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

  
  async initializeWorkers(): Promise<void> {
    try {
      console.log('Initializing workers...');
      
      
      await this.initializeEscalationWorker();
      
      console.log('All workers initialized successfully');
    } catch (error) {
      console.error('Failed to initialize workers:', error);
      throw error;
    }
  }

  
  private async initializeEscalationWorker(): Promise<void> {
    if (this.escalationWorkerStarted) {
      console.log('ℹEscalation worker already started');
      return;
    }

    try {
      const worker = getEscalationWorker();
      await worker.start();
      this.escalationWorkerStarted = true;
      console.log('Escalation worker started successfully');
    } catch (error) {
      console.error('Failed to start escalation worker:', error);
      throw error;
    }
  }

  
  async stopWorkers(): Promise<void> {
    try {
      console.log('Stopping workers...');
      
      if (this.escalationWorkerStarted) {
        const worker = getEscalationWorker();
        await worker.stop();
        this.escalationWorkerStarted = false;
        console.log('Escalation worker stopped');
      }

      console.log('All workers stopped successfully');
    } catch (error) {
      console.error('Error stopping workers:', error);
    }
  }

  
  getStatus(): { escalationWorker: { isRunning: boolean } } {
    const escalationWorker = getEscalationWorker();
    return {
      escalationWorker: {
        isRunning: escalationWorker.getStatus().isRunning,
      },
    };
  }

  
  async restartWorkers(): Promise<void> {
    console.log('Restarting workers...');
    await this.stopWorkers();
    await this.initializeWorkers();
    console.log('Workers restarted successfully');
  }
}




export default WorkerManager;