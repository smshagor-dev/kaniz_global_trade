import 'server-only'
import { Redis } from 'ioredis'

type PipelineResult = Array<[Error | null, unknown]> | null

interface RedisLike {
  get(key: string): Promise<string | null>
  setex(key: string, ttlSeconds: number, value: string): Promise<unknown>
  del(...keys: string[]): Promise<unknown>
  ping(): Promise<string>
  scan(cursor: string, ...args: Array<string | number>): Promise<[string, string[]]>
  lpush(key: string, value: string): Promise<unknown>
  ltrim(key: string, start: number, end: number): Promise<unknown>
  lrange(key: string, start: number, end: number): Promise<string[]>
  pipeline(): {
    zremrangebyscore(key: string, min: string | number, max: string | number): unknown
    zadd(key: string, score: number, member: string): unknown
    zcard(key: string): unknown
    expire(key: string, seconds: number): unknown
    exec(): Promise<PipelineResult>
  }
  on(event: string, listener: (error: Error) => void): unknown
}

class NoopRedis implements RedisLike {
  async get() { return null }
  async setex() { return null }
  async del() { return 0 }
  async ping() { return 'PONG' }
  async scan(cursor: string, ..._args: Array<string | number>): Promise<[string, string[]]> {
    return [cursor === '0' ? '0' : '0', []]
  }
  async lpush() { return 0 }
  async ltrim() { return 0 }
  async lrange() { return [] }
  pipeline() {
    return {
      zremrangebyscore(_key: string, _min: string | number, _max: string | number) { return null },
      zadd(_key: string, _score: number, _member: string) { return null },
      zcard(_key: string) { return null },
      expire(_key: string, _seconds: number) { return null },
      async exec(): Promise<PipelineResult> { return [[null, 0], [null, 0], [null, 0], [null, 0]] },
    }
  }
  on() { return null }
}

const globalForRedis = globalThis as unknown as { redis: RedisLike | undefined }

export const redis =
  globalForRedis.redis ??
  (process.env.NODE_ENV === 'test'
    ? new NoopRedis()
    : (new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: false,
      }) as unknown as RedisLike))

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
    const keys: string[] = []
    let cursor = '0'

    do {
      const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = nextCursor
      keys.push(...batch)
    } while (cursor !== '0')

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
    if (!results || results.some(([error]) => error)) {
      throw new Error('Redis rate limit pipeline failed')
    }

    const count = results[2]?.[1]
    if (typeof count !== 'number') {
      throw new Error('Redis rate limit count was not numeric')
    }

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

export async function resetRateLimit(key: string): Promise<void> {
  try {
    await redis.del(`ratelimit:${key}`)
  } catch {
    // Redis is optional in local development.
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
