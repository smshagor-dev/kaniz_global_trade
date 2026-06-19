import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError } from '@/lib/utils/api'
import { logApprove, logReject } from '@/lib/utils/audit'
import { indexProduct, removeProductFromIndex } from '@/lib/search'
import { createNotification } from '@/server/services/notification'
import { sendProductApprovalEmail } from '@/lib/email'

const schema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'SUSPEND']),
  reason: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await requireAdmin(req)
    const { action, reason } = schema.parse(await req.json())

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            companyUsers: {
              where: { isPrimary: true },
              include: { user: { select: { email: true, firstName: true } } },
            },
          },
        },
      },
    })

    if (!product) throw new ApiError(404, 'Product not found')

    const statusMap: Record<string, 'APPROVED' | 'REJECTED' | 'SUSPENDED'> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      SUSPEND: 'SUSPENDED',
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        status: statusMap[action],
        approvedAt: action === 'APPROVE' ? new Date() : null,
        approvedBy: action === 'APPROVE' ? authUser.userId : null,
        rejectedReason: action === 'REJECT' ? reason : null,
      },
    })

    if (action === 'APPROVE') {
      await logApprove(authUser.userId, 'products', 'Product', id)

      // Index in search
      try {
        await indexProduct({
          id: product.id,
          name: product.name,
          slug: product.slug,
          shortDescription: product.shortDescription,
          companyId: product.companyId,
          categoryId: product.categoryId,
          priceMin: product.priceMin?.toString(),
          priceMax: product.priceMax?.toString(),
          moq: product.moq?.toString(),
          status: 'APPROVED',
          isFeatured: product.isFeatured,
        })
      } catch { /* non-critical */ }
    } else {
      await logReject(authUser.userId, 'products', 'Product', id, reason)
      await removeProductFromIndex(id)
    }

    // Notify supplier owner
    const owner = product.company.companyUsers[0]?.user
    if (owner) {
      await createNotification({
        userId: product.company.companyUsers[0].userId,
        type: action === 'APPROVE' ? 'PRODUCT_APPROVED' : 'PRODUCT_REJECTED',
        title: action === 'APPROVE' ? 'Product Approved' : 'Product Rejected',
        message: action === 'APPROVE'
          ? `Your product "${product.name}" has been approved and is now live.`
          : `Your product "${product.name}" was rejected. Reason: ${reason || 'No reason provided'}`,
        data: { productId: product.id },
      })

      await sendProductApprovalEmail(
        owner.email,
        owner.firstName,
        product.name,
        action === 'APPROVE',
        reason
      )
    }

    return successResponse(updated, `Product ${action.toLowerCase()}d successfully`)
  } catch (error) {
    return handleApiError(error)
  }
}
