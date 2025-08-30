import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { prisma } from "db/client";
import { z } from "zod";
import { DailyStatusData, DailyStatus } from "@/types/monitor";

const querySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).default("30d"),
  timezone: z.string().optional().default("UTC"),
});

type DailyAggregation = {
  date: Date;
  total_checks: bigint;
  successful_checks: bigint;
  avg_latency: number;
  uptime_percentage: number;
};

// Function to determine daily status based on uptime percentage
function getDailyStatus(uptimePercentage: number, totalChecks: number): DailyStatus {
  if (totalChecks === 0) return 'unknown';
  if (uptimePercentage >= 99.5) return 'up';
  if (uptimePercentage >= 95) return 'partial';
  if (uptimePercentage < 95) return 'down';
  return 'unknown';
}

export const GET = withAuth(
  async (req: NextRequest, user, _session, context) => {
    try {
      const { monitorid } = (await context.params) as { monitorid: string };
      const url = new URL(req.url);
      const { period, timezone } = querySchema.parse({
        period: url.searchParams.get("period"),
        timezone: url.searchParams.get("timezone"),
      });

      // First verify that the monitor belongs to the user
      const monitor = await prisma.monitor.findFirst({
        where: {
          id: monitorid,
          userId: user.id,
        },
      });

      if (!monitor) {
        return NextResponse.json(
          { error: "Monitor not found" },
          { status: 404 }
        );
      }

      // Calculate the date range
      const periodDays = parseInt(period.replace('d', ''));
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - periodDays);

      // Query to get daily aggregations
      const dailyAggregations = await prisma.$queryRaw<DailyAggregation[]>`
        SELECT 
          DATE("createdAt" AT TIME ZONE ${timezone}) as date,
          COUNT(*) as total_checks,
          COUNT(*) FILTER (WHERE status = 'GOOD') as successful_checks,
          COALESCE(AVG(latency), 0) as avg_latency,
          COALESCE(
            (COUNT(*) FILTER (WHERE status = 'GOOD') * 100.0 / NULLIF(COUNT(*), 0)), 
            0
          ) as uptime_percentage
        FROM "MonitorTick"
        WHERE "monitorId" = ${monitorid}
          AND "createdAt" >= ${startDate}
          AND "createdAt" <= ${endDate}
        GROUP BY DATE("createdAt" AT TIME ZONE ${timezone})
        ORDER BY date ASC
      `;

      // Create a map of existing data
      const dataMap = new Map<string, DailyAggregation>();
      dailyAggregations.forEach(agg => {
        dataMap.set(agg.date.toISOString().split('T')[0], agg);
      });

      // Fill in missing days with no data
      const result: DailyStatusData[] = [];
      for (let i = 0; i < periodDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateString = currentDate.toISOString().split('T')[0];
        
        const agg = dataMap.get(dateString);
        
        if (agg) {
          const totalChecks = Number(agg.total_checks);
          const successfulChecks = Number(agg.successful_checks);
          const uptimePercentage = agg.uptime_percentage;
          
          result.push({
            date: dateString,
            status: getDailyStatus(uptimePercentage, totalChecks),
            uptime: Math.round(uptimePercentage * 100) / 100,
            totalChecks,
            successfulChecks,
            averageResponseTime: Math.round(agg.avg_latency),
            incidents: totalChecks > 0 && successfulChecks < totalChecks ? 1 : 0,
            downtimeMinutes: Math.round(((totalChecks - successfulChecks) * 5)), // Assuming 5-minute intervals
          });
        } else {
          // No data for this day
          result.push({
            date: dateString,
            status: 'unknown',
            uptime: 0,
            totalChecks: 0,
            successfulChecks: 0,
            averageResponseTime: 0,
            incidents: 0,
            downtimeMinutes: 0,
          });
        }
      }

      return NextResponse.json({
        monitorId: monitorid,
        period,
        data: result,
        generatedAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error("Error fetching daily status data:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
