import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, ROLES, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const buyerVerificationSchema = z.object({
  companyName: z.string().min(2).optional(),
  registrationNo: z.string().optional(),
  businessLicenseNo: z.string().optional(),
  taxId: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  companyAddress: z.string().optional(),
  contactRole: z.string().optional(),
  notes: z.string().optional(),
  documentUrls: z.array(z.string().url()).default([]),
  submit: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const verification = await prisma.buyerVerification.findUnique({
      where: { userId: authUser.userId },
    })

    return successResponse(verification, 'Buyer verification fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    if (!authUser.roles.includes(ROLES.BUYER) && !authUser.roles.includes(ROLES.SUPER_ADMIN)) {
      throw new ApiError(403, 'Buyer access required')
    }

    const data = buyerVerificationSchema.parse(await req.json())
    const status = data.submit ? 'SUBMITTED' : 'DRAFT'

    const verification = await prisma.buyerVerification.upsert({
      where: { userId: authUser.userId },
      create: {
        userId: authUser.userId,
        companyName: data.companyName,
        registrationNo: data.registrationNo,
        businessLicenseNo: data.businessLicenseNo,
        taxId: data.taxId,
        website: data.website || null,
        companyAddress: data.companyAddress,
        contactRole: data.contactRole,
        notes: data.notes,
        documentUrls: JSON.stringify(data.documentUrls),
        status,
        submittedAt: data.submit ? new Date() : null,
      },
      update: {
        companyName: data.companyName,
        registrationNo: data.registrationNo,
        businessLicenseNo: data.businessLicenseNo,
        taxId: data.taxId,
        website: data.website || null,
        companyAddress: data.companyAddress,
        contactRole: data.contactRole,
        notes: data.notes,
        documentUrls: JSON.stringify(data.documentUrls),
        status,
        submittedAt: data.submit ? new Date() : undefined,
      },
    })

    return successResponse(
      verification,
      data.submit ? 'Buyer verification submitted' : 'Buyer verification saved',
      undefined,
      201
    )
  } catch (error) {
    return handleApiError(error)
  }
}
