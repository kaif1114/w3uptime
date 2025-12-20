import { Queue, QueueOptions } from 'bullmq';
import Redis from 'ioredis';


const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  lazyConnect: true,
};


export const redis = new Redis(redisConfig);


const queueOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100, 
    removeOnFail: 50, 
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};


export const escalationQueue = new Queue('escalation', queueOptions);


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


export const getJobName = (incidentId: string, levelOrder: number) => 
  `escalation-${incidentId}-${levelOrder}`;

export const getJobPattern = (incidentId: string) => 
  `escalation-${incidentId}-*`;


