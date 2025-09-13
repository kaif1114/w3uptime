import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

const createAlertSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  triggerStatusCode: z.number().int().optional(),
  expectedStatusCode: z.number().int().optional(),
  triggeredAt: z.date().default(new Date()),
  monitorId: z.string().min(1).optional(), 
  status: z.enum(["PENDING", "SENT", "ACKNOWLEDGED", "RESOLVED"]).default("PENDING"),
});

// GET /api/alerts - Get all alerts (with optional monitor filter)

export const GET = withAuth(async (req: NextRequest, user) =>
{
  const body = await req.json();
  const validation = createAlertSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.message },
      { status: 400 }
    );
  }

  try {
    const whereClause: Prisma.AlertWhereInput = {
      monitor: {
        userId: user.id,  
      },
    };

    // Use query parameter if provided, otherwise use hardcoded monitor ID
    const targetMonitorId = validation.data.monitorId || user.id;
    whereClause.monitorId = targetMonitorId;

    // Note: Status filtering would require adding status field to Alert schema

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
});

// POST /api/alerts - Create new alert
export const POST = withAuth(async (req: NextRequest, user) =>
{
  const body = await req.json();
  const validation = createAlertSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.message },
      { status: 400 }
    );
  } 

  try{
    const { title, message, severity, triggerStatusCode, expectedStatusCode } = validation.data;
    const monitorId = validation.data.monitorId || user.id;
    // Check if monitor exists and belongs to user
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: monitorId,
        userId: user.id,
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
        triggerStatusCode,
        expectedStatusCode,
        monitorId,
        // Note: severity, status, currentEscalationLevel, escalationCompleted fields would need to be added to schema
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
        message: "Alert sent successfully",
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
});
