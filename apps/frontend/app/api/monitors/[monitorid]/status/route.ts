import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";

const updateMonitorStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "DISABLED"]).default("PAUSED"),
});

// Hardcoded user ID as requested
const HARDCODED_USER_ID = "user-123";

// PATCH /api/monitors/[monitorid]/status - Update monitor status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ monitorid: string }> }
) {
  try {
    const { monitorid } = await params;
    const body = await req.json();

    if (!monitorid) {
      return NextResponse.json(
        { error: "Monitor ID is required" },
        { status: 400 }
      );
    }

    const validation = updateMonitorStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    // Check if the monitor exists and belongs to the user
    const existingMonitor = await prisma.monitor.findFirst({
      where: {
        id: monitorid,
        userId: HARDCODED_USER_ID,
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
        status: validation.data.status,
      },
    });

    return NextResponse.json(
      {
        message: "Monitor status updated successfully",
        monitor: {
          id: updatedMonitor.id,
          name: updatedMonitor.name,
          status: updatedMonitor.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating monitor status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 