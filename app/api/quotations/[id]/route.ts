import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { ApiError, ROLES, isAdmin, requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params

    const quotation = await prisma.rFQQuotation.findUnique({
      where: { id },
      include: {
        rfq: {
          select: {
            id: true,
            productName: true,
            quantity: true,
            unit: true,
            status: true,
            expiresAt: true,
          },
        },
        inquiry: {
          select: {
            id: true,
            subject: true,
            quantity: true,
            targetPrice: true,
            status: true,
            createdAt: true,
          },
        },
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
                userId: true,
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
        paymentTerm: {
          select: { id: true, name: true },
        },
        items: true,
        attachments: true,
        tradeOrder: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            currencyCode: true,
          },
        },
      },
    })

    if (!quotation) throw new ApiError(404, 'Quotation not found')

    const isBuyerOwner = quotation.buyerId === authUser.userId
    const isSupplierMember = !!authUser.companyId && quotation.companyId === authUser.companyId

    if (!isBuyerOwner && !isSupplierMember && !isAdmin(authUser)) {
      throw new ApiError(403, 'Access denied')
    }

    return successResponse(quotation, 'Quotation fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
