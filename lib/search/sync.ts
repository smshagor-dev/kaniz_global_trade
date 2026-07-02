import prisma from '@/lib/db/prisma'
import {
  indexCompany,
  indexProduct,
  indexRFQ,
  removeCompanyFromIndex,
  removeProductFromIndex,
  removeRFQFromIndex,
} from '@/lib/search'
import { isPubliclyVisibleRFQStatus } from '@/lib/rfqs/visibility'
import { logSearchSyncFailureEvent } from '@/lib/monitoring/event-helpers'
import { enqueueSearchSync } from '@/server/queues/client'
import type { SearchEntityType, SearchSyncAction } from '@/server/queues/config'

const VERIFIED_COMPANY_STATUSES = ['ADMIN_VERIFIED', 'PREMIUM_VERIFIED', 'DOCUMENT_VERIFIED'] as const

async function syncProduct(entityId: string, action: SearchSyncAction): Promise<void> {
  if (action === 'remove') {
    await removeProductFromIndex(entityId)
    return
  }

  const product = await prisma.product.findUnique({
    where: { id: entityId },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      companyId: true,
      categoryId: true,
      priceMin: true,
      priceMax: true,
      moq: true,
      status: true,
      isFeatured: true,
      totalViews: true,
      deletedAt: true,
      createdAt: true,
      company: {
        select: {
          name: true,
          slug: true,
          verificationStatus: true,
          countryId: true,
          country: { select: { name: true } },
        },
      },
      category: { select: { name: true } },
      images: {
        where: { isPrimary: true },
        take: 1,
        select: { url: true },
      },
    },
  })

  if (!product || product.deletedAt || product.status !== 'APPROVED') {
    await removeProductFromIndex(entityId)
    return
  }

  await indexProduct({
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    primaryImage: product.images[0]?.url || null,
    companyId: product.companyId,
    companyName: product.company.name,
    companySlug: product.company.slug,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    countryId: product.company.countryId,
    countryName: product.company.country?.name || null,
    priceMin: product.priceMin?.toString(),
    priceMax: product.priceMax?.toString(),
    moq: product.moq?.toString(),
    status: product.status,
    isFeatured: product.isFeatured,
    isVerified: VERIFIED_COMPANY_STATUSES.includes(product.company.verificationStatus as typeof VERIFIED_COMPANY_STATUSES[number]),
    totalViews: product.totalViews,
    createdAt: product.createdAt.toISOString(),
  })
}

async function syncCompany(entityId: string, action: SearchSyncAction): Promise<void> {
  if (action === 'remove') {
    await removeCompanyFromIndex(entityId)
    return
  }

  const company = await prisma.company.findUnique({
    where: { id: entityId },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      businessType: true,
      countryId: true,
      verificationStatus: true,
      isPremium: true,
      isFeatured: true,
      totalViews: true,
      totalInquiries: true,
      mainProducts: true,
      yearEstablished: true,
      status: true,
      deletedAt: true,
      createdAt: true,
      country: { select: { name: true } },
    },
  })

  if (!company || company.deletedAt || company.status !== 'ACTIVE') {
    await removeCompanyFromIndex(entityId)
    return
  }

  await indexCompany({
    id: company.id,
    name: company.name,
    slug: company.slug,
    logo: company.logo,
    businessType: company.businessType,
    countryId: company.countryId,
    countryName: company.country?.name || null,
    verificationStatus: company.verificationStatus,
    isPremium: company.isPremium,
    isFeatured: company.isFeatured,
    totalViews: company.totalViews,
    totalInquiries: company.totalInquiries,
    mainProducts: company.mainProducts,
    yearEstablished: company.yearEstablished,
    status: company.status,
    createdAt: company.createdAt.toISOString(),
  })
}

async function syncRFQ(entityId: string, action: SearchSyncAction): Promise<void> {
  if (action === 'remove') {
    await removeRFQFromIndex(entityId)
    return
  }

  const rfq = await prisma.rFQ.findUnique({
    where: { id: entityId },
    select: {
      id: true,
      productName: true,
      quantity: true,
      unit: true,
      budget: true,
      status: true,
      isPublic: true,
      expiresAt: true,
      createdAt: true,
      deletedAt: true,
      quotationCount: true,
      buyerId: true,
      categoryId: true,
      destinationCountryId: true,
      currencyId: true,
      description: true,
      category: { select: { name: true } },
      destinationCountry: { select: { name: true } },
      currency: { select: { code: true } },
    },
  })

  const isVisible = !!rfq &&
    !rfq.deletedAt &&
    rfq.isPublic &&
    (!rfq.expiresAt || rfq.expiresAt > new Date()) &&
    isPubliclyVisibleRFQStatus(rfq.status)

  if (!rfq || !isVisible) {
    await removeRFQFromIndex(entityId)
    return
  }

  await indexRFQ({
    id: rfq.id,
    productName: rfq.productName,
    quantity: rfq.quantity,
    unit: rfq.unit,
    budget: rfq.budget?.toString(),
    status: rfq.status,
    categoryId: rfq.categoryId,
    categoryName: rfq.category?.name || null,
    destinationCountryId: rfq.destinationCountryId,
    destinationCountryName: rfq.destinationCountry?.name || null,
    currencyId: rfq.currencyId,
    currencyCode: rfq.currency?.code || null,
    description: rfq.description,
    quotationCount: rfq.quotationCount,
    buyerId: rfq.buyerId,
    createdAt: rfq.createdAt.toISOString(),
    expiresAt: rfq.expiresAt?.toISOString() || null,
  })
}

export async function processSearchSyncJob(entityType: SearchEntityType, entityId: string, action: SearchSyncAction): Promise<void> {
  try {
    if (entityType === 'product') {
      await syncProduct(entityId, action)
      return
    }

    if (entityType === 'company') {
      await syncCompany(entityId, action)
      return
    }

    await syncRFQ(entityId, action)
  } catch (error) {
    await logSearchSyncFailureEvent({
      entityType,
      entityId,
      action,
      reason: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export async function scheduleSearchSync(entityType: SearchEntityType, entityId: string, action: SearchSyncAction): Promise<void> {
  try {
    await enqueueSearchSync({ entityType, entityId, action })
  } catch (error) {
    console.warn(`Search sync queue unavailable for ${entityType}:${entityId}; processing inline instead.`, error)
    try {
      await processSearchSyncJob(entityType, entityId, action)
    } catch (innerError) {
      await logSearchSyncFailureEvent({
        entityType,
        entityId,
        action,
        reason: innerError instanceof Error ? innerError.message : String(innerError),
      })
      throw innerError
    }
  }
}
