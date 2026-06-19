import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import sharp from 'sharp'
import { getSettingsMap } from '@/lib/settings/system'

async function getStorageConfig() {
  const settings = await getSettingsMap([
    'S3_ACCESS_KEY',
    'S3_SECRET_KEY',
    'S3_BUCKET',
    'S3_ENDPOINT',
    'S3_REGION',
    'NEXT_PUBLIC_CDN_URL',
  ])

  return {
    s3: new S3Client({
      credentials: settings.S3_ACCESS_KEY && settings.S3_SECRET_KEY
        ? {
            accessKeyId: settings.S3_ACCESS_KEY,
            secretAccessKey: settings.S3_SECRET_KEY,
          }
        : undefined,
      endpoint: settings.S3_ENDPOINT,
      forcePathStyle: true,
      region: settings.S3_REGION || 'auto',
    }),
    bucket: settings.S3_BUCKET,
    cdnUrl: settings.NEXT_PUBLIC_CDN_URL || '',
    endpoint: settings.S3_ENDPOINT,
  }
}

export const UPLOAD_FOLDERS = {
  PRODUCT_IMAGES: 'products/images',
  PRODUCT_VIDEOS: 'products/videos',
  PRODUCT_DOCS: 'products/documents',
  COMPANY_LOGOS: 'companies/logos',
  COMPANY_BANNERS: 'companies/banners',
  COMPANY_GALLERY: 'companies/gallery',
  COMPANY_DOCS: 'companies/documents',
  CERTIFICATES: 'certificates',
  CHAT_ATTACHMENTS: 'chat/attachments',
  RFQ_ATTACHMENTS: 'rfq/attachments',
  INQUIRY_ATTACHMENTS: 'inquiry/attachments',
  BLOG_IMAGES: 'blog/images',
  BANNERS: 'banners',
  AVATARS: 'avatars',
  PAYMENT_PROOFS: 'payments/proofs',
} as const

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_DOC_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

export interface UploadResult {
  url: string
  key: string
  size: number
  mimeType: string
  filename: string
}

export function validateFileType(
  mimeType: string,
  allowed: string[]
): boolean {
  return allowed.includes(mimeType)
}

export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize
}

export async function uploadFile(
  buffer: Buffer,
  folder: string,
  originalFilename: string,
  mimeType: string,
  isPrivate = false
): Promise<UploadResult> {
  const { s3, bucket, cdnUrl, endpoint } = await getStorageConfig()
  const ext = path.extname(originalFilename)
  const filename = `${uuidv4()}${ext}`
  const key = `${folder}/${filename}`

  let uploadBuffer = buffer

  // Auto-optimize images
  if (ALLOWED_IMAGE_TYPES.includes(mimeType) && mimeType !== 'image/gif') {
    uploadBuffer = await sharp(buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer()
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: uploadBuffer,
      ContentType: mimeType,
      ACL: isPrivate ? 'private' : 'public-read',
      CacheControl: 'max-age=31536000',
    })
  )

  const url = cdnUrl ? `${cdnUrl}/${key}` : `${endpoint}/${bucket}/${key}`

  return {
    url,
    key,
    size: uploadBuffer.length,
    mimeType,
    filename,
  }
}

export async function uploadImage(
  buffer: Buffer,
  folder: string,
  originalFilename: string,
  options?: { width?: number; height?: number; quality?: number }
): Promise<UploadResult> {
  const { s3, bucket, cdnUrl, endpoint } = await getStorageConfig()
  const { width = 1920, height = 1920, quality = 85 } = options || {}

  const optimized = await sharp(buffer)
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer()

  const filename = `${uuidv4()}.webp`
  const key = `${folder}/${filename}`

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: optimized,
      ContentType: 'image/webp',
      ACL: 'public-read',
      CacheControl: 'max-age=31536000',
    })
  )

  const url = cdnUrl ? `${cdnUrl}/${key}` : `${endpoint}/${bucket}/${key}`

  return {
    url,
    key,
    size: optimized.length,
    mimeType: 'image/webp',
    filename,
  }
}

export async function generateThumbnail(
  buffer: Buffer,
  folder: string,
  size = 300
): Promise<UploadResult> {
  return uploadImage(buffer, `${folder}/thumbs`, 'thumb.webp', {
    width: size,
    height: size,
    quality: 75,
  })
}

export async function deleteFile(key: string): Promise<void> {
  const { s3, bucket } = await getStorageConfig()
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

export async function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const { s3, bucket } = await getStorageConfig()
  return getS3SignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn }
  )
}

export function parseFormData(
  body: Buffer,
  contentType: string
): Promise<{ fields: Record<string, string>; files: Record<string, { buffer: Buffer; filename: string; mimeType: string; size: number }> }> {
  return new Promise((resolve, reject) => {
    // For Next.js App Router, we use native FormData parsing
    // This is handled in route handlers directly
    reject(new Error('Use route handler FormData parsing instead'))
  })
}
