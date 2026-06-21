import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, isAdmin, requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const statusSchema = z.object({
  status: z.enum(['OPEN', 'REPLIED', 'CLOSED', 'SPAM']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params
    const { status } = statusSchema.parse(await req.json())

    const inquiry = await prisma.inquiry.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, buyerId: true, companyId: true },
    })

    if (!inquiry) throw new ApiError(404, 'Inquiry not found')

    const isBuyerOwner = inquiry.buyerId === authUser.userId
    const isSupplierMember = !!authUser.companyId && inquiry.companyId === authUser.companyId

    if (!isBuyerOwner && !isSupplierMember && !isAdmin(authUser)) {
      throw new ApiError(403, 'Access denied')
    }

    const updated = await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: {
        status,
        isRead: isBuyerOwner ? false : true,
      },
    })

    return successResponse(updated, 'Inquiry status updated')
  } catch (error) {
    return handleApiError(error)
  }
}
