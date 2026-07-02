import { buildSystemHealthReport } from '@/lib/monitoring/health'
import { listRecentSystemEvents } from '@/lib/monitoring/system-events'
import { emailQueue, searchQueue, analyticsQueue, searchDeadLetterQueue } from '@/server/queues/client'
import { getRecentQueueFailures } from '@/server/queues/failure-log'

export async function getSystemDashboardSnapshot() {
  const [health, emails, search, analytics, deadLetter, queueFailures, webhookFailures, uploadRejects, securityEvents] = await Promise.all([
    buildSystemHealthReport(),
    emailQueue.getJobCounts(),
    searchQueue.getJobCounts(),
    analyticsQueue.getJobCounts(),
    searchDeadLetterQueue.getJobCounts(),
    getRecentQueueFailures(20),
    listRecentSystemEvents({ categories: ['PAYMENT', 'WEBHOOK'], limit: 10 }),
    listRecentSystemEvents({ categories: ['UPLOAD'], limit: 10 }),
    listRecentSystemEvents({ categories: ['SECURITY', 'AUTH'], limit: 10 }),
  ])

  return {
    generatedAt: new Date().toISOString(),
    health,
    queues: {
      emails,
      search,
      analytics,
      searchDeadLetter: deadLetter,
    },
    failedJobs: queueFailures,
    recentPaymentWebhookFailures: webhookFailures,
    recentUploadRejects: uploadRejects,
    recentSecurityEvents: securityEvents,
    readiness: {
      healthyServices: health.services.filter((service: { status: string }) => service.status === 'healthy').length,
      totalServices: health.services.length,
      hasRecentQueueFailures: queueFailures.length > 0,
      hasRecentWebhookFailures: webhookFailures.length > 0,
      hasRecentSecurityEvents: securityEvents.length > 0,
    },
  }
}
