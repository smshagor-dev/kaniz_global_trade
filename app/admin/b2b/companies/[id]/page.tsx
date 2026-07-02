'use client'

import { useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { get, post } from '@/lib/utils/api-client'

type B2BCompanyDetails = {
  id: string
  companyName: string
  legalName?: string | null
  companyType: string
  registrationNumber?: string | null
  taxNumber?: string | null
  country: string
  city?: string | null
  address?: string | null
  website?: string | null
  phone: string
  businessEmail: string
  description?: string | null
  logo?: string | null
  tradeLicenseFile?: string | null
  taxDocumentFile?: string | null
  buyerVerificationStatus: string
  buyerVerificationNote?: string | null
  buyerVerifiedAt?: string | null
  supplierVerificationStatus: string
  supplierVerificationNote?: string | null
  supplierVerifiedAt?: string | null
  createdAt: string
  user: {
    firstName: string
    lastName: string
    email: string
    phone?: string | null
    roles: Array<{ role: { name: string } }>
  }
  buyerVerifiedByUser?: {
    firstName: string
    lastName: string
    email: string
  } | null
  supplierVerifiedByUser?: {
    firstName: string
    lastName: string
    email: string
  } | null
}

export default function AdminB2BCompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [buyerNote, setBuyerNote] = useState('')
  const [supplierNote, setSupplierNote] = useState('')
  const audience = searchParams.get('audience') === 'supplier' ? 'supplier' : 'buyer'
  const reviewTitle = audience === 'supplier' ? 'Supplier Company Verification Review' : 'Buyer Company Verification Review'
  const backHref = audience === 'supplier' ? '/admin/b2b/supplier-verifications' : '/admin/b2b/buyer-verifications'

  const { data, isLoading } = useQuery({
    queryKey: ['admin-b2b-company', id],
    queryFn: () => get<B2BCompanyDetails>(`/admin/b2b/companies/${id}`),
    enabled: !!id,
  })

  const company = data?.data as B2BCompanyDetails | undefined

  const buyerAction = useMutation({
    mutationFn: async ({ action, note }: { action: 'approve-buyer' | 'reject-buyer'; note?: string }) =>
      post(`/admin/b2b/companies/${id}/${action}`, note ? { note } : {}),
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'approve-buyer' ? 'Buyer verification approved' : 'Buyer verification rejected')
      queryClient.invalidateQueries({ queryKey: ['admin-b2b-company', id] })
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Buyer verification action failed'
      toast.error(message)
    },
  })

  const supplierAction = useMutation({
    mutationFn: async ({ action, note }: { action: 'approve-supplier' | 'reject-supplier'; note?: string }) =>
      post(`/admin/b2b/companies/${id}/${action}`, note ? { note } : {}),
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'approve-supplier' ? 'Supplier verification approved' : 'Supplier verification rejected')
      queryClient.invalidateQueries({ queryKey: ['admin-b2b-company', id] })
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Supplier verification action failed'
      toast.error(message)
    },
  })

  if (isLoading || !company) {
    return <div className="text-sm text-gray-500">{isLoading ? 'Loading B2B company...' : 'B2B company not found.'}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{reviewTitle}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{company.companyName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {company.user.firstName} {company.user.lastName} • {company.user.email}
          </p>
        </div>
        <button onClick={() => router.push(backHref)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">
          Back
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Buyer Company Review</p>
          <h2 className="mt-2 text-lg font-bold text-emerald-950">Buyer-side verification is reviewed separately</h2>
          <p className="mt-2 text-sm text-emerald-800">
            Approving buyer verification enables buyer-side B2B access only. It does not approve supplier-side access.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Supplier Company Review</p>
          <h2 className="mt-2 text-lg font-bold text-blue-950">Supplier-side verification is reviewed separately</h2>
          <p className="mt-2 text-sm text-blue-800">
            Approving supplier verification enables supplier-side B2B access and wholesale creation eligibility only.
          </p>
        </div>
      </div>

      <section className="grid gap-4 rounded-xl border border-gray-100 bg-white p-6 md:grid-cols-2">
        <Detail label="Company type" value={company.companyType.replace(/_/g, ' ')} />
        <Detail label="Country" value={company.country} />
        <Detail label="City" value={company.city} />
        <Detail label="Business email" value={company.businessEmail} />
        <Detail label="Phone" value={company.phone} />
        <Detail label="Registration number" value={company.registrationNumber} />
        <Detail label="Tax number" value={company.taxNumber} />
        <Detail label="Website" value={company.website} isLink />
        <Detail label="Address" value={company.address} />
        <Detail label="Created date" value={new Date(company.createdAt).toLocaleString()} />
        <Detail label="Buyer verified by" value={formatUser(company.buyerVerifiedByUser)} />
        <Detail label="Supplier verified by" value={formatUser(company.supplierVerifiedByUser)} />
        <div className="md:col-span-2">
          <p className="text-sm font-semibold text-gray-700">Description</p>
          <p className="mt-1 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">{company.description || 'No description provided.'}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">Trade License File</p>
          {company.tradeLicenseFile ? <a href={company.tradeLicenseFile} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-blue-700 hover:underline">Open document</a> : <p className="mt-1 text-sm text-gray-500">Not uploaded</p>}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">Tax Document File</p>
          {company.taxDocumentFile ? <a href={company.taxDocumentFile} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-blue-700 hover:underline">Open document</a> : <p className="mt-1 text-sm text-gray-500">Not uploaded</p>}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-bold text-gray-900">Buyer Company Verification</h2>
          <p className="mt-2 text-sm text-gray-500">Status: <StatusBadge status={company.buyerVerificationStatus} /></p>
          <p className="mt-2 text-sm text-gray-600">Current buyer note: {company.buyerVerificationNote || 'No buyer note yet.'}</p>
          <p className="mt-2 text-sm text-gray-600">Verified at: {company.buyerVerifiedAt ? new Date(company.buyerVerifiedAt).toLocaleString() : 'Not verified yet'}</p>
          <textarea value={buyerNote} onChange={(event) => setBuyerNote(event.target.value)} rows={4} className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" placeholder="Add buyer rejection or approval note" />
          <div className="mt-4 flex gap-3">
            <button onClick={() => buyerAction.mutate({ action: 'approve-buyer', note: buyerNote || undefined })} className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60" disabled={buyerAction.isPending}>
              Approve Buyer
            </button>
            <button onClick={() => buyerAction.mutate({ action: 'reject-buyer', note: buyerNote })} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60" disabled={buyerAction.isPending}>
              Reject Buyer
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-6">
          <h2 className="text-lg font-bold text-gray-900">Supplier Company Verification</h2>
          <p className="mt-2 text-sm text-gray-500">Status: <StatusBadge status={company.supplierVerificationStatus} /></p>
          <p className="mt-2 text-sm text-gray-600">Current supplier note: {company.supplierVerificationNote || 'No supplier note yet.'}</p>
          <p className="mt-2 text-sm text-gray-600">Verified at: {company.supplierVerifiedAt ? new Date(company.supplierVerifiedAt).toLocaleString() : 'Not verified yet'}</p>
          <textarea value={supplierNote} onChange={(event) => setSupplierNote(event.target.value)} rows={4} className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" placeholder="Add supplier rejection or approval note" />
          <div className="mt-4 flex gap-3">
            <button onClick={() => supplierAction.mutate({ action: 'approve-supplier', note: supplierNote || undefined })} className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60" disabled={supplierAction.isPending}>
              Approve Supplier
            </button>
            <button onClick={() => supplierAction.mutate({ action: 'reject-supplier', note: supplierNote })} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60" disabled={supplierAction.isPending}>
              Reject Supplier
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function Detail({ label, value, isLink = false }: { label: string; value?: string | null; isLink?: boolean }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700">{label}</p>
      {isLink && value ? (
        <a href={value} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-blue-700 hover:underline">{value}</a>
      ) : (
        <p className="mt-1 text-sm text-gray-600">{value || 'Not provided'}</p>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = status === 'APPROVED'
    ? 'bg-green-100 text-green-700'
    : status === 'REJECTED'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700'

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${styles}`}>{status}</span>
}

function formatUser(user?: { firstName: string; lastName: string; email: string } | null) {
  if (!user) return 'Not assigned'
  return `${user.firstName} ${user.lastName} (${user.email})`
}
