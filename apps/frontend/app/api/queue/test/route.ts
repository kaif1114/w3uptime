import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { z } from "zod";
import bullMQEscalationService from "@/lib/escalation-bullmq";
import { prisma } from "db/client";

const testAlertSchema = z.object({
  monitorId: z.string().min(1),
  testType: z.enum(["incident", "recovery"]).default("incident"),
  customMessage: z.string().optional(),
});

// POST /api/queue/test - Test BullMQ alert system
export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const validation = testAlertSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { monitorId, testType, customMessage } = validation.data;

    // Verify monitor exists and belongs to user
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: user.id,
      },
      include: {
        escalationPolicy: {
          include: {
            levels: {
              orderBy: { levelOrder: 'asc' }
            }
          }
        }
      }
    });

    if (!monitor) {
      return NextResponse.json(
        { error: `Monitor not found with ID: ${monitorId}` },
        { status: 404 }
      );
    }

    if (!monitor.escalationPolicy) {
      return NextResponse.json(
        { error: `Monitor ${monitor.name} has no escalation policy configured` },
        { status: 400 }
      );
    }

    if (testType === "incident") {
      // Test incident alert
      const testTitle = customMessage || `Test Alert - ${monitor.name}`;
      
      await bullMQEscalationService.startEscalation({
        monitorId: monitor.id,
        incidentTitle: testTitle,
        timestamp: new Date(),
      });

      return NextResponse.json({
        message: "Test incident alert triggered successfully",
        monitor: {
          id: monitor.id,
          name: monitor.name,
          url: monitor.url,
        },
        escalationLevels: monitor.escalationPolicy.levels.length,
        testTitle,
      });

    } else if (testType === "recovery") {
      // Test recovery notification
      await bullMQEscalationService.stopEscalation(monitor.id);

      return NextResponse.json({
        message: "Test recovery notification triggered successfully",
        monitor: {
          id: monitor.id,
          name: monitor.name,
          url: monitor.url,
        },
      });
    }

  } catch (error) {
    console.error("Failed to trigger test alert:", error);
    return NextResponse.json(
      { error: "Failed to trigger test alert" },
      { status: 500 }
    );
  }
});
