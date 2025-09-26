// Application initialization - ensures workers and services start properly
import WorkerManager from './workerManager';

let initialized = false;

export async function initializeApp(): Promise<void> {
  if (initialized) {
    return;
  }

  try {
    console.log('🚀 Initializing W3Uptime application...');
    
    // Initialize worker manager only in development mode
    // In production, workers should be run as separate processes
    if (process.env.NODE_ENV === 'development') {
      const workerManager = WorkerManager.getInstance();
      await workerManager.initializeWorkers();
    }
    
    initialized = true;
    console.log('✅ W3Uptime application initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize W3Uptime application:', error);
    throw error;
  }
}

// Auto-initialize when this module is imported (only in development)
if (process.env.NODE_ENV === 'development') {
  initializeApp().catch(console.error);
}

export { WorkerManager };