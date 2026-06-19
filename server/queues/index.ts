import { Queue, Worker, type ConnectionOptions } from 'bullmq'
import prisma from '@/lib/db/prisma'
import {
  sendVerificationEmail, sendPasswordResetEmail,
  sendNewInquiryEmail, sendNewRFQEmail,
  sendQuotationEmail, sendProductApprovalEmail,
  sendSubscriptionExpiryEmail,
} from '@/lib/email'
import { indexProduct, indexCompany } from '@/lib/search'

function createBullMqConnection(): ConnectionOptions {
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

const connection = createBullMqConnection()

// ── Queue Definitions ───────────────────────────────────────
export const emailQueue     = new Queue('emails',     { connection })
export const searchQueue    = new Queue('search',     { connection })
export const notifQueue     = new Queue('notifications', { connection })
export const analyticsQueue = new Queue('analytics', { connection })

// ── Email Worker ────────────────────────────────────────────
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

// ── Search Indexing Worker ──────────────────────────────────
const searchWorker = new Worker('search', async (job) => {
  const { type, data } = job.data

  if (type === 'index_product') {
    await indexProduct(data)
  } else if (type === 'index_company') {
    await indexCompany(data)
  }
}, { connection, concurrency: 10 })

// ── Analytics Worker ─────────────────────────────────────────
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

// ── Subscription Expiry Cron ─────────────────────────────────
export async function scheduleSubscriptionChecks(): Promise<void> {
  // Run daily at midnight
  await emailQueue.add(
    'check-expiring-subscriptions',
    { type: 'check_subscriptions' },
    {
      repeat: { pattern: '0 0 * * *' },
      removeOnComplete: 10,
    }
  )
}

// Error handlers
emailWorker.on('failed',     (job, err) => console.error(`Email job ${job?.id} failed:`, err))
searchWorker.on('failed',    (job, err) => console.error(`Search job ${job?.id} failed:`, err))
analyticsWorker.on('failed', (job, err) => console.error(`Analytics job ${job?.id} failed:`, err))

emailWorker.on('completed',  (job) => console.log(`Email job ${job.id} completed`))

export { emailWorker, searchWorker, analyticsWorker }
