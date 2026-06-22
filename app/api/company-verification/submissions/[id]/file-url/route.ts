import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { ApiError, isAdmin, requireAuth } from '@/lib/permissions'
import { getSignedUrl } from '@/lib/storage'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireAuth(req)
    const { id } = await params

    const submission = await prisma.companyVerificationSubmission.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            companyUsers: { select: { userId: true } },
          },
        },
      },
    })

    if (!submission?.fileStorageKey) throw new ApiError(404, 'Verification file not found')

    const canAccess = isAdmin(authUser) || submission.company.companyUsers.some((user) => user.userId === authUser.userId)
    if (!canAccess) throw new ApiError(403, 'Access denied')

    const url = await getSignedUrl(submission.fileStorageKey, 15 * 60)
    return successResponse({ url }, 'Signed verification file URL generated')
  } catch (error) {
    return handleApiError(error)
  }
}
