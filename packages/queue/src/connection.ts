import { Redis } from 'ioredis';
import { getRedisConfig } from './config';

let redisConnection: Redis | null = null;

export const getRedisConnection = (): Redis => {
  if (!redisConnection) {
    const config = getRedisConfig();
    
    redisConnection = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });

    redisConnection.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redisConnection.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
    });

    redisConnection.on('close', () => {
      console.log('⚠️ Redis connection closed');
    });
  }

  return redisConnection;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    console.log('🔌 Redis connection closed');
  }
};

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, closing Redis connection...');
  await closeRedisConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, closing Redis connection...');
  await closeRedisConnection();
  process.exit(0);
});
