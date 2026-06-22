import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { ApiError, requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { ensureServicePartnersSeeded } from '@/lib/partners/server'
import { createNotification } from '@/server/services/notification'
import { formatInsurancePolicy, humanizeInsuranceStatus } from '@/lib/insurance/policy'

const updateSchema = z.object({
  policyId: z.string(),
  status: z.enum(['ACTIVE', 'CLAIM_OPEN', 'CLAIM_SETTLED', 'EXPIRED', 'CANCELLED']).optional(),
  partnerId: z.string().optional(),
  documentUrl: z.string().optional(),
  underwriterNotes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await ensureServicePartnersSeeded()
    await requireAdmin(req)
    const policies = await prisma.insurancePolicy.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        product: { select: { id: true, name: true, slug: true } },
        partner: { select: { id: true, code: true, name: true, type: true, isDefault: true } },
        tradeOrder: { select: { id: true, productName: true, totalAmount: true, currencyCode: true, status: true } },
        sampleOrder: { select: { id: true, title: true, totalAmount: true, currencyCode: true, status: true } },
        claims: { orderBy: { createdAt: 'desc' } },
      },
    })
    return successResponse(policies.map(formatInsurancePolicy), 'Admin insurance policies fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureServicePartnersSeeded()
    await requireAdmin(req)
    const data = updateSchema.parse(await req.json())
    const selectedPartner = data.partnerId
      ? await prisma.servicePartner.findFirst({ where: { id: data.partnerId, type: 'INSURANCE', isActive: true } })
      : null

    if (data.partnerId && !selectedPartner) {
      throw new ApiError(404, 'Insurance partner not found')
    }

    const updated = await prisma.insurancePolicy.update({
      where: { id: data.policyId },
      data: {
        status: data.status,
        partnerId: selectedPartner?.id,
        providerName: selectedPartner?.name || undefined,
        documentUrl: data.documentUrl,
        underwriterNotes: data.underwriterNotes,
      },
      include: {
        company: { select: { id: true, name: true, slug: true } },
        buyer: { select: { id: true, firstName: true, lastName: true } },
        product: { select: { id: true, name: true, slug: true } },
        partner: { select: { id: true, code: true, name: true, type: true, isDefault: true } },
        tradeOrder: { select: { id: true, productName: true, totalAmount: true, currencyCode: true, status: true } },
        sampleOrder: { select: { id: true, title: true, totalAmount: true, currencyCode: true, status: true } },
        claims: { orderBy: { createdAt: 'desc' } },
      },
    })

    const formatted = formatInsurancePolicy(updated)
    if (updated.buyerId) {
      try {
        await createNotification({
          userId: updated.buyerId,
          type: 'INSURANCE_UPDATE',
          title: 'Insurance policy updated',
          message: `${formatted.sourceLabel} insurance is now ${humanizeInsuranceStatus(updated.status)}.`,
          data: { insurancePolicyId: updated.id, status: updated.status },
        })
      } catch (error) {
        console.error('Failed to create insurance policy notification:', error)
      }
    }

    return successResponse(formatted, 'Insurance policy updated')
  } catch (error) {
    return handleApiError(error)
  }
}
