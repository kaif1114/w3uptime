import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
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
  monitor: {
    id: string;
    name: string;
    url: string;
    status: string;
  };
  incident: {
    id: string;
    title: string;
  };
  escalationLevelId: string;
  levelOrder: number;
  method: 'EMAIL' | 'SLACK' | 'WEBHOOK';
  contacts: string[];
}

// Job naming patterns
export const getJobName = (incidentId: string, levelOrder: number) => 
  `escalation-${incidentId}-${levelOrder}`;

export const getJobPattern = (incidentId: string) => 
  `escalation-${incidentId}-*`;


