import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { feeCalculationService } from '@/lib/finance/service-fees'

const previewSchema = z.object({
  code: z.string().min(2),
  baseAmount: z.number().min(0),
  country: z.string().optional(),
  stateRegion: z.string().optional(),
  serviceType: z.string().default('SERVICE_FEE'),
  appliesTo: z.enum(['BUYER', 'SUPPLIER', 'SERVICE_FEE', 'SUBSCRIPTION']).default('SERVICE_FEE'),
})

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req)
    const data = previewSchema.parse(await req.json())
    const fee = await feeCalculationService.calculateFee(data.code, data.baseAmount)
    const tax = await feeCalculationService.calculateTaxVat(
      fee.feeAmount,
      data.country,
      data.serviceType,
      { stateRegion: data.stateRegion, appliesTo: data.appliesTo }
    )

    return successResponse(
      {
        baseAmount: data.baseAmount,
        fee,
        tax,
        finalAmount: Number((data.baseAmount + fee.feeAmount + tax.taxAmount).toFixed(2)),
      },
      'Fee preview calculated'
    )
  } catch (error) {
    return handleApiError(error)
  }
}
