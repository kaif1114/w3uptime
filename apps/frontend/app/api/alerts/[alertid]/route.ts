import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const updateAlertSchema = z.object({
  alertId: z.string().min(1),
  status: z.enum(["PENDING", "SENT", "ACKNOWLEDGED", "RESOLVED"]).optional(),
  acknowledgedBy: z.string().optional(),
  currentEscalationLevel: z.number().int().positive().optional(),
  escalationCompleted: z.boolean().optional(),
});



const acknowledgeAlertSchema = z.object({
  acknowledgedBy: z.string().min(1).optional(), 
  alertId: z.string().min(1),
});





export const GET = withAuth(async (req: NextRequest, user) =>
{
  try {
    const body = await req.json();
    const validation = updateAlertSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.findFirst({
      where: {
        monitor: {
          userId: user.id,
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
);


export const PATCH = withAuth(async (req: NextRequest, user) =>
{
  try {
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
        id: validation.data.alertId,
        monitor: {
          userId: user.id,
        },
      },
    });

    if (!existingAlert) {
      return NextResponse.json(
        { error: "Alert not found.." },
        { status: 404 }
      );
    }

    

    
    const acknowledgedAlert = await prisma.alert.update({
      where: {
        id: validation.data.alertId,
      },
      data: {
        
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
});


export const DELETE = withAuth(async (req: NextRequest, user) =>
{
  try {
    const body = await req.json();
    const validation = updateAlertSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.findFirst({
      where: {
        monitor: {
          userId: user.id,
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
          id: validation.data.alertId,
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
});
