import { getEscalationWorker } from '../workers/escalationWorker';

export class WorkerManager {
  private static instance: WorkerManager;
  private escalationWorkerStarted = false;
  
  private constructor() {}

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  /**
   * Initialize all workers for the application
   */
  async initializeWorkers(): Promise<void> {
    try {
      console.log('🚀 Initializing workers...');
      
      // Initialize escalation worker
      await this.initializeEscalationWorker();
      
      // Set up shutdown handlers
      setupShutdownHandlers();
      
      console.log('✅ All workers initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize workers:', error);
      throw error;
    }
  }

  /**
   * Initialize the escalation worker
   */
  private async initializeEscalationWorker(): Promise<void> {
    if (this.escalationWorkerStarted) {
      console.log('ℹ️ Escalation worker already started');
      return;
    }

    try {
      const worker = getEscalationWorker();
      await worker.start();
      this.escalationWorkerStarted = true;
      console.log('✅ Escalation worker started successfully');
    } catch (error) {
      console.error('❌ Failed to start escalation worker:', error);
      throw error;
    }
  }

  /**
   * Stop all workers gracefully
   */
  async stopWorkers(): Promise<void> {
    try {
      console.log('🛑 Stopping workers...');
      
      if (this.escalationWorkerStarted) {
        const worker = getEscalationWorker();
        await worker.stop();
        this.escalationWorkerStarted = false;
        console.log('✅ Escalation worker stopped');
      }

      console.log('✅ All workers stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping workers:', error);
    }
  }

  /**
   * Get worker status information
   */
  getStatus(): { escalationWorker: { isRunning: boolean } } {
    const escalationWorker = getEscalationWorker();
    return {
      escalationWorker: {
        isRunning: escalationWorker.getStatus().isRunning,
      },
    };
  }

  /**
   * Restart workers (useful for development)
   */
  async restartWorkers(): Promise<void> {
    console.log('🔄 Restarting workers...');
    await this.stopWorkers();
    await this.initializeWorkers();
    console.log('✅ Workers restarted successfully');
  }
}

// Graceful shutdown handlers - only set up when workers are initialized
let shutdownHandlersSet = false;

function setupShutdownHandlers() {
  if (shutdownHandlersSet) return;
  
  const handleShutdown = async () => {
    console.log('📴 Shutting down worker manager...');
    const workerManager = WorkerManager.getInstance();
    await workerManager.stopWorkers();
    process.exit(0);
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
  shutdownHandlersSet = true;
}

export default WorkerManager;