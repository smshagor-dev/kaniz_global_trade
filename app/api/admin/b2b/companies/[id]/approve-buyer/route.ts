import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { b2bVerificationActionSchema } from '@/lib/b2b/company-schema'
import { updateBuyerVerification } from '@/lib/b2b/admin-actions'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await requireAdmin(req)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const data = b2bVerificationActionSchema.parse(body)

    const company = await updateBuyerVerification(id, adminUser.userId, 'APPROVED', data.note)
    return successResponse(company, 'Buyer verification approved')
  } catch (error) {
    return handleApiError(error)
  }
}
