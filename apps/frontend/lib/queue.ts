import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
};

// Create Redis connection instance
export const redis = new Redis(redisConfig);

// Queue configuration
const queueOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

// Create escalation queue
export const escalationQueue = new Queue('escalation', queueOptions);

// Job data interfaces
export interface EscalationJobData {
  monitorId: string;
  incidentId: string;
  escalationLevelId: string;
  levelOrder: number;
  method: 'EMAIL' | 'SLACK' | 'WEBHOOK';
  contacts: string[];
  message?: string;
  title: string;
}

// Job naming patterns
export const getJobName = (monitorId: string, incidentId: string, levelOrder: number) => 
  `escalation-${monitorId}-${incidentId}-level-${levelOrder}`;

export const getJobPattern = (monitorId: string, incidentId: string) => 
  `escalation-${monitorId}-${incidentId}-level-*`;

// Queue event handlers for debugging
if (process.env.NODE_ENV === 'development') {
  escalationQueue.on('waiting', (job) => {
    console.log(`🕐 Escalation job ${job.name} is waiting`);
  });

  escalationQueue.on('active', (job) => {
    console.log(`🚀 Escalation job ${job.name} started processing`);
  });

  escalationQueue.on('completed', (job) => {
    console.log(`✅ Escalation job ${job.name} completed`);
  });

  escalationQueue.on('failed', (job, err) => {
    console.log(`❌ Escalation job ${job?.name} failed:`, err);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing escalation queue...');
  await escalationQueue.close();
  await redis.quit();
});

process.on('SIGINT', async () => {
  console.log('Closing escalation queue...');
  await escalationQueue.close();
  await redis.quit();
});