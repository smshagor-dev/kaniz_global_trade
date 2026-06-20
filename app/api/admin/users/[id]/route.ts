import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { logDelete } from '@/lib/utils/audit'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAdmin(req)
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, email: true },
    })
    if (!user) throw new ApiError(404, 'User not found')

    const deletedEmail = `${user.email}__deleted__${Date.now()}`

    await prisma.user.update({
      where: { id },
      data: {
        email: deletedEmail,
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    })

    await logDelete(authUser.userId, 'admin/users', 'User', id)
    return successResponse(null, 'User deleted successfully')
  } catch (error) {
    return handleApiError(error)
  }
}
