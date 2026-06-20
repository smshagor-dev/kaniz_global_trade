import { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { getDefaultPartner, listServicePartners } from '@/lib/partners/server'

const querySchema = z.object({
  type: z.enum(['FINANCING', 'INSURANCE']).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const data = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams.entries()))
    const [partners, defaultPartner] = await Promise.all([
      listServicePartners(data.type),
      data.type ? getDefaultPartner(data.type) : Promise.resolve(null),
    ])

    return successResponse({
      type: data.type || null,
      defaultPartner,
      partners,
    }, 'Service partners fetched')
  } catch (error) {
    return handleApiError(error)
  }
}
