import { z } from 'zod'

const allowedDocumentExtensions = ['pdf', 'jpg', 'jpeg', 'png']

function hasAllowedDocumentExtension(value: string) {
  const extension = value.split('.').pop()?.toLowerCase()
  return !!extension && allowedDocumentExtensions.includes(extension)
}

const optionalFileSchema = z.string().trim().optional().refine(
  (value) => !value || hasAllowedDocumentExtension(value),
  'Allowed file types: pdf, jpg, jpeg, png'
)

export const b2bCompanyTypes = [
  'BUYER',
  'SUPPLIER',
  'MANUFACTURER',
  'DISTRIBUTOR',
  'WHOLESALER',
  'RETAILER',
] as const

export const verificationStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const

export const b2bCompanySchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(200),
  legalName: z.string().trim().max(200).optional(),
  companyType: z.enum(b2bCompanyTypes, { message: 'Company type is required' }),
  registrationNumber: z.string().trim().max(120).optional(),
  taxNumber: z.string().trim().max(120).optional(),
  country: z.string().trim().min(1, 'Country is required').max(120),
  city: z.string().trim().max(120).optional(),
  address: z.string().trim().max(2000).optional(),
  website: z.union([z.string().trim().url('Website must be a valid URL'), z.literal('')]).optional(),
  phone: z.string().trim().min(1, 'Phone is required').max(60),
  businessEmail: z.string().trim().email('Business email must be valid'),
  description: z.string().trim().max(2000).optional(),
  logo: z.string().trim().max(500).optional(),
  tradeLicenseFile: optionalFileSchema,
  taxDocumentFile: optionalFileSchema,
})

export const b2bCompanyUpdateSchema = b2bCompanySchema

export const b2bVerificationActionSchema = z.object({
  note: z.string().trim().min(1, 'Note is required').max(2000).optional(),
})

export type B2BCompanyInput = z.infer<typeof b2bCompanySchema>
