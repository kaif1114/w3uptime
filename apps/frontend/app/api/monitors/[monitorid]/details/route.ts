import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (req: NextRequest, user, session, { params }: { params: Promise<{ monitorid: string }> }) => {
  try {
    const { monitorid } = await params;

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorid,
        userId: user.id,
      },
      include: {
        monitorTicks: {
          orderBy: { createdAt: 'desc' },
          take: 1000, // Get last 1000 checks for calculations
        },
        alerts: {
          orderBy: { triggeredAt: 'desc' },
        },
        Incident: true,
      },
    });

    if (!monitor) {
      return NextResponse.json(
        { error: "Monitor not found" },
        { status: 404 }
      );
    }

    // Calculate time periods
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const last30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const last365Days = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

    // Helper function to calculate uptime percentage
    const calculateUptime = (ticks: any[], startDate: Date) => {
      const relevantTicks = ticks.filter(tick => tick.createdAt >= startDate);
      if (relevantTicks.length === 0) return 100;
      
      const goodTicks = relevantTicks.filter(tick => tick.status === 'GOOD').length;
      return (goodTicks / relevantTicks.length) * 100;
    };

    // Helper function to calculate downtime duration
    const calculateDowntime = (ticks: any[], startDate: Date) => {
      const relevantTicks = ticks.filter(tick => tick.createdAt >= startDate);
      const badTicks = relevantTicks.filter(tick => tick.status === 'BAD').length;
      
      if (badTicks === 0) return "none";
      
      // Estimate downtime based on check interval and bad ticks
      const downtimeMinutes = (badTicks * monitor.checkInterval) / 60;
      
      if (downtimeMinutes < 60) {
        return `${Math.round(downtimeMinutes)} minutes`;
      } else if (downtimeMinutes < 1440) {
        return `${Math.round(downtimeMinutes / 60)} hours`;
      } else {
        return `${Math.round(downtimeMinutes / 1440)} days`;
      }
    };

    // Helper function to count incidents
    const countIncidents = (alerts: any[], startDate: Date) => {
      return alerts.filter(alert => alert.triggeredAt >= startDate).length;
    };

    // Calculate stats
    const uptimeToday = calculateUptime(monitor.monitorTicks, today);
    const uptime7Days = calculateUptime(monitor.monitorTicks, last7Days);
    const uptime30Days = calculateUptime(monitor.monitorTicks, last30Days);
    const uptime365Days = calculateUptime(monitor.monitorTicks, last365Days);
    const uptimeAllTime = calculateUptime(monitor.monitorTicks, monitor.createdAt);

    const downtimeToday = calculateDowntime(monitor.monitorTicks, today);
    const downtime7Days = calculateDowntime(monitor.monitorTicks, last7Days);
    const downtime30Days = calculateDowntime(monitor.monitorTicks, last30Days);
    const downtime365Days = calculateDowntime(monitor.monitorTicks, last365Days);
    const downtimeAllTime = calculateDowntime(monitor.monitorTicks, monitor.createdAt);

    const incidentsToday = countIncidents(monitor.alerts, today);
    const incidents7Days = countIncidents(monitor.alerts, last7Days);
    const incidents30Days = countIncidents(monitor.alerts, last30Days);
    const incidents365Days = countIncidents(monitor.alerts, last365Days);
    const incidentsAllTime = monitor.alerts.length;

    // Calculate currently up for duration
    const lastBadTick = monitor.monitorTicks.find(tick => tick.status === 'BAD');
    const lastGoodTickTime = lastBadTick ? lastBadTick.createdAt : monitor.createdAt;
    const upForMs = now.getTime() - new Date(lastGoodTickTime).getTime();
    const upForDays = Math.floor(upForMs / (24 * 60 * 60 * 1000));
    const upForHours = Math.floor((upForMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const upForMinutes = Math.floor((upForMs % (60 * 60 * 1000)) / (60 * 1000));
    
    const currentlyUpFor = upForDays > 0 
      ? `${upForDays} days ${upForHours} hours ${upForMinutes} mins`
      : upForHours > 0 
      ? `${upForHours} hours ${upForMinutes} mins`
      : `${upForMinutes} mins`;

    // Calculate last checked time
    const lastCheck = monitor.monitorTicks[0];
    const lastCheckedAt = lastCheck 
      ? getTimeAgo(new Date(lastCheck.createdAt))
      : "Never";

    // Calculate longest and average incident duration
    const incidents = monitor.alerts.filter(alert => alert.status === 'RESOLVED');
    let longestIncident = "none";
    let avgIncident = "none";
    
    if (incidents.length > 0) {
      const durations = incidents.map(incident => {
        const start = new Date(incident.triggeredAt);
        const end = incident.acknowledgedAt ? new Date(incident.acknowledgedAt) : now;
        return end.getTime() - start.getTime();
      });
      
      const longestMs = Math.max(...durations);
      const avgMs = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      
      longestIncident = formatDuration(longestMs);
      avgIncident = formatDuration(avgMs);
    }

    const stats = {
      currentlyUpFor,
      lastCheckedAt,
      incidentsCount: incidentsAllTime,
      uptime: {
        today: parseFloat(uptimeToday.toFixed(4)),
        last7Days: parseFloat(uptime7Days.toFixed(4)),
        last30Days: parseFloat(uptime30Days.toFixed(4)),
        last365Days: parseFloat(uptime365Days.toFixed(4)),
        allTime: parseFloat(uptimeAllTime.toFixed(4))
      },
      downtime: {
        today: downtimeToday,
        last7Days: downtime7Days,
        last30Days: downtime30Days,
        last365Days: downtime365Days,
        allTime: downtimeAllTime
      },
      incidents: {
        today: incidentsToday,
        last7Days: incidents7Days,
        last30Days: incidents30Days,
        last365Days: incidents365Days,
        allTime: incidentsAllTime
      },
      longestIncident,
      avgIncident
    };

    // Generate response time data from monitor ticks
    const responseTimeData = monitor.monitorTicks
      .slice(0, 24) // Last 24 data points
      .reverse() // Show chronologically
      .map(tick => ({
        timestamp: tick.createdAt.toISOString(),
        responseTime: tick.latency,
        status: tick.status === 'GOOD' ? "success" : "failure" as const
      }));

    const formattedMonitor = {
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      status: monitor.status,
      timeout: monitor.timeout,
      checkInterval: monitor.checkInterval,
      expectedStatusCodes: monitor.expectedStatusCodes,
      createdAt: monitor.createdAt.toISOString(),
      updatedAt: monitor.createdAt.toISOString(),
    };

    return NextResponse.json({
      monitor: formattedMonitor,
      stats,
      responseTimeData,
    });
  } catch (error) {
    console.error("Error fetching monitor details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Helper function to format duration
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
} 