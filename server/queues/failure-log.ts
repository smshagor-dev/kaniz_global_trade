import redis from '@/lib/db/redis'
import { recordSystemEvent } from '@/lib/monitoring/system-events'

const FAILURE_LOG_KEY = 'queues:failures'
const MAX_FAILURE_LOGS = 200

export interface QueueFailureEntry {
  queue: string
  jobId: string
  jobName: string
  attemptsMade: number
  failedReason: string
  payload: unknown
  failedAt: string
}

export async function recordQueueFailure(entry: QueueFailureEntry): Promise<void> {
  try {
    await redis.lpush(FAILURE_LOG_KEY, JSON.stringify(entry))
    await redis.ltrim(FAILURE_LOG_KEY, 0, MAX_FAILURE_LOGS - 1)
    await recordSystemEvent({
      severity: 'ERROR',
      category: 'QUEUE',
      service: entry.queue,
      eventType: 'queue_job_failed',
      message: `Queue job ${entry.jobId} failed in ${entry.queue}.`,
      source: 'queue-worker',
      details: entry,
    })
  } catch {
    // Best-effort failure visibility only.
  }
}

export async function getRecentQueueFailures(limit = 20): Promise<QueueFailureEntry[]> {
  try {
    const rows = await redis.lrange(FAILURE_LOG_KEY, 0, Math.max(0, limit - 1))
    return rows
      .map((row) => {
        try {
          return JSON.parse(row) as QueueFailureEntry
        } catch {
          return null
        }
      })
      .filter((row): row is QueueFailureEntry => !!row)
  } catch {
    return []
  }
}
