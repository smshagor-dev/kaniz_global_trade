'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, FileText, Loader2, Mail, Phone, ReceiptText, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { get, post } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { getQuotationStatusMeta } from '@/lib/trade/status'

interface BuyerQuotationDetail {
  id: string
  status: string
  totalPrice: number
  currencyCode: string
  createdAt: string
  validUntil?: string | null
  deliveryTime?: string | null
  shippingTerms?: string | null
  notes?: string | null
  rejectedReason?: string | null
  rfq?: {
    id: string
    productName: string
    quantity: string
    unit?: string | null
    status: string
  } | null
  inquiry?: {
    id: string
    subject: string
    quantity?: string | null
    targetPrice?: string | null
    status: string
  } | null
  company: {
    id: string
    name: string
    slug: string
    email?: string | null
    phone?: string | null
    companyUsers: Array<{
      user: {
        firstName: string
        lastName: string
        email: string
      }
    }>
  }
  items: Array<{
    id: string
    description: string
    quantity: number
    unit?: string | null
    unitPrice: number
    totalPrice: number
    notes?: string | null
  }>
  tradeOrder?: {
    id: string
    status: string
    totalAmount: number
    currencyCode: string
  } | null
}

export default function BuyerQuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [hasMarkedViewed, setHasMarkedViewed] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['buyer-quotation-detail', id],
    queryFn: () => get<BuyerQuotationDetail>(`/quotations/${id}`),
    enabled: !!id,
  })

  const quotation = data?.data
  const statusMeta = quotation ? getQuotationStatusMeta(quotation.status) : null

  useEffect(() => {
    if (!quotation || hasMarkedViewed || quotation.status !== 'SENT') return
    setHasMarkedViewed(true)
    post(`/quotations/${quotation.id}/action`, { action: 'VIEW' }).catch(() => {})
  }, [quotation, hasMarkedViewed])

  const actionMutation = useMutation({
    mutationFn: ({ action, reason }: { action: 'ACCEPT' | 'REJECT'; reason?: string }) =>
      post(`/quotations/${id}/action`, { action, reason }),
    onSuccess: (_, variables) => {
      toast.success(variables.action === 'ACCEPT' ? 'Quotation accepted' : 'Quotation rejected')
      qc.invalidateQueries({ queryKey: ['buyer-quotation-detail', id] })
      qc.invalidateQueries({ queryKey: ['buyer-quotations'] })
      if (quotation?.rfq?.id) qc.invalidateQueries({ queryKey: ['buyer-rfq-detail', quotation.rfq.id] })
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update quotation'
      toast.error(message)
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }

  if (!quotation) {
    return <div className="rounded-xl border border-gray-100 bg-white p-8 text-sm text-gray-500">Quotation not found.</div>
  }

  const contact = quotation.company.companyUsers[0]?.user
  const actionDisabled = actionMutation.isPending || ['ACCEPTED', 'REJECTED'].includes(quotation.status)
  const acceptDisabled = actionDisabled || isRejecting

  function submitRejection() {
    actionMutation.mutate(
      { action: 'REJECT', reason: rejectReason.trim() || undefined },
      {
        onSuccess: () => {
          setIsRejecting(false)
          setRejectReason('')
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/buyer/quotations" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Back to quotations
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            {quotation.rfq?.productName || quotation.inquiry?.subject || 'Quotation detail'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {quotation.tradeOrder ? (
            <Link href="/buyer/trade-orders" className="inline-flex h-10 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
              Open trade order
            </Link>
          ) : null}
          {quotation.rfq?.id ? (
            <Link href={`/buyer/rfqs/${quotation.rfq.id}`} className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-gray-300">
              View RFQ
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta?.className || 'bg-slate-100 text-slate-700'}`}>
                {statusMeta?.label || quotation.status}
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                Submitted {new Date(quotation.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-gray-500">{statusMeta?.description}</p>
            <h2 className="mt-3 text-lg font-bold text-gray-900">{quotation.company.name}</h2>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
              {contact ? <span className="inline-flex items-center gap-1"><Mail className="h-4 w-4" /> {contact.firstName} {contact.lastName}</span> : null}
              {quotation.company.email ? <span className="inline-flex items-center gap-1"><Mail className="h-4 w-4" /> {quotation.company.email}</span> : null}
              {quotation.company.phone ? <span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" /> {quotation.company.phone}</span> : null}
            </div>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-xl font-bold text-gray-900">
              <CurrencyAmount amount={quotation.totalPrice} currencyCode={quotation.currencyCode} showCode />
            </p>
            <p className="mt-1 text-sm text-gray-500">Delivery: {quotation.deliveryTime || 'Not specified'}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info icon={Truck} label="Shipping terms" value={quotation.shippingTerms || 'Not specified'} />
          <Info icon={Calendar} label="Valid until" value={quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'Not specified'} />
          <Info icon={ReceiptText} label="Items" value={String(quotation.items.length)} />
          <Info icon={FileText} label="Quotation ID" value={quotation.id} />
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-900">Supplier message</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
            {quotation.notes || 'No message provided.'}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {quotation.items.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.description}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {item.quantity} {item.unit || ''} at <CurrencyAmount amount={item.unitPrice} currencyCode={quotation.currencyCode} showCode />
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  <CurrencyAmount amount={item.totalPrice} currencyCode={quotation.currencyCode} showCode />
                </p>
              </div>
              {item.notes ? <p className="mt-2 text-sm text-gray-500">{item.notes}</p> : null}
            </div>
          ))}
        </div>

        {quotation.rejectedReason ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Rejection reason: {quotation.rejectedReason}
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Decision panel</h3>
              <p className="mt-1 text-sm text-gray-600">
                Accepting this quotation confirms supplier selection and enables trade order progression.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => actionMutation.mutate({ action: 'ACCEPT' })}
                disabled={acceptDisabled}
                className="inline-flex h-10 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionMutation.isPending && !isRejecting ? 'Updating...' : 'Accept quotation'}
              </button>
              <button
                onClick={() => setIsRejecting((current) => !current)}
                disabled={actionDisabled}
                className="inline-flex h-10 items-center rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRejecting ? 'Cancel rejection' : 'Reject quotation'}
              </button>
            </div>
          </div>

          {isRejecting ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4">
              <label className="block text-sm font-semibold text-gray-900">Reason for rejection</label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
                placeholder="Share why this offer was not selected, such as price, lead time, or specification mismatch."
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={submitRejection}
                  disabled={actionMutation.isPending}
                  className="inline-flex h-10 items-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionMutation.isPending ? 'Updating...' : 'Confirm rejection'}
                </button>
                <button
                  onClick={() => {
                    setIsRejecting(false)
                    setRejectReason('')
                  }}
                  disabled={actionMutation.isPending}
                  className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Keep quotation open
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function Info({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <Icon className="h-3.5 w-3.5 text-blue-600" />
        {label}
      </p>
      <div className="mt-2 text-sm text-gray-700">{value}</div>
    </div>
  )
}
