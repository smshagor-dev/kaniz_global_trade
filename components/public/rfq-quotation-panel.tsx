'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import { LoadingButton } from '@/components/ui/loading-button'
import { useCurrentUser, useIsAuthenticated, useIsBuyer, useIsSupplier } from '@/store/auth'
import { getQuotationStatusMeta, getRFQStatusMeta } from '@/lib/trade/status'

type CompanyResponse = {
  id: string
  name: string
  slug: string
}

export function RFQQuotationPanel({
  rfq,
  existingQuotation,
  onSubmitted,
}: {
  rfq: {
    id: string
    buyerId: string
    productName: string
    quantity: string
    unit?: string | null
    status: string
    currency?: { code?: string | null } | null
  }
  existingQuotation?: {
    id: string
    status: string
    createdAt?: string
    totalPrice?: number
    currencyCode?: string
  } | null
  onSubmitted?: () => void
}) {
  const user = useCurrentUser()
  const isAuthenticated = useIsAuthenticated()
  const isSupplier = useIsSupplier()
  const isBuyer = useIsBuyer()
  const isOwner = user?.id === rfq.buyerId
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(() => ({
    totalPrice: '',
    currencyCode: rfq.currency?.code || 'USD',
    deliveryTime: '',
    notes: '',
    lineQuantity: extractNumericQuantity(rfq.quantity),
  }))

  const { data: companyData } = useQuery({
    queryKey: ['my-company-for-rfq-quote'],
    queryFn: () => get<CompanyResponse>('/me/company'),
    enabled: isAuthenticated && isSupplier,
  })

  const company = companyData?.data
  const lineQuantity = useMemo(() => {
    const parsed = Number(form.lineQuantity)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  }, [form.lineQuantity])
  const rfqStatus = getRFQStatusMeta(rfq.status)
  const existingQuotationStatus = existingQuotation ? getQuotationStatusMeta(existingQuotation.status) : null

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!company?.id) {
      toast.error('Please complete your supplier company setup before quoting')
      return
    }

    const totalPrice = Number(form.totalPrice)
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      toast.error('Enter a valid quotation amount')
      return
    }

    if (!Number.isFinite(lineQuantity) || lineQuantity <= 0) {
      toast.error('Enter a valid quantity for your quotation')
      return
    }

    setLoading(true)
    try {
      await post('/quotations', {
        rfqId: rfq.id,
        companyId: company.id,
        buyerId: rfq.buyerId,
        totalPrice,
        currencyCode: form.currencyCode,
        deliveryTime: form.deliveryTime,
        notes: form.notes,
        items: [
          {
            description: `Quotation for ${rfq.productName}`,
            quantity: lineQuantity,
            unit: rfq.unit || undefined,
            unitPrice: Number((totalPrice / lineQuantity).toFixed(2)),
            totalPrice,
            notes: form.notes,
          },
        ],
      })
      toast.success('Quotation submitted successfully')
      setForm((current) => ({ ...current, totalPrice: '', deliveryTime: '', notes: '' }))
      onSubmitted?.()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to submit quotation'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Send a quotation</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in as a supplier to submit your offer for this RFQ.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/auth/login?redirect=${encodeURIComponent(`/rfqs/${rfq.id}`)}`} className="inline-flex h-11 items-center rounded-full bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800">
            Login
          </Link>
          <Link href="/auth/register?role=SUPPLIER_OWNER" className="inline-flex h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:border-slate-300">
            Register as supplier
          </Link>
        </div>
      </div>
    )
  }

  if (isOwner || (isBuyer && !isSupplier)) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Manage this RFQ</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This RFQ belongs to your buyer account. Review supplier responses in your buyer workspace.
        </p>
        <Link href={`/buyer/rfqs/${rfq.id}`} className="mt-4 inline-flex h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800">
          Open buyer RFQ detail
        </Link>
      </div>
    )
  }

  if (!isSupplier) {
    return (
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Supplier access required</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Quotations can only be submitted from supplier accounts with a company profile.
        </p>
        <Link href="/auth/register?role=SUPPLIER_OWNER" className="mt-4 inline-flex h-11 items-center rounded-full bg-amber-600 px-5 text-sm font-semibold text-white hover:bg-amber-700">
          Become a supplier
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Send your quotation</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Submit one quotation per supplier company for active RFQs.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${rfqStatus.className}`}>
          {rfqStatus.shortLabel}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-600">{rfqStatus.description}</p>

      {existingQuotation ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">Your company already submitted a quotation.</p>
          <p className="mt-1 text-sm text-emerald-700">
            Status: {existingQuotationStatus?.label || existingQuotation.status}
            {existingQuotation.createdAt ? ` | Submitted ${new Date(existingQuotation.createdAt).toLocaleDateString()}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/dashboard/quotations" className="inline-flex h-10 items-center rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">
              View my quotations
            </Link>
            <Link href={`/dashboard/rfqs/${rfq.id}`} className="inline-flex h-10 items-center rounded-full border border-emerald-200 px-4 text-sm font-semibold text-emerald-700 hover:border-emerald-300">
              Open RFQ detail
            </Link>
          </div>
        </div>
      ) : null}

      {!company?.id ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          A primary supplier company is required before you can quote on marketplace RFQs.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Quoted amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.totalPrice}
            onChange={(event) => setForm((current) => ({ ...current, totalPrice: event.target.value }))}
            className={inputCls}
            placeholder="Enter your best offer"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Currency</label>
            <input
              value={form.currencyCode}
              onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))}
              className={inputCls}
              placeholder="USD"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">Delivery time</label>
            <input
              value={form.deliveryTime}
              onChange={(event) => setForm((current) => ({ ...current, deliveryTime: event.target.value }))}
              className={inputCls}
              placeholder="e.g. 20 days after deposit"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Quoted quantity</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.lineQuantity}
            onChange={(event) => setForm((current) => ({ ...current, lineQuantity: event.target.value }))}
            className={inputCls}
            placeholder={rfq.quantity}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">Message</label>
          <textarea
            rows={5}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            className={`${inputCls} min-h-[120px] resize-y`}
            placeholder="Share lead time, packaging, payment expectations, and any conditions with the buyer."
          />
        </div>

        <LoadingButton
          type="submit"
          loading={loading}
          disabled={!company?.id || !!existingQuotation}
          loadingText="Submitting quotation..."
          className="inline-flex h-11 items-center rounded-full bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Submit quotation
        </LoadingButton>
      </form>
    </div>
  )
}

function extractNumericQuantity(quantity: string) {
  const parsed = Number(quantity.replace(/,/g, '').match(/[\d.]+/)?.[0] || '')
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : '1'
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100'
