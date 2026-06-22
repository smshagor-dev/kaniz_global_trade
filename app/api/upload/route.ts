import { NextRequest } from 'next/server'
import { requireAuth, ApiError } from '@/lib/permissions'
import { successResponse, handleApiError } from '@/lib/utils/api'
import {
  uploadImage,
  uploadFile,
  UPLOAD_FOLDERS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
  ALLOWED_VIDEO_TYPES,
} from '@/lib/storage'

const MAX_IMAGE = 10 * 1024 * 1024   // 10 MB
const MAX_DOC   = 20 * 1024 * 1024   // 20 MB
const MAX_VIDEO = 100 * 1024 * 1024  // 100 MB

const FOLDER_MAP: Record<string, string> = {
  product_image:    UPLOAD_FOLDERS.PRODUCT_IMAGES,
  product_video:    UPLOAD_FOLDERS.PRODUCT_VIDEOS,
  product_doc:      UPLOAD_FOLDERS.PRODUCT_DOCS,
  category_image:   UPLOAD_FOLDERS.CATEGORY_IMAGES,
  company_logo:     UPLOAD_FOLDERS.COMPANY_LOGOS,
  company_banner:   UPLOAD_FOLDERS.COMPANY_BANNERS,
  company_gallery:  UPLOAD_FOLDERS.COMPANY_GALLERY,
  company_doc:      UPLOAD_FOLDERS.COMPANY_DOCS,
  inspection_report: UPLOAD_FOLDERS.INSPECTION_REPORTS,
  certificate:      UPLOAD_FOLDERS.CERTIFICATES,
  chat_attachment:  UPLOAD_FOLDERS.CHAT_ATTACHMENTS,
  rfq_attachment:   UPLOAD_FOLDERS.RFQ_ATTACHMENTS,
  inquiry_attachment: UPLOAD_FOLDERS.INQUIRY_ATTACHMENTS,
  blog_image:       UPLOAD_FOLDERS.BLOG_IMAGES,
  avatar:           UPLOAD_FOLDERS.AVATARS,
  payment_proof:    UPLOAD_FOLDERS.PAYMENT_PROOFS,
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'product_image'

    if (!file) throw new ApiError(400, 'No file provided')

    const folder = FOLDER_MAP[type]
    if (!folder) throw new ApiError(400, `Unknown upload type: ${type}`)

    const mimeType = file.type
    const buffer = Buffer.from(await file.arrayBuffer())
    const size = buffer.length

    const isPrivate = ['company_doc', 'product_doc', 'certificate', 'payment_proof', 'inspection_report'].includes(type)

    // Validate type & size
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      if (size > MAX_IMAGE) throw new ApiError(400, 'Image too large. Max 10 MB.')
      const result = await uploadImage(buffer, folder, file.name, { mimeType })
      return successResponse(result, 'Image uploaded')
    }

    if (ALLOWED_DOC_TYPES.includes(mimeType)) {
      if (size > MAX_DOC) throw new ApiError(400, 'Document too large. Max 20 MB.')
      const result = await uploadFile(buffer, folder, file.name, mimeType, isPrivate)
      return successResponse(result, 'Document uploaded')
    }

    if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
      if (size > MAX_VIDEO) throw new ApiError(400, 'Video too large. Max 100 MB.')
      const result = await uploadFile(buffer, folder, file.name, mimeType, false)
      const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.mp4'
      const { createVideoThumbnail } = await import('@/lib/media/video-thumbnail')
      const thumbnailBuffer = type === 'product_video'
        ? await createVideoThumbnail(buffer, extension)
        : null
      const thumbnailUpload = thumbnailBuffer
        ? await uploadImage(thumbnailBuffer, `${folder}/thumbs`, `${file.name}-thumb.jpg`, { width: 1280, height: 720, quality: 82 })
        : null

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
    return handleApiError(error)
  }
}
