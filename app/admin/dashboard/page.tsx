'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import Link from 'next/link'
import {
  Users, Building2, Package, FileText,
  Shield, CreditCard, Flag, TrendingUp, ArrowUpRight,
  Clock, AlertTriangle,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface AdminStats {
  overview: {
    totalUsers: number; totalBuyers: number; totalSuppliers: number
    totalCompanies: number; totalProducts: number; pendingProducts: number
    pendingVerification: number; totalRFQs: number; totalInquiries: number
    pendingReports: number; activeSubscriptions: number; newUsersToday: number
    newCompaniesMonth: number; revenueMonth: number
    pendingBuyerVerifications: number; pendingKyc: number; openFraudAlerts: number
    inspectionReports: number; tradeOrders: number; sampleOrders: number; activeShipments: number
    openInsuranceClaims: number; openFinancingRequests: number; commissionRevenue: number
    paidInvoicesMonth: number; pendingManualPayments: number
  }
  charts: {
    userGrowth:   { date: string; count: number }[]
    revenueTrend: { month: string; revenue: number }[]
    billingByGateway: { method: string; amount: number; count: number }[]
    topCategories: { id: string; name: string; _count: { products: number } }[]
    recentInvoices: { id: string; invoiceNumber: string; total: number; currency: string; status: string; createdAt: string; companyName: string; planName: string; method: string }[]
  }
}

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-stats'],
    queryFn:  () => get<AdminStats>('/admin/stats'),
    refetchInterval: 60000,
  })

  const stats = data?.data

  const metricCards = stats ? [
    { label: 'Total Users',       value: stats.overview.totalUsers.toLocaleString(),       icon: Users,       color: 'blue',   href: '/admin/users',       change: `+${stats.overview.newUsersToday} today` },
    { label: 'Total Companies',   value: stats.overview.totalCompanies.toLocaleString(),   icon: Building2,   color: 'indigo', href: '/admin/companies',   change: `+${stats.overview.newCompaniesMonth} this month` },
    { label: 'Total Products',    value: stats.overview.totalProducts.toLocaleString(),    icon: Package,     color: 'green',  href: '/admin/products',    change: `${stats.overview.pendingProducts} pending` },
    { label: 'Trade Orders',      value: stats.overview.tradeOrders.toLocaleString(),      icon: FileText,    color: 'orange', href: '/admin/trade-orders', change: `${stats.overview.sampleOrders} sample orders` },
    { label: 'Open Fraud Alerts', value: stats.overview.openFraudAlerts.toLocaleString(),  icon: Flag,        color: 'red',    href: '/admin/fraud-alerts', change: `${stats.overview.pendingKyc} KYC reviews` },
    { label: 'Inspections',       value: stats.overview.inspectionReports.toLocaleString(), icon: Shield,     color: 'purple', href: '/admin/inspections', change: `${stats.overview.activeShipments} active shipments` },
    { label: 'Buyer Verification', value: stats.overview.pendingBuyerVerifications.toLocaleString(), icon: CreditCard, color: 'emerald', href: '/admin/buyer-verifications', change: 'Awaiting review' },
    { label: 'Commission Revenue', value: `$${stats.overview.commissionRevenue.toLocaleString()}`, icon: TrendingUp, color: 'teal', href: '/admin/commissions', change: `${stats.overview.openFinancingRequests} financing requests` },
    { label: 'Paid Invoices', value: stats.overview.paidInvoicesMonth.toLocaleString(), icon: CreditCard, color: 'blue', href: '/admin/payments', change: `${stats.overview.pendingManualPayments} manual pending` },
    ] : []

  const colorMap: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-700',
    indigo:  'bg-indigo-50 text-indigo-700',
    green:   'bg-green-50 text-green-700',
    orange:  'bg-orange-50 text-orange-700',
    teal:    'bg-teal-50 text-teal-700',
    purple:  'bg-purple-50 text-purple-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red:     'bg-red-50 text-red-700',
  }

  const urgentActions = stats ? [
    { label: 'Products pending approval',  value: stats.overview.pendingProducts,     href: '/admin/products?status=PENDING',    icon: Clock,          color: 'orange' },
    { label: 'Companies pending verification', value: stats.overview.pendingVerification, href: '/admin/verification',           icon: AlertTriangle,  color: 'yellow' },
    { label: 'KYC submissions to review',  value: stats.overview.pendingKyc,          href: '/admin/kyc',                        icon: Shield,         color: 'blue' },
    { label: 'Fraud alerts to review',     value: stats.overview.openFraudAlerts,     href: '/admin/fraud-alerts',               icon: Flag,           color: 'red' },
    { label: 'Insurance claims to review', value: stats.overview.openInsuranceClaims, href: '/admin/insurance-claims',          icon: Shield,         color: 'purple' },
    { label: 'Manual payments to review', value: stats.overview.pendingManualPayments, href: '/admin/payments', icon: CreditCard, color: 'blue' },
  ] : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kaniz Global Trade Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview and management</p>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-gray-100 mb-3" />
                <div className="h-8 w-20 bg-gray-100 rounded mb-2" />
                <div className="h-4 w-28 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-xl p-6 h-72 animate-pulse" />
            <div className="bg-white border border-gray-100 rounded-xl p-6 h-72 animate-pulse" />
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-red-800">Dashboard data failed to load</h2>
          <p className="text-sm text-red-700 mt-1">
            {(error as Error)?.message || 'The Kaniz Global Trade stats request returned an error.'}
          </p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-4 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      {!isLoading && !error && !stats && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">
          No Kaniz Global Trade stats are available yet.
        </div>
      )}

      {/* Urgent actions */}
      {!!stats && urgentActions.some((a) => a.value > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Action Required
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {urgentActions.filter((a) => a.value > 0).map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="flex items-center gap-3 bg-white border border-amber-200 rounded-lg px-3 py-2.5 hover:border-amber-400 transition-colors"
              >
                <a.icon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">{a.label}</span>
                <span className="ml-auto font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-xs">{a.value}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Metric cards */}
      {!!stats && <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metricCards.map(({ label, value, icon: Icon, color, href, change }) => (
          <Link
            key={label}
            href={href}
            className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-1">{change}</p>
          </Link>
        ))}
      </div>}

      {/* Charts */}
      {!!stats && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User growth */}
        {stats?.charts.userGrowth && (
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-4">User Growth (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.charts.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="New Users" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Revenue trend */}
        {stats?.charts.revenueTrend && (
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-4">Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.charts.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>}

      {!!stats && stats?.charts.billingByGateway && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="font-bold text-gray-900 mb-4">Billing by Gateway (This Month)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.charts.billingByGateway}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="method" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Amount']} />
                <Bar dataKey="amount" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Recent Billing Activity</h3>
              <Link href="/admin/payments" className="text-sm text-blue-700 hover:underline">Review payments</Link>
            </div>
            <div className="space-y-3">
              {stats.charts.recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-gray-500 mt-1">{invoice.companyName} | {invoice.planName} | {invoice.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{invoice.currency} {invoice.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {stats.charts.recentInvoices.length === 0 && <p className="text-sm text-gray-500">No recent invoices found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Top categories */}
      {!!stats && stats?.charts.topCategories && (
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Top Categories by Products</h3>
            <Link href="/admin/categories" className="text-sm text-blue-700 hover:underline">Manage →</Link>
          </div>
          <div className="space-y-2">
            {stats.charts.topCategories.map((cat, i) => (
              <div key={cat.id} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                    <span className="text-xs text-gray-500">{cat._count.products} products</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, (cat._count.products / (stats.charts.topCategories[0]?._count.products || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
