'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowRight, Loader2 } from 'lucide-react'

interface AnalyticsResponse {
  generatedAt: string
  acceptanceRate: number
  totals: {
    profileViews: number
    productViews: number
    inquiries: number
    rfqs: number
    messages: number
    quotations: number
  }
  charts: {
    traffic: Array<{ date: string; profileViews: number; productViews: number; inquiries: number; quotations: number; messages: number }>
    engagement: Array<{ name: string; value: number }>
    inquiryStatus: Array<{ name: string; value: number }>
    quotationStatus: Array<{ name: string; value: number }>
    tradeOrders: Array<{ name: string; value: number }>
    samples: Array<{ name: string; value: number }>
    shipments: Array<{ name: string; value: number }>
    logistics: Array<{ name: string; value: number }>
    insurance: Array<{ name: string; value: number }>
    claims: Array<{ name: string; value: number }>
  }
  topProducts: Array<{ id: string; name: string; slug: string; totalViews: number; totalInquiries: number; images: Array<{ url: string }> }>
}

const chartColors = ['#2563eb', '#0f766e', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444']
const periods = [7, 30, 90] as const

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  )
}

export default function DashboardAnalyticsPage() {
  const [days, setDays] = useState<(typeof periods)[number]>(30)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-analytics-page', days],
    queryFn: () => get<AnalyticsResponse>(`/dashboard/overview?days=${days}`),
  })

  const analytics = data?.data

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }

  if (!analytics) {
    return <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500">No analytics available.</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.22em] text-blue-200/80">Supplier Analytics</p>
            <h1 className="mt-3 text-3xl font-bold">Performance, conversion, and pipeline in one place</h1>
            <p className="mt-3 text-sm text-slate-300">
              Review discovery traffic, buyer demand signals, quotation conversion, and operational pipeline for the last {days} days.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {periods.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setDays(period)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    days === period ? 'bg-white text-slate-950' : 'bg-white/10 text-slate-200 hover:bg-white/20'
                  }`}
                >
                  Last {period} days
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[440px]">
            <MetricCard label="Profile views" value={analytics.totals.profileViews} />
            <MetricCard label="Product views" value={analytics.totals.productViews} />
            <MetricCard label="Quotations" value={analytics.totals.quotations} />
            <MetricCard label="Acceptance" value={`${analytics.acceptanceRate}%`} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        {[
          ['Profile Views', analytics.totals.profileViews],
          ['Product Views', analytics.totals.productViews],
          ['Inquiries', analytics.totals.inquiries],
          ['RFQ Leads', analytics.totals.rfqs],
          ['Messages', analytics.totals.messages],
          ['Quotations', analytics.totals.quotations],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{Number(value).toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <ChartCard title="Traffic and lead trend" subtitle="Daily movement across profile, product, inquiry, quotation, and chat activity.">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={analytics.charts.traffic}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDateLabel} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={formatDateLabel} />
              <Legend />
              <Line type="monotone" dataKey="profileViews" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="productViews" stroke="#0f766e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="inquiries" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="quotations" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="messages" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Engagement mix" subtitle="Which actions buyers are taking most often across your supplier funnel.">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.charts.engagement.filter((item) => item.value > 0)} dataKey="value" nameKey="name" outerRadius={95} innerRadius={52} paddingAngle={3}>
                  {analytics.charts.engagement.map((item, index) => (
                    <Cell key={item.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {analytics.charts.engagement.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                <span className="text-gray-600">{item.name}</span>
                <span className="ml-auto font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Inquiry vs quotation status" subtitle="See where leads are landing versus how far quotations are progressing.">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={analytics.charts.inquiryStatus.map((item) => ({
                name: item.name,
                inquiries: item.value,
                quotations: analytics.charts.quotationStatus.find((quotation) => quotation.name === item.name)?.value || 0,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="inquiries" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="quotations" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top products" subtitle="The products creating the strongest demand and repeat buyer attention.">
          <div className="space-y-3">
            {analytics.topProducts.length ? analytics.topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3">
                <span className="w-5 text-xs font-semibold text-gray-400">{index + 1}</span>
                <div className="h-12 w-12 overflow-hidden rounded-xl bg-gray-50">
                  {product.images[0] ? (
                    <img src={product.images[0].url} alt={product.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.totalViews} views | {product.totalInquiries} inquiries</p>
                </div>
                <Link href={`/products/${product.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                  View
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500">
                No product analytics available yet.
              </div>
            )}
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <StatusCard title="Trade order pipeline" data={analytics.charts.tradeOrders} color="#2563eb" />
        <StatusCard title="Sample order pipeline" data={analytics.charts.samples} color="#0f766e" />
        <StatusCard title="Shipment status" data={analytics.charts.shipments} color="#0ea5e9" />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <StatusCard title="Logistics status" data={analytics.charts.logistics} color="#14b8a6" />
        <StatusCard title="Insurance status" data={analytics.charts.insurance} color="#f59e0b" />
        <StatusCard title="Claim status" data={analytics.charts.claims} color="#ef4444" />
      </section>

      <div className="text-right text-xs text-gray-400">
        Updated {new Date(analytics.generatedAt).toLocaleString()}
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  )
}

function StatusCard({
  title,
  data,
  color,
}: {
  title: string
  data: Array<{ name: string; value: number }>
  color: string
}) {
  return (
    <ChartCard title={title} subtitle="Live status distribution across current operational states.">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
