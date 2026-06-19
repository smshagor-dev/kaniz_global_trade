'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  Package,
  Shield,
  Sparkles,
  Truck,
} from 'lucide-react'

interface DashboardOverviewResponse {
  company: {
    id: string
    name: string
    verificationStatus: string
    isPremium: boolean
    isFeatured: boolean
    creditProfile?: { score: number } | null
    subscription?: {
      status: string
      billingCycle: string
      currentPeriodEnd: string
      plan: { id: string; name: string }
    } | null
    _count: { products: number; reviews: number }
  } | null
  totals: {
    profileViews: number
    productViews: number
    inquiries: number
    rfqs: number
    messages: number
    quotations: number
  }
  acceptanceRate: number
  unreadNotifications: number
  commissionTotals: { total: number; recognized: number }
  portfolio: {
    activeTradeOrders: number
    activeSampleOrders: number
    activeShipments: number
    activeAds: number
    financingOpen: number
    insuranceOpen: number
  }
  charts: {
    traffic: Array<{ date: string; profileViews: number; productViews: number; inquiries: number; quotations: number; messages: number }>
    engagement: Array<{ name: string; value: number }>
    inquiryStatus: Array<{ name: string; value: number }>
    quotationStatus: Array<{ name: string; value: number }>
    tradeOrders: Array<{ name: string; value: number }>
    samples: Array<{ name: string; value: number }>
  }
  topProducts: Array<{ id: string; name: string; slug: string; totalViews: number; totalInquiries: number; images: Array<{ url: string }> }>
  recent: {
    notifications: Array<{ id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string }>
    tradeOrders: Array<{ id: string; productName: string; status: string; totalAmount: number; currencyCode: string; createdAt: string }>
    sampleOrders: Array<{ id: string; title: string; status: string; totalAmount: number; currencyCode: string; createdAt: string }>
    payments: Array<{ id: string; method: string; amount: number; currency: string; status: string; createdAt: string; label: string }>
  }
}

