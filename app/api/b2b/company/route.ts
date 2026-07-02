import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { requireAuth, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { b2bCompanySchema, b2bCompanyUpdateSchema } from '@/lib/b2b/company-schema'
import { buildB2BStatusSummary, getCompanyByUser } from '@/lib/b2b/company-service'
import { FraudEventType } from '@prisma/client'
import { assertFraudActionAllowed, screenFraudEvent } from '@/lib/fraud/service'
import { FRAUD_ACTIONS } from '@/lib/fraud/shared'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const company = await getCompanyByUser(authUser.userId)
    return successResponse(company, company ? 'B2B company fetched' : 'No B2B company found')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const body = await req.json()
    const data = b2bCompanySchema.parse(body)

    await assertFraudActionAllowed({
      userId: authUser.userId,
      action: FRAUD_ACTIONS.COMPANY_CREATE,
    })

    const existing = await prisma.b2BCompany.findUnique({
      where: { userId: authUser.userId },
      select: { id: true },
    })

    if (existing) {
      throw new ApiError(409, 'You already have a B2B company profile')
    }

    const company = await prisma.b2BCompany.create({
      data: {
        ...data,
        userId: authUser.userId,
        website: data.website || null,
      },
    })

    await screenFraudEvent({
      req,
      actorUserId: authUser.userId,
      userId: authUser.userId,
      companyId: company.id,
      eventType: FraudEventType.COMPANY_CREATE,
      sourceModule: 'b2b/company',
      title: 'B2B company profile created',
      summary: `${company.companyName} company onboarding submitted.`,
      payload: data,
    })

    return successResponse(company, 'B2B company profile created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const body = await req.json()
    const data = b2bCompanyUpdateSchema.parse(body)

    await assertFraudActionAllowed({
      userId: authUser.userId,
      action: FRAUD_ACTIONS.COMPANY_UPDATE,
    })

    const existing = await prisma.b2BCompany.findUnique({
      where: { userId: authUser.userId },
      select: { id: true },
    })

    if (!existing) {
      throw new ApiError(404, 'B2B company profile not found')
    }

    const company = await prisma.b2BCompany.update({
      where: { userId: authUser.userId },
      data: {
        ...data,
        website: data.website || null,
      },
    })

    await screenFraudEvent({
      req,
      actorUserId: authUser.userId,
      userId: authUser.userId,
      companyId: company.id,
      eventType: FraudEventType.COMPANY_UPDATE,
      sourceModule: 'b2b/company',
      title: 'B2B company profile updated',
      summary: `${company.companyName} company details changed.`,
      payload: data,
    })

    return successResponse(company, 'B2B company profile updated')
  } catch (error) {
    return handleApiError(error)
  }
}
