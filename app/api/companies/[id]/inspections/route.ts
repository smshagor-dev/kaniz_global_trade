import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { getAuthUser, requireCompanyAccess, isAdmin, isBuyer, ApiError, assertComplianceAccess } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { refreshCompanyCreditProfile } from '@/lib/trust/credit-score'
import { createNotification } from '@/server/services/notification'

const schema = z.object({
  providerName: z.string().min(2),
  inspectorName: z.string().optional(),
  reportNumber: z.string().min(3),
  score: z.number().int().min(0).max(100).optional(),
  summary: z.string().optional(),
  findings: z.string().optional(),
  reportUrl: z.string().url().optional(),
  reportStorageKey: z.string().optional(),
  reportFilename: z.string().optional(),
  reportMimeType: z.string().optional(),
  adminReviewNotes: z.string().optional(),
  inspectedAt: z.string().optional(),
  status: z.enum(['REQUESTED', 'SCHEDULED', 'COMPLETED', 'VERIFIED', 'REJECTED']).default('COMPLETED'),
})

const updateSchema = schema.partial().extend({
  id: z.string().min(1),
  action: z.enum(['REQUEST', 'SCHEDULE', 'COMPLETE', 'VERIFY', 'REJECT', 'UPDATE']).optional(),
})

const deleteSchema = z.object({
  id: z.string().min(1),
})

async function notifyAdminsAboutInspectionSubmission(companyId: string, reportId: string, reportNumber: string) {
  try {
    const [company, admins] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      }),
      prisma.user.findMany({
        where: {
          roles: {
            some: {
              role: {
                name: { in: ['ADMIN', 'SUPER_ADMIN'] },
              },
            },
          },
        },
        select: { id: true },
        take: 5,
      }),
    ])

    if (!company || admins.length === 0) return

    await Promise.all(admins.map((admin) => createNotification({
      userId: admin.id,
      type: 'ADMIN_ANNOUNCEMENT',
      title: 'New inspection report submitted',
      message: `${company.name} submitted inspection report ${reportNumber} for Kaniz Global Trade review.`,
      data: { companyId, inspectionReportId: reportId },
    })))
  } catch (error) {
    console.error('Failed to create inspection submission notifications:', error)
  }
}

