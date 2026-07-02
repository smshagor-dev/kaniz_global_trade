import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { getAuthUser, requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { logCreate } from '@/lib/utils/audit'
import { invalidateCompanyCaches } from '@/lib/cache/public'
import { scheduleSearchSync } from '@/lib/search/sync'

const createCompanySchema = z.object({
  name: z.string().min(2).max(200),
  legalName: z.string().optional(),
  businessType: z.enum(['MANUFACTURER', 'TRADING_COMPANY', 'BUYING_OFFICE', 'AGENT', 'DISTRIBUTOR', 'RETAILER', 'GOVERNMENT', 'ASSOCIATION', 'INDIVIDUAL', 'OTHER']).default('MANUFACTURER'),
  countryId: z.string().optional(),
  cityId: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  mainProducts: z.string().optional(),
  yearEstablished: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const authUser = await getAuthUser(req)
    const { page, limit, skip } = getPaginationParams(searchParams)
    const myCompany = searchParams.get('myCompany') === 'true'

    if (myCompany) {
      if (!authUser) throw new ApiError(401, 'Authentication required')
      const companyUser = await prisma.companyUser.findFirst({
        where: { userId: authUser.userId, isPrimary: true },
        select: { companyId: true },
      })
      if (!companyUser) return successResponse(null, 'No company found')

      const company = await prisma.company.findUnique({
        where: { id: companyUser.companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          verificationStatus: true,
          creditProfile: { select: { score: true } },
          subscription: { include: { plan: { select: { name: true } } } },
        },
      })

      return successResponse(company, 'Company fetched')
    }

    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      deletedAt: null,
    }

    const countryId = searchParams.get('countryId')
    const businessType = searchParams.get('businessType')
    const verificationStatus = searchParams.get('verificationStatus')
    const isFeatured = searchParams.get('isFeatured')
    const search = searchParams.get('q')

    if (countryId) where.countryId = countryId
    if (businessType) where.businessType = businessType
    if (verificationStatus) where.verificationStatus = verificationStatus
    if (isFeatured === 'true') where.isFeatured = true

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { mainProducts: { contains: search } },
      ]
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isFeatured: 'desc' },
          { isPremium: 'desc' },
          { totalViews: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          businessType: true,
          countryId: true,
          verificationStatus: true,
          fraudPublicFlag: true,
          isPremium: true,
          isFeatured: true,
          totalViews: true,
          totalInquiries: true,
          mainProducts: true,
          yearEstablished: true,
          country: { select: { name: true, code: true, flag: true } },
          _count: { select: { products: true, reviews: true } },
        },
      }),
      prisma.company.count({ where }),
    ])

    return successResponse(companies, 'Companies fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)

    if (!authUser.roles.includes(ROLES.SUPPLIER_OWNER) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new ApiError(403, 'Only suppliers can create companies')
    }

    // Check if user already owns a company (for non-admin)
    if (!authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      const existingCompany = await prisma.companyUser.findFirst({
        where: { userId: authUser.userId, isPrimary: true },
      })
      if (existingCompany) throw new ApiError(409, 'You already have a company')
    }

    const body = await req.json()
    const data = createCompanySchema.parse(body)

    // Generate unique slug
    const baseSlug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    let slug = baseSlug
    let counter = 0
    while (await prisma.company.findUnique({ where: { slug } })) {
      counter++
      slug = `${baseSlug}-${counter}`
    }

    const company = await prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          ...data,
          slug,
          status: 'ACTIVE',
        },
      })

      await tx.companyUser.create({
        data: {
          companyId: newCompany.id,
          userId: authUser.userId,
          isPrimary: true,
        },
      })

      await tx.companyVerification.create({
        data: { companyId: newCompany.id, status: 'UNVERIFIED' },
      })

      return newCompany
    })

    await logCreate(authUser.userId, 'companies', 'Company', company.id, { name: company.name })

    await invalidateCompanyCaches(company.id, company.slug)
    await scheduleSearchSync('company', company.id, 'upsert')

    return successResponse(company, 'Company created successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
