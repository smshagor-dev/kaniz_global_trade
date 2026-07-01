import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth } from '@/lib/permissions'
import { feeCalculationService } from '@/lib/finance/service-fees'
import { handleApiError, successResponse } from '@/lib/utils/api'

const createSchema = z.object({
  companyId: z.string().optional(),
  feeCode: z.string().min(2),
  serviceName: z.string().min(2),
  description: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const items = await prisma.complianceServiceRequest.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(items, 'Compliance requests fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const data = createSchema.parse(await req.json())
    const feeResult = await feeCalculationService.calculateFee(data.feeCode, 0)
    const revenueLedger = await feeCalculationService.createRevenueLedger({
      sourceType: 'COMPLIANCE_SERVICE',
      sourceId: data.serviceName,
      userId: authUser.userId,
      companyId: data.companyId ?? null,
      grossAmount: feeResult.feeAmount,
      feeAmount: feeResult.feeAmount,
      netAmount: feeResult.feeAmount,
      currency: feeResult.currency,
      refundableAmount: feeResult.feeAmount,
    })
    const snapshot = await feeCalculationService.createFeeSnapshot({
      code: feeResult.code,
      sourceType: 'COMPLIANCE_SERVICE',
      sourceId: data.serviceName,
      userId: authUser.userId,
      companyId: data.companyId ?? null,
      serviceFeeSettingId: feeResult.serviceFeeSettingId,
      revenueLedgerId: revenueLedger.id,
      baseAmount: 0,
      feeAmount: feeResult.feeAmount,
      totalAmount: feeResult.feeAmount,
      currency: feeResult.currency,
      calculationData: { ...feeResult, serviceName: data.serviceName },
    })

    const request = await prisma.complianceServiceRequest.create({
      data: {
        userId: authUser.userId,
        companyId: data.companyId ?? null,
        serviceName: data.serviceName,
        description: data.description ?? null,
        serviceFeeSettingId: feeResult.serviceFeeSettingId,
        revenueLedgerId: revenueLedger.id,
        snapshotId: snapshot.id,
        paymentStatus: 'PAID',
        requestStatus: 'PAID',
        feeAmount: feeResult.feeAmount,
        totalAmount: feeResult.feeAmount,
        currency: feeResult.currency,
      },
    })

    return successResponse(request, 'Compliance service request created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
