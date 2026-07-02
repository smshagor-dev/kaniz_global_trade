import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { getAuthUser, requireCompanyAccess, isAdmin, ApiError } from '@/lib/permissions'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api'
import { logUpdate, logDelete } from '@/lib/utils/audit'
import { PUBLIC_CACHE_TTL, supplierProfileCacheKey, rememberPublicCache, invalidateCompanyCaches } from '@/lib/cache/public'
import { scheduleSearchSync } from '@/lib/search/sync'
import { trackCompanyProfileView } from '@/lib/analytics/tracking'

const updateCompanySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  legalName: z.string().optional(),
  businessType: z.enum(['MANUFACTURER', 'TRADING_COMPANY', 'BUYING_OFFICE', 'AGENT', 'DISTRIBUTOR', 'RETAILER', 'GOVERNMENT', 'ASSOCIATION', 'INDIVIDUAL', 'OTHER']).optional(),
  registrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  tradeLicenseNumber: z.string().optional(),
  exportLicenseNumber: z.string().optional(),
  yearEstablished: z.number().int().optional(),
  countryId: z.string().optional(),
  cityId: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  mainProducts: z.string().optional(),
  description: z.string().optional(),
  annualRevenue: z.string().optional(),
  employees: z.string().optional(),
  factorySize: z.string().optional(),
  productionCapacity: z.string().optional(),
  exportPercentage: z.number().int().min(0).max(100).optional(),
  importPercentage: z.number().int().min(0).max(100).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await getAuthUser(req)
    const loadCompany = () => prisma.company.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        country: { select: { name: true, code: true, flag: true } },
        city: { select: { name: true } },
        companyUsers: {
          where: { isPrimary: true },
          include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
        },
        profile: true,
        gallery: { orderBy: { sortOrder: 'asc' } },
        certificates: true,
        socialLinks: true,
        virtualTours: true,
        markets: { include: { country: { select: { name: true, code: true } } } },
        tradeInfo: true,
        factoryInfo: true,
        verification: true,
        subscription: { include: { plan: true } },
        _count: {
          select: { products: true, reviews: true },
        },
      },
    })

    const company = authUser
      ? await loadCompany()
      : await rememberPublicCache(supplierProfileCacheKey(id), PUBLIC_CACHE_TTL.supplierProfile, loadCompany)

    if (!company) return errorResponse('Company not found', 404)

    if (!authUser) {
      trackCompanyProfileView(company.id).catch(() => {})
    }

    return successResponse(company)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await requireCompanyAccess(req, id)
    const body = await req.json()
    const data = updateCompanySchema.parse(body)

    const existing = await prisma.company.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Company not found')

    const updated = await prisma.company.update({
      where: { id },
      data,
    })

    await logUpdate(authUser.userId, 'companies', 'Company', id, existing, data)

    await invalidateCompanyCaches(updated.id, updated.slug)
    await scheduleSearchSync('company', updated.id, 'upsert')

    return successResponse(updated, 'Company updated')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await getAuthUser(req)
    if (!authUser) throw new ApiError(401, 'Unauthorized')
    if (!isAdmin(authUser)) throw new ApiError(403, 'Admin access required')

    await prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await invalidateCompanyCaches(id)
    await scheduleSearchSync('company', id, 'remove')
    await logDelete(authUser.userId, 'companies', 'Company', id)

    return successResponse(null, 'Company deleted')
  } catch (error) {
    return handleApiError(error)
  }
}
