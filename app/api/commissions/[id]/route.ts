import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const updateSchema = z.object({
  status: z.enum(['PENDING', 'ACCRUED', 'SETTLED', 'WAIVED']),
  notes: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req)
    const { id } = await params
    const data = updateSchema.parse(await req.json())

    const existing = await prisma.platformCommission.findUnique({ where: { id } })
    if (!existing) throw new ApiError(404, 'Commission record not found')

    const updated = await prisma.platformCommission.update({
      where: { id },
      data: {
        status: data.status,
        notes: data.notes ?? existing.notes,
        recognizedAt:
          data.status === 'ACCRUED'
            ? existing.recognizedAt || new Date()
            : data.status === 'PENDING' || data.status === 'WAIVED'
              ? null
              : existing.recognizedAt,
        settledAt:
          data.status === 'SETTLED'
            ? existing.settledAt || new Date()
            : data.status === 'PENDING' || data.status === 'WAIVED' || data.status === 'ACCRUED'
              ? null
              : existing.settledAt,
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
        tradeOrder: { select: { id: true, productName: true, status: true, totalAmount: true, currencyCode: true } },
      },
    })

    return successResponse(updated, 'Commission updated')
  } catch (error) {
    return handleApiError(error)
  }
}
