import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";
import { registerStream, unregisterStream } from "@/lib/notifications";



const cleanupConnection = (monitorId: string) => {
  unregisterStream(monitorId);
};


export const GET = withAuth(async (
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

    
    const stream = new ReadableStream({
      start(controller) {
        
        registerStream(monitorid, user.id, controller);
        
        
        const data = `data: ${JSON.stringify({ type: 'connected', monitorId: monitorid })}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));
      },

      cancel() {
        
        cleanupConnection(monitorid);
      },
    });

    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error("Error setting up SSE stream:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});

