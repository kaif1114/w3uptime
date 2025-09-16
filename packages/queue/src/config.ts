import { RedisConfig, QueueConfig, EmailConfig, SlackConfig } from './types';

export const getRedisConfig = (): RedisConfig => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
});

export const getEmailConfig = (): EmailConfig => ({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  from: process.env.EMAIL_FROM,
});

export const getSlackConfig = (): SlackConfig => ({
  token: process.env.SLACK_BOT_TOKEN || '',
  defaultChannel: process.env.SLACK_CHANNEL || 'W3UPTIME',
});

export const queueConfig: QueueConfig = {
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

// Validate required environment variables
export const validateConfig = (): void => {
  const requiredVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
    console.warn('Some notification features may not work properly.');
  }
};
