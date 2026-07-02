'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { TrustBadge } from '@/components/public/trust-badge'
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
  Bell,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  Loader2,
  PackageCheck,
  Shield,
  Truck,
} from 'lucide-react'

interface BuyerOverviewResponse {
  generatedAt: string
  buyer: {
    id: string
    firstName: string
    lastName: string
    fullName: string
    email: string
    fraudPublicFlag?: 'VERIFIED' | 'UNDER_REVIEW' | 'LIMITED_ACCESS' | 'HIGH_RISK' | 'BLOCKED' | null
    creditProfile?: { score: number } | null
    kycProfile?: { status: string } | null
    b2bCompanyOwned?: { id: string; companyName: string; buyerVerificationStatus: string } | null
  }
  totals: {
    tradeOrders: number
    sampleOrders: number
    rfqs: number
    inquiries: number
    quotations: number
    shipments: number
    logistics: number
    insurancePolicies: number
    claims: number
  }
  portfolio: {
    activeTradeOrders: number
    activeSampleOrders: number
    inTransitShipments: number
    pendingInsurance: number
    unreadNotifications: number
  }
  financials: {
    tradeSpendTotal: number
    sampleSpendTotal: number
    protectedValue: number
    openClaimValue: number
    averageOrderValue: number
  }
  charts: {
    activity: Array<{ date: string; tradeOrders: number; sampleOrders: number; inquiries: number; quotations: number; shipments: number; logistics: number }>
    spend: Array<{ date: string; tradeSpend: number; sampleSpend: number; insuredValue: number; claimValue: number }>
    tradeOrders: Array<{ name: string; value: number }>
    samples: Array<{ name: string; value: number }>
    logistics: Array<{ name: string; value: number }>
    insurance: Array<{ name: string; value: number }>
    claims: Array<{ name: string; value: number }>
  }
  recent: {
    notifications: Array<{ id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string }>
    payments: Array<{ id: string; method: string; amount: number; currency: string; status: string; createdAt: string; label: string }>
    tradeOrders: Array<{ id: string; productName: string; status: string; totalAmount: number; currencyCode: string; createdAt: string; supplierCompany: { name: string; slug: string }; escrowAccount?: { status: string } | null }>
    sampleOrders: Array<{ id: string; title: string; status: string; totalAmount: number; currencyCode: string; createdAt: string; supplierCompany: { name: string; slug: string } }>
    shipments: Array<{ id: string; carrier: string; trackingNumber: string; trackingUrl?: string | null; status: string; lastEvent?: string | null; lastLocation?: string | null; estimatedDeliveryAt?: string | null; lastSyncedAt?: string | null; tradeOrder?: { productName: string } | null; sampleOrder?: { title: string } | null }>
    logistics: Array<{ id: string; providerName: string; serviceMode: string; origin: string; destination: string; status: string; trackingNumber?: string | null; estimatedDeliveryAt?: string | null; updatedAt: string; statusLabel: string }>
    insurancePolicies: Array<{ id: string; providerName: string; policyType: string; status: string; insuredAmount: number; premiumAmount: number; currencyCode: string; endsAt?: string | null; updatedAt: string }>
    claims: Array<{ id: string; title: string; status: string; claimAmount: number; currencyCode: string; updatedAt: string; policy: { providerName: string; policyType: string } }>
  }
}

