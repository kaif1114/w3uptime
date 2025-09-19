import pgClient from "./pg";
import { createIncident, resolveIncident } from "./incident";
import escalationService from "./escalation";
import bullMQEscalationService from "./escalationBullmq";
import { prisma } from "db/client";

// Global registry for active SSE streams with user authorization (using globalThis for persistence)
const globalForStreams = globalThis as unknown as {
  activeStreams: Map<string, {
    monitorId: string;
    userId: string;
    controller: ReadableStreamDefaultController;
  }> | undefined;
};

const activeStreams = globalForStreams.activeStreams ?? new Map<string, {
  monitorId: string;
  userId: string;
  controller: ReadableStreamDefaultController;
}>();

// Store in global for development hot reload persistence
globalForStreams.activeStreams = activeStreams;

// Global flag to ensure notification handler is only set up once

// Initialize notification handling (called lazily when first stream is registered)
export const initializeNotificationHandler = () => {
  if (!pgClient) {
    return;
  }

  // Set up global notification handler
  pgClient.on('notification', async (msg) => {
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
          const incidentTime = new Date(payload.checkedAt);
          
          // Check if there's already an ongoing incident for this monitor
          const existingIncident = await prisma.incident.findFirst({
            where: {
              monitorId: payload.monitorId,
              status: { in: ['ONGOING', 'ACKNOWLEDGED'] }
            }
          });
          
          // Only create incident and start escalation if no ongoing incident exists
          if (!existingIncident) {
            createIncident(payload.monitorId, 'Monitor is down', incidentTime);
            
            // Start escalation process only for new incidents
            escalationService.startEscalation({
              monitorId: payload.monitorId,
              incidentTitle: 'Monitor is down',
              timestamp: incidentTime
            });
          }
        }
        else if(payload.status === 'GOOD') {
          resolveIncident(payload.monitorId, new Date(payload.checkedAt));
          
          // Stop both escalation processes but only send recovery notifications once via BullMQ service
          await escalationService.stopEscalation(payload.monitorId);
          await bullMQEscalationService.stopEscalation(payload.monitorId);
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