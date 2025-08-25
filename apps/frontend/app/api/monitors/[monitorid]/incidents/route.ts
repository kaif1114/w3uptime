import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";

// GET /api/monitors/[monitorid]/incidents - Get monitor incidents count
export const GET = withAuth(async (
  req: NextRequest,
  user,
  session,
  { params }: { params: Promise<{ monitorid: string }> }
) => {
  try {
    const { monitorid } = await params;

    // Verify monitor ownership
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

    // Count incidents for this monitor
    const incidentCount = await prisma.incident.count({
      where: {
        monitorId: monitorid,
      },
    });

    return NextResponse.json(
      {
        monitorId: monitorid,
        incidentCount,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error fetching monitor incidents count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});