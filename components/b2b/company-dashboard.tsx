'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import { BadgeCheck, Building2, Loader2, Shield, Truck } from 'lucide-react'

type B2BStatusResponse = {
  company: null | {
    id: string
    companyName: string
    companyType: string
    buyerVerificationStatus: string
    buyerVerificationNote?: string | null
    buyerVerifiedAt?: string | null
    supplierVerificationStatus: string
    supplierVerificationNote?: string | null
    supplierVerifiedAt?: string | null
  }
  hasCompany: boolean
  supplierEligible: boolean
  isApprovedBuyer: boolean
  isApprovedSupplier: boolean
}

type B2BCompanyDashboardProps = {
  portal: 'buyer' | 'supplier'
}

function statusTone(status: string) {
  if (status === 'APPROVED') return 'bg-green-100 text-green-700'
  if (status === 'REJECTED') return 'bg-red-100 text-red-700'
  return 'bg-amber-100 text-amber-700'
}

function formatDate(value?: string | null) {
  if (!value) return 'Not verified yet'
  return new Date(value).toLocaleString()
}

export function B2BCompanyDashboard({ portal }: B2BCompanyDashboardProps) {
  const baseHref = portal === 'buyer' ? '/buyer/b2b/company' : '/dashboard/b2b/company'
  const companyLabel = portal === 'buyer' ? 'Buyer Company' : 'Supplier Company'
  const createLabel = portal === 'buyer' ? 'Create buyer company profile' : 'Create supplier company profile'

  const { data, isLoading } = useQuery({
    queryKey: ['b2b-company-status', portal],
    queryFn: () => get<B2BStatusResponse>('/b2b/company/status'),
  })

  const payload = data?.data as B2BStatusResponse | undefined

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!payload?.hasCompany || !payload.company) {
    return (
      <div className="space-y-6">
        <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/75">{companyLabel}</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold">
            <Building2 className="h-8 w-8 text-sky-300" />
            {createLabel}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Set up one company account, then manage buyer verification and supplier verification independently.
          </p>
          <Link href={`${baseHref}/create`} className="mt-5 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
            Create B2B Company
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/75">{companyLabel}</p>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold">
              <Building2 className="h-8 w-8 text-sky-300" />
              {payload.company.companyName}
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              Company type: <span className="font-semibold text-white">{payload.company.companyType.replace(/_/g, ' ')}</span>
            </p>
          </div>
          <Link href={`${baseHref}/edit`} className="inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
            Edit Company
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <VerificationCard
          icon={<BadgeCheck className="h-5 w-5 text-green-600" />}
          title="Buyer Verification"
          status={payload.company.buyerVerificationStatus}
          note={payload.company.buyerVerificationNote}
          verifiedAt={payload.company.buyerVerifiedAt}
          allowedText={payload.isApprovedBuyer ? 'Buyer-side B2B features are available.' : 'Buyer-side B2B features stay restricted until approval.'}
        />
        <VerificationCard
          icon={<Truck className="h-5 w-5 text-blue-600" />}
          title="Supplier Verification"
          status={payload.company.supplierVerificationStatus}
          note={payload.company.supplierVerificationNote}
          verifiedAt={payload.company.supplierVerifiedAt}
          allowedText={
            payload.isApprovedSupplier
              ? 'Supplier-side B2B features and wholesale product creation are available.'
              : payload.supplierEligible
                ? 'Supplier-side B2B features stay restricted until approval.'
                : 'This company type is not eligible for supplier-side wholesale creation.'
          }
        />
      </div>
    </div>
  )
}

function VerificationCard({
  icon,
  title,
  status,
  note,
  verifiedAt,
  allowedText,
}: {
  icon: React.ReactNode
  title: string
  status: string
  note?: string | null
  verifiedAt?: string | null
  allowedText: string
}) {
  return (
    <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gray-50 p-3">{icon}</div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(status)}`}>
            {status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm text-gray-600">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="font-semibold text-gray-900">Status Note</p>
          <p className="mt-1">{note || 'No admin note yet.'}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="font-semibold text-gray-900">Verified Date</p>
          <p className="mt-1">{formatDate(verifiedAt)}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-900">
          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4" />
            <p>{allowedText}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
