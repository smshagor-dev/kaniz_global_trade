'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import Link from 'next/link'

interface CompanyRecord {
  id: string
  name: string
  slug: string
  status: string
  verificationStatus: string
  isVerified: boolean
  isPremium: boolean
  createdAt: string
  country?: { name: string; code: string }
  creditProfile?: { score: number } | null
  _count: {
    products: number
    inspectionReports: number
    tradeOrders: number
    sampleOrders: number
  }
}

export default function AdminCompaniesPage() {
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const query = status ? `/admin/companies?status=${status}&q=${encodeURIComponent(search)}` : `/admin/companies?q=${encodeURIComponent(search)}`

  const { data, isLoading } = useQuery({
    queryKey: ['admin-companies', status, search],
    queryFn: () => get<CompanyRecord[]>(query),
  })

  const companies = (data?.data || []) as CompanyRecord[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
        <p className="text-sm text-gray-500 mt-1">Kaniz Global Trade view of supplier profiles, trust signals, and trade activity.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company name or email"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {companies.map((company) => (
          <div key={company.id} className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{company.name}</h2>
                <p className="text-sm text-gray-500">
                  {company.country?.name || 'No country'} | {company.verificationStatus.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Credit Score</p>
                <p className="text-xl font-bold text-blue-700">{company.creditProfile?.score ?? 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Metric label="Products" value={company._count.products} />
              <Metric label="Inspections" value={company._count.inspectionReports} />
              <Metric label="Trade Orders" value={company._count.tradeOrders} />
              <Metric label="Samples" value={company._count.sampleOrders} />
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge>{company.status}</Badge>
              {company.isVerified && <Badge tone="green">Verified</Badge>}
              {company.isPremium && <Badge tone="amber">Premium</Badge>}
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <Link href={`/companies/${company.slug}`} target="_blank" className="text-blue-700 hover:underline">
                View Public Profile
              </Link>
              <Link href={`/admin/inspections`} className="text-blue-700 hover:underline">
                Review Inspections
              </Link>
            </div>
          </div>
        ))}

        {!isLoading && companies.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">
            No companies found.
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900">{value.toLocaleString()}</p>
    </div>
  )
}

function Badge({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'green' | 'amber' }) {
  const styles = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
  }

  return <span className={`px-2.5 py-1 rounded-full ${styles[tone]}`}>{children}</span>
}
