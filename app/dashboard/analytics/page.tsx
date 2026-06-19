'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Loader2 } from 'lucide-react'

interface AnalyticsResponse {
  charts: {
    traffic: Array<{ date: string; profileViews: number; productViews: number; inquiries: number; quotations: number; messages: number }>
    tradeOrders: Array<{ name: string; value: number }>
    samples: Array<{ name: string; value: number }>
    inquiryStatus: Array<{ name: string; value: number }>
    quotationStatus: Array<{ name: string; value: number }>
  }
  totals: {
    profileViews: number
    productViews: number
    inquiries: number
    rfqs: number
    messages: number
    quotations: number
  }
}

export default function DashboardAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-analytics-page'],
    queryFn: () => get<AnalyticsResponse>('/dashboard/overview'),
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">All core performance data and operational breakdowns in one place.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Profile Views', analytics.totals.profileViews],
          ['Product Views', analytics.totals.productViews],
          ['Inquiries', analytics.totals.inquiries],
          ['RFQs', analytics.totals.rfqs],
          ['Messages', analytics.totals.messages],
          ['Quotations', analytics.totals.quotations],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{Number(value).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Traffic Detail</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.charts.traffic}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="profileViews" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="productViews" stroke="#0f766e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="inquiries" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="quotations" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Inquiry vs Quotation Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={analytics.charts.inquiryStatus.map((item) => ({
                name: item.name,
                inquiries: item.value,
                quotations: analytics.charts.quotationStatus.find((q) => q.name === item.name)?.value || 0,
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
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Trade Order Pipeline</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.charts.tradeOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Sample Order Pipeline</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={analytics.charts.samples}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