const chartColors = ['#2563eb', '#0f766e', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444']

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function StatusBars({ title, data, color }: { title: string; data: Array<{ name: string; value: number }>; color: string }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function BuyerOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['buyer-dashboard-overview'],
    queryFn: () => get<BuyerOverviewResponse>('/buyer/overview'),
    refetchInterval: 30000,
  })

  const dashboard = data?.data

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }

  if (!dashboard) {
    return <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500">No buyer overview available yet.</div>
  }

  const summaryCards = [
    { label: 'Trade Orders', value: dashboard.totals.tradeOrders, href: '/buyer/trade-orders', icon: Shield, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Sample Orders', value: dashboard.totals.sampleOrders, href: '/buyer/sample-orders', icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'RFQs', value: dashboard.totals.rfqs, href: '/buyer/rfqs', icon: FileText, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Quotations', value: dashboard.totals.quotations, href: '/buyer/quotations', icon: BriefcaseBusiness, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Shipments', value: dashboard.totals.shipments, href: '/buyer/shipments', icon: Truck, tone: 'bg-sky-50 text-sky-700' },
    { label: 'Unread Alerts', value: dashboard.portfolio.unreadNotifications, href: '/buyer/notifications', icon: Bell, tone: 'bg-rose-50 text-rose-700' },
  ]

  const engagementMix = [
    { name: 'Trade Orders', value: dashboard.totals.tradeOrders },
    { name: 'Sample Orders', value: dashboard.totals.sampleOrders },
    { name: 'Inquiries', value: dashboard.totals.inquiries },
    { name: 'Quotations', value: dashboard.totals.quotations },
    { name: 'Logistics', value: dashboard.totals.logistics },
    { name: 'Claims', value: dashboard.totals.claims },
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-br from-[#0b132b] via-[#132042] to-[#1d4ed8] p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.22em] text-blue-200/85">Buyer Command Center</p>
            <h1 className="mt-3 text-3xl font-bold">Welcome back, {dashboard.buyer.firstName}</h1>
            <p className="mt-3 text-sm text-slate-200">
              Track escrow-protected orders, supplier quotations, shipment progress, insurance protection, and live buyer-side risk signals from one overview.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-white/10 px-3 py-1">KYC {formatStatus(dashboard.buyer.kycProfile?.status || 'PENDING')}</span>
              {dashboard.buyer.b2bCompanyOwned ? (
                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-100">
                  {dashboard.buyer.b2bCompanyOwned.companyName} • {formatStatus(dashboard.buyer.b2bCompanyOwned.buyerVerificationStatus)}
                </span>
              ) : null}
              {dashboard.buyer.creditProfile?.score != null ? (
                <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-100">Credit Score {dashboard.buyer.creditProfile.score}</span>
              ) : null}
              <div className="rounded-full bg-white/10 px-3 py-1">
                <TrustBadge flag={dashboard.buyer.fraudPublicFlag || null} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[430px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Trade Spend</p>
              <p className="mt-2 text-2xl font-bold"><CurrencyAmount amount={dashboard.financials.tradeSpendTotal} currencyCode="USD" /></p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Sample Spend</p>
              <p className="mt-2 text-2xl font-bold"><CurrencyAmount amount={dashboard.financials.sampleSpendTotal} currencyCode="USD" /></p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Protected Value</p>
              <p className="mt-2 text-2xl font-bold"><CurrencyAmount amount={dashboard.financials.protectedValue} currencyCode="USD" /></p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Last refresh</p>
              <p className="mt-2 text-sm font-semibold">{new Date(dashboard.generatedAt).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        {summaryCards.map((item) => (
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
              <h2 className="text-lg font-bold text-gray-900">Activity Trend</h2>
              <p className="text-sm text-gray-500">Live buyer-side order, inquiry, and logistics movement across the last 30 days.</p>
            </div>
            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Auto refresh 30s</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboard.charts.activity}>
              <defs>
                <linearGradient id="buyerOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="buyerOps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="tradeOrders" stroke="#2563eb" fill="url(#buyerOrders)" strokeWidth={2} />
              <Area type="monotone" dataKey="shipments" stroke="#0f766e" fill="url(#buyerOps)" strokeWidth={2} />
              <Area type="monotone" dataKey="quotations" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Engagement Mix</h2>
          <p className="text-sm text-gray-500">Where the buyer workflow is most active right now.</p>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={engagementMix.filter((item) => item.value > 0)} dataKey="value" nameKey="name" outerRadius={90} innerRadius={48} paddingAngle={3}>
                  {engagementMix.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {engagementMix.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                <span className="text-gray-600">{item.name}</span>
                <span className="ml-auto font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Spend & Protection Trend</h2>
              <p className="text-sm text-gray-500">Trade spend, samples, insurance cover, and claim exposure over time.</p>
            </div>
            <Link href="/buyer/insurance" className="text-sm font-medium text-blue-700">Insurance desk</Link>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboard.charts.spend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="tradeSpend" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Bar dataKey="sampleSpend" fill="#0f766e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="insuredValue" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Operations Snapshot</h2>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Active trade orders', value: dashboard.portfolio.activeTradeOrders, href: '/buyer/trade-orders' },
              { label: 'Active sample orders', value: dashboard.portfolio.activeSampleOrders, href: '/buyer/sample-orders' },
              { label: 'In transit shipments', value: dashboard.portfolio.inTransitShipments, href: '/buyer/shipments' },
              { label: 'Pending insurance work', value: dashboard.portfolio.pendingInsurance, href: '/buyer/insurance' },
              { label: 'Open claim value', value: <CurrencyAmount amount={dashboard.financials.openClaimValue} currencyCode="USD" />, href: '/buyer/claims' },
              { label: 'Average completed order', value: <CurrencyAmount amount={dashboard.financials.averageOrderValue} currencyCode="USD" />, href: '/buyer/trade-orders' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center rounded-2xl border border-gray-100 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/40">
                <span className="text-sm font-medium text-gray-600">{item.label}</span>
                <span className="ml-auto text-lg font-bold text-gray-900">{item.value}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <StatusBars title="Trade Order Status" data={dashboard.charts.tradeOrders} color="#2563eb" />
        <StatusBars title="Logistics Status" data={dashboard.charts.logistics} color="#0f766e" />
        <StatusBars title="Insurance & Claims" data={[...dashboard.charts.insurance, ...dashboard.charts.claims]} color="#f59e0b" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Trade Orders</h2>
            <Link href="/buyer/trade-orders" className="text-sm font-medium text-blue-700">Open all</Link>
          </div>
          <div className="space-y-3">
            {dashboard.recent.tradeOrders.map((order) => (
              <Link key={order.id} href="/buyer/trade-orders" className="flex items-center gap-3 rounded-2xl border border-gray-100 p-4 transition hover:border-blue-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{order.productName}</p>
                  <p className="text-xs text-gray-500">{order.supplierCompany.name} • {formatStatus(order.status)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900"><CurrencyAmount amount={order.totalAmount} currencyCode={order.currencyCode} showCode /></p>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Recent Payments</h2>
            <Link href="/buyer/trade-orders" className="text-sm font-medium text-blue-700">Protected orders</Link>
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
                    <p className="text-xs text-gray-500">{payment.method} • {new Date(payment.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900"><CurrencyAmount amount={payment.amount} currencyCode={payment.currency} showCode /></p>
                    <p className="text-xs text-gray-500">{formatStatus(payment.status)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Shipment Tracking</h2>
            <Link href="/buyer/shipments" className="text-sm font-medium text-blue-700">All shipments</Link>
          </div>
          <div className="space-y-3">
            {dashboard.recent.shipments.map((shipment) => (
              <div key={shipment.id} className="rounded-2xl border border-gray-100 p-3">
                <p className="text-sm font-semibold text-gray-900">{shipment.tradeOrder?.productName || shipment.sampleOrder?.title || 'Shipment'}</p>
                <p className="mt-1 text-xs text-gray-500">{shipment.carrier} • {shipment.trackingNumber}</p>
                <p className="mt-1 text-xs text-gray-500">{formatStatus(shipment.status)}{shipment.lastLocation ? ` • ${shipment.lastLocation}` : ''}</p>
                {shipment.lastEvent ? <p className="mt-2 text-xs text-gray-400">{shipment.lastEvent}</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Logistics Tracking</h2>
            <Link href="/buyer/logistics" className="text-sm font-medium text-blue-700">All bookings</Link>
          </div>
          <div className="space-y-3">
            {dashboard.recent.logistics.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-100 p-3">
                <p className="text-sm font-semibold text-gray-900">{item.providerName} • {item.serviceMode}</p>
                <p className="mt-1 text-xs text-gray-500">{item.origin} → {item.destination}</p>
                <p className="mt-1 text-xs text-gray-500">{formatStatus(item.status)}{item.trackingNumber ? ` • ${item.trackingNumber}` : ''}</p>
                <p className="mt-2 text-xs text-gray-400">Updated {new Date(item.updatedAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Insurance Tracking</h2>
            <Link href="/buyer/insurance" className="text-sm font-medium text-blue-700">All policies</Link>
          </div>
          <div className="space-y-3">
            {dashboard.recent.insurancePolicies.map((policy) => (
              <div key={policy.id} className="rounded-2xl border border-gray-100 p-3">
                <p className="text-sm font-semibold text-gray-900">{policy.providerName} • {policy.policyType}</p>
                <p className="mt-1 text-xs text-gray-500"><CurrencyAmount amount={policy.insuredAmount} currencyCode={policy.currencyCode} showCode /> protected</p>
                <p className="mt-1 text-xs text-gray-500">{formatStatus(policy.status)}{policy.endsAt ? ` • Ends ${new Date(policy.endsAt).toLocaleDateString()}` : ''}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Claim Tracking</h2>
            <Link href="/buyer/claims" className="text-sm font-medium text-blue-700">All claims</Link>
          </div>
          <div className="space-y-3">
            {dashboard.recent.claims.map((claim) => (
              <div key={claim.id} className="rounded-2xl border border-gray-100 p-3">
                <p className="text-sm font-semibold text-gray-900">{claim.title}</p>
                <p className="mt-1 text-xs text-gray-500">{claim.policy.providerName} • {claim.policy.policyType}</p>
                <p className="mt-1 text-xs text-gray-500"><CurrencyAmount amount={claim.claimAmount} currencyCode={claim.currencyCode} showCode /> • {formatStatus(claim.status)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recent Alerts</h2>
          <Link href="/buyer/notifications" className="text-sm font-medium text-blue-700">Open inbox</Link>
        </div>
        <div className="grid gap-3 xl:grid-cols-3">
          {dashboard.recent.notifications.map((item) => (
            <div key={item.id} className={`rounded-2xl border p-4 ${item.isRead ? 'border-gray-100 bg-white' : 'border-blue-100 bg-blue-50/50'}`}>
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <p className="mt-2 text-xs leading-5 text-gray-500">{item.message}</p>
              <p className="mt-3 text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
