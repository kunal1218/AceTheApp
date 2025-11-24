import Redis from 'ioredis';
import type { User } from '@prisma/client';
import { env } from '../config/env';

const USER_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

export const redis = new Redis(env.REDIS_URL);

redis.on('error', (err) => {
  console.error('Redis connection error', err);
});

export const cacheUser = async (user: User): Promise<void> => {
  try {
    await redis.set(`user:${user.id}`, JSON.stringify(user), 'EX', USER_CACHE_TTL_SECONDS);
  } catch (err) {
    console.error('Failed to cache user', err);
  }
};

export const getCachedUser = async (userId: string): Promise<User | null> => {
  try {
    const cached = await redis.get(`user:${userId}`);
    return cached ? (JSON.parse(cached) as User) : null;
  } catch (err) {
    console.error('Failed to read user from cache', err);
    return null;
  }
};

export const invalidateUserCache = async (userId: string): Promise<void> => {
  try {
    await redis.del(`user:${userId}`);
  } catch (err) {
    console.error('Failed to delete user cache', err);
  }
};
