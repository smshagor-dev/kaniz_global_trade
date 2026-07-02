'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

type VerificationAudience = 'buyer' | 'supplier'

type B2BCompanyRow = {
  id: string
  companyName: string
  companyType: string
  country: string
  buyerVerificationStatus: string
  supplierVerificationStatus: string
  createdAt: string
  user: {
    firstName: string
    lastName: string
    email: string
  }
}

export function B2BVerificationList({ audience }: { audience: VerificationAudience }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [companyType, setCompanyType] = useState('')

  const params = new URLSearchParams()
  if (search) params.set('q', search)
  if (companyType) params.set('companyType', companyType)
  if (status) {
    params.set(audience === 'buyer' ? 'buyerStatus' : 'supplierStatus', status)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-b2b-verifications', audience, search, status, companyType],
    queryFn: () => get<B2BCompanyRow[]>(`/admin/b2b/companies${params.toString() ? `?${params.toString()}` : ''}`),
  })

  const companies = (data?.data as B2BCompanyRow[] | undefined) || []
  const title = audience === 'buyer' ? 'Buyer Company Verification' : 'Supplier Company Verification'
  const subtitle = audience === 'buyer'
    ? 'Review buyer-side B2B company verification requests separately.'
    : 'Review supplier-side B2B company verification requests separately.'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="grid gap-3 rounded-xl border border-gray-100 bg-white p-4 md:grid-cols-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search company or user"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select value={companyType} onChange={(event) => setCompanyType(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All company types</option>
          <option value="BUYER">Buyer</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="MANUFACTURER">Manufacturer</option>
          <option value="DISTRIBUTOR">Distributor</option>
          <option value="WHOLESALER">Wholesaler</option>
          <option value="RETAILER">Retailer</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Country</th>
                <th className="px-4 py-3 font-semibold">{audience === 'buyer' ? 'Buyer Status' : 'Supplier Status'}</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const verificationStatus = audience === 'buyer' ? company.buyerVerificationStatus : company.supplierVerificationStatus

                return (
                  <tr key={company.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-900">{company.companyName}</td>
                    <td className="px-4 py-3 text-gray-600">{company.user.firstName} {company.user.lastName}<div className="text-xs text-gray-400">{company.user.email}</div></td>
                    <td className="px-4 py-3 text-gray-600">{company.companyType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-gray-600">{company.country}</td>
                    <td className="px-4 py-3"><StatusBadge status={verificationStatus} /></td>
                    <td className="px-4 py-3 text-gray-600">{new Date(company.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/b2b/companies/${company.id}?audience=${audience}`} className="text-blue-700 hover:underline">
                        Review
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {!isLoading && companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No verification requests found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles = status === 'APPROVED'
    ? 'bg-green-100 text-green-700'
    : status === 'REJECTED'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700'

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{status}</span>
}
