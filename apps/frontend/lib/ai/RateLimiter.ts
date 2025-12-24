import { redis } from '@/lib/queue';

export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  resetIn?: number;
}> {
  const key = `ratelimit:chat:${userId}`;
  const limit = parseInt(process.env.CHAT_RATE_LIMIT_PER_MINUTE || '20');

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, 60); // 60 second window
    }

    if (count > limit) {
      const ttl = await redis.ttl(key);
      return { allowed: false, resetIn: ttl };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true }; // Fail open on Redis error
  }
}
