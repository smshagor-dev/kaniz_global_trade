import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { getAuthUser, requireCompanyAccess, isAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { refreshCompanyCreditProfile } from '@/lib/trust/credit-score'

const schema = z.object({
  providerName: z.string().min(2),
  inspectorName: z.string().optional(),
  reportNumber: z.string().min(3),
  score: z.number().int().min(0).max(100).optional(),
  summary: z.string().optional(),
  findings: z.string().optional(),
  reportUrl: z.string().url().optional(),
  inspectedAt: z.string().optional(),
  status: z.enum(['REQUESTED', 'SCHEDULED', 'COMPLETED', 'VERIFIED', 'REJECTED']).default('COMPLETED'),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const reports = await prisma.inspectionReport.findMany({
      where: { companyId: id },
      orderBy: [{ status: 'desc' }, { inspectedAt: 'desc' }, { createdAt: 'desc' }],
    })
    return successResponse(reports, 'Inspection reports fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authUser = await getAuthUser(req)
    if (!authUser) throw new ApiError(401, 'Authentication required')
    if (!isAdmin(authUser)) {
      await requireCompanyAccess(req, id)
    }

    const data = schema.parse(await req.json())
    const report = await prisma.inspectionReport.create({
      data: {
        companyId: id,
        providerName: data.providerName,
        inspectorName: data.inspectorName,
        reportNumber: data.reportNumber,
        score: data.score,
        summary: data.summary,
        findings: data.findings,
        reportUrl: data.reportUrl,
        inspectedAt: data.inspectedAt ? new Date(data.inspectedAt) : null,
        status: data.status,
        verifiedAt: data.status === 'VERIFIED' ? new Date() : null,
        reviewedBy: isAdmin(authUser) ? authUser.userId : null,
      },
    })
    await refreshCompanyCreditProfile(id)
    return successResponse(report, 'Inspection report saved', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
