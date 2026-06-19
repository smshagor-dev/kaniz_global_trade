'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import { useAuthStore } from '@/store/auth'
import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Package, MessageSquare, FileText, Eye, TrendingUp,
  CheckCircle, Plus, Quote, Shield, ArrowUpRight,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DashboardData {
  totals: {
    profileViews: number; productViews: number; inquiries: number
    rfqs: number; messages: number; quotations: number
  }
  acceptanceRate: number
  dailyChart: { date: string; profileViews: number; productViews: number; inquiries: number }[]
  topProducts: { id: string; name: string; slug: string; totalViews: number; totalInquiries: number; images: { url: string }[] }[]
  company: {
    totalViews: number; totalInquiries: number
    _count: { products: number; reviews: number }
  }
}

interface CompanySummary {
  id: string
  name: string
  verificationStatus: string
  creditProfile?: { score: number } | null
  subscription: {
    plan: {
      name: string
    }
    status: string
  } | null
}

export default function DashboardOverviewPage() {
  const { user } = useAuthStore()

  const { data: companyData } = useQuery({
    queryKey: ['my-company'],
    queryFn: () => get<CompanySummary>('/companies?myCompany=true'),
  })

  const company = companyData?.data

  const { data: analyticsData } = useQuery({
    queryKey: ['company-analytics', company?.id],
    queryFn:  () => get<DashboardData>(`/companies/${company!.id}/analytics?days=30`),
    enabled:  !!company?.id,
  })

  const analytics = analyticsData?.data
  const { data: commissionsData } = useQuery({
    queryKey: ['supplier-commission-summary'],
    queryFn: () => get<{ totals: { amount: number; recognized: number } }>('/commissions'),
  })
  const { data: adsData } = useQuery({
    queryKey: ['supplier-ads-preview'],
    queryFn: () => get<unknown[]>('/ad-campaigns'),
  })
  const { data: financingData } = useQuery({
    queryKey: ['supplier-financing-preview'],
    queryFn: () => get<unknown[]>('/financing-requests'),
  })

  const stats: Array<{ label: string; value: ReactNode; icon: typeof Eye; color: string; href: string }> = [
    { label: 'Profile Views',  value: analytics?.totals.profileViews  ?? 0, icon: Eye,          color: 'blue',   href: '/dashboard/analytics' },
    { label: 'Product Views',  value: analytics?.totals.productViews  ?? 0, icon: Package,       color: 'indigo', href: '/dashboard/products' },
    { label: 'Inquiries',      value: analytics?.totals.inquiries     ?? 0, icon: MessageSquare, color: 'green',  href: '/dashboard/inquiries' },
    { label: 'RFQs',           value: analytics?.totals.rfqs          ?? 0, icon: FileText,      color: 'orange', href: '/dashboard/rfqs' },
    { label: 'Quotations',     value: analytics?.totals.quotations    ?? 0, icon: Quote,         color: 'purple', href: '/dashboard/quotations' },
    { label: 'Acceptance Rate',value: `${analytics?.acceptanceRate ?? 0}%`, icon: TrendingUp,    color: 'teal',   href: '/dashboard/quotations' },
    { label: 'Commission',     value: `$${((commissionsData?.data as { totals?: { amount?: number } } | undefined)?.totals?.amount ?? 0).toLocaleString()}`, icon: Shield, color: 'blue', href: '/dashboard/revenue' },
    { label: 'Ad Campaigns',   value: (adsData?.data || []).length, icon: Package, color: 'orange', href: '/dashboard/ads' },
    { label: 'Financing',      value: (financingData?.data || []).length, icon: FileText, color: 'green', href: '/dashboard/financing' },
  ]

  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    green:  'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700',
    teal:   'bg-teal-50 text-teal-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h1>
          <p className="text-gray-500 text-sm mt-1">Here&apos;s what&apos;s happening with your business</p>
        </div>
        <Link href="/dashboard/products/new" className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors">
          <Plus className="w-4 h-4" /> Add Product
        </Link>
      </div>

      {/* Company status */}
      {company && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{company.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    company.verificationStatus === 'ADMIN_VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {company.verificationStatus.replace(/_/g, ' ')}
                  </span>
                  {company.subscription && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                      {company.subscription.plan.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard/company" className="text-sm text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
                Edit Profile
              </Link>
              <Link href="/dashboard/subscription" className="text-sm bg-blue-700 text-white rounded-lg px-3 py-1.5 hover:bg-blue-800 transition-colors">
                Upgrade Plan
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow group"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
            <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
          </Link>
        ))}
      </div>

      {/* Chart */}
      {analytics?.dailyChart && analytics.dailyChart.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 mb-4">Traffic Overview (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={analytics.dailyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="profileViews" stroke="#3b82f6" strokeWidth={2} name="Profile Views" dot={false} />
              <Line type="monotone" dataKey="productViews"  stroke="#8b5cf6" strokeWidth={2} name="Product Views"  dot={false} />
              <Line type="monotone" dataKey="inquiries"     stroke="#10b981" strokeWidth={2} name="Inquiries"      dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top products */}
      {analytics?.topProducts && analytics.topProducts.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Top Performing Products</h3>
            <Link href="/dashboard/products" className="text-sm text-blue-700 hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {analytics.topProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-6 text-sm text-gray-400 font-medium">{i + 1}</span>
                <div className="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0">
                  {p.images[0]
                    ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">{p.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">views</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: '/dashboard/products/new',  icon: Plus,          label: 'Add Product',    color: 'blue' },
          { href: '/dashboard/inquiries',     icon: MessageSquare, label: 'View Inquiries', color: 'green' },
          { href: '/dashboard/rfqs',          icon: FileText,      label: 'Browse RFQs',    color: 'purple' },
          { href: '/dashboard/company',       icon: CheckCircle,   label: 'Complete Profile', color: 'orange' },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link
            key={href}
            href={href}
            className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-gray-900">{label}</span>
            <ArrowUpRight className="w-4 h-4 text-gray-400 ml-auto" />
          </Link>
        ))}
      </div>
    </div>
  )
}
