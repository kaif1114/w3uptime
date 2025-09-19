import { Queue } from 'bullmq';
import { getRedisConnection } from './connection';
import { queueConfig } from './config';
import { QueueName, AlertJobData, EscalationJobData, RecoveryJobData } from './types';

// Queue instances
export const alertImmediateQueue = new Queue<AlertJobData>('alert-immediate', {
  connection: getRedisConnection(),
  defaultJobOptions: queueConfig.defaultJobOptions,
});

export const alertDelayedQueue = new Queue<EscalationJobData>('alert-delayed', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    ...queueConfig.defaultJobOptions,
    delay: 0, // Will be set per job
  },
});

export const emailNotificationQueue = new Queue<AlertJobData>('email-notifications', {
  connection: getRedisConnection(),
  defaultJobOptions: queueConfig.defaultJobOptions,
});

export const slackNotificationQueue = new Queue<AlertJobData>('slack-notifications', {
  connection: getRedisConnection(),
  defaultJobOptions: queueConfig.defaultJobOptions,
});

export const webhookNotificationQueue = new Queue<AlertJobData>('webhook-notifications', {
  connection: getRedisConnection(),
  defaultJobOptions: queueConfig.defaultJobOptions,
});

export const recoveryNotificationQueue = new Queue<RecoveryJobData>('recovery-notifications', {
  connection: getRedisConnection(),
  defaultJobOptions: queueConfig.defaultJobOptions,
});

// Queue management utilities
export class QueueManager {
  private queues: Map<QueueName, Queue> = new Map();

  constructor() {
    this.queues.set('alert-immediate', alertImmediateQueue);
    this.queues.set('alert-delayed', alertDelayedQueue);
    this.queues.set('email-notifications', emailNotificationQueue);
    this.queues.set('slack-notifications', slackNotificationQueue);
    this.queues.set('webhook-notifications', webhookNotificationQueue);
    this.queues.set('recovery-notifications', recoveryNotificationQueue);
  }

  getQueue(name: QueueName): Queue | undefined {
    return this.queues.get(name);
  }

  async addImmediateAlert(data: AlertJobData): Promise<void> {
    await alertImmediateQueue.add('immediate-alert', data, {
      priority: this.getSeverityPriority(data.severity),
    });
  }

  async addDelayedEscalation(data: EscalationJobData): Promise<void> {
    const delay = data.waitMinutes * 60 * 1000; // Convert minutes to milliseconds
    
    await alertDelayedQueue.add('delayed-escalation', data, {
      delay,
      priority: this.getSeverityPriority(data.severity),
      jobId: `escalation-${data.monitorId}-${data.levelOrder}`, // Unique ID for deduplication
    });
  }

  async cancelDelayedEscalations(monitorId: string): Promise<void> {
    // Find and remove all delayed escalation jobs for this monitor
    const jobs = await alertDelayedQueue.getJobs(['delayed', 'waiting']);
    
    for (const job of jobs) {
      if (job.data.monitorId === monitorId) {
        await job.remove();
        console.log(`🗑️ Cancelled delayed escalation job for monitor ${monitorId}, level ${job.data.levelOrder}`);
      }
    }
  }

  async addRecoveryNotification(data: RecoveryJobData): Promise<void> {
    await recoveryNotificationQueue.add('recovery-notification', data);
  }

  private getSeverityPriority(severity: string): number {
    const priorities = {
      'CRITICAL': 1,
      'HIGH': 2,
      'MEDIUM': 3,
      'LOW': 4,
    };
    return priorities[severity as keyof typeof priorities] || 3;
  }

  async getQueueStats(): Promise<Record<QueueName, any>> {
    const stats: Record<string, any> = {};
    
    for (const [name, queue] of this.queues) {
      try {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        
        stats[name] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        };
      } catch (error) {
        console.error(`Error getting stats for queue ${name}:`, error);
        stats[name] = { error: 'Failed to get stats' };
      }
    }
    
    return stats as Record<QueueName, any>;
  }

  async cleanupQueues(): Promise<void> {
    console.log('🧹 Cleaning up queues...');
    
    for (const [name, queue] of this.queues) {
      try {
        // Clean completed jobs older than 1 hour
        await queue.clean(60 * 60 * 1000, 100, 'completed');
        // Clean failed jobs older than 24 hours
        await queue.clean(24 * 60 * 60 * 1000, 50, 'failed');
        
        console.log(`✅ Cleaned queue: ${name}`);
      } catch (error) {
        console.error(`❌ Error cleaning queue ${name}:`, error);
      }
    }
  }

  async closeAll(): Promise<void> {
    console.log('🔒 Closing all queues...');
    
    for (const [name, queue] of this.queues) {
      try {
        await queue.close();
        console.log(`✅ Closed queue: ${name}`);
      } catch (error) {
        console.error(`❌ Error closing queue ${name}:`, error);
      }
    }
  }
}

export const queueManager = new QueueManager();