const chartColors = ['#0f766e', '#2563eb', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444']

export default function DashboardOverviewPage() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['supplier-dashboard-overview'],
    queryFn: () => get<DashboardOverviewResponse>('/dashboard/overview'),
    refetchInterval: 60000,
  })

  const dashboard = data?.data

  const primaryStats = dashboard ? [
    { label: 'Profile Views', value: dashboard.totals.profileViews, icon: Eye, href: '/dashboard/analytics', tone: 'bg-sky-50 text-sky-700' },
    { label: 'Product Views', value: dashboard.totals.productViews, icon: Package, href: '/dashboard/products', tone: 'bg-indigo-50 text-indigo-700' },
    { label: 'Inquiries', value: dashboard.totals.inquiries, icon: MessageSquare, href: '/dashboard/inquiries', tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Quotations', value: dashboard.totals.quotations, icon: FileText, href: '/dashboard/quotations', tone: 'bg-violet-50 text-violet-700' },
    { label: 'Acceptance Rate', value: `${dashboard.acceptanceRate}%`, icon: Sparkles, href: '/dashboard/quotations', tone: 'bg-amber-50 text-amber-700' },
    { label: 'Unread Alerts', value: dashboard.unreadNotifications, icon: Bell, href: '/dashboard/notifications', tone: 'bg-rose-50 text-rose-700' },
  ] : []

  const pipelineStats = dashboard ? [
    { label: 'Trade Orders', value: dashboard.portfolio.activeTradeOrders, href: '/dashboard/trade-orders' },
    { label: 'Sample Orders', value: dashboard.portfolio.activeSampleOrders, href: '/dashboard/sample-orders' },
    { label: 'Shipments', value: dashboard.portfolio.activeShipments, href: '/dashboard/shipments' },
    { label: 'Ads Running', value: dashboard.portfolio.activeAds, href: '/dashboard/ads' },
    { label: 'Financing', value: dashboard.portfolio.financingOpen, href: '/dashboard/financing' },
    { label: 'Insurance', value: dashboard.portfolio.insuranceOpen, href: '/dashboard/insurance' },
  ] : []

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }

  if (!dashboard || !dashboard.company) {
    return <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500">No dashboard data available yet.</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.22em] text-sky-200/80">Supplier Command Center</p>
            <h1 className="mt-3 text-3xl font-bold">Welcome back, {user?.firstName || 'Supplier'}</h1>
            <p className="mt-3 text-sm text-slate-300">
              {dashboard.company.name} is currently {dashboard.company.verificationStatus.replace(/_/g, ' ').toLowerCase()}.
              {dashboard.company.subscription ? ` ${dashboard.company.subscription.plan.name} plan active until ${new Date(dashboard.company.subscription.currentPeriodEnd).toLocaleDateString()}.` : ' No active subscription found yet.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-white/10 px-3 py-1">{dashboard.company.verificationStatus.replace(/_/g, ' ')}</span>
              {dashboard.company.subscription && <span className="rounded-full bg-sky-500/20 px-3 py-1 text-sky-100">{dashboard.company.subscription.plan.name}</span>}
              {dashboard.company.isPremium && <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-100">Premium</span>}
              {dashboard.company.creditProfile?.score != null && <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-100">Credit Score {dashboard.company.creditProfile.score}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[420px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Products</p>
              <p className="mt-2 text-2xl font-bold">{dashboard.company._count.products}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Reviews</p>
              <p className="mt-2 text-2xl font-bold">{dashboard.company._count.reviews}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Recognized Comm.</p>
              <p className="mt-2 text-2xl font-bold">${dashboard.commissionTotals.recognized.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Unread Alerts</p>
              <p className="mt-2 text-2xl font-bold">{dashboard.unreadNotifications}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        {primaryStats.map((item) => (
          <Link key={item.label} href={item.href} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <p className="mt-4 text-2xl font-bold text-gray-900">{item.value}</p>
            <p className="mt-1 text-sm text-gray-500">{item.label}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Traffic & Lead Trend</h2>
              <p className="text-sm text-gray-500">Last 30 days performance across views and demand signals.</p>
            </div>
            <Link href="/dashboard/analytics" className="text-sm font-medium text-blue-700">Deep analytics</Link>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={dashboard.charts.traffic}>
              <defs>
                <linearGradient id="trafficViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="trafficLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="productViews" stroke="#2563eb" fill="url(#trafficViews)" strokeWidth={2} />
              <Area type="monotone" dataKey="inquiries" stroke="#0f766e" fill="url(#trafficLeads)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Engagement Mix</h2>
          <p className="text-sm text-gray-500">What visitors and buyers are doing most.</p>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard.charts.engagement.filter((item) => item.value > 0)} dataKey="value" nameKey="name" outerRadius={90} innerRadius={48} paddingAngle={3}>
                  {dashboard.charts.engagement.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {dashboard.charts.engagement.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                <span className="text-gray-600">{item.name}</span>
                <span className="ml-auto font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Inquiry Status</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.charts.inquiryStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Quotation Status</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.charts.quotationStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Operations Snapshot</h2>
          <div className="mt-4 space-y-3">
            {pipelineStats.map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center rounded-2xl border border-gray-100 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/40">
                <span className="text-sm font-medium text-gray-600">{item.label}</span>
                <span className="ml-auto text-lg font-bold text-gray-900">{item.value}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr_1fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Top Products</h2>
            <Link href="/dashboard/products" className="text-sm font-medium text-blue-700">View all</Link>
          </div>
          <div className="space-y-3">
            {dashboard.topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3">
                <span className="w-5 text-xs font-semibold text-gray-400">{index + 1}</span>
                <div className="h-12 w-12 overflow-hidden rounded-xl bg-gray-50">
                  {product.images[0] ? (
                    <img src={product.images[0].url} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-gray-300" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.totalViews} views | {product.totalInquiries} inquiries</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Payments</h2>
            <Link href="/dashboard/payments" className="text-sm font-medium text-blue-700">Billing</Link>
          </div>
          <div className="space-y-3">
            {dashboard.recent.payments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-gray-100 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{payment.label}</p>
                    <p className="text-xs text-gray-500">{payment.method} | {new Date(payment.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{payment.currency} {payment.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{payment.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <Link href="/dashboard/notifications" className="text-sm font-medium text-blue-700">Open inbox</Link>
          </div>
          <div className="space-y-3">
            {dashboard.recent.notifications.map((item) => (
              <div key={item.id} className={`rounded-2xl border p-3 ${item.isRead ? 'border-gray-100 bg-white' : 'border-blue-100 bg-blue-50/50'}`}>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="mt-1 text-xs text-gray-500">{item.message}</p>
                <p className="mt-2 text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BriefcaseBusiness className="h-4 w-4 text-blue-700" />
            <h2 className="text-lg font-bold text-gray-900">Recent Trade Orders</h2>
          </div>
          <div className="space-y-3">
            {dashboard.recent.tradeOrders.map((order) => (
              <Link key={order.id} href="/dashboard/trade-orders" className="flex items-center gap-3 rounded-2xl border border-gray-100 p-4 transition hover:border-blue-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{order.productName}</p>
                  <p className="text-xs text-gray-500">{order.status} | {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{order.currencyCode} {order.totalAmount.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-emerald-700" />
            <h2 className="text-lg font-bold text-gray-900">Recent Sample Orders</h2>
          </div>
          <div className="space-y-3">
            {dashboard.recent.sampleOrders.map((order) => (
              <Link key={order.id} href="/dashboard/sample-orders" className="flex items-center gap-3 rounded-2xl border border-gray-100 p-4 transition hover:border-emerald-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Package className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{order.title}</p>
                  <p className="text-xs text-gray-500">{order.status} | {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{order.currencyCode} {order.totalAmount.toLocaleString()}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
