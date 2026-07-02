'use client'

import api from '@/lib/utils/api-client'

export type UploadType =
  | 'product_image'
  | 'product_video'
  | 'product_doc'
  | 'category_image'
  | 'company_logo'
  | 'company_banner'
  | 'company_gallery'
  | 'company_doc'
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

export type UploadAssetResult = {
  url: string
  key: string
  size: number
  mimeType: string
  filename: string
  thumbnailUrl?: string | null
  accessUrl?: string | null
  private?: boolean
}

export async function uploadAsset(file: File, type: UploadType) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)

  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data.data as UploadAssetResult
}
