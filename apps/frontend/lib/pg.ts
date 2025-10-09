import "server-only";
import { Client } from "pg";


const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000; 
const HEARTBEAT_INTERVAL = 30 * 1000; 


const globalForPg = globalThis as unknown as {
  pgNotificationClient: Client | undefined;
  isConnected: boolean | undefined;
  reconnectAttempts: number | undefined;
  heartbeatInterval: NodeJS.Timeout | undefined;
  notificationHandlerInitialized: boolean | undefined;
};

let pgClient = globalForPg.pgNotificationClient;
let isConnected = globalForPg.isConnected ?? false;
let reconnectAttempts = globalForPg.reconnectAttempts ?? 0;
let notificationHandlerInitialized = globalForPg.notificationHandlerInitialized ?? false;


const createPgClient = () => {
  if (pgClient) {
    pgClient.removeAllListeners();
  }
  
  pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  
  globalForPg.pgNotificationClient = pgClient;
  
  return pgClient;
};


const startHeartbeat = () => {
  
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


const initializePgClient = async () => {
  try {
    const pgClient = createPgClient();
    await pgClient.connect();
    await pgClient.query('LISTEN monitor_update');
    
    isConnected = true;
    globalForPg.isConnected = true;
    console.log('PostgreSQL notification client connected successfully');
    
    
    if (!notificationHandlerInitialized && isConnected) {
      const { initializeNotificationHandler } = await import('./notifications');
      initializeNotificationHandler();
      globalForPg.notificationHandlerInitialized = true;
      notificationHandlerInitialized = true;
    }
    
    
    pgClient.on('error', (error) => {
      console.error('PostgreSQL client error:', error);
      isConnected = false;
      globalForPg.isConnected = false;
      
      
      
      reconnectWithBackoff();
    });

    pgClient.on('end', () => {
      console.log('PostgreSQL connection ended');
      isConnected = false;
      globalForPg.isConnected = false;
      
      
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        
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


export const getConnectionStatus = () => ({
  isConnected,
  reconnectAttempts,
  clientExists: !!pgClient,
  notificationHandlerInitialized
});


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



let initializationPromise: Promise<void> | null = null;

const initialize = async () => {
  
  if (pgClient && isConnected) {
    console.log('Using existing PostgreSQL connection');
    return;
  }
  
  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        await initializePgClient();
        startHeartbeat();
      } catch (error) {
        console.error('Failed to initialize PostgreSQL notification system:', error);
        
        initializationPromise = null;
        throw error;
      }
    })();
  }
  return initializationPromise;
};


export const initializeConnection = () => {
  if (!pgClient || !isConnected) {
    initialize().catch((error) => {
      console.error('PostgreSQL connection failed:', error);
    });
  }
};


const cleanup = async () => {
  console.log('Cleaning up PostgreSQL notification system...');
  
  
  if (globalForPg.heartbeatInterval) {
    clearInterval(globalForPg.heartbeatInterval);
  }
  
  
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


if (process.env.NODE_ENV === 'development') {
  process.on('SIGUSR2', cleanup);
}

export { pgClient as default };