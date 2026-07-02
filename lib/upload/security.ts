import path from 'path'
import prisma from '@/lib/db/prisma'
import {
  ALLOWED_DOC_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  UPLOAD_FOLDERS,
  getSignedUrl,
} from '@/lib/storage'
import {
  ApiError,
  AuthUser,
  isAdmin,
  isBuyer,
  isSupplier,
  requireChatRoomAccess,
  requireCompanyAccess,
} from '@/lib/permissions'
import { createAuditLog } from '@/lib/utils/audit'

type DbClient = typeof prisma

export type UploadPurpose =
  | 'product_image'
  | 'product_video'
  | 'product_doc'
  | 'category_image'
  | 'company_logo'
  | 'company_banner'
  | 'company_gallery'
  | 'company_doc'
  | 'company_certificate'
  | 'inspection_report'
  | 'certificate'
  | 'chat_attachment'
  | 'rfq_attachment'
  | 'inquiry_attachment'
  | 'blog_image'
  | 'avatar'
  | 'payment_proof'
  | 'kyc_document'
  | 'insurance_claim_evidence'
  | 'fraud_evidence'
  | 'dispute_evidence'
  | 'trade_document'

type UploadKind = 'image' | 'document' | 'video' | 'image_or_document'

type UploadPolicy = {
  purpose: UploadPurpose
  folder: string
  kind: UploadKind
  maxSize: number
  isPrivate: boolean
  companyScoped?: boolean
  roomScoped?: boolean
  blockedExtensions?: string[]
}

const MB = 1024 * 1024
const DEFAULT_BLOCKED_EXTENSIONS = [
  '.ade',
  '.adp',
  '.apk',
  '.app',
  '.bat',
  '.chm',
  '.cmd',
  '.com',
  '.cpl',
  '.dll',
  '.exe',
  '.hta',
  '.html',
  '.htm',
  '.jar',
  '.js',
  '.jse',
  '.lnk',
  '.msi',
  '.msp',
  '.php',
  '.ps1',
  '.py',
  '.rb',
  '.scr',
  '.sh',
  '.svg',
  '.vbe',
  '.vbs',
  '.wsf',
]

const PURPOSES: Record<UploadPurpose, UploadPolicy> = {
  product_image: { purpose: 'product_image', folder: UPLOAD_FOLDERS.PRODUCT_IMAGES, kind: 'image', maxSize: 10 * MB, isPrivate: false, companyScoped: true },
  product_video: { purpose: 'product_video', folder: UPLOAD_FOLDERS.PRODUCT_VIDEOS, kind: 'video', maxSize: 100 * MB, isPrivate: false, companyScoped: true },
  product_doc: { purpose: 'product_doc', folder: UPLOAD_FOLDERS.PRODUCT_DOCS, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true, companyScoped: true },
  category_image: { purpose: 'category_image', folder: UPLOAD_FOLDERS.CATEGORY_IMAGES, kind: 'image', maxSize: 10 * MB, isPrivate: false },
  company_logo: { purpose: 'company_logo', folder: UPLOAD_FOLDERS.COMPANY_LOGOS, kind: 'image', maxSize: 10 * MB, isPrivate: false, companyScoped: true },
  company_banner: { purpose: 'company_banner', folder: UPLOAD_FOLDERS.COMPANY_BANNERS, kind: 'image', maxSize: 10 * MB, isPrivate: false, companyScoped: true },
  company_gallery: { purpose: 'company_gallery', folder: UPLOAD_FOLDERS.COMPANY_GALLERY, kind: 'image', maxSize: 10 * MB, isPrivate: false, companyScoped: true },
  company_doc: { purpose: 'company_doc', folder: UPLOAD_FOLDERS.COMPANY_DOCS, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true, companyScoped: true },
  company_certificate: { purpose: 'company_certificate', folder: UPLOAD_FOLDERS.CERTIFICATES, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true, companyScoped: true },
  inspection_report: { purpose: 'inspection_report', folder: UPLOAD_FOLDERS.INSPECTION_REPORTS, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true, companyScoped: true },
  certificate: { purpose: 'certificate', folder: UPLOAD_FOLDERS.CERTIFICATES, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true, companyScoped: true },
  chat_attachment: { purpose: 'chat_attachment', folder: UPLOAD_FOLDERS.CHAT_ATTACHMENTS, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true, roomScoped: true },
  rfq_attachment: { purpose: 'rfq_attachment', folder: UPLOAD_FOLDERS.RFQ_ATTACHMENTS, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true },
  inquiry_attachment: { purpose: 'inquiry_attachment', folder: UPLOAD_FOLDERS.INQUIRY_ATTACHMENTS, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true },
  blog_image: { purpose: 'blog_image', folder: UPLOAD_FOLDERS.BLOG_IMAGES, kind: 'image', maxSize: 10 * MB, isPrivate: false },
  avatar: { purpose: 'avatar', folder: UPLOAD_FOLDERS.AVATARS, kind: 'image', maxSize: 10 * MB, isPrivate: false },
  payment_proof: { purpose: 'payment_proof', folder: UPLOAD_FOLDERS.PAYMENT_PROOFS, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true },
  kyc_document: { purpose: 'kyc_document', folder: UPLOAD_FOLDERS.KYC_DOCUMENTS, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true },
  insurance_claim_evidence: { purpose: 'insurance_claim_evidence', folder: UPLOAD_FOLDERS.INSURANCE_CLAIM_EVIDENCE, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true },
  fraud_evidence: { purpose: 'fraud_evidence', folder: UPLOAD_FOLDERS.FRAUD_EVIDENCE, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true },
  dispute_evidence: { purpose: 'dispute_evidence', folder: UPLOAD_FOLDERS.DISPUTE_EVIDENCE, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true },
  trade_document: { purpose: 'trade_document', folder: UPLOAD_FOLDERS.INSPECTION_REPORTS, kind: 'image_or_document', maxSize: 20 * MB, isPrivate: true },
}

