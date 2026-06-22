'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import Link from 'next/link'
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
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'REPLIED' | 'CLOSED'>('ALL')

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
  const filteredInquiries = useMemo(() => {
    if (activeFilter === 'ALL') return inquiries
    return inquiries.filter((item) => item.status === activeFilter)
  }, [activeFilter, inquiries])

  const summary = {
    total: inquiries.length,
    open: inquiries.filter((item) => item.status === 'OPEN').length,
    replied: inquiries.filter((item) => item.status === 'REPLIED').length,
    replies: inquiries.reduce((sum, item) => sum + item._count.replies, 0),
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Lead management
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Inquiries</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#616b64]">
              Follow buyer conversations in a simple list, spot open leads quickly, and move into each thread without the page feeling crowded.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'OPEN', label: 'Open' },
              { key: 'REPLIED', label: 'Replied' },
              { key: 'CLOSED', label: 'Closed' },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key as 'ALL' | 'OPEN' | 'REPLIED' | 'CLOSED')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter.key
                    ? 'bg-[#243127] text-white'
                    : 'border border-[#d9ddd4] bg-white text-[#58635d] hover:border-[#c9d0c1]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Total inquiries', value: summary.total, icon: MessageSquare },
              { label: 'Open leads', value: summary.open, icon: Search },
              { label: 'Replied', value: summary.replied, icon: Reply },
              { label: 'Total replies', value: summary.replies, icon: UserRound },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-[#d9ddd4] bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f5ef] text-[#4f5d49]">
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="mt-4 text-3xl font-semibold text-[#1f2937]">{item.value}</p>
                <p className="mt-1 text-sm text-[#68726b]">{item.label}</p>
              </div>
            ))}
          </div>

          <section className="rounded-[28px] border border-[#d9ddd4] bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#1f2937]">Buyer conversations</h2>
                <p className="mt-1 text-sm text-[#68726b]">{filteredInquiries.length} conversations in this view</p>
              </div>
            </div>

            <div className="space-y-3">
              {filteredInquiries.map((inquiry) => (
                <div key={inquiry.id} className="rounded-[24px] border border-[#e4e7e0] bg-[#fbfbf9] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[#1f2937]">{inquiry.subject}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          inquiry.status === 'OPEN'
                            ? 'bg-[#fff4de] text-[#a66a00]'
                            : inquiry.status === 'REPLIED'
                              ? 'bg-[#e7f6ec] text-[#216c43]'
                              : 'bg-[#ecefec] text-[#5f6862]'
                        }`}>
                          {inquiry.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#68726b]">
                        {inquiry.buyer.firstName} {inquiry.buyer.lastName} | {inquiry.product?.name || 'General inquiry'}
                      </p>
                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#5f6862]">{inquiry.message}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[280px] lg:grid-cols-1">
                      <StatPill label="Replies" value={String(inquiry._count.replies)} />
                      <StatPill label="Date" value={new Date(inquiry.createdAt).toLocaleDateString()} />
                      <StatPill label="Buyer email" value={inquiry.buyer.email} />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/inquiries/${inquiry.id}`}
                      className="inline-flex items-center gap-1 rounded-2xl bg-[#243127] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d271f]"
                    >
                      Open thread
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => statusMutation.mutate({ inquiryId: inquiry.id, status: inquiry.status === 'CLOSED' ? 'OPEN' : 'CLOSED' })}
                      disabled={statusMutation.isPending}
                      className="rounded-2xl border border-[#d9ddd4] px-4 py-2.5 text-sm font-semibold text-[#4f5d49] transition hover:border-[#c8d0bf] disabled:opacity-50"
                    >
                      {inquiry.status === 'CLOSED' ? 'Reopen inquiry' : 'Close inquiry'}
                    </button>
                  </div>
                </div>
              ))}

              {!filteredInquiries.length ? (
                <p className="rounded-[24px] border border-dashed border-[#d9ddd4] px-5 py-10 text-sm text-[#68726b]">
                  No inquiries match this filter right now.
                </p>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e4e7e0] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a837d]">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-[#1f2937]">{value}</p>
    </div>
  )
}
