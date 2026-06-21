'use client'

import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Calendar, FileText, Loader2, Package, ReceiptText, Truck } from 'lucide-react'
import { get } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { getQuotationStatusMeta, getRFQStatusMeta } from '@/lib/trade/status'

interface SupplierQuotationDetail {
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
    expiresAt?: string | null
  } | null
  inquiry?: {
    id: string
    subject: string
    quantity?: string | null
    targetPrice?: string | null
    status: string
    createdAt: string
  } | null
  paymentTerm?: { id: string; name: string } | null
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

function Info({
  label,
  value,
  icon: Icon,
  content,
}: {
  label: string
  value?: string
  icon: ComponentType<{ className?: string }>
  content?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Icon className="h-4 w-4 text-blue-600" />
        {label}
      </div>
      <div className="mt-2 text-sm text-gray-600">{content || value}</div>
    </div>
  )
}

export default function DashboardQuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-quotation-detail', id],
    queryFn: () => get<SupplierQuotationDetail>(`/quotations/${id}`),
    enabled: !!id,
  })

  const quotation = data?.data
  const statusMeta = quotation ? getQuotationStatusMeta(quotation.status) : null
  const rfqStatus = quotation?.rfq ? getRFQStatusMeta(quotation.rfq.status) : null

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
        Quotation not found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/dashboard/quotations" className="text-sm font-medium text-blue-700 hover:text-blue-800">
            Back to quotations
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            {quotation.rfq?.productName || quotation.inquiry?.subject || 'Custom quotation'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Submitted on {new Date(quotation.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta?.className || 'bg-slate-100 text-slate-700'}`}>
            {statusMeta?.label || quotation.status}
          </span>
          {quotation.tradeOrder ? (
            <Link href="/dashboard/trade-orders" className="inline-flex h-10 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
              Open trade order
            </Link>
          ) : null}
          {quotation.rfq?.id ? (
            <Link href={`/dashboard/rfqs/${quotation.rfq.id}`} className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-gray-300">
              View RFQ
            </Link>
          ) : null}
          {quotation.inquiry?.id ? (
            <Link href={`/dashboard/inquiries/${quotation.inquiry.id}`} className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 hover:border-gray-300">
              View inquiry
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Quotation overview</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Info
                icon={ReceiptText}
                label="Total quoted"
                content={<CurrencyAmount amount={quotation.totalPrice} currencyCode={quotation.currencyCode} showCode />}
              />
              <Info icon={Truck} label="Delivery time" value={quotation.deliveryTime || 'Not specified'} />
              <Info icon={Calendar} label="Valid until" value={quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'Not specified'} />
              <Info icon={FileText} label="Shipping terms" value={quotation.shippingTerms || 'Not specified'} />
              <Info icon={Package} label="Line items" value={String(quotation.items.length)} />
              <Info icon={Calendar} label="Trade order" value={quotation.tradeOrder ? quotation.tradeOrder.status : 'Not created'} />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Supplier message</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">
              {quotation.notes || 'No extra notes provided.'}
            </p>
            {quotation.rejectedReason ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                Rejection reason: {quotation.rejectedReason}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Quoted items</h2>
            <div className="mt-4 space-y-3">
              {quotation.items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{item.description}</p>
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
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Linked request</h2>
            <div className="mt-4 space-y-4 text-sm">
              {quotation.rfq ? (
                <>
                  <div>
                    <p className="text-gray-400">RFQ</p>
                    <p className="mt-1 font-medium text-gray-900">{quotation.rfq.productName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Requested quantity</p>
                    <p className="mt-1 font-medium text-gray-900">{quotation.rfq.quantity}{quotation.rfq.unit ? ` ${quotation.rfq.unit}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">RFQ status</p>
                    <p className="mt-1 font-medium text-gray-900">{rfqStatus?.label || quotation.rfq.status}</p>
                  </div>
                </>
              ) : quotation.inquiry ? (
                <>
                  <div>
                    <p className="text-gray-400">Inquiry</p>
                    <p className="mt-1 font-medium text-gray-900">{quotation.inquiry.subject}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Requested quantity</p>
                    <p className="mt-1 font-medium text-gray-900">{quotation.inquiry.quantity || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Target price</p>
                    <p className="mt-1 font-medium text-gray-900">{quotation.inquiry.targetPrice || 'Not specified'}</p>
                  </div>
                </>
              ) : (
                <p className="text-gray-500">No linked RFQ or inquiry.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
