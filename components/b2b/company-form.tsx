'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Building2, FileText, Loader2, Save, Upload } from 'lucide-react'
import { get, post, put } from '@/lib/utils/api-client'
import { b2bCompanySchema, type B2BCompanyInput, b2bCompanyTypes } from '@/lib/b2b/company-schema'
import { LoadingButton } from '@/components/ui/loading-button'
import { uploadAsset } from '@/lib/utils/upload'
import { CountrySelect } from '@/components/ui/country-select'

type B2BCompanyDetails = B2BCompanyInput & {
  id: string
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-400'

type B2BCompanyFormProps = {
  mode: 'create' | 'edit'
  portal: 'buyer' | 'supplier'
}

export function B2BCompanyForm({ mode, portal }: B2BCompanyFormProps) {
  const router = useRouter()
  const backHref = portal === 'buyer' ? '/buyer/b2b/company' : '/dashboard/b2b/company'
  const companyLabel = portal === 'buyer' ? 'Buyer Company' : 'Supplier Company'
  const [uploadingField, setUploadingField] = useState<'logo' | 'tradeLicenseFile' | 'taxDocumentFile' | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['b2b-company-form', mode],
    queryFn: () => get<B2BCompanyDetails | null>('/b2b/company'),
  })

  const company = (data?.data as B2BCompanyDetails | null | undefined) || null

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<B2BCompanyInput>({
    resolver: zodResolver(b2bCompanySchema),
    defaultValues: {
      companyName: '',
      legalName: '',
      companyType: 'BUYER',
      registrationNumber: '',
      taxNumber: '',
      country: '',
      city: '',
      address: '',
      website: '',
      phone: '',
      businessEmail: '',
      description: '',
      logo: '',
      tradeLicenseFile: '',
      taxDocumentFile: '',
    },
  })

  useEffect(() => {
    if (!company) return
    reset({
      companyName: company.companyName || '',
      legalName: company.legalName || '',
      companyType: company.companyType,
      registrationNumber: company.registrationNumber || '',
      taxNumber: company.taxNumber || '',
      country: company.country || '',
      city: company.city || '',
      address: company.address || '',
      website: company.website || '',
      phone: company.phone || '',
      businessEmail: company.businessEmail || '',
      description: company.description || '',
      logo: company.logo || '',
      tradeLicenseFile: company.tradeLicenseFile || '',
      taxDocumentFile: company.taxDocumentFile || '',
    })
  }, [company, reset])

  const logo = watch('logo')
  const tradeLicenseFile = watch('tradeLicenseFile')
  const taxDocumentFile = watch('taxDocumentFile')

  async function handleFileUpload(field: 'logo' | 'tradeLicenseFile' | 'taxDocumentFile', file: File) {
    setUploadingField(field)
    try {
      const uploaded = await uploadAsset(file, field === 'logo' ? 'company_logo' : 'company_doc')
      setValue(field, uploaded.url, { shouldValidate: true, shouldDirty: true })
      toast.success(field === 'logo' ? 'Logo uploaded' : 'Document uploaded')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(message || 'Upload failed')
    } finally {
      setUploadingField(null)
    }
  }

  async function onSubmit(values: B2BCompanyInput) {
    try {
      if (mode === 'create') {
        await post('/b2b/company', values)
        toast.success('B2B company profile created')
      } else {
        await put('/b2b/company', values)
        toast.success('B2B company profile updated')
      }

      router.push(backHref)
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(message || 'Failed to save B2B company profile')
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">{companyLabel}</p>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold">
          <Building2 className="h-8 w-8 text-emerald-300" />
          {mode === 'create' ? `Create ${companyLabel.toLowerCase()} profile` : `Edit ${companyLabel.toLowerCase()} profile`}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Create one company account and manage buyer-side and supplier-side verification separately.
        </p>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <input type="hidden" {...register('logo')} />
        <input type="hidden" {...register('tradeLicenseFile')} />
        <input type="hidden" {...register('taxDocumentFile')} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company Name *" error={errors.companyName?.message}>
            <input {...register('companyName')} className={inputCls} placeholder="Company name" />
          </Field>
          <Field label="Legal Name" error={errors.legalName?.message}>
            <input {...register('legalName')} className={inputCls} placeholder="Registered legal name" />
          </Field>
          <Field label="Company Type *" error={errors.companyType?.message}>
            <select {...register('companyType')} className={inputCls}>
              {b2bCompanyTypes.map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="Country *" error={errors.country?.message}>
            <CountrySelect
              value={watch('country')}
              onChange={(value) => setValue('country', value, { shouldValidate: true, shouldDirty: true })}
            />
          </Field>
          <Field label="City" error={errors.city?.message}>
            <input {...register('city')} className={inputCls} placeholder="City" />
          </Field>
          <Field label="Phone *" error={errors.phone?.message}>
            <input {...register('phone')} className={inputCls} placeholder="+880..." />
          </Field>
          <Field label="Business Email *" error={errors.businessEmail?.message}>
            <input {...register('businessEmail')} type="email" className={inputCls} placeholder="company@example.com" />
          </Field>
          <Field label="Website" error={errors.website?.message}>
            <input {...register('website')} className={inputCls} placeholder="https://example.com" />
          </Field>
          <Field label="Registration Number" error={errors.registrationNumber?.message}>
            <input {...register('registrationNumber')} className={inputCls} placeholder="Registration number" />
          </Field>
          <Field label="Tax Number" error={errors.taxNumber?.message}>
            <input {...register('taxNumber')} className={inputCls} placeholder="Tax number" />
          </Field>
          <Field label="Company Logo" error={errors.logo?.message}>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-700">
                {uploadingField === 'logo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingField === 'logo' ? 'Uploading logo...' : 'Upload logo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleFileUpload('logo', file)
                    event.target.value = ''
                  }}
                  disabled={uploadingField === 'logo'}
                />
              </label>
              {logo ? (
                <div className="rounded-xl border border-gray-200 p-3">
                  <img src={logo} alt="Company logo preview" className="h-16 w-16 rounded-lg object-cover" />
                </div>
              ) : null}
            </div>
          </Field>
          <Field label="Trade License File" error={errors.tradeLicenseFile?.message}>
            <DocumentUploadField
              value={tradeLicenseFile}
              loading={uploadingField === 'tradeLicenseFile'}
              onSelect={(file) => handleFileUpload('tradeLicenseFile', file)}
            />
          </Field>
          <Field label="Tax Document File" error={errors.taxDocumentFile?.message}>
            <DocumentUploadField
              value={taxDocumentFile}
              loading={uploadingField === 'taxDocumentFile'}
              onSelect={(file) => handleFileUpload('taxDocumentFile', file)}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4">
          <Field label="Address" error={errors.address?.message}>
            <textarea {...register('address')} rows={3} className={inputCls} placeholder="Business address" />
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <textarea {...register('description')} rows={5} className={inputCls} placeholder="Describe the business, capabilities, and trade focus" />
          </Field>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href={backHref} className="flex-1 rounded-xl border border-gray-200 py-3 text-center text-sm font-medium transition-colors hover:bg-gray-50">
            Cancel
          </Link>
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingText="Saving..."
            icon={<Save className="h-4 w-4" />}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {mode === 'create' ? `Create ${companyLabel}` : `Update ${companyLabel}`}
          </LoadingButton>
        </div>
      </form>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-500">{error}</span> : null}
    </label>
  )
}

function DocumentUploadField({
  value,
  loading,
  onSelect,
}: {
  value?: string
  loading: boolean
  onSelect: (file: File) => void
}) {
  const fileName = value ? value.split('/').pop() : ''

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-700">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {loading ? 'Uploading document...' : 'Upload document'}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onSelect(file)
            event.target.value = ''
          }}
          disabled={loading}
        />
      </label>
      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
        >
          <FileText className="h-4 w-4" />
          {fileName || 'Open uploaded document'}
        </a>
      ) : null}
    </div>
  )
}
