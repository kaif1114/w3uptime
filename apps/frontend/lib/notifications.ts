import pgClient, { initializeConnection } from "./pg";
import { createIncident, resolveIncident } from "./incident";
// Global registry for active SSE streams with user authorization
const activeStreams = new Map<string, {
  monitorId: string;
  userId: string;
  controller: ReadableStreamDefaultController;
}>();

// Global flag to ensure notification handler is only set up once

// Initialize notification handling (called lazily when first stream is registered)
export const initializeNotificationHandler = () => {
  if (!pgClient) {
    return;
  }

  // Set up global notification handler
  pgClient.on('notification', (msg) => {
    console.log("Notification received from PG:", msg);
    try {
      if (msg.channel === 'monitor_update') {
        const payload = JSON.parse(msg.payload || '{}');
        
        // Find the stream for this monitor
        const stream = activeStreams.get(payload.monitorId);
        if (stream) {
          // Authorization was already verified during stream registration
          const sseData = `data: ${JSON.stringify({
            type: 'monitor_update',
            monitorId: payload.monitorId,
            status: payload.status == 'BAD' ? 'DOWN' : 'ACTIVE',
            latency: payload.latency,
            checkedAt: payload.checkedAt,
            location: payload.location
          })}\n\n`;
          
          stream.controller.enqueue(new TextEncoder().encode(sseData));
        }
        if(payload.status === 'BAD') {
          createIncident(payload.monitorId, 'Monitor is down', new Date(payload.checkedAt));
        }
        else if(payload.status === 'GOOD') {
          resolveIncident(payload.monitorId, new Date(payload.checkedAt));
        }
      }
    } catch (error) {
      console.error('Error processing notification:', error);
    }
  });
  
  console.log('PostgreSQL notification handler initialized');
};

// Register a new SSE stream for a monitor with user authorization
export const registerStream = (monitorId: string, userId: string, controller: ReadableStreamDefaultController) => {
  // Connection is already initialized at application startup via instrumentation.ts
  initializeConnection()
  activeStreams.set(monitorId, { 
    monitorId, 
    userId,
    controller
  });
  console.log(`Stream registered for monitor ${monitorId}, user ${userId}. Active streams: ${activeStreams.size}`);
};

// Unregister an SSE stream
export const unregisterStream = (monitorId: string) => {
  const existed = activeStreams.delete(monitorId);
  if (existed) {
    console.log(`Stream unregistered for monitor ${monitorId}. Active streams: ${activeStreams.size}`);
  }
};

// Get count of active streams (for debugging)
export const getActiveStreamCount = () => activeStreams.size;

// Clean up all streams (called on connection errors)
export const cleanupAllStreams = () => {
  activeStreams.forEach((stream, monitorId) => {
    try {
      stream.controller.close();
    } catch (error) {
      console.error(`Error closing stream ${monitorId} during cleanup:`, error);
    }
  });
  activeStreams.clear();
  console.log('All streams cleaned up');
};

// Notification handler will be initialized lazily when first stream is registered