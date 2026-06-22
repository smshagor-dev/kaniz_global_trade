import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, requireSupplier } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const submissionSchema = z.object({
  requirementId: z.string().uuid(),
  textValue: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  fileStorageKey: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileMimeType: z.string().optional().nullable(),
})

const submitSchema = z.object({
  submissions: z.array(submissionSchema),
})

async function getPrimaryCompany(userId: string) {
  const companyUser = await prisma.companyUser.findFirst({
    where: { userId, isPrimary: true },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          verificationStatus: true,
          isVerified: true,
        },
      },
    },
  })

  return companyUser?.company || null
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireSupplier(req)
    const company = await getPrimaryCompany(authUser.userId)
    if (!company) throw new ApiError(404, 'Primary company not found')

    const requirements = await prisma.companyVerificationRequirement.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        submissions: {
          where: { companyId: company.id },
          take: 1,
        },
      },
    })

    return successResponse({
      company,
      requirements: requirements.map((requirement) => {
        const { submissions, ...rest } = requirement
        return {
          ...rest,
          submission: submissions[0] || null,
        }
      }),
    }, 'Company verification fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireSupplier(req)
    const company = await getPrimaryCompany(authUser.userId)
    if (!company) throw new ApiError(404, 'Primary company not found')

    const data = submitSchema.parse(await req.json())
    const incoming = new Map(data.submissions.map((item) => [item.requirementId, item]))

    const requirements = await prisma.companyVerificationRequirement.findMany({
      where: { isActive: true },
      include: {
        submissions: {
          where: { companyId: company.id },
          take: 1,
        },
      },
    })

    for (const requirement of requirements) {
      if (!requirement.isRequired) continue

      const next = incoming.get(requirement.id)
      const existing = requirement.submissions[0]
      const textValue = (next?.textValue ?? existing?.textValue ?? '').trim()
      const fileStorageKey = (next?.fileStorageKey ?? existing?.fileStorageKey ?? '').trim()

      if ((requirement.inputType === 'TEXT' || requirement.inputType === 'BOTH') && !textValue) {
        throw new ApiError(422, `${requirement.title} text is required`)
      }

      if ((requirement.inputType === 'FILE' || requirement.inputType === 'BOTH') && !fileStorageKey) {
        throw new ApiError(422, `${requirement.title} file upload is required`)
      }
    }

    const now = new Date()
    await prisma.$transaction(async (tx) => {
      for (const item of data.submissions) {
        const requirement = requirements.find((entry) => entry.id === item.requirementId)
        if (!requirement) continue

        await tx.companyVerificationSubmission.upsert({
          where: {
            companyId_requirementId: {
              companyId: company.id,
              requirementId: item.requirementId,
            },
          },
          create: {
            companyId: company.id,
            requirementId: item.requirementId,
            textValue: item.textValue?.trim() || null,
            fileUrl: item.fileUrl || null,
            fileStorageKey: item.fileStorageKey || null,
            fileName: item.fileName || null,
            fileMimeType: item.fileMimeType || null,
            status: 'SUBMITTED',
            submittedAt: now,
            adminNotes: null,
            reviewedAt: null,
            reviewedBy: null,
          },
          update: {
            textValue: item.textValue?.trim() || null,
            fileUrl: item.fileUrl || null,
            fileStorageKey: item.fileStorageKey || null,
            fileName: item.fileName || null,
            fileMimeType: item.fileMimeType || null,
            status: 'SUBMITTED',
            submittedAt: now,
            adminNotes: null,
            reviewedAt: null,
            reviewedBy: null,
          },
        })
      }

      await tx.company.update({
        where: { id: company.id },
        data: {
          verificationStatus: 'DOCUMENT_SUBMITTED',
          isVerified: false,
        },
      })

      await tx.companyVerification.upsert({
        where: { companyId: company.id },
        create: {
          companyId: company.id,
          status: 'DOCUMENT_SUBMITTED',
          submittedAt: now,
        },
        update: {
          status: 'DOCUMENT_SUBMITTED',
          submittedAt: now,
          rejectionReason: null,
        },
      })
    })

    return successResponse(null, 'Company verification documents submitted')
  } catch (error) {
    return handleApiError(error)
  }
}
