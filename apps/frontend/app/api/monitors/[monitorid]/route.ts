import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const patchMonitorSchema = z.object({
  name: z.string().min(1).optional(),
  url: z.url().min(1).optional(),
  timeout: z.number().int().positive().optional(),
  checkInterval: z.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "PAUSED", "DOWN", "RECOVERING"]).optional(),
  expectedStatusCodes: z.array(z.number().int()).optional(),
  escalationPolicyId: z.string().min(1, "Escalation policy is required").optional(),
});


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

      
      const [lastResolvedIncident, ongoingIncident] = await Promise.all([
        
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
          updatedAt: monitor.createdAt.toISOString(), 
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

      // Validate partial updates
      const validation = patchMonitorSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }

      // Fetch existing monitor
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

      // Merge updates with existing data (only update provided fields)
      const updateData = {
        name: validation.data.name ?? existingMonitor.name,
        url: validation.data.url ?? existingMonitor.url,
        timeout: validation.data.timeout ?? existingMonitor.timeout,
        checkInterval: validation.data.checkInterval ?? existingMonitor.checkInterval,
        status: validation.data.status ?? existingMonitor.status,
        expectedStatusCodes: validation.data.expectedStatusCodes ?? existingMonitor.expectedStatusCodes,
        escalationPolicyId: validation.data.escalationPolicyId ?? existingMonitor.escalationPolicyId,
      };

      // Update monitor with merged data
      const updatedMonitor = await prisma.monitor.update({
        where: {
          id: monitorid,
        },
        data: updateData,
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
        

        
        await tx.timelineEvent.deleteMany({
          where: {
            incident: {
              monitorId: monitorid,
            },
          },
        });

        
        await tx.escalationLog.deleteMany({
          where: {
            Alert: {
              monitorId: monitorid,
            },
          },
        });

        
        await tx.alert.deleteMany({
          where: {
            monitorId: monitorid,
          },
        });

        
        await tx.incident.deleteMany({
          where: {
            monitorId: monitorid,
          },
        });

        
        await tx.statusPageSection.deleteMany({
          where: {
            monitorId: monitorid,
          },
        });

        
        await tx.monitorTick.deleteMany({
          where: {
            monitorId: monitorid,
          },
        });

        
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