async function notifyCompanyAboutInspectionUpdate(args: {
  companyId: string
  reportId: string
  reportNumber: string
  status: 'REQUESTED' | 'SCHEDULED' | 'COMPLETED' | 'VERIFIED' | 'REJECTED'
}) {
  try {
    const companyUsers = await prisma.companyUser.findMany({
      where: { companyId: args.companyId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      select: { userId: true },
      take: 3,
    })

    if (companyUsers.length === 0) return

    const statusLabel = args.status.toLowerCase().replace(/_/g, ' ')
    await Promise.all(companyUsers.map((companyUser) => createNotification({
      userId: companyUser.userId,
      type: 'ADMIN_ANNOUNCEMENT',
      title: 'Inspection review updated',
      message: `Inspection report ${args.reportNumber} is now marked as ${statusLabel}.`,
      data: {
        companyId: args.companyId,
        inspectionReportId: args.reportId,
        status: args.status,
      },
    })))
  } catch (error) {
    console.error('Failed to create inspection review notifications:', error)
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const authUser = await getAuthUser(req)
    const where: Record<string, unknown> = { companyId: id }

    if (!authUser) {
      where.status = { in: ['COMPLETED', 'VERIFIED'] }
    } else if (isAdmin(authUser)) {
      // admins can see everything
    } else if (authUser.companyId === id) {
      await requireCompanyAccess(req, id)
    } else if (isBuyer(authUser)) {
      where.status = { in: ['COMPLETED', 'VERIFIED'] }
    } else {
      where.status = { in: ['COMPLETED', 'VERIFIED'] }
    }

    const reports = await prisma.inspectionReport.findMany({
      where,
      orderBy: [{ inspectedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        company: { select: { id: true, name: true, slug: true } },
      },
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
    const adminMode = isAdmin(authUser)
    if (!adminMode) {
      await requireCompanyAccess(req, id)
      await assertComplianceAccess({
        userId: authUser.userId,
        audience: 'SUPPLIER',
        companyId: id,
      })
    }

    const data = schema.parse(await req.json())
    if (!adminMode && ['VERIFIED', 'REJECTED'].includes(data.status)) {
      throw new ApiError(403, 'Only Kaniz Global Trade can verify or reject inspection reports')
    }

    const duplicate = await prisma.inspectionReport.findUnique({
      where: { reportNumber: data.reportNumber },
      select: { id: true, companyId: true },
    })
    if (duplicate) {
      throw new ApiError(409, 'Report number already exists')
    }

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
        reportStorageKey: data.reportStorageKey,
        reportFilename: data.reportFilename,
        reportMimeType: data.reportMimeType,
        adminReviewNotes: adminMode ? data.adminReviewNotes : null,
        inspectedAt: data.inspectedAt ? new Date(data.inspectedAt) : null,
        status: data.status,
        verifiedAt: data.status === 'VERIFIED' ? new Date() : null,
        reviewedBy: isAdmin(authUser) ? authUser.userId : null,
      },
    })
    await refreshCompanyCreditProfile(id)
    if (!adminMode) {
      await notifyAdminsAboutInspectionSubmission(id, report.id, report.reportNumber)
    }
    return successResponse(report, 'Inspection report saved', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: companyId } = await params
    const authUser = await getAuthUser(req)
    if (!authUser) throw new ApiError(401, 'Authentication required')

    const adminMode = isAdmin(authUser)
    if (!adminMode) {
      await requireCompanyAccess(req, companyId)
      await assertComplianceAccess({
        userId: authUser.userId,
        audience: 'SUPPLIER',
        companyId,
      })
    }

    const data = updateSchema.parse(await req.json())
    const report = await prisma.inspectionReport.findFirst({
      where: { id: data.id, companyId },
    })
    if (!report) throw new ApiError(404, 'Inspection report not found')

    if (!adminMode && ['VERIFY', 'REJECT', 'REQUEST', 'SCHEDULE'].includes(data.action || '')) {
      throw new ApiError(403, 'Kaniz Global Trade review required for this inspection action')
    }
    if (!adminMode && data.status && ['VERIFIED', 'REJECTED'].includes(data.status)) {
      throw new ApiError(403, 'Only Kaniz Global Trade can verify or reject inspection reports')
    }

    if (data.reportNumber && data.reportNumber !== report.reportNumber) {
      const duplicate = await prisma.inspectionReport.findUnique({
        where: { reportNumber: data.reportNumber },
        select: { id: true },
      })
      if (duplicate) throw new ApiError(409, 'Report number already exists')
    }

    const nextStatus =
      data.action === 'REQUEST' ? 'REQUESTED' :
      data.action === 'SCHEDULE' ? 'SCHEDULED' :
      data.action === 'COMPLETE' ? 'COMPLETED' :
      data.action === 'VERIFY' ? 'VERIFIED' :
      data.action === 'REJECT' ? 'REJECTED' :
      data.status ?? report.status

    const updated = await prisma.inspectionReport.update({
      where: { id: report.id },
      data: {
        providerName: data.providerName ?? report.providerName,
        inspectorName: data.inspectorName !== undefined ? data.inspectorName : report.inspectorName,
        reportNumber: data.reportNumber ?? report.reportNumber,
        score: data.score !== undefined ? data.score : report.score,
        summary: data.summary !== undefined ? data.summary : report.summary,
        findings: data.findings !== undefined ? data.findings : report.findings,
        reportUrl: data.reportUrl !== undefined ? data.reportUrl : report.reportUrl,
        reportStorageKey: data.reportStorageKey !== undefined ? data.reportStorageKey : report.reportStorageKey,
        reportFilename: data.reportFilename !== undefined ? data.reportFilename : report.reportFilename,
        reportMimeType: data.reportMimeType !== undefined ? data.reportMimeType : report.reportMimeType,
        adminReviewNotes: adminMode
          ? (data.adminReviewNotes !== undefined ? data.adminReviewNotes : report.adminReviewNotes)
          : report.adminReviewNotes,
        inspectedAt: data.inspectedAt !== undefined ? (data.inspectedAt ? new Date(data.inspectedAt) : null) : report.inspectedAt,
        status: nextStatus,
        verifiedAt: nextStatus === 'VERIFIED' ? new Date() : nextStatus === 'REJECTED' || nextStatus === 'REQUESTED' || nextStatus === 'SCHEDULED' ? null : report.verifiedAt,
        reviewedBy: adminMode ? authUser.userId : report.reviewedBy,
      },
    })

    await refreshCompanyCreditProfile(companyId)
    if (adminMode && (data.action || report.status !== updated.status || data.adminReviewNotes !== undefined)) {
      await notifyCompanyAboutInspectionUpdate({
        companyId,
        reportId: updated.id,
        reportNumber: updated.reportNumber,
        status: updated.status,
      })
    }
    return successResponse(updated, 'Inspection report updated')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: companyId } = await params
    const authUser = await getAuthUser(req)
    if (!authUser) throw new ApiError(401, 'Authentication required')

    if (!isAdmin(authUser)) {
      await requireCompanyAccess(req, companyId)
      await assertComplianceAccess({
        userId: authUser.userId,
        audience: 'SUPPLIER',
        companyId,
      })
    }

    const { id } = deleteSchema.parse(await req.json())
    const report = await prisma.inspectionReport.findFirst({
      where: { id, companyId },
      select: { id: true, companyId: true },
    })
    if (!report) throw new ApiError(404, 'Inspection report not found')

    await prisma.inspectionReport.delete({ where: { id: report.id } })
    await refreshCompanyCreditProfile(companyId)
    return successResponse({ id: report.id }, 'Inspection report deleted')
  } catch (error) {
    return handleApiError(error)
  }
}
