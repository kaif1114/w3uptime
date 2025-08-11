import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";

const updateAlertSchema = z.object({
  status: z.enum(["PENDING", "SENT", "ACKNOWLEDGED", "RESOLVED"]).optional(),
  acknowledgedBy: z.string().optional(),
  currentEscalationLevel: z.number().int().positive().optional(),
  escalationCompleted: z.boolean().optional(),
});

const acknowledgeAlertSchema = z.object({
  acknowledgedBy: z.string().min(1).optional(), // Can be optional if using hardcoded user
});

// Hardcoded user ID (matching other APIs)
const HARDCODED_USER_ID = "user-123";
// Hardcoded monitor ID for testing
const HARDCODED_MONITOR_ID = "a9be5b60-ae13-4bb1-af74-f49660086e49s";

// GET /api/alerts/[alertid] - Get specific alert
export async function GET(
  req: NextRequest,
  { params }: { params: { alertid: string } }
) {
  try {
    const { alertid } = params;

    const alert = await prisma.alert.findFirst({
      where: {
        id: alertid,
        monitor: {
          userId: HARDCODED_USER_ID,
        },
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

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Failed to fetch alert:", error);
    return NextResponse.json(
      { error: "Failed to fetch alert" },
      { status: 500 }
    );
  }
}

// PUT /api/alerts/[alertid] - Update alert (general update)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ alertid: string }> }
) {
  try {
    const { alertid } = await params;
    const body = await req.json();

    const validation = updateAlertSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const existingAlert = await prisma.alert.findFirst({
      where: {
        id: alertid,
        monitor: {
          userId: HARDCODED_USER_ID,
        },
      },
    });

    if (!existingAlert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    const updateData: any = { ...validation.data };

    // Auto-set acknowledgedAt when status changes to ACKNOWLEDGED
    if (validation.data.status === "ACKNOWLEDGED" && existingAlert.status !== "ACKNOWLEDGED") {
      updateData.acknowledgedAt = new Date();
      if (!validation.data.acknowledgedBy) {
        updateData.acknowledgedBy = HARDCODED_USER_ID;
      }
    }

    // Auto-set resolvedAt-like behavior when status changes to RESOLVED
    if (validation.data.status === "RESOLVED" && existingAlert.status !== "RESOLVED") {
      updateData.escalationCompleted = true;
    }

    const updatedAlert = await prisma.alert.update({
      where: {
        id: alertid,
      },
      data: updateData,
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

    return NextResponse.json({
      message: "Alert updated successfully",
      alert: updatedAlert,
    });
  } catch (error) {
    console.error("Failed to update alert:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}

// PATCH /api/alerts/[alertid] - Acknowledge alert (specific action)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ alertid: string }> }
) {
  try {
    const { alertid } = await params;
    const body = await req.json();

    const validation = acknowledgeAlertSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const existingAlert = await prisma.alert.findFirst({
      where: { 
        id: alertid,
        monitor: {
          userId: HARDCODED_USER_ID,
        },
      },
    });

    if (!existingAlert) {
      return NextResponse.json(
        { error: "Alert not found.." },
        { status: 404 }
      );
    }

    // Check if alert is already acknowledged
    if (existingAlert.status === "ACKNOWLEDGED") {
      return NextResponse.json(
        { error: "Alert is already acknowledged" },
        { status: 400 }
      );
    }

    // Acknowledge the alert
    const acknowledgedAlert = await prisma.alert.update({
      where: {
        id: alertid,
      },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        acknowledgedBy: validation.data.acknowledgedBy || HARDCODED_USER_ID,
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

    return NextResponse.json({
      message: "Alert acknowledged successfully",
      alert: acknowledgedAlert,
    });
  } catch (error) {
    console.error("Failed to acknowledge alert:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge alert" },
      { status: 500 }
    );
  }
}

// DELETE /api/alerts/[alertid] - Delete alert
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ alertid: string }> }
) {
  try {
    const { alertid } = await params;

    const alert = await prisma.alert.findFirst({
      where: {
        id: alertid,
        monitor: {
          userId: HARDCODED_USER_ID,
        },
      },
    });

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    await prisma.alert.delete({
      where: {
        id: alertid,
      },
    });

    return NextResponse.json({ message: "Alert deleted successfully" });
  } catch (error) {
    console.error("Failed to delete alert:", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
