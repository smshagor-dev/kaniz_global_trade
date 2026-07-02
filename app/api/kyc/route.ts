import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { refreshUserCreditProfile } from '@/lib/trust/credit-score'
import { FraudEventType } from '@prisma/client'
import { screenFraudEvent } from '@/lib/fraud/service'

const kycDocumentsSchema = z.object({
  passportCopy: z.array(z.string().url()).default([]),
  nationalIdFrontCopy: z.array(z.string().url()).default([]),
  nationalIdBackCopy: z.array(z.string().url()).default([]),
  addressProof: z.array(z.string().url()).default([]),
  businessLicenseCopy: z.array(z.string().url()).default([]),
  bankStatementCopy: z.array(z.string().url()).default([]),
  bankChequeCopy: z.array(z.string().url()).default([]),
  additional: z.array(z.string().url()).default([]),
})

const schema = z.object({
  legalName: z.string().optional(),
  companyId: z.string().optional(),
  identityDocumentType: z.enum(['PASSPORT', 'NID']).optional(),
  passportNumber: z.string().optional(),
  nationalIdNumber: z.string().optional(),
  personalCountry: z.string().optional(),
  personalCity: z.string().optional(),
  personalPostalCode: z.string().optional(),
  personalAddress: z.string().optional(),
  businessLicenseNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountType: z.string().optional(),
  bankCurrency: z.string().optional(),
  bankBranchName: z.string().optional(),
  bankBranchCode: z.string().optional(),
  bankRoutingNumber: z.string().optional(),
  bankSwiftCode: z.string().optional(),
  bankIban: z.string().optional(),
  bankCountry: z.string().optional(),
  bankCity: z.string().optional(),
  bankAddress: z.string().optional(),
  documentUrls: z.union([z.array(z.string().url()), kycDocumentsSchema]).default([]),
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
        identityDocumentType: data.identityDocumentType,
        passportNumber: data.passportNumber,
        nationalIdNumber: data.nationalIdNumber,
        personalCountry: data.personalCountry,
        personalCity: data.personalCity,
        personalPostalCode: data.personalPostalCode,
        personalAddress: data.personalAddress,
        businessLicenseNumber: data.businessLicenseNumber,
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        bankName: data.bankName,
        bankAccountType: data.bankAccountType,
        bankCurrency: data.bankCurrency,
        bankBranchName: data.bankBranchName,
        bankBranchCode: data.bankBranchCode,
        bankRoutingNumber: data.bankRoutingNumber,
        bankSwiftCode: data.bankSwiftCode,
        bankIban: data.bankIban,
        bankCountry: data.bankCountry,
        bankCity: data.bankCity,
        bankAddress: data.bankAddress,
        documentUrls: JSON.stringify(data.documentUrls),
        notes: data.notes,
        submittedAt: data.submit ? new Date() : null,
        status: data.submit ? 'SUBMITTED' : 'DRAFT',
      },
      update: {
        companyId: data.companyId,
        legalName: data.legalName,
        identityDocumentType: data.identityDocumentType,
        passportNumber: data.passportNumber,
        nationalIdNumber: data.nationalIdNumber,
        personalCountry: data.personalCountry,
        personalCity: data.personalCity,
        personalPostalCode: data.personalPostalCode,
        personalAddress: data.personalAddress,
        businessLicenseNumber: data.businessLicenseNumber,
        bankAccountName: data.bankAccountName,
        bankAccountNumber: data.bankAccountNumber,
        bankName: data.bankName,
        bankAccountType: data.bankAccountType,
        bankCurrency: data.bankCurrency,
        bankBranchName: data.bankBranchName,
        bankBranchCode: data.bankBranchCode,
        bankRoutingNumber: data.bankRoutingNumber,
        bankSwiftCode: data.bankSwiftCode,
        bankIban: data.bankIban,
        bankCountry: data.bankCountry,
        bankCity: data.bankCity,
        bankAddress: data.bankAddress,
        documentUrls: JSON.stringify(data.documentUrls),
        notes: data.notes,
        submittedAt: data.submit ? new Date() : undefined,
        status: data.submit ? 'SUBMITTED' : 'DRAFT',
      },
    })

    await refreshUserCreditProfile(authUser.userId)
    await screenFraudEvent({
      req,
      actorUserId: authUser.userId,
      userId: authUser.userId,
      companyId: data.companyId,
      eventType: FraudEventType.KYC_SUBMISSION,
      sourceModule: 'kyc',
      title: data.submit ? 'KYC submitted for review' : 'KYC draft updated',
      summary: data.submit ? 'KYC details and verification documents were submitted.' : 'KYC profile draft was updated.',
      payload: {
        submit: data.submit,
        identityDocumentType: data.identityDocumentType,
        bankCountry: data.bankCountry,
        bankName: data.bankName,
        documentUrls: data.documentUrls,
      },
    })
    return successResponse(profile, data.submit ? 'KYC submitted' : 'KYC saved')
  } catch (error) {
    return handleApiError(error)
  }
}
