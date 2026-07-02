import { NextRequest } from 'next/server'
import { ApiError, requireAuth } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import {
  createPrivateUploadAccessUrl,
  extractStorageKeyFromUrl,
  requireUploadEntityAccess,
  validateUploadPurpose,
} from '@/lib/upload/security'

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const { searchParams } = new URL(req.url)
    const purpose = validateUploadPurpose(searchParams.get('purpose') || searchParams.get('type') || '')
    const key = searchParams.get('key')
      || (searchParams.get('url') ? extractStorageKeyFromUrl(searchParams.get('url') as string) : null)

    if (!key) {
      throw new ApiError(400, 'storage key is required')
    }

    await requireUploadEntityAccess(authUser, {
      purpose: purpose.purpose,
      companyId: searchParams.get('companyId'),
      entityType: searchParams.get('entityType'),
      entityId: searchParams.get('entityId'),
      roomId: searchParams.get('roomId'),
    })

    const url = await createPrivateUploadAccessUrl(key, purpose.purpose)
    return successResponse({ key, url, private: true }, 'Signed upload URL generated')
  } catch (error) {
    return handleApiError(error)
  }
}
