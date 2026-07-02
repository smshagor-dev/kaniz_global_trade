import { Worker } from 'bullmq'
import prisma from '@/lib/db/prisma'
import {
  sendVerificationEmail, sendPasswordResetEmail,
  sendNewInquiryEmail, sendNewRFQEmail,
  sendQuotationEmail, sendProductApprovalEmail,
  sendSubscriptionExpiryEmail,
} from '@/lib/email'
import { processSearchSyncJob } from '@/lib/search/sync'
import { analyticsQueue, emailQueue, searchDeadLetterQueue } from '@/server/queues/client'
import { connection } from '@/server/queues/config'
import { recordQueueFailure } from '@/server/queues/failure-log'

const emailWorker = new Worker('emails', async (job) => {
  const { type, data } = job.data

  switch (type) {
    case 'verification':
      await sendVerificationEmail(data.email, data.name, data.token)
      break
    case 'password_reset':
      await sendPasswordResetEmail(data.email, data.name, data.token)
      break
    case 'new_inquiry':
      await sendNewInquiryEmail(data.supplierEmail, data.supplierName, data.buyerName, data.subject, data.inquiryId)
      break
    case 'new_rfq':
      await sendNewRFQEmail(data.supplierEmail, data.supplierName, data.rfqTitle, data.rfqId)
      break
    case 'new_quotation':
      await sendQuotationEmail(data.buyerEmail, data.buyerName, data.supplierName, data.quotationId)
      break
    case 'product_approval':
      await sendProductApprovalEmail(data.email, data.name, data.productName, data.approved, data.reason)
      break
    case 'subscription_expiry':
      await sendSubscriptionExpiryEmail(data.email, data.name, data.planName, new Date(data.expiresAt))
      break
    default:
      console.warn('Unknown email type:', type)
  }
}, { connection, concurrency: 5 })

const searchWorker = new Worker('search', async (job) => {
  await processSearchSyncJob(job.data.entityType, job.data.entityId, job.data.action)
}, { connection, concurrency: 10 })

const analyticsWorker = new Worker('analytics', async (job) => {
  const { type, data } = job.data
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (type === 'product_view') {
    await prisma.$transaction([
      prisma.product.update({
        where: { id: data.productId },
        data: { totalViews: { increment: 1 } },
      }),
      prisma.productAnalytic.upsert({
        where: { productId_date: { productId: data.productId, date: today } },
        create: { productId: data.productId, date: today, views: 1 },
        update: { views: { increment: 1 } },
      }),
    ])
  } else if (type === 'company_view') {
    await prisma.$transaction([
      prisma.company.update({
        where: { id: data.companyId },
        data: { totalViews: { increment: 1 } },
      }),
      prisma.companyAnalytic.upsert({
        where: { companyId_date: { companyId: data.companyId, date: today } },
        create: { companyId: data.companyId, date: today, profileViews: 1 },
        update: { profileViews: { increment: 1 } },
      }),
    ])
  }
}, { connection, concurrency: 20 })

export async function scheduleSubscriptionChecks(): Promise<void> {
  await emailQueue.add(
    'check-expiring-subscriptions',
    { type: 'check_subscriptions' },
    {
      repeat: { pattern: '0 0 * * *' },
      removeOnComplete: 10,
    }
  )
}

async function handleWorkerFailure(
  queueName: string,
  job: { id?: string; name: string; attemptsMade: number; data: unknown; opts?: { attempts?: number } } | undefined,
  err: Error
) {
  console.error(`${queueName} job ${job?.id} failed:`, err)

  await recordQueueFailure({
    queue: queueName,
    jobId: String(job?.id || 'unknown'),
    jobName: job?.name || 'unknown',
    attemptsMade: job?.attemptsMade || 0,
    failedReason: err.message,
    payload: job?.data,
    failedAt: new Date().toISOString(),
  })

  if (queueName === 'search' && job && job.attemptsMade >= (job.opts?.attempts || 1)) {
    const payload = typeof job.data === 'object' && job.data !== null
      ? job.data as Record<string, unknown>
      : { data: job.data }

    await searchDeadLetterQueue.add(
      'dead-search-document',
      { ...payload, failedReason: err.message, failedAt: new Date().toISOString() },
      { jobId: `dead:${job.id}` }
    )
  }
}

emailWorker.on('failed', (job, err) => void handleWorkerFailure('emails', job, err))
searchWorker.on('failed', (job, err) => void handleWorkerFailure('search', job, err))
analyticsWorker.on('failed', (job, err) => void handleWorkerFailure('analytics', job, err))

emailWorker.on('completed', (job) => console.log(`Email job ${job.id} completed`))

export { emailWorker, searchWorker, analyticsWorker, analyticsQueue }
