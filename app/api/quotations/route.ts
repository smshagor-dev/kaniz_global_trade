import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, ROLES, ApiError, isAdmin, requireRole, requireVerifiedSupplier } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { createNotification } from '@/server/services/notification'
import { sendQuotationEmail } from '@/lib/email'
import { isPubliclyVisibleRFQStatus } from '@/lib/rfqs/visibility'
import { trackQuotationCreated } from '@/lib/analytics/tracking'
import { FraudEventType } from '@prisma/client'
import { assertFraudActionAllowed, screenFraudEvent } from '@/lib/fraud/service'
import { FRAUD_ACTIONS } from '@/lib/fraud/shared'

const createQuotationSchema = z.object({
  rfqId: z.string().optional(),
  inquiryId: z.string().optional(),
  companyId: z.string(),
  buyerId: z.string().optional(),
  totalPrice: z.number().positive(),
  currencyCode: z.string().default('USD'),
  deliveryTime: z.string().trim().min(2, 'Delivery time is required'),
  paymentTermId: z.string().optional(),
  shippingTerms: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().trim().min(10, 'Message must be at least 10 characters'),
  items: z.array(z.object({
    description: z.string().trim().min(2, 'Item description is required'),
    quantity: z.number().positive(),
    unit: z.string().optional(),
    unitPrice: z.number().positive(),
    totalPrice: z.number().positive(),
    notes: z.string().optional(),
  })).min(1),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (
      !isAdmin(authUser) &&
      !authUser.roles.includes(ROLES.BUYER) &&
      !authUser.roles.includes(ROLES.SUPPLIER_OWNER) &&
      !authUser.roles.includes(ROLES.SUPPLIER_STAFF)
    ) {
      throw new ApiError(403, 'Marketplace quotation access required')
    }
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)

    const where: Record<string, unknown> = {}

    if (authUser.roles.includes(ROLES.BUYER)) {
      where.buyerId = authUser.userId
    } else if (authUser.roles.includes(ROLES.SUPPLIER_OWNER) || authUser.roles.includes(ROLES.SUPPLIER_STAFF)) {
      if (!authUser.companyId) throw new ApiError(400, 'No company')
      where.companyId = authUser.companyId
    }

    const [quotations, total] = await Promise.all([
      prisma.rFQQuotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          rfq: { select: { id: true, productName: true, quantity: true } },
          inquiry: { select: { id: true, subject: true } },
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              companyUsers: {
                where: { isPrimary: true },
                take: 1,
                select: {
                  user: {
                    select: { firstName: true, lastName: true },
                  },
                },
              },
            },
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
      }),
      prisma.rFQQuotation.count({ where }),
    ])

    return successResponse(quotations, 'Quotations fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = createQuotationSchema.parse(body)
    const authUser = await requireVerifiedSupplier(await requireRole(req, ROLES.SUPPLIER_OWNER, ROLES.SUPPLIER_STAFF), data.companyId)
    const itemsTotal = data.items.reduce((sum, item) => sum + item.totalPrice, 0)

    if (Math.abs(itemsTotal - data.totalPrice) > 0.01) {
      throw new ApiError(422, 'Quotation total does not match the sum of line items')
    }

    // Must be supplier for this company
    await requireCompanyAccess(req, data.companyId)
    await assertFraudActionAllowed({
      userId: authUser.userId,
      companyId: data.companyId,
      action: FRAUD_ACTIONS.QUOTATION_CREATE,
    })

    if (!data.rfqId && !data.inquiryId) {
      throw new ApiError(400, 'Either rfqId or inquiryId is required')
    }

    const quotation = await prisma.$transaction(async (tx) => {
      let buyerId = data.buyerId

      if (data.rfqId) {
        const rfq = await tx.rFQ.findUnique({
          where: { id: data.rfqId },
          select: {
            id: true,
            buyerId: true,
            status: true,
            expiresAt: true,
            deletedAt: true,
          },
        })

        if (!rfq || rfq.deletedAt) {
          throw new ApiError(404, 'RFQ not found')
        }

        buyerId = rfq.buyerId

        if (!isPubliclyVisibleRFQStatus(rfq.status)) {
          throw new ApiError(409, 'This RFQ is no longer accepting quotations')
        }

        if (rfq.expiresAt && rfq.expiresAt <= new Date()) {
          throw new ApiError(409, 'This RFQ deadline has passed')
        }

        const existingQuotation = await tx.rFQQuotation.findFirst({
          where: {
            rfqId: data.rfqId,
            companyId: data.companyId,
          },
          select: { id: true },
        })

        if (existingQuotation) {
          throw new ApiError(409, 'Your company has already submitted a quotation for this RFQ')
        }
      }

      if (!buyerId) {
        throw new ApiError(400, 'Buyer is required for this quotation')
      }

      const q = await tx.rFQQuotation.create({
        data: {
          rfqId: data.rfqId,
          inquiryId: data.inquiryId,
          companyId: data.companyId,
          buyerId,
          totalPrice: data.totalPrice,
          currencyCode: data.currencyCode,
          deliveryTime: data.deliveryTime,
          paymentTermId: data.paymentTermId,
          shippingTerms: data.shippingTerms,
          validUntil: data.validUntil ? new Date(data.validUntil) : null,
          notes: data.notes,
          status: 'SENT',
          items: { createMany: { data: data.items } },
        },
        include: { items: true, company: { select: { name: true } } },
      })

      // Update RFQ quotation count
      if (data.rfqId) {
        await tx.rFQ.update({
          where: { id: data.rfqId },
          data: {
            quotationCount: { increment: 1 },
            status: 'RECEIVING_QUOTATIONS',
          },
        })
      }

      return q
    })

    // Notify buyer
    const buyer = await prisma.user.findUnique({
      where: { id: quotation.buyerId },
      select: { email: true, firstName: true },
    })

    if (buyer) {
      await createNotification({
        userId: quotation.buyerId,
        type: 'NEW_QUOTATION',
        title: 'New Quotation Received',
        message: `${quotation.company.name} submitted a quotation`,
        data: { quotationId: quotation.id },
      })

      try {
        await sendQuotationEmail(
          buyer.email,
          buyer.firstName,
          quotation.company.name,
          data.rfqId ? `/buyer/rfqs/${data.rfqId}` : `/buyer/quotations/${quotation.id}`
        )
      } catch (emailError) {
        console.error('Quotation email failed:', emailError)
      }
    }

    await trackQuotationCreated(data.companyId)

    await screenFraudEvent({
      req,
      actorUserId: authUser.userId,
      userId: authUser.userId,
      companyId: data.companyId,
      eventType: FraudEventType.QUOTATION_CREATE,
      sourceModule: 'quotations',
      title: 'Supplier quotation submitted',
      summary: `Quotation submitted for ${data.rfqId ? 'RFQ' : 'inquiry'} workflow.`,
      payload: {
        rfqId: data.rfqId,
        inquiryId: data.inquiryId,
        totalPrice: data.totalPrice,
        currencyCode: data.currencyCode,
        itemCount: data.items.length,
        deliveryTime: data.deliveryTime,
        notes: data.notes,
      },
    })

    return successResponse(quotation, 'Quotation submitted successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
