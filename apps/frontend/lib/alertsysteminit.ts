import { alertSystem } from "../../../packages/queue/src";
import { prisma } from "db/client";

let isInitialized = false;

/**
 * Initialize the BullMQ Alert System
 * This should be called once when the application starts
 */
export async function initializeAlertSystem(): Promise<void> {
  if (isInitialized) {
    console.log('⚠️ Alert System already initialized');
    return;
  }

  try {
    await alertSystem.initialize(prisma);
    isInitialized = true;
    
    // Set up graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.log(`🛑 Received ${signal}, shutting down Alert System...`);
      await alertSystem.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Set up periodic cleanup (every 6 hours)
    setInterval(async () => {
      try {
        await alertSystem.cleanupSystem();
      } catch (error) {
        console.error('Error during periodic cleanup:', error);
      }
    }, 6 * 60 * 60 * 1000);

  } catch (error) {
    console.error('❌ Failed to initialize Alert System:', error);
    throw error;
  }
}

/**
 * Check if the Alert System is initialized
 */
export function isAlertSystemInitialized(): boolean {
  return isInitialized;
}

/**
 * Get Alert System statistics
 */
export async function getAlertSystemStats(): Promise<Record<string, unknown>> {
  if (!isInitialized) {
    throw new Error('Alert System not initialized');
  }
  
  return await alertSystem.getSystemStats();
}
