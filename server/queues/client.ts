import { Queue } from 'bullmq'
import { buildSearchSyncJobId, connection, defaultJobOptions, type SearchSyncJobData } from '@/server/queues/config'

type QueueLike = Pick<Queue, 'add' | 'getJobCounts'>

class NoopQueue implements QueueLike {
  async add(name: string, data: unknown, opts?: { jobId?: string }) {
    return {
      id: opts?.jobId || name,
      name,
      data,
    } as never
  }

  async getJobCounts() {
    return {
      active: 0,
      completed: 0,
      delayed: 0,
      failed: 0,
      paused: 0,
      prioritized: 0,
      waiting: 0,
      'waiting-children': 0,
    }
  }
}

function createQueue(name: string): QueueLike {
  if (process.env.NODE_ENV === 'test') {
    return new NoopQueue()
  }

  return new Queue(name, { connection, defaultJobOptions })
}

export const emailQueue = createQueue('emails')
export const searchQueue = createQueue('search')
export const notifQueue = createQueue('notifications')
export const analyticsQueue = createQueue('analytics')
export const searchDeadLetterQueue = createQueue('search-dead-letter')

export async function enqueueSearchSync(data: SearchSyncJobData): Promise<void> {
  await searchQueue.add('sync-search-document', data, {
    ...defaultJobOptions,
    jobId: buildSearchSyncJobId(data),
  })
}
