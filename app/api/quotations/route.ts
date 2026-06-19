import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, ROLES, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { createNotification } from '@/server/services/notification'
import { sendQuotationEmail } from '@/lib/email'

const createQuotationSchema = z.object({
  rfqId: z.string().optional(),
  inquiryId: z.string().optional(),
  companyId: z.string(),
  buyerId: z.string(),
  totalPrice: z.number().positive(),
  currencyCode: z.string().default('USD'),
  deliveryTime: z.string().optional(),
  paymentTermId: z.string().optional(),
  shippingTerms: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    description: z.string(),
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
        orderBy: { createdAt: 'desc' },
        include: {
          rfq: { select: { id: true, productName: true, quantity: true } },
          inquiry: { select: { id: true, subject: true } },
          company: { select: { id: true, name: true, slug: true, logo: true } },
          items: true,
          attachments: true,
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
    const authUser = await requireAuth(req)
    const body = await req.json()
    const data = createQuotationSchema.parse(body)

    // Must be supplier for this company
    await requireCompanyAccess(req, data.companyId)

    if (!data.rfqId && !data.inquiryId) {
      throw new ApiError(400, 'Either rfqId or inquiryId is required')
    }

    const quotation = await prisma.$transaction(async (tx) => {
      const q = await tx.rFQQuotation.create({
        data: {
          rfqId: data.rfqId,
          inquiryId: data.inquiryId,
          companyId: data.companyId,
          buyerId: data.buyerId,
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
      where: { id: data.buyerId },
      select: { email: true, firstName: true },
    })

    if (buyer) {
      await createNotification({
        userId: data.buyerId,
        type: 'NEW_QUOTATION',
        title: 'New Quotation Received',
        message: `${quotation.company.name} submitted a quotation`,
        data: { quotationId: quotation.id },
      })

      try {
        await sendQuotationEmail(buyer.email, buyer.firstName, quotation.company.name, quotation.id)
      } catch (emailError) {
        console.error('Quotation email failed:', emailError)
      }
    }

    return successResponse(quotation, 'Quotation submitted successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
