import { NextRequest } from 'next/server'
import { requireAuth, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError } from '@/lib/utils/api'
import {
  uploadImage,
  uploadFile,
} from '@/lib/storage'
import { FraudEventType } from '@prisma/client'
import { assertFraudActionAllowed, screenFraudEvent } from '@/lib/fraud/service'
import { FRAUD_ACTIONS } from '@/lib/fraud/shared'
import {
  createPrivateUploadAccessUrl,
  createUploadAuditLog,
  requireUploadEntityAccess,
  sanitizeFilename,
  validateFileMimeType,
  validateFileSize,
  validateUploadPurpose,
} from '@/lib/upload/security'
import { logUploadRejectEvent } from '@/lib/monitoring/event-helpers'

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const purpose = validateUploadPurpose(
      (formData.get('purpose') as string) || (formData.get('type') as string) || 'product_image'
    )
    const companyId = (formData.get('companyId') as string) || null
    const entityType = (formData.get('entityType') as string) || null
    const entityId = (formData.get('entityId') as string) || null
    const roomId = (formData.get('roomId') as string) || null

    if (!file) throw new ApiError(400, 'No file provided')

    if (!['kyc_document', 'fraud_evidence', 'dispute_evidence'].includes(purpose.purpose)) {
      await assertFraudActionAllowed({
        userId: authUser.userId,
        companyId: authUser.companyId,
        action: FRAUD_ACTIONS.DOCUMENT_UPLOAD,
      })
    }

    const mimeType = file.type
    const buffer = Buffer.from(await file.arrayBuffer())
    const size = buffer.length
    const safeFilename = sanitizeFilename(file.name)
    const { mimeType: normalizedMimeType } = validateFileMimeType(purpose, mimeType, safeFilename)
    validateFileSize(purpose, size)

    const accessScope = await requireUploadEntityAccess(authUser, {
      purpose: purpose.purpose,
      companyId,
      entityType,
      entityId,
      roomId,
    })

    if (purpose.kind === 'image') {
      const result = await uploadImage(buffer, purpose.folder, safeFilename, {
        mimeType: normalizedMimeType,
        isPrivate: purpose.isPrivate,
      })
      const privateUrl = purpose.isPrivate
        ? await createPrivateUploadAccessUrl(result.key, purpose.purpose)
        : null
      await createUploadAuditLog({
        user: authUser,
        purpose: purpose.purpose,
        key: result.key,
        filename: result.filename,
        mimeType: result.mimeType,
        size: result.size,
        isPrivate: purpose.isPrivate,
        companyId: accessScope.companyId,
        entityType,
        entityId,
      })
      await screenFraudEvent({
        req,
        actorUserId: authUser.userId,
        userId: authUser.userId,
        companyId: authUser.companyId,
        eventType: FraudEventType.DOCUMENT_UPLOAD,
        sourceModule: 'upload',
        title: 'Image upload activity',
        payload: { type: purpose.purpose, mimeType: normalizedMimeType, size, fileCount: 1, fileName: safeFilename, isPrivate: purpose.isPrivate },
      })
      return successResponse({
        ...result,
        accessUrl: privateUrl,
        private: purpose.isPrivate,
      }, 'Image uploaded')
    }

    if (purpose.kind === 'document' || purpose.kind === 'image_or_document') {
      const result = await uploadFile(buffer, purpose.folder, safeFilename, normalizedMimeType, purpose.isPrivate)
      const privateUrl = purpose.isPrivate
        ? await createPrivateUploadAccessUrl(result.key, purpose.purpose)
        : null
      await createUploadAuditLog({
        user: authUser,
        purpose: purpose.purpose,
        key: result.key,
        filename: result.filename,
        mimeType: result.mimeType,
        size: result.size,
        isPrivate: purpose.isPrivate,
        companyId: accessScope.companyId,
        entityType,
        entityId,
      })
      await screenFraudEvent({
        req,
        actorUserId: authUser.userId,
        userId: authUser.userId,
        companyId: authUser.companyId,
        eventType: FraudEventType.DOCUMENT_UPLOAD,
        sourceModule: 'upload',
        title: 'Document upload activity',
        payload: { type: purpose.purpose, mimeType: normalizedMimeType, size, fileCount: 1, fileName: safeFilename, isPrivate: purpose.isPrivate },
      })
      return successResponse({
        ...result,
        accessUrl: privateUrl,
        private: purpose.isPrivate,
      }, 'Document uploaded')
    }

    if (purpose.kind === 'video') {
      const result = await uploadFile(buffer, purpose.folder, safeFilename, normalizedMimeType, purpose.isPrivate)
      const extension = safeFilename.includes('.') ? safeFilename.slice(safeFilename.lastIndexOf('.')) : '.mp4'
      const { createVideoThumbnail } = await import('@/lib/media/video-thumbnail')
      const thumbnailBuffer = purpose.purpose === 'product_video'
        ? await createVideoThumbnail(buffer, extension)
        : null
      const thumbnailUpload = thumbnailBuffer
        ? await uploadImage(thumbnailBuffer, `${purpose.folder}/thumbs`, `${safeFilename}-thumb.jpg`, { width: 1280, height: 720, quality: 82 })
        : null
      await createUploadAuditLog({
        user: authUser,
        purpose: purpose.purpose,
        key: result.key,
        filename: result.filename,
        mimeType: result.mimeType,
        size: result.size,
        isPrivate: purpose.isPrivate,
        companyId: accessScope.companyId,
        entityType,
        entityId,
      })

      await screenFraudEvent({
        req,
        actorUserId: authUser.userId,
        userId: authUser.userId,
        companyId: authUser.companyId,
        eventType: FraudEventType.DOCUMENT_UPLOAD,
        sourceModule: 'upload',
        title: 'Video upload activity',
        payload: { type: purpose.purpose, mimeType: normalizedMimeType, size, fileCount: 1, fileName: safeFilename, generatedThumbnail: !!thumbnailUpload },
      })

      return successResponse(
        {
          ...result,
          thumbnailUrl: thumbnailUpload?.url || null,
        },
        'Video uploaded'
      )
    }

    throw new ApiError(400, 'Unsupported file type')
  } catch (error) {
    if (error instanceof ApiError) {
      await logUploadRejectEvent({
        message: 'Upload request rejected.',
        reason: error.message,
      })
    }
    return handleApiError(error)
  }
}
