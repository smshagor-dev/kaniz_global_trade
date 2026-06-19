import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const updateSchema = z.object({
  policyId: z.string(),
  status: z.enum(['ACTIVE', 'CLAIM_OPEN', 'CLAIM_SETTLED', 'EXPIRED', 'CANCELLED']),
  documentUrl: z.string().optional(),
  underwriterNotes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const policies = await prisma.insurancePolicy.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        tradeOrder: { select: { id: true, productName: true } },
        sampleOrder: { select: { id: true, title: true } },
        claims: { orderBy: { createdAt: 'desc' } },
      },
    })
    return successResponse(policies, 'Admin insurance policies fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req)
    const data = updateSchema.parse(await req.json())
    const updated = await prisma.insurancePolicy.update({
      where: { id: data.policyId },
      data: {
        status: data.status,
        documentUrl: data.documentUrl,
        underwriterNotes: data.underwriterNotes,
      },
    })
    return successResponse(updated, 'Insurance policy updated')
  } catch (error) {
    return handleApiError(error)
  }
}
