import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { getAuthUser, requireCompanyAccess, isAdmin, isBuyer, ApiError } from '@/lib/permissions'
import { getSignedUrl } from '@/lib/storage'
import { handleApiError, successResponse } from '@/lib/utils/api'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inspectionId: string }> }
) {
  try {
    const { id: companyId, inspectionId } = await params
    const authUser = await getAuthUser(req)
    if (!authUser) throw new ApiError(401, 'Authentication required')

    const report = await prisma.inspectionReport.findFirst({
      where: { id: inspectionId, companyId },
      select: {
        id: true,
        companyId: true,
        reportStorageKey: true,
        reportFilename: true,
        reportMimeType: true,
      },
    })
    if (!report) throw new ApiError(404, 'Inspection report not found')
    if (!report.reportStorageKey) throw new ApiError(404, 'No private attachment found for this inspection report')

    if (isAdmin(authUser)) {
      // admins always allowed
    } else if (authUser.companyId === companyId) {
      await requireCompanyAccess(req, companyId)
    } else if (isBuyer(authUser)) {
      const relationCount = await prisma.$transaction([
        prisma.tradeOrder.count({ where: { buyerId: authUser.userId, supplierCompanyId: companyId } }),
        prisma.sampleOrder.count({ where: { buyerId: authUser.userId, supplierCompanyId: companyId } }),
      ])
      if (relationCount[0] + relationCount[1] === 0) {
        throw new ApiError(403, 'No access to this supplier inspection attachment')
      }
    } else {
      throw new ApiError(403, 'Access denied')
    }

    const signedUrl = await getSignedUrl(report.reportStorageKey)
    return successResponse({
      url: signedUrl,
      filename: report.reportFilename,
      mimeType: report.reportMimeType,
    }, 'Signed report URL generated')
  } catch (error) {
    return handleApiError(error)
  }
}
