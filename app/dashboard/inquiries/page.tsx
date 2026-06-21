'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import Link from 'next/link'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowRight, Loader2, MessageSquare, Reply, Search, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'

interface Inquiry {
  id: string
  subject: string
  message: string
  status: string
  createdAt: string
  quantity?: string | null
  buyer: { firstName: string; lastName: string; email: string }
  product?: { name: string } | null
  _count: { replies: number }
}

export default function DashboardInquiriesPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-inquiries'],
    queryFn: () => get<Inquiry[]>('/inquiries?limit=50'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ inquiryId, status }: { inquiryId: string; status: 'OPEN' | 'CLOSED' }) =>
      patch(`/inquiries/${inquiryId}/status`, { status }),
    onSuccess: (_, variables) => {
      toast.success(`Inquiry marked ${variables.status.toLowerCase()}`)
      qc.invalidateQueries({ queryKey: ['dashboard-inquiries'] })
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update inquiry'
      toast.error(msg)
    },
  })

  const inquiries = data?.data || []
  const statusData = Object.entries(
    inquiries.reduce<Record<string, number>>((acc, inquiry) => {
      acc[inquiry.status] = (acc[inquiry.status] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const summary = {
    total: inquiries.length,
    open: inquiries.filter((item) => item.status === 'OPEN').length,
    replied: inquiries.filter((item) => item.status === 'REPLIED').length,
    replies: inquiries.reduce((sum, item) => sum + item._count.replies, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
          <p className="mt-1 text-sm text-gray-500">Track buyer interest, unanswered leads, and conversation activity.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Total Inquiries', value: summary.total, icon: MessageSquare, tone: 'bg-sky-50 text-sky-700' },
              { label: 'Open Leads', value: summary.open, icon: Search, tone: 'bg-amber-50 text-amber-700' },
              { label: 'Replied', value: summary.replied, icon: Reply, tone: 'bg-emerald-50 text-emerald-700' },
              { label: 'Total Replies', value: summary.replies, icon: UserRound, tone: 'bg-violet-50 text-violet-700' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="mt-4 text-2xl font-bold text-gray-900">{item.value}</p>
                <p className="mt-1 text-sm text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Status Breakdown</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Recent Buyer Conversations</h2>
                <span className="text-sm text-gray-400">{inquiries.length} items</span>
              </div>
              <div className="space-y-3">
                {inquiries.map((inquiry) => (
                  <div key={inquiry.id} className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{inquiry.subject}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {inquiry.buyer.firstName} {inquiry.buyer.lastName} | {inquiry.product?.name || 'General inquiry'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        inquiry.status === 'OPEN'
                          ? 'bg-amber-50 text-amber-700'
                          : inquiry.status === 'REPLIED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {inquiry.status}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-gray-600">{inquiry.message}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                      <span>{inquiry._count.replies} replies</span>
                      <span>{new Date(inquiry.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/inquiries/${inquiry.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        Open thread
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => statusMutation.mutate({ inquiryId: inquiry.id, status: inquiry.status === 'CLOSED' ? 'OPEN' : 'CLOSED' })}
                        disabled={statusMutation.isPending}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-blue-200 hover:text-blue-700 disabled:opacity-50"
                      >
                        {inquiry.status === 'CLOSED' ? 'Reopen' : 'Close'}
                      </button>
                    </div>
                  </div>
                ))}
                {!inquiries.length && <p className="text-sm text-gray-500">No inquiries yet.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