const MIME_BY_KIND: Record<UploadKind, string[]> = {
  image: ALLOWED_IMAGE_TYPES,
  document: ALLOWED_DOC_TYPES,
  video: ALLOWED_VIDEO_TYPES,
  image_or_document: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES],
}

const EXTENSIONS_BY_MIME: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/ogg': ['.ogg'],
  'video/quicktime': ['.mov'],
}

export function validateUploadPurpose(value: string | null | undefined) {
  const normalized = String(value || '').trim().toLowerCase() as UploadPurpose
  const policy = PURPOSES[normalized]
  if (!policy) {
    throw new ApiError(400, `Unknown upload type: ${value}`)
  }
  return policy
}

export function sanitizeFilename(filename: string) {
  const parsed = path.parse(filename || 'upload')
  const normalizedBase = parsed.name
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 80) || 'upload'
  const normalizedExt = parsed.ext
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .slice(0, 10)

  return `${normalizedBase}${normalizedExt}`
}

export function validateFileMimeType(policy: UploadPolicy, mimeType: string, filename: string) {
  const normalizedMimeType = String(mimeType || '').toLowerCase()
  const allowedMimeTypes = MIME_BY_KIND[policy.kind]
  const normalizedFilename = sanitizeFilename(filename)
  const extension = path.extname(normalizedFilename).toLowerCase()
  const blockedExtensions = policy.blockedExtensions || DEFAULT_BLOCKED_EXTENSIONS

  if (blockedExtensions.includes(extension)) {
    throw new ApiError(400, 'Executable or script uploads are not allowed')
  }

  if (!allowedMimeTypes.includes(normalizedMimeType)) {
    throw new ApiError(400, 'Unsupported file type')
  }

  const allowedExtensions = EXTENSIONS_BY_MIME[normalizedMimeType] || []
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new ApiError(400, 'File extension does not match the declared MIME type')
  }

  return {
    mimeType: normalizedMimeType,
    filename: normalizedFilename,
    extension,
  }
}

export function validateFileSize(policy: UploadPolicy, size: number) {
  if (size > policy.maxSize) {
    throw new ApiError(400, `File too large. Max ${Math.round(policy.maxSize / MB)} MB.`)
  }
}

type UploadAccessInput = {
  purpose: UploadPurpose
  companyId?: string | null
  entityType?: string | null
  entityId?: string | null
  roomId?: string | null
  db?: DbClient
}

async function requireTradeOrderAccess(user: AuthUser, tradeOrderId: string, db: DbClient) {
  const order = await db.tradeOrder.findUnique({
    where: { id: tradeOrderId },
    select: { id: true, buyerId: true, supplierCompanyId: true },
  })
  if (!order) throw new ApiError(404, 'Trade order not found')
  if (isAdmin(user)) return order
  if (order.buyerId === user.userId) return order
  if (user.companyId && order.supplierCompanyId === user.companyId) {
    await requireCompanyAccess(user, order.supplierCompanyId)
    return order
  }
  throw new ApiError(403, 'Access denied')
}

async function requireInquiryAccess(user: AuthUser, inquiryId: string, db: DbClient) {
  const inquiry = await db.inquiry.findUnique({
    where: { id: inquiryId },
    select: { id: true, buyerId: true, companyId: true },
  })
  if (!inquiry) throw new ApiError(404, 'Inquiry not found')
  if (isAdmin(user)) return inquiry
  if (inquiry.buyerId === user.userId) return inquiry
  if (user.companyId && inquiry.companyId === user.companyId) {
    await requireCompanyAccess(user, inquiry.companyId)
    return inquiry
  }
  throw new ApiError(403, 'Access denied')
}

async function requireRfqAccess(user: AuthUser, rfqId: string, db: DbClient) {
  const rfq = await db.rFQ.findUnique({
    where: { id: rfqId },
    select: { id: true, buyerId: true },
  })
  if (!rfq) throw new ApiError(404, 'RFQ not found')
  if (isAdmin(user) || rfq.buyerId === user.userId) return rfq
  throw new ApiError(403, 'Access denied')
}

