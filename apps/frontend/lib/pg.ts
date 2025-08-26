import { Client } from "pg";
import { prisma } from "db/client";

// Global registry for active SSE streams with user authorization
const activeStreams = new Map<string, {
  monitorId: string;
  userId: string;
  controller: ReadableStreamDefaultController;
}>();

// Connection state management
let pgClient: Client;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000; // 1 second
const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds

// Create a new PostgreSQL client for listening to notifications
const createPgClient = () => {
  if (pgClient) {
    pgClient.removeAllListeners();
  }
  
  pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  return pgClient;
};


// Heartbeat mechanism to keep connection alive
const startHeartbeat = () => {
  setInterval(async () => {
    if (isConnected && pgClient) {
      try {
        await pgClient.query('SELECT 1');
      } catch (error) {
        console.error('Heartbeat failed:', error);
        isConnected = false;
        reconnectWithBackoff();
      }
    }
  }, HEARTBEAT_INTERVAL);
};

// Exponential backoff reconnection
const reconnectWithBackoff = async () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Max reconnection attempts reached. Manual intervention required.');
    return;
  }
  
  const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts);
  console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
  
  setTimeout(async () => {
    try {
      await initializePgClient();
      reconnectAttempts = 0; // Reset on successful connection
    } catch (error) {
      reconnectAttempts++;
      console.error(`Reconnection attempt ${reconnectAttempts} failed:`, error);
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectWithBackoff();
      }
    }
  }, delay);
};

// Initialize connection and set up notification handling
const initializePgClient = async () => {
  try {
    createPgClient();
    await pgClient.connect();
    await pgClient.query('LISTEN monitor_update');
    
    isConnected = true;
    console.log('PostgreSQL notification client connected successfully');
    
    // Set up global notification handler
    pgClient.on('notification', (msg) => {
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
              status: payload.status,
              latency: payload.latency,
              checkedAt: payload.checkedAt,
              location: payload.location
            })}\n\n`;
            
            stream.controller.enqueue(new TextEncoder().encode(sseData));
          }
        }
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    });

    // Handle connection errors with improved error isolation
    pgClient.on('error', (error) => {
      console.error('PostgreSQL client error:', error);
      isConnected = false;
      
      // Don't immediately close all streams - let them stay open
      // and attempt to reconnect first
      reconnectWithBackoff();
    });

    pgClient.on('end', () => {
      console.log('PostgreSQL connection ended');
      isConnected = false;
      
      // Only close streams if we're not attempting to reconnect
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        activeStreams.forEach((stream) => {
          try {
            stream.controller.close();
          } catch (error) {
            console.error('Error closing stream on connection end:', error);
          }
        });
        activeStreams.clear();
      } else {
        reconnectWithBackoff();
      }
    });

  } catch (error) {
    console.error('Failed to initialize PostgreSQL client:', error);
    isConnected = false;
    throw error;
  }
};

// Register a new SSE stream for a monitor with user authorization
export const registerStream = (monitorId: string, userId: string, controller: ReadableStreamDefaultController) => {
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

// Get connection status (for health checks)
export const getConnectionStatus = () => ({
  isConnected,
  reconnectAttempts,
  activeStreamCount: activeStreams.size,
  clientExists: !!pgClient
});

// Force reconnection (for manual intervention)
export const forceReconnect = async () => {
  reconnectAttempts = 0;
  isConnected = false;
  if (pgClient) {
    try {
      await pgClient.end();
    } catch (error) {
      console.error('Error ending existing connection:', error);
    }
  }
  await initializePgClient();
};

// Initialize the client when the module loads
let initializationPromise: Promise<void> | null = null;

const initialize = async () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        await initializePgClient();
        startHeartbeat();
      } catch (error) {
        console.error('Failed to initialize PostgreSQL notification system:', error);
        // Reset promise so initialization can be retried
        initializationPromise = null;
        throw error;
      }
    })();
  }
  return initializationPromise;
};

// Start initialization
initialize().catch((error) => {
  console.error('Initial PostgreSQL connection failed:', error);
});

// Clean up on process termination
const cleanup = async () => {
  console.log('Cleaning up PostgreSQL notification system...');
  
  // Close all active streams gracefully
  activeStreams.forEach((stream, monitorId) => {
    try {
      stream.controller.close();
    } catch (error) {
      console.error(`Error closing stream ${monitorId} during cleanup:`, error);
    }
  });
  activeStreams.clear();
  
  // Close PostgreSQL connection
  if (pgClient && isConnected) {
    try {
      await pgClient.end();
    } catch (error) {
      console.error('Error closing PostgreSQL connection during cleanup:', error);
    }
  }
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

// Graceful shutdown for Next.js hot reload
if (process.env.NODE_ENV === 'development') {
  process.on('SIGUSR2', cleanup);
}

export { pgClient as default, initialize };