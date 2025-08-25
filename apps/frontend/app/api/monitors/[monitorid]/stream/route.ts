import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";
import { Client } from "pg";

// Global clients map to manage PostgreSQL connections per monitor
const monitorClients = new Map<string, { client: Client; responseStream: ReadableStream }>();

// Clean up function to close connections
const cleanupConnection = (monitorId: string) => {
  const connection = monitorClients.get(monitorId);
  if (connection) {
    connection.client.end().catch(console.error);
    monitorClients.delete(monitorId);
  }
};

// GET /api/monitors/[monitorid]/stream - SSE endpoint for real-time updates
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

    // Create a new PostgreSQL client for listening to notifications
    const pgClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await pgClient.connect();
    await pgClient.query('LISTEN monitor_update');

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const data = `data: ${JSON.stringify({ type: 'connected', monitorId: monitorid })}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));

        // Listen for PostgreSQL notifications
        pgClient.on('notification', (msg) => {
          try {
            if (msg.channel === 'monitor_update') {
              const payload = JSON.parse(msg.payload || '{}');
              
              // Only send notifications for this specific monitor
              if (payload.monitorId === monitorid) {
                const sseData = `data: ${JSON.stringify({
                  type: 'monitor_update',
                  monitorId: payload.monitorId,
                  status: payload.status,
                  latency: payload.latency,
                  checkedAt: payload.checkedAt,
                  location: payload.location
                })}\n\n`;
                
                controller.enqueue(new TextEncoder().encode(sseData));
              }
            }
          } catch (error) {
            console.error('Error processing notification:', error);
          }
        });

        // Handle client disconnection
        pgClient.on('end', () => {
          controller.close();
          cleanupConnection(monitorid);
        });

        pgClient.on('error', (error) => {
          console.error('PostgreSQL client error:', error);
          controller.error(error);
          cleanupConnection(monitorid);
        });

        // Store the connection
        monitorClients.set(monitorid, { client: pgClient, responseStream: stream });
      },

      cancel() {
        // Clean up when client disconnects
        cleanupConnection(monitorid);
      },
    });

    // Return SSE response
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

// Clean up connections on process termination
process.on('SIGTERM', () => {
  monitorClients.forEach((_, monitorId) => cleanupConnection(monitorId));
});

process.on('SIGINT', () => {
  monitorClients.forEach((_, monitorId) => cleanupConnection(monitorId));
});