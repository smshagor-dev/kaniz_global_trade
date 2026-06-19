import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { refreshUserCreditProfile } from '@/lib/trust/credit-score'

const schema = z.object({
  legalName: z.string().optional(),
  companyId: z.string().optional(),
  passportNumber: z.string().optional(),
  nationalIdNumber: z.string().optional(),
  businessLicenseNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  documentUrls: z.array(z.string().url()).default([]),
  notes: z.string().optional(),
  submit: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const profile = await prisma.kYCProfile.findUnique({ where: { userId: authUser.userId } })
    return successResponse(profile, 'KYC profile fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const data = schema.parse(await req.json())

    const profile = await prisma.kYCProfile.upsert({
      where: { userId: authUser.userId },
      create: {
        userId: authUser.userId,
        companyId: data.companyId,
        legalName: data.legalName,
        passportNumber: data.passportNumber,
        nationalIdNumber: data.nationalIdNumber,
        businessLicenseNumber: data.businessLicenseNumber,
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        bankName: data.bankName,
        documentUrls: JSON.stringify(data.documentUrls),
        notes: data.notes,
        submittedAt: data.submit ? new Date() : null,
        status: data.submit ? 'SUBMITTED' : 'DRAFT',
      },
      update: {
        companyId: data.companyId,
        legalName: data.legalName,
        passportNumber: data.passportNumber,
        nationalIdNumber: data.nationalIdNumber,
        businessLicenseNumber: data.businessLicenseNumber,
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        bankName: data.bankName,
        documentUrls: JSON.stringify(data.documentUrls),
        notes: data.notes,
        submittedAt: data.submit ? new Date() : undefined,
        status: data.submit ? 'SUBMITTED' : 'DRAFT',
      },
    })

    await refreshUserCreditProfile(authUser.userId)
    return successResponse(profile, data.submit ? 'KYC submitted' : 'KYC saved')
  } catch (error) {
    return handleApiError(error)
  }
}
