'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, MessageSquare, Send, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { get, patch, post } from '@/lib/utils/api-client'

interface InquiryReply {
  id: string
  message: string
  createdAt: string
  sender: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

interface InquiryDetail {
  id: string
  subject: string
  message: string
  status: 'OPEN' | 'REPLIED' | 'CLOSED' | 'SPAM'
  quantity?: string | null
  targetPrice?: string | null
  createdAt: string
  isRead: boolean
  buyer: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  company: {
    id: string
    name: string
  }
  product?: {
    id: string
    name: string
    slug: string
  } | null
  replies: InquiryReply[]
}

const statusTone: Record<InquiryDetail['status'], string> = {
  OPEN: 'bg-amber-50 text-amber-700',
  REPLIED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-700',
  SPAM: 'bg-rose-50 text-rose-700',
}

export default function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [replyMessage, setReplyMessage] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-inquiry-detail', id],
    queryFn: () => get<InquiryDetail>(`/inquiries/${id}`),
    enabled: !!id,
  })

  const inquiry = data?.data

  const replyMutation = useMutation({
    mutationFn: (message: string) => post(`/inquiries/${id}/reply`, { message }),
    onSuccess: () => {
      setReplyMessage('')
      toast.success('Reply sent successfully')
      qc.invalidateQueries({ queryKey: ['dashboard-inquiry-detail', id] })
      qc.invalidateQueries({ queryKey: ['dashboard-inquiries'] })
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send reply'
      toast.error(msg)
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: InquiryDetail['status']) => patch(`/inquiries/${id}/status`, { status }),
    onSuccess: (_, status) => {
      toast.success(`Inquiry marked ${status.toLowerCase()}`)
      qc.invalidateQueries({ queryKey: ['dashboard-inquiry-detail', id] })
      qc.invalidateQueries({ queryKey: ['dashboard-inquiries'] })
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update status'
      toast.error(msg)
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!inquiry) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
        Inquiry not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/dashboard/inquiries" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Back to inquiries
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{inquiry.subject}</h1>
          <p className="mt-1 text-sm text-gray-500">
            From {inquiry.buyer.firstName} {inquiry.buyer.lastName} ({inquiry.buyer.email})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[inquiry.status]}`}>
            {inquiry.status}
          </span>
          {(['OPEN', 'CLOSED', 'SPAM'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => statusMutation.mutate(status)}
              disabled={statusMutation.isPending || inquiry.status === status}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark {status.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Inquiry message</h2>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">{inquiry.message}</p>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Reply thread</h2>
            <div className="mt-4 space-y-4">
              {inquiry.replies.length === 0 ? (
                <p className="text-sm text-gray-500">No replies yet. Send the first response to the buyer.</p>
              ) : (
                inquiry.replies.map((reply) => (
                  <div key={reply.id} className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {reply.sender ? `${reply.sender.firstName} ${reply.sender.lastName}` : 'Unknown sender'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(reply.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{reply.message}</p>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                replyMutation.mutate(replyMessage)
              }}
              className="mt-6 space-y-3"
            >
              <textarea
                value={replyMessage}
                onChange={(event) => setReplyMessage(event.target.value)}
                rows={5}
                placeholder="Write your reply to the buyer..."
                className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="submit"
                disabled={replyMutation.isPending || replyMessage.trim().length < 5}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send reply
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Inquiry details</h2>
            </div>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-gray-400">Created</dt>
                <dd className="mt-1 font-medium text-gray-900">{new Date(inquiry.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Product</dt>
                <dd className="mt-1 font-medium text-gray-900">{inquiry.product?.name || 'General inquiry'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Quantity</dt>
                <dd className="mt-1 font-medium text-gray-900">{inquiry.quantity || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Target price</dt>
                <dd className="mt-1 font-medium text-gray-900">{inquiry.targetPrice || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Company</dt>
                <dd className="mt-1 font-medium text-gray-900">{inquiry.company.name}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
