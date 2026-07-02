import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { emailQueue, searchQueue, analyticsQueue, searchDeadLetterQueue } from '@/server/queues/client'
import { getRecentQueueFailures } from '@/server/queues/failure-log'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const [emails, search, analytics, deadLetter, failures] = await Promise.all([
      emailQueue.getJobCounts(),
      searchQueue.getJobCounts(),
      analyticsQueue.getJobCounts(),
      searchDeadLetterQueue.getJobCounts(),
      getRecentQueueFailures(20),
    ])

    return successResponse({
      generatedAt: new Date().toISOString(),
      queues: {
        emails,
        search,
        analytics,
        searchDeadLetter: deadLetter,
      },
      failures,
    }, 'Queue health fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
