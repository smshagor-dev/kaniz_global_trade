import { Redis } from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: false,
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

let hasLoggedRedisError = false
redis.on('error', (error) => {
  if (!hasLoggedRedisError) {
    hasLoggedRedisError = true
    console.warn('Redis unavailable, falling back to degraded local mode:', error.message)
  }
})

export default redis

// Cache helpers
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key)
    if (!data) return null
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds = 300
): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  } catch {
    // Redis is optional in local development.
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch {
    // Redis is optional in local development.
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) await redis.del(...keys)
  } catch {
    // Redis is optional in local development.
  }
}

// Rate limiting
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000
  const redisKey = `ratelimit:${key}`

  try {
    const pipe = redis.pipeline()
    pipe.zremrangebyscore(redisKey, '-inf', windowStart)
    pipe.zadd(redisKey, now, `${now}`)
    pipe.zcard(redisKey)
    pipe.expire(redisKey, windowSeconds)

    const results = await pipe.exec()
    const count = results?.[2]?.[1] as number

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetAt: now + windowSeconds * 1000,
    }
  } catch {
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: now + windowSeconds * 1000,
    }
  }
}

// Session management
export async function setUserOnline(userId: string): Promise<void> {
  try {
    await redis.setex(`online:${userId}`, 300, '1')
  } catch {
    // Redis is optional in local development.
  }
}

export async function setUserOffline(userId: string): Promise<void> {
  try {
    await redis.del(`online:${userId}`)
  } catch {
    // Redis is optional in local development.
  }
}

export async function isUserOnline(userId: string): Promise<boolean> {
  try {
    const result = await redis.get(`online:${userId}`)
    return result === '1'
  } catch {
    return false
  }
}
