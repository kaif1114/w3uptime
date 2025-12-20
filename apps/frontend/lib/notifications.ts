import pgClient from "./pg";
import { createIncident, resolveIncident } from "./incident";


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


globalForStreams.activeStreams = activeStreams;




export const initializeNotificationHandler = () => {
  if (!pgClient) {
    return;
  }

  
  pgClient.on('notification', (msg) => {
    try {
      if (msg.channel === 'monitor_update') {
        const payload = JSON.parse(msg.payload || '{}');
        
        
        const stream = activeStreams.get(payload.monitorId);
        if (stream) {
          
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
          createIncident(payload.monitorId, 'Monitor is down', incidentTime);
      
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


export const registerStream = (monitorId: string, userId: string, controller: ReadableStreamDefaultController) => {
  
  activeStreams.set(monitorId, { 
    monitorId, 
    userId,
    controller
  });
  console.log(`Stream registered for monitor ${monitorId}, user ${userId}. Active streams: ${activeStreams.size}`);
};


export const unregisterStream = (monitorId: string) => {
  const existed = activeStreams.delete(monitorId);
  if (existed) {
    console.log(`Stream unregistered for monitor ${monitorId}. Active streams: ${activeStreams.size}`);
  }
};


export const getActiveStreamCount = () => activeStreams.size;


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

