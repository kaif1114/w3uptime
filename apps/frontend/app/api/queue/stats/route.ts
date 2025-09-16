import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getAlertSystemStats, isAlertSystemInitialized } from "@/lib/alert-system-init";

// GET /api/queue/stats - Get BullMQ system statistics
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    if (!isAlertSystemInitialized()) {
      return NextResponse.json(
        { error: "Alert System not initialized" },
        { status: 503 }
      );
    }

    const stats = await getAlertSystemStats();
    
    return NextResponse.json({
      initialized: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get queue stats:", error);
    return NextResponse.json(
      { error: "Failed to get queue statistics" },
      { status: 500 }
    );
  }
});
