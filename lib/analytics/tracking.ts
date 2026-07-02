import prisma from '@/lib/db/prisma'

type CompanyMetricDelta = {
  profileViews?: number
  productViews?: number
  inquiries?: number
  rfqs?: number
  messages?: number
  quotations?: number
}

type ProductMetricDelta = {
  views?: number
  inquiries?: number
  impressions?: number
}

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export async function incrementCompanyAnalytics(companyId: string, delta: CompanyMetricDelta) {
  const today = startOfToday()

  await prisma.companyAnalytic.upsert({
    where: { companyId_date: { companyId, date: today } },
    create: {
      companyId,
      date: today,
      profileViews: delta.profileViews || 0,
      productViews: delta.productViews || 0,
      inquiries: delta.inquiries || 0,
      rfqs: delta.rfqs || 0,
      messages: delta.messages || 0,
      quotations: delta.quotations || 0,
    },
    update: {
      profileViews: { increment: delta.profileViews || 0 },
      productViews: { increment: delta.productViews || 0 },
      inquiries: { increment: delta.inquiries || 0 },
      rfqs: { increment: delta.rfqs || 0 },
      messages: { increment: delta.messages || 0 },
      quotations: { increment: delta.quotations || 0 },
    },
  })
}

export async function incrementProductAnalytics(productId: string, delta: ProductMetricDelta) {
  const today = startOfToday()

  await prisma.productAnalytic.upsert({
    where: { productId_date: { productId, date: today } },
    create: {
      productId,
      date: today,
      views: delta.views || 0,
      inquiries: delta.inquiries || 0,
      impressions: delta.impressions || 0,
    },
    update: {
      views: { increment: delta.views || 0 },
      inquiries: { increment: delta.inquiries || 0 },
      impressions: { increment: delta.impressions || 0 },
    },
  })
}

export async function trackCompanyProfileView(companyId: string) {
  await Promise.all([
    prisma.company.update({
      where: { id: companyId },
      data: { totalViews: { increment: 1 } },
    }),
    incrementCompanyAnalytics(companyId, { profileViews: 1 }),
  ])
}

export async function trackProductView(productId: string, companyId: string) {
  await Promise.all([
    prisma.product.update({
      where: { id: productId },
      data: { totalViews: { increment: 1 } },
    }),
    incrementProductAnalytics(productId, { views: 1 }),
    incrementCompanyAnalytics(companyId, { productViews: 1 }),
  ])
}

export async function trackInquiryCreated(companyId: string, productId?: string | null) {
  await Promise.all([
    prisma.company.update({
      where: { id: companyId },
      data: { totalInquiries: { increment: 1 } },
    }),
    incrementCompanyAnalytics(companyId, { inquiries: 1 }),
    productId
      ? prisma.product.update({
        where: { id: productId },
        data: { totalInquiries: { increment: 1 } },
      })
      : Promise.resolve(),
    productId ? incrementProductAnalytics(productId, { inquiries: 1 }) : Promise.resolve(),
  ])
}

export async function trackQuotationCreated(companyId: string) {
  await incrementCompanyAnalytics(companyId, { quotations: 1 })
}

export async function trackCompanyMessage(companyId: string) {
  await incrementCompanyAnalytics(companyId, { messages: 1 })
}

export async function trackCompanyRfqs(companyIds: string[]) {
  const uniqueCompanyIds = [...new Set(companyIds.filter(Boolean))]
  if (!uniqueCompanyIds.length) return

  await Promise.all(uniqueCompanyIds.map((companyId) => incrementCompanyAnalytics(companyId, { rfqs: 1 })))
}
