import redisConfig from '../config/redis';
import logger from './logger';

export interface RateLimitCounter {
  totalHits: number;
  resetTime: Date;
}

/**
 * Initialize Redis connection via the central manager
 */
export const connectRedis = async (): Promise<void> => {
  try {
    await redisConfig.initialize();
  } catch (err) {
    logger.error(`Failed to connect to Redis, permissions will not be cached: ${err}`);
  }
};

/**
 * Atomically increments a fixed-window counter. The expiry is only assigned
 * when the key is created, so sustained traffic cannot extend the window.
 */
export const incrementRateLimitCounter = async (
  key: string,
  windowMs: number
): Promise<RateLimitCounter | null> => {
  const client = redisConfig.getRawClient();
  if (!client) return null;

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const script = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('TTL', KEYS[1])
    return { current, ttl }
  `;

  try {
    const result = await client.eval(script, 1, key, windowSeconds) as [number, number];
    const totalHits = Number(result[0]);
    const ttlSeconds = Number(result[1]) > 0 ? Number(result[1]) : windowSeconds;

    return {
      totalHits,
      resetTime: new Date(Date.now() + ttlSeconds * 1000),
    };
  } catch (err) {
    logger.error(`Error incrementing rate limit counter ${key}: ${err}`);
    return null;
  }
};

export const decrementRateLimitCounter = async (key: string): Promise<void> => {
  const client = redisConfig.getRawClient();
  if (!client) return;

  try {
    await client.decr(key);
  } catch (err) {
    logger.error(`Error decrementing rate limit counter ${key}: ${err}`);
  }
};

export const resetRateLimitCounter = async (key: string): Promise<void> => {
  const client = redisConfig.getRawClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch (err) {
    logger.error(`Error resetting rate limit counter ${key}: ${err}`);
  }
};

/**
 * Cache user permissions in Redis with 1-hour expiry
 */
export const cachePermissions = async (userId: string, permissions: string[]): Promise<void> => {
  try {
    const client = redisConfig.getRawClient();
    if (!client) {
      logger.warn(`Skipping permission caching for user ${userId}: Redis not available`);
      return;
    }
    
    await client.set(`user_perms:${userId}`, JSON.stringify(permissions), 'EX', 3600);
  } catch (err) {
    logger.error(`Error caching permissions for user ${userId}: ${err}`);
  }
};

/**
 * Retrieve cached user permissions from Redis
 */
export const getCachedPermissions = async (userId: string): Promise<string[] | null> => {
  try {
    const client = redisConfig.getRawClient();
    if (!client) return null;

    const data = await client.get(`user_perms:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error(`Error retrieving cached permissions for user ${userId}: ${err}`);
    return null;
  }
};

/**
 * Clear cached user permissions
 */
export const clearCachedPermissions = async (userId: string): Promise<void> => {
  try {
    const client = redisConfig.getRawClient();
    if (!client) return;

    await client.del(`user_perms:${userId}`);
  } catch (err) {
    logger.error(`Error clearing cached permissions for user ${userId}: ${err}`);
  }
};
