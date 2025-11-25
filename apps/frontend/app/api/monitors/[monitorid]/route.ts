import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const patchMonitorSchema = z.object({
  name: z.string().min(1),
  url: z.url().min(1),
  timeout: z.number().int().positive().default(30), // seconds
  checkInterval: z.number().int().positive().default(300), // seconds
  status: z.enum(["ACTIVE", "PAUSED", "DOWN", "RECOVERING"]).default("ACTIVE"),
  expectedStatusCodes: z.array(z.number().int()).default([200, 201, 202, 204]),
  escalationPolicyId: z.string().min(1, "Escalation policy is required"),
});

// GET /api/monitors/[monitorid] - Get single monitor
export const GET = withAuth(
  async (
    req: NextRequest,
    user,
    session,
    { params }: { params: Promise<{ monitorid: string }> }
  ) => {
    try {
      const { monitorid } = await params;

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

      // Fetch incident data in parallel for better performance
      const [lastResolvedIncident, ongoingIncident] = await Promise.all([
        // Get the most recent resolved incident
        prisma.incident.findFirst({
          where: {
            monitorId: monitorid,
            status: "RESOLVED",
          },
          orderBy: {
            resolvedAt: "desc",
          },
          select: {
            resolvedAt: true,
          },
        }),
        // Check if there's any ongoing incident
        prisma.incident.findFirst({
          where: {
            monitorId: monitorid,
            status: {
              in: ["ONGOING", "ACKNOWLEDGED"],
            },
          },
          select: {
            id: true,
            createdAt: true,
          },
        }),
      ]);

    

      return NextResponse.json(
        {
          id: monitor.id,
          name: monitor.name,
          url: monitor.url,
          status: monitor.status,
          timeout: monitor.timeout,
          checkInterval: monitor.checkInterval,
          expectedStatusCodes: monitor.expectedStatusCodes,
          escalationPolicyId: monitor.escalationPolicyId,
          createdAt: monitor.createdAt.toISOString(),
          updatedAt: monitor.createdAt.toISOString(), // Use createdAt since updatedAt doesn't exist yet
          lastCheckedAt: monitor.lastCheckedAt
            ? monitor.lastCheckedAt.toISOString()
            : null,
          lastIncidentResolvedAt: lastResolvedIncident?.resolvedAt
            ? lastResolvedIncident.resolvedAt.toISOString()
            : null,
          hasOngoingIncident: !!ongoingIncident,
          ongoingIncidentStartedAt: ongoingIncident?.createdAt
            ? ongoingIncident.createdAt.toISOString()
            : null,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error fetching monitor:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// PATCH /api/monitors/[monitorid] - Update monitor
export const PATCH = withAuth(
  async (
    req: NextRequest,
    user,
    session,
    { params }: { params: Promise<{ monitorid: string }> }
  ) => {
    try {
      const { monitorid } = await params;
      const body = await req.json();

      if (!monitorid) {
        return NextResponse.json(
          { error: "Monitor ID is required" },
          { status: 400 }
        );
      }

      const validation = patchMonitorSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }

      const { name, url, timeout, checkInterval, status, expectedStatusCodes, escalationPolicyId } =
        validation.data;

      const existingMonitor = await prisma.monitor.findFirst({
        where: {
          id: monitorid,
          userId: user.id,
        },
      });

      if (!existingMonitor) {
        return NextResponse.json(
          { error: "Monitor not found" },
          { status: 404 }
        );
      }

      const updatedMonitor = await prisma.monitor.update({
        where: {
          id: monitorid,
        },
        data: {
          name,
          url,
          timeout,
          checkInterval,
          expectedStatusCodes,
          status,
          escalationPolicyId,
        },
      });

      return NextResponse.json(
        {
          message: "Monitor updated successfully",
          monitor: {
            id: updatedMonitor.id,
            name: updatedMonitor.name,
            url: updatedMonitor.url,
            createdAt: updatedMonitor.createdAt,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error updating monitor:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// DELETE /api/monitors/[monitorid] - Delete monitor
export const DELETE = withAuth(
  async (
    req: NextRequest,
    user,
    session,
    { params }: { params: Promise<{ monitorid: string }> }
  ) => {
    try {
      const { monitorid } = await params;

      if (!monitorid) {
        return NextResponse.json(
          { error: "Monitor ID is required" },
          { status: 400 }
        );
      }

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

      await prisma.$transaction(async (tx) => {
        // Delete all associated records in the correct order due to foreign key constraints

        // 1. Delete TimelineEvents related to incidents of this monitor
        await tx.timelineEvent.deleteMany({
          where: {
            incident: {
              monitorId: monitorid,
            },
          },
        });

        // 2. Delete EscalationLogs related to alerts of this monitor
        await tx.escalationLog.deleteMany({
          where: {
            Alert: {
              monitorId: monitorid,
            },
          },
        });

        // 3. Delete Alerts for this monitor
        await tx.alert.deleteMany({
          where: {
            monitorId: monitorid,
          },
        });

        // 4. Delete Incidents for this monitor
        await tx.incident.deleteMany({
          where: {
            monitorId: monitorid,
          },
        });

        // 5. Delete StatusPageSections for this monitor
        await tx.statusPageSection.deleteMany({
          where: {
            monitorId: monitorid,
          },
        });

        // 6. Delete MonitorTicks for this monitor
        await tx.monitorTick.deleteMany({
          where: {
            monitorId: monitorid,
          },
        });

        // 7. Finally delete the monitor
        await tx.monitor.delete({
          where: {
            id: monitorid,
          },
        });
      });

      return NextResponse.json(
        { message: "Monitor deleted successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting monitor:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
