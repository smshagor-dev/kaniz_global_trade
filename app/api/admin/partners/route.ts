import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { deleteServicePartner, listAdminServicePartners, upsertServicePartner } from '@/lib/partners/server'

const partnerSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['FINANCING', 'INSURANCE']),
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(120),
  description: z.string().optional(),
  website: z.string().optional(),
  contactEmail: z.string().optional(),
  apiBaseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  accessToken: z.string().optional(),
  metadata: z.string().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

const deleteSchema = z.object({
  id: z.string(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const partners = await listAdminServicePartners(undefined, true)
    return successResponse(partners, 'Admin partners fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const data = partnerSchema.parse(await req.json())
    const partner = await upsertServicePartner(data)
    return successResponse(partner, data.id ? 'Partner updated' : 'Partner created')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req)
    const data = deleteSchema.parse(await req.json())
    const result = await deleteServicePartner(data.id)
    return successResponse(result, 'Partner removed')
  } catch (error) {
    return handleApiError(error)
  }
}
