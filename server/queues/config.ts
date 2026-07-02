import type { ConnectionOptions, JobsOptions } from 'bullmq'

export type SearchEntityType = 'product' | 'company' | 'rfq'
export type SearchSyncAction = 'upsert' | 'remove'

export interface SearchSyncJobData {
  entityType: SearchEntityType
  entityId: string
  action: SearchSyncAction
}

export function createBullMqConnection(): ConnectionOptions {
  const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379')

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: redisUrl.pathname ? Number(redisUrl.pathname.slice(1) || 0) : 0,
    maxRetriesPerRequest: null,
  }
}

export const connection = createBullMqConnection()

export const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: 100,
  removeOnFail: 500,
}

export function buildSearchSyncJobId(data: SearchSyncJobData) {
  return `search:${data.entityType}:${data.entityId}:${data.action}`
}