async function requireInsuranceClaimAccess(user: AuthUser, claimId: string, db: DbClient) {
  const claim = await db.insuranceClaim.findUnique({
    where: { id: claimId },
    select: { id: true, buyerId: true, companyId: true },
  })
  if (!claim) throw new ApiError(404, 'Insurance claim not found')
  if (isAdmin(user) || claim.buyerId === user.userId) return claim
  if (user.companyId && claim.companyId === user.companyId) {
    await requireCompanyAccess(user, claim.companyId)
    return claim
  }
  throw new ApiError(403, 'Access denied')
}

async function requireDisputeAccess(user: AuthUser, disputeId: string, db: DbClient) {
  const dispute = await db.escrowDispute.findUnique({
    where: { id: disputeId },
    select: { id: true, buyerId: true, supplierCompanyId: true },
  })
  if (!dispute) throw new ApiError(404, 'Dispute not found')
  if (isAdmin(user) || dispute.buyerId === user.userId) return dispute
  if (user.companyId && dispute.supplierCompanyId === user.companyId) {
    await requireCompanyAccess(user, dispute.supplierCompanyId)
    return dispute
  }
  throw new ApiError(403, 'Access denied')
}

async function requireInspectionAccess(user: AuthUser, reportId: string, db: DbClient) {
  const report = await db.inspectionReport.findUnique({
    where: { id: reportId },
    select: { id: true, companyId: true },
  })
  if (!report) throw new ApiError(404, 'Inspection report not found')
  if (isAdmin(user)) return report
  await requireCompanyAccess(user, report.companyId)
  return report
}

export async function requireUploadEntityAccess(user: AuthUser, input: UploadAccessInput) {
  const db = input.db ?? prisma
  const policy = validateUploadPurpose(input.purpose)

  if (policy.roomScoped) {
    if (!input.roomId) throw new ApiError(400, 'roomId is required for chat attachments')
    await requireChatRoomAccess({ user, roomId: input.roomId })
    return { companyId: user.companyId || null }
  }

  if (input.entityType && input.entityId) {
    switch (input.entityType) {
      case 'tradeOrder':
        await requireTradeOrderAccess(user, input.entityId, db)
        return { companyId: input.companyId || user.companyId || null }
      case 'inquiry':
        await requireInquiryAccess(user, input.entityId, db)
        return { companyId: input.companyId || user.companyId || null }
      case 'rfq':
        await requireRfqAccess(user, input.entityId, db)
        return { companyId: input.companyId || user.companyId || null }
      case 'insuranceClaim':
        await requireInsuranceClaimAccess(user, input.entityId, db)
        return { companyId: input.companyId || user.companyId || null }
      case 'dispute':
        await requireDisputeAccess(user, input.entityId, db)
        return { companyId: input.companyId || user.companyId || null }
      case 'inspectionReport':
        await requireInspectionAccess(user, input.entityId, db)
        return { companyId: input.companyId || user.companyId || null }
      default:
        throw new ApiError(400, `Unsupported upload entity type: ${input.entityType}`)
    }
  }

  if (policy.companyScoped) {
    const companyId = input.companyId || user.companyId
    if (!companyId) throw new ApiError(400, 'companyId is required for this upload purpose')
    await requireCompanyAccess(user, companyId)
    return { companyId }
  }

  if (policy.purpose === 'kyc_document') {
    if (input.companyId) {
      await requireCompanyAccess(user, input.companyId)
      return { companyId: input.companyId }
    }

    if (!isBuyer(user) && !isSupplier(user) && !isAdmin(user)) {
      throw new ApiError(403, 'Access denied')
    }

    return { companyId: user.companyId || null }
  }

  return { companyId: input.companyId || user.companyId || null }
}

export async function createUploadAuditLog(input: {
  user: AuthUser
  purpose: UploadPurpose
  key: string
  filename: string
  mimeType: string
  size: number
  isPrivate: boolean
  companyId?: string | null
  entityType?: string | null
  entityId?: string | null
}) {
  await createAuditLog({
    userId: input.user.userId,
    action: 'CREATE',
    module: 'upload',
    targetType: 'Upload',
    targetId: input.key,
    newData: {
      purpose: input.purpose,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      isPrivate: input.isPrivate,
      companyId: input.companyId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  })
}

export function extractStorageKeyFromUrl(url: string) {
  const parsed = new URL(url)
  const pathParts = parsed.pathname.split('/').filter(Boolean)
  if (pathParts.length >= 2) {
    return pathParts.slice(1).join('/')
  }
  throw new ApiError(400, 'Unable to resolve storage key from URL')
}

export async function createPrivateUploadAccessUrl(key: string, purpose: UploadPurpose) {
  const policy = validateUploadPurpose(purpose)
  if (!policy.isPrivate) {
    throw new ApiError(400, 'This upload purpose does not require private access')
  }
  return getSignedUrl(key)
}
