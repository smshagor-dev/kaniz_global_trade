import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth } from '@/lib/permissions'
import { feeCalculationService } from '@/lib/finance/service-fees'
import { handleApiError, successResponse } from '@/lib/utils/api'

const createSchema = z.object({
  companyId: z.string(),
  feeCode: z.string().min(2),
  verificationType: z.string().min(2),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const items = await prisma.verificationRequest.findMany({
      where: { requesterUserId: authUser.userId },
      orderBy: { createdAt: 'desc' },
    })
    return successResponse(items, 'Verification requests fetched')
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
      sourceType: 'VERIFICATION_SERVICE',
      sourceId: data.verificationType,
      userId: authUser.userId,
      companyId: data.companyId,
      grossAmount: feeResult.feeAmount,
      feeAmount: feeResult.feeAmount,
      netAmount: feeResult.feeAmount,
      currency: feeResult.currency,
      refundableAmount: feeResult.feeAmount,
    })
    const snapshot = await feeCalculationService.createFeeSnapshot({
      code: feeResult.code,
      sourceType: 'VERIFICATION_SERVICE',
      sourceId: data.verificationType,
      userId: authUser.userId,
      companyId: data.companyId,
      serviceFeeSettingId: feeResult.serviceFeeSettingId,
      revenueLedgerId: revenueLedger.id,
      baseAmount: 0,
      feeAmount: feeResult.feeAmount,
      totalAmount: feeResult.feeAmount,
      currency: feeResult.currency,
      calculationData: { ...feeResult, verificationType: data.verificationType },
    })

    const request = await prisma.verificationRequest.create({
      data: {
        requesterUserId: authUser.userId,
        companyId: data.companyId,
        verificationType: data.verificationType,
        serviceFeeSettingId: feeResult.serviceFeeSettingId,
        revenueLedgerId: revenueLedger.id,
        snapshotId: snapshot.id,
        paymentStatus: 'PAID',
        verificationStatus: 'PAID',
        feeAmount: feeResult.feeAmount,
        totalAmount: feeResult.feeAmount,
        currency: feeResult.currency,
      },
    })

    return successResponse(request, 'Verification request created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
