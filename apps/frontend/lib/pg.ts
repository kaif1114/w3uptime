import { Client } from "pg";

// Connection state management
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000; // 1 second
const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds

// Global singleton for PostgreSQL notification client
const globalForPg = globalThis as unknown as {
  pgNotificationClient: Client | undefined;
  isConnected: boolean | undefined;
  reconnectAttempts: number | undefined;
  heartbeatInterval: NodeJS.Timeout | undefined;
};

let pgClient = globalForPg.pgNotificationClient;
let isConnected = globalForPg.isConnected ?? false;
let reconnectAttempts = globalForPg.reconnectAttempts ?? 0;

// Create a new PostgreSQL client for listening to notifications
const createPgClient = () => {
  if (pgClient) {
    pgClient.removeAllListeners();
  }
  
  pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  // Store in global for development hot reload persistence
  globalForPg.pgNotificationClient = pgClient;
  
  return pgClient;
};

// Heartbeat mechanism to keep connection alive
const startHeartbeat = () => {
  // Clear existing heartbeat if any
  if (globalForPg.heartbeatInterval) {
    clearInterval(globalForPg.heartbeatInterval);
  }
  
  globalForPg.heartbeatInterval = setInterval(async () => {
    if (isConnected && pgClient) {
      try {
        await pgClient.query('SELECT 1');
      } catch (error) {
        console.error('Heartbeat failed:', error);
        isConnected = false;
        globalForPg.isConnected = false;
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
      reconnectAttempts = 0;
      globalForPg.reconnectAttempts = 0;
    } catch (error) {
      reconnectAttempts++;
      globalForPg.reconnectAttempts = reconnectAttempts;
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
    const pgClient = createPgClient();
    await pgClient.connect();
    await pgClient.query('LISTEN monitor_update');
    
    isConnected = true;
    globalForPg.isConnected = true;
    console.log('PostgreSQL notification client connected successfully');
    
    // Handle connection errors with improved error isolation
    pgClient.on('error', (error) => {
      console.error('PostgreSQL client error:', error);
      isConnected = false;
      globalForPg.isConnected = false;
      
      // Don't immediately close all streams - let them stay open
      // and attempt to reconnect first
      reconnectWithBackoff();
    });

    pgClient.on('end', () => {
      console.log('PostgreSQL connection ended');
      isConnected = false;
      globalForPg.isConnected = false;
      
      // Only close streams if we're not attempting to reconnect
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        // Import here to avoid circular dependency
        import('./notifications').then(({ cleanupAllStreams }) => {
          cleanupAllStreams();
        });
      } else {
        reconnectWithBackoff();
      }
    });

  } catch (error) {
    console.error('Failed to initialize PostgreSQL client:', error);
    isConnected = false;
    globalForPg.isConnected = false;
    throw error;
  }
};

// Get connection status (for health checks)
export const getConnectionStatus = () => ({
  isConnected,
  reconnectAttempts,
  clientExists: !!pgClient
});

// Force reconnection (for manual intervention)
export const forceReconnect = async () => {
  reconnectAttempts = 0;
  globalForPg.reconnectAttempts = 0;
  isConnected = false;
  globalForPg.isConnected = false;
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
  // If already connected via global singleton, don't reinitialize
  if (pgClient && isConnected) {
    console.log('Using existing PostgreSQL notification connection');
    return;
  }
  
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

// Initialize only when explicitly called (not on module load)
export const initializeConnection = () => {
  if (!pgClient || !isConnected) {
    initialize().catch((error) => {
      console.error('PostgreSQL connection failed:', error);
    });
  }
};

// Clean up on process termination
const cleanup = async () => {
  console.log('Cleaning up PostgreSQL notification system...');
  
  // Clear heartbeat
  if (globalForPg.heartbeatInterval) {
    clearInterval(globalForPg.heartbeatInterval);
  }
  
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

export { pgClient as default };