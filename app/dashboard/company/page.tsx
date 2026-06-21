'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Building2, ExternalLink, Loader2, Save, ShieldCheck } from 'lucide-react'
import { get, post, put } from '@/lib/utils/api-client'
import { LoadingButton } from '@/components/ui/loading-button'

type MyCompanySummary = {
  id: string
  name: string
  slug: string
  verificationStatus?: string | null
}

type CompanyDetails = {
  id: string
  name: string
  legalName?: string | null
  slug: string
  businessType: string
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  website?: string | null
  address?: string | null
  description?: string | null
  mainProducts?: string | null
  yearEstablished?: number | null
  verificationStatus?: string | null
  country?: { name: string } | null
}

const businessTypes = [
  'MANUFACTURER',
  'TRADING_COMPANY',
  'BUYING_OFFICE',
  'AGENT',
  'DISTRIBUTOR',
  'RETAILER',
  'GOVERNMENT',
  'ASSOCIATION',
  'INDIVIDUAL',
  'OTHER',
] as const

const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-400'

export default function DashboardCompanyPage() {
  const [form, setForm] = useState({
    name: '',
    legalName: '',
    businessType: 'MANUFACTURER',
    email: '',
    phone: '',
    whatsapp: '',
    website: '',
    address: '',
    description: '',
    mainProducts: '',
    yearEstablished: '',
  })
  const [saving, setSaving] = useState(false)

  const { data: myCompanyData, isLoading: loadingCompany, refetch: refetchCompany } = useQuery({
    queryKey: ['supplier-my-company-profile'],
    queryFn: () => get<MyCompanySummary | null>('/companies?myCompany=true'),
  })

  const companySummary = (myCompanyData?.data as MyCompanySummary | null | undefined) || null

  const { data: companyDetailsData, isLoading: loadingDetails, refetch: refetchDetails } = useQuery({
    queryKey: ['supplier-company-details', companySummary?.id],
    queryFn: () => get<CompanyDetails>(`/companies/${companySummary?.id}`),
    enabled: !!companySummary?.id,
  })

  const companyDetails = companyDetailsData?.data as CompanyDetails | undefined

  useEffect(() => {
    if (!companyDetails) return
    setForm({
      name: companyDetails.name || '',
      legalName: companyDetails.legalName || '',
      businessType: companyDetails.businessType || 'MANUFACTURER',
      email: companyDetails.email || '',
      phone: companyDetails.phone || '',
      whatsapp: companyDetails.whatsapp || '',
      website: companyDetails.website || '',
      address: companyDetails.address || '',
      description: companyDetails.description || '',
      mainProducts: companyDetails.mainProducts || '',
      yearEstablished: companyDetails.yearEstablished ? String(companyDetails.yearEstablished) : '',
    })
  }, [companyDetails])

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Company name is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        legalName: form.legalName || undefined,
        businessType: form.businessType as typeof businessTypes[number],
        email: form.email || undefined,
        phone: form.phone || undefined,
        whatsapp: form.whatsapp || undefined,
        website: form.website || '',
        address: form.address || undefined,
        description: form.description || undefined,
        mainProducts: form.mainProducts || undefined,
        yearEstablished: form.yearEstablished ? Number(form.yearEstablished) : undefined,
      }

      if (companySummary?.id) {
        await put(`/companies/${companySummary.id}`, payload)
        toast.success('Company profile updated')
        refetchDetails()
      } else {
        await post('/companies', payload)
        toast.success('Company created successfully')
        await refetchCompany()
      }
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save company profile'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loadingCompany || (companySummary?.id && loadingDetails)) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/75">Supplier Company</p>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold">
              <Building2 className="h-8 w-8 text-sky-300" />
              {companySummary?.name || 'Create your company profile'}
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              {companySummary
                ? 'Keep your public supplier profile updated so buyers can trust your business and send more inquiries.'
                : 'Create your supplier company profile to publish products, quote RFQs, and appear across the marketplace.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {companySummary?.slug ? (
              <Link
                href={`/companies/${companySummary.slug}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                <ExternalLink className="h-4 w-4" />
                View Public Profile
              </Link>
            ) : null}
            {companyDetails?.verificationStatus ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-100">
                <ShieldCheck className="h-4 w-4" />
                {companyDetails.verificationStatus.replace(/_/g, ' ')}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Company Details</h2>
          <p className="mt-1 text-sm text-gray-500">These details help buyers understand your business and discover your company in search.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company Name *">
            <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className={inputCls} placeholder="Your company name" />
          </Field>
          <Field label="Legal Name">
            <input value={form.legalName} onChange={(e) => setForm((current) => ({ ...current, legalName: e.target.value }))} className={inputCls} placeholder="Registered legal name" />
          </Field>
          <Field label="Business Type">
            <select value={form.businessType} onChange={(e) => setForm((current) => ({ ...current, businessType: e.target.value }))} className={inputCls}>
              {businessTypes.map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="Year Established">
            <input value={form.yearEstablished} onChange={(e) => setForm((current) => ({ ...current, yearEstablished: e.target.value }))} type="number" className={inputCls} placeholder="e.g. 2015" />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} type="email" className={inputCls} placeholder="company@example.com" />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} className={inputCls} placeholder="+880..." />
          </Field>
          <Field label="WhatsApp">
            <input value={form.whatsapp} onChange={(e) => setForm((current) => ({ ...current, whatsapp: e.target.value }))} className={inputCls} placeholder="WhatsApp number" />
          </Field>
          <Field label="Website">
            <input value={form.website} onChange={(e) => setForm((current) => ({ ...current, website: e.target.value }))} className={inputCls} placeholder="https://yourcompany.com" />
          </Field>
        </div>

        <div className="mt-4 grid gap-4">
          <Field label="Address">
            <textarea value={form.address} onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))} rows={3} className={inputCls} placeholder="Company address" />
          </Field>
          <Field label="Main Products">
            <textarea value={form.mainProducts} onChange={(e) => setForm((current) => ({ ...current, mainProducts: e.target.value }))} rows={3} className={inputCls} placeholder="Key products or categories you sell" />
          </Field>
          <Field label="Company Description">
            <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows={6} className={inputCls} placeholder="Describe your company, strengths, facilities, and export capabilities" />
          </Field>
        </div>

        <div className="mt-6 flex justify-end">
          <LoadingButton
            type="button"
            onClick={handleSave}
            loading={saving}
            loadingText="Saving..."
            icon={<Save className="h-4 w-4" />}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
          >
            {companySummary?.id ? 'Update Company' : 'Create Company'}
          </LoadingButton>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  )
}
