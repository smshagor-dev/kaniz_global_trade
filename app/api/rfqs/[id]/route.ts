import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, ROLES, getAuthUser, isAdmin, requireAuth } from '@/lib/permissions'
import { errorResponse, handleApiError, successResponse } from '@/lib/utils/api'
import { isPubliclyVisibleRFQStatus } from '@/lib/rfqs/visibility'
import { invalidateRFQCaches } from '@/lib/cache/public'
import { scheduleSearchSync } from '@/lib/search/sync'

const updateRFQSchema = z.object({
  categoryId: z.string().nullable().optional(),
  productName: z.string().min(3).max(200).optional(),
  quantity: z.string().min(1).optional(),
  unit: z.string().nullable().optional(),
  destinationCountryId: z.string().nullable().optional(),
  budget: z.number().positive().nullable().optional(),
  currencyId: z.string().nullable().optional(),
  requiredDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  isPublic: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
  status: z.enum(['OPEN', 'RECEIVING_QUOTATIONS', 'CLOSED', 'AWARDED', 'CANCELLED', 'EXPIRED']).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req)
    const { id } = await params

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        status: true,
        isPublic: true,
        expiresAt: true,
        deletedAt: true,
      },
    })

    if (!rfq || rfq.deletedAt) {
      return errorResponse('RFQ not found', 404)
    }

    const isOwner = authUser?.userId === rfq.buyerId
    const canSeePrivate = !!authUser && (isOwner || isAdmin(authUser))
    const isSupplierViewer = !!authUser && (
      authUser.roles.includes(ROLES.SUPPLIER_OWNER) ||
      authUser.roles.includes(ROLES.SUPPLIER_STAFF)
    ) && !!authUser.companyId

    if (canSeePrivate) {
      const fullRfq = await prisma.rFQ.findUnique({
        where: { id },
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          category: { select: { id: true, name: true } },
          destinationCountry: { select: { id: true, name: true, code: true, flag: true } },
          currency: { select: { id: true, code: true, symbol: true } },
          attachments: true,
          quotations: {
            orderBy: { createdAt: 'desc' },
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logo: true,
                  email: true,
                  phone: true,
                  companyUsers: {
                    where: { isPrimary: true },
                    take: 1,
                    select: {
                      user: {
                        select: {
                          firstName: true,
                          lastName: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
              items: true,
              attachments: true,
              paymentTerm: {
                select: { id: true, name: true },
              },
            },
          },
          _count: { select: { quotations: true } },
        },
      })

      return successResponse({ ...fullRfq, access: 'private' })
    }

    const isExpired = !!rfq.expiresAt && rfq.expiresAt <= new Date()
    if (!rfq.isPublic || isExpired || !isPubliclyVisibleRFQStatus(rfq.status)) {
      return errorResponse('RFQ not found', 404)
    }

    const publicRfq = await prisma.rFQ.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        productName: true,
        quantity: true,
        unit: true,
        budget: true,
        requiredDate: true,
        description: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        isPublic: true,
        quotationCount: true,
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        category: { select: { id: true, name: true } },
        destinationCountry: { select: { id: true, name: true, code: true, flag: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        _count: { select: { quotations: true } },
        ...(isSupplierViewer
          ? {
            quotations: {
              where: { companyId: authUser.companyId },
              select: {
                id: true,
                status: true,
                createdAt: true,
                totalPrice: true,
                currencyCode: true,
              },
              take: 1,
              orderBy: { createdAt: 'desc' as const },
            },
          }
          : {}),
      },
    })

    return successResponse({ ...publicRfq, access: 'public' })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const body = await req.json()
    const data = updateRFQSchema.parse(body)

    const rfq = await prisma.rFQ.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, buyerId: true },
    })

    if (!rfq) throw new ApiError(404, 'RFQ not found')
    if (rfq.buyerId !== authUser.userId && !isAdmin(authUser)) {
      throw new ApiError(403, 'Access denied')
    }

    const updateData: Record<string, unknown> = {}

    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
    if (data.productName !== undefined) updateData.productName = data.productName
    if (data.quantity !== undefined) updateData.quantity = data.quantity
    if (data.unit !== undefined) updateData.unit = data.unit
    if (data.destinationCountryId !== undefined) updateData.destinationCountryId = data.destinationCountryId
    if (data.budget !== undefined) updateData.budget = data.budget
    if (data.currencyId !== undefined) updateData.currencyId = data.currencyId
    if (data.requiredDate !== undefined) updateData.requiredDate = data.requiredDate ? new Date(data.requiredDate) : null
    if (data.description !== undefined) updateData.description = data.description
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null
    if (data.status !== undefined) updateData.status = data.status

    const updated = await prisma.rFQ.update({
      where: { id: rfq.id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        destinationCountry: { select: { id: true, name: true, code: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        _count: { select: { quotations: true } },
      },
    })

    await invalidateRFQCaches()
    await scheduleSearchSync('rfq', updated.id, 'upsert')

    return successResponse(updated, 'RFQ updated successfully')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      select: { id: true, buyerId: true, deletedAt: true },
    })

    if (!rfq || rfq.deletedAt) throw new ApiError(404, 'RFQ not found')
    if (rfq.buyerId !== authUser.userId && !isAdmin(authUser)) {
      throw new ApiError(403, 'Access denied')
    }

    await prisma.rFQ.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'CANCELLED',
        isPublic: false,
      },
    })

    await invalidateRFQCaches()
    await scheduleSearchSync('rfq', id, 'remove')

    return successResponse(null, 'RFQ deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
