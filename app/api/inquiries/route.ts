import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, getAuthUser, isAdmin, ROLES, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError, getPaginationParams, paginationMeta } from '@/lib/utils/api'
import { createNotification } from '@/server/services/notification'
import { sendNewInquiryEmail } from '@/lib/email'

const createInquirySchema = z.object({
  companyId: z.string(),
  productId: z.string().optional(),
  subject: z.string().min(5).max(200),
  quantity: z.string().optional(),
  targetPrice: z.string().optional(),
  destinationCountryId: z.string().optional(),
  message: z.string().min(20).max(5000),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const { page, limit, skip } = getPaginationParams(searchParams)

    const where: Record<string, unknown> = { deletedAt: null }

    if (authUser.roles.includes(ROLES.BUYER)) {
      where.buyerId = authUser.userId
    } else if (authUser.roles.includes(ROLES.SUPPLIER_OWNER) || authUser.roles.includes(ROLES.SUPPLIER_STAFF)) {
      if (!authUser.companyId) throw new ApiError(400, 'No company associated')
      where.companyId = authUser.companyId
    } else if (!isAdmin(authUser)) {
      throw new ApiError(403, 'Access denied')
    }

    const status = searchParams.get('status')
    if (status) where.status = status

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
          company: { select: { id: true, name: true, slug: true, logo: true } },
          product: { select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1 } } },
          attachments: true,
          _count: { select: { replies: true } },
        },
      }),
      prisma.inquiry.count({ where }),
    ])

    return successResponse(inquiries, 'Inquiries fetched', paginationMeta(total, page, limit))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)

    if (!authUser.roles.includes(ROLES.BUYER) && !isAdmin(authUser)) {
      throw new ApiError(403, 'Only buyers can send inquiries')
    }

    const body = await req.json()
    const data = createInquirySchema.parse(body)

    const company = await prisma.company.findUnique({
      where: { id: data.companyId, status: 'ACTIVE', deletedAt: null },
      include: {
        companyUsers: {
          where: { isPrimary: true },
          include: { user: { select: { email: true, firstName: true, id: true } } },
        },
      },
    })

    if (!company) throw new ApiError(404, 'Company not found')

    const inquiry = await prisma.inquiry.create({
      data: {
        buyerId: authUser.userId,
        companyId: data.companyId,
        productId: data.productId,
        subject: data.subject,
        quantity: data.quantity,
        targetPrice: data.targetPrice,
        destinationCountryId: data.destinationCountryId,
        message: data.message,
      },
    })

    // Increment company inquiry count
    await prisma.company.update({
      where: { id: data.companyId },
      data: { totalInquiries: { increment: 1 } },
    })

    // Track analytics
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    await prisma.companyAnalytic.upsert({
      where: { companyId_date: { companyId: data.companyId, date: today } },
      create: { companyId: data.companyId, date: today, inquiries: 1 },
      update: { inquiries: { increment: 1 } },
    }).catch(() => {})

    // Notify supplier
    const owner = company.companyUsers[0]
    if (owner) {
      await createNotification({
        userId: owner.userId,
        type: 'NEW_INQUIRY',
        title: 'New Inquiry Received',
        message: `New inquiry: "${data.subject}"`,
        data: { inquiryId: inquiry.id },
      })

      await sendNewInquiryEmail(
        owner.user.email,
        owner.user.firstName,
        authUser.email,
        data.subject,
        inquiry.id
      )
    }

    return successResponse(inquiry, 'Inquiry sent successfully', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
