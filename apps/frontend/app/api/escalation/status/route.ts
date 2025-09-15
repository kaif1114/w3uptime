import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import escalationService from "@/lib/escalation";
import { prisma } from "db/client";

// GET /api/escalation/status - Get escalation status for monitors
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const url = new URL(req.url);
    const monitorId = url.searchParams.get('monitorId');

    if (monitorId) {
      // Get status for specific monitor
      const monitor = await prisma.monitor.findFirst({
        where: {
          id: monitorId,
          userId: user.id
        }
      });

      if (!monitor) {
        return NextResponse.json(
          { error: "Monitor not found" },
          { status: 404 }
        );
      }

      const status = await escalationService.getEscalationStatus(monitorId);
      
      return NextResponse.json({
        monitorId,
        monitorName: monitor.name,
        ...status
      });
    } else {
      // Get status for all user's monitors
      const monitors = await prisma.monitor.findMany({
        where: { userId: user.id },
        select: { id: true, name: true }
      });

      const statusPromises = monitors.map(async (monitor) => {
        const status = await escalationService.getEscalationStatus(monitor.id);
        return {
          monitorId: monitor.id,
          monitorName: monitor.name,
          ...status
        };
      });

      const statuses = await Promise.all(statusPromises);

      return NextResponse.json({
        monitors: statuses,
        totalMonitors: monitors.length,
        activeEscalations: statuses.filter(s => s.isActive).length
      });
    }

  } catch (error) {
    console.error("Escalation status error:", error);
    return NextResponse.json(
      { error: "Failed to get escalation status" },
      { status: 500 }
    );
  }
});

// POST /api/escalation/status - Stop escalation for a monitor
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { monitorId, action } = body;

    if (!monitorId) {
      return NextResponse.json(
        { error: "Monitor ID is required" },
        { status: 400 }
      );
    }

    // Verify monitor belongs to user
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: user.id
      }
    });

    if (!monitor) {
      return NextResponse.json(
        { error: "Monitor not found" },
        { status: 404 }
      );
    }

    if (action === 'stop') {
      await escalationService.stopEscalation(monitorId);
      
      return NextResponse.json({
        message: "Escalation stopped successfully",
        monitorId,
        monitorName: monitor.name
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'stop'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Stop escalation error:", error);
    return NextResponse.json(
      { error: "Failed to stop escalation" },
      { status: 500 }
    );
  }
});
