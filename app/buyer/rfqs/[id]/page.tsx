'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Mail, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { get, post } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { getQuotationStatusMeta, getRFQStatusMeta } from '@/lib/trade/status'

interface RFQDetail {
  id: string
  productName: string
  quantity: string
  unit?: string | null
  status: string
  budget?: number | null
  createdAt: string
  requiredDate?: string | null
  expiresAt?: string | null
  description?: string | null
  quotationCount: number
  buyer: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  category?: { id: string; name: string } | null
  destinationCountry?: { id: string; name: string; code: string; flag?: string | null } | null
  currency?: { id: string; code?: string | null; symbol?: string | null } | null
  quotations: Array<{
    id: string
    status: string
    totalPrice: number
    currencyCode: string
    deliveryTime?: string | null
    shippingTerms?: string | null
    validUntil?: string | null
    notes?: string | null
    createdAt: string
    rejectedReason?: string | null
    company: {
      id: string
      name: string
      slug: string
      logo?: string | null
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
  }>
}

export default function BuyerRFQDetailPage() {
  const params = useParams<{ id: string }>()
  const rfqId = params.id
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['buyer-rfq-detail', rfqId],
    queryFn: () => get<RFQDetail>(`/rfqs/${rfqId}`),
    enabled: !!rfqId,
  })

  const rfq = data?.data
  const rfqStatus = rfq ? getRFQStatusMeta(rfq.status) : null

  async function handleQuotationAction(quotationId: string, action: 'ACCEPT' | 'REJECT', reason?: string) {
    setActingId(quotationId)
    try {
      await post(`/quotations/${quotationId}/action`, { action, reason })
      toast.success(action === 'ACCEPT' ? 'Quotation accepted' : 'Quotation rejected')
      setRejectingId(null)
      setRejectReason('')
      refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update quotation'
      toast.error(message)
    } finally {
      setActingId(null)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }

  if (!rfq) {
    return <div className="rounded-xl border border-gray-100 bg-white p-8 text-sm text-gray-500">RFQ not found.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{rfq.productName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {rfq.category?.name || 'General category'} | {rfq.quotationCount} quotation{rfq.quotationCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/rfqs/${rfq.id}`} className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-gray-300">
            View public page
          </Link>
          <Link href="/buyer/quotations" className="inline-flex h-10 items-center rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
            View all quotations
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="Status" value={rfqStatus?.label || rfq.status} />
          <Info label="Quantity" value={`${rfq.quantity}${rfq.unit ? ` ${rfq.unit}` : ''}`} />
          <Info label="Budget" content={<CurrencyAmount amount={rfq.budget} currencyCode={rfq.currency?.code} showCode />} />
          <Info label="Deadline" value={rfq.requiredDate ? new Date(rfq.requiredDate).toLocaleDateString() : 'Not set'} />
          <Info label="Created" value={new Date(rfq.createdAt).toLocaleDateString()} />
          <Info label="Visible until" value={rfq.expiresAt ? new Date(rfq.expiresAt).toLocaleDateString() : 'No expiry'} />
          <Info label="Delivery location" value={rfq.destinationCountry ? rfq.destinationCountry.name : 'Not specified'} />
          <Info label="Buyer" value={`${rfq.buyer.firstName} ${rfq.buyer.lastName}`} />
        </div>
        <div className="mt-5 border-t border-gray-100 pt-5">
          <h2 className="text-sm font-semibold text-gray-900">Description</h2>
          <p className="mt-2 text-sm text-gray-500">{rfqStatus?.description}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
            {rfq.description || 'No additional requirement notes provided.'}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Supplier quotations</h2>
          <span className="text-sm text-gray-400">{rfq.quotations.length} received</span>
        </div>

        {rfq.quotations.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
            No supplier quotations have been submitted for this RFQ yet.
          </div>
        ) : rfq.quotations.map((quotation) => {
          const contact = quotation.company.companyUsers[0]?.user
          const statusMeta = getQuotationStatusMeta(quotation.status)
          const actionDisabled = actingId === quotation.id || ['ACCEPTED', 'REJECTED'].includes(quotation.status)
          const isRejecting = rejectingId === quotation.id

          return (
            <div key={quotation.id} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      Submitted {new Date(quotation.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm text-gray-500">{statusMeta.description}</p>
                  <h3 className="mt-3 text-lg font-bold text-gray-900">{quotation.company.name}</h3>
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
                <Info label="Shipping terms" value={quotation.shippingTerms || 'Not specified'} />
                <Info label="Valid until" value={quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'Not specified'} />
                <Info label="Items" value={String(quotation.items.length)} />
                <Info label="Quotation ID" value={quotation.id} />
              </div>

              <div className="mt-5">
                <h4 className="text-sm font-semibold text-gray-900">Supplier message</h4>
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
                    <h4 className="text-sm font-semibold text-gray-900">Review outcome</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      Accept the best offer to move sourcing forward, or decline with a short note for supplier clarity.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleQuotationAction(quotation.id, 'ACCEPT')}
                      disabled={actionDisabled || isRejecting}
                      className="inline-flex h-10 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actingId === quotation.id ? 'Updating...' : 'Accept quotation'}
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(isRejecting ? null : quotation.id)
                        setRejectReason('')
                      }}
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
                      placeholder="Explain the pricing, quality, quantity, or delivery gap for this supplier."
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleQuotationAction(quotation.id, 'REJECT', rejectReason.trim() || undefined)}
                        disabled={actingId === quotation.id}
                        className="inline-flex h-10 items-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actingId === quotation.id ? 'Updating...' : 'Confirm rejection'}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null)
                          setRejectReason('')
                        }}
                        disabled={actingId === quotation.id}
                        className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Keep quotation open
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Info({
  label,
  value,
  content,
}: {
  label: string
  value?: string
  content?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <div className="mt-2 text-sm text-gray-700">{content || value}</div>
    </div>
  )
}
