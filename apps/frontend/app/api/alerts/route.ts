import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";

const createAlertSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  triggerStatusCode: z.number().int().optional(),
  expectedStatusCode: z.number().int().optional(),
  monitorId: z.string().min(1).optional(), // foriegn key to monitor table (not required for create)
});

// Hardcoded user ID (matching other APIs)
const HARDCODED_USER_ID = "user-123";
// Hardcoded monitor ID for testing (same as incidents)
const HARDCODED_MONITOR_ID = "a9be5b60-ae13-4bb1-af74-f49660086e49";

// GET /api/alerts - Get all alerts (with optional monitor filter)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryMonitorId = searchParams.get("monitorId");
    const status = searchParams.get("status");

    const whereClause:any = {
      monitor: {
        userId: HARDCODED_USER_ID,
      },
    };

    // Use query parameter if provided, otherwise use hardcoded monitor ID
    const targetMonitorId = queryMonitorId || HARDCODED_MONITOR_ID;
    whereClause.monitorId = targetMonitorId;

    // Filter by status if provided
    if (status && ["PENDING", "SENT", "ACKNOWLEDGED", "RESOLVED"].includes(status)) {
      whereClause.status = status;
    }

    const alerts = await prisma.alert.findMany({
      where: whereClause,
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
      orderBy: {
        triggeredAt: 'desc',
      },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create new alert
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = createAlertSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { title, message, severity, triggerStatusCode, expectedStatusCode } = validation.data;
    // Use hardcoded monitor ID instead of from request body
    const monitorId = HARDCODED_MONITOR_ID;

    // Check if monitor exists and belongs to user
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: HARDCODED_USER_ID,
      },
    });

    if (!monitor) {
      return NextResponse.json(
        { error: `Monitor not found with ID: ${monitorId}` },
        { status: 404 }
      );
    }

    // Create the alert
    const alert = await prisma.alert.create({
      data: {
        title,
        message,
        severity,
        triggerStatusCode,
        expectedStatusCode,
        monitorId,
        status: "PENDING", // New alerts start as PENDING
        currentEscalationLevel: 1,
        escalationCompleted: false,
      },
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    });

    // TODO: Trigger notification/escalation process here
    // You could call NotificationService.processEscalation(alert.id) here

    return NextResponse.json(
      {
        message: "Alert created successfully",
        alert,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create alert:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}
