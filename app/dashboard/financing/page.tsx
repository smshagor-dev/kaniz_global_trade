'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Landmark, LineChart, Loader2, ShieldCheck, Wallet } from 'lucide-react'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface FinancingRequest {
  id: string
  amount: number
  currencyCode: string
  facilityType: string
  status: string
  statusLabel: string
  partnerName?: string | null
  purpose: string
  riskScore: number
  recommendedLimit?: number | null
  riskNotes?: string | null
  partner?: { id: string; name: string; code: string } | null
}

interface PartnerCatalogResponse {
  defaultPartner?: { id: string; name: string; code: string } | null
  partners: Array<{ id: string; name: string; code: string }>
  tradeOrders: Array<{
    id: string
    productName: string
    totalAmount: number
    currencyCode: string
    status: string
    buyerName: string
  }>
  items: FinancingRequest[]
}

const inputCls = 'w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none transition focus:border-[#9daf98] focus:ring-2 focus:ring-[#eef2e7]'

export default function SupplierFinancingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    amount: 10000,
    currencyCode: 'USD',
    purpose: '',
    facilityType: 'WORKING_CAPITAL',
    termDays: 30,
    partnerId: '',
    partnerName: '',
    tradeOrderId: '',
  })

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['supplier-financing-requests'],
    queryFn: () => get<PartnerCatalogResponse>('/financing-requests'),
  })

  const response = data?.data as PartnerCatalogResponse | undefined
  const requests = response?.items || []
  const partnerCatalog = response?.partners || []
  const tradeOrders = response?.tradeOrders || []

  useEffect(() => {
    const defaultPartner = response?.defaultPartner
    if (defaultPartner && !form.partnerId) {
      setForm((current) => ({
        ...current,
        partnerId: defaultPartner.id,
        partnerName: defaultPartner.name,
      }))
    }
  }, [form.partnerId, response?.defaultPartner])

  useEffect(() => {
    if (!tradeOrders.length || form.tradeOrderId) return
    const first = tradeOrders[0]
    setForm((current) => ({
      ...current,
      tradeOrderId: first.id,
      amount: current.amount > 0 ? current.amount : first.totalAmount,
      currencyCode: current.currencyCode || first.currencyCode,
      purpose: current.purpose || `Working capital against trade order ${first.productName} for buyer ${first.buyerName}.`,
    }))
  }, [form.tradeOrderId, tradeOrders])

  const selectedOrder = tradeOrders.find((order) => order.id === form.tradeOrderId) || null

  const summary = useMemo(() => ({
    total: requests.length,
    underReview: requests.filter((request) => ['SUBMITTED', 'UNDER_REVIEW'].includes(request.status)).length,
    approved: requests.filter((request) => ['APPROVED', 'DISBURSED'].includes(request.status)).length,
    requestedAmount: requests.reduce((sum, request) => sum + Number(request.amount || 0), 0),
  }), [requests])

  async function submit() {
    setIsSubmitting(true)
    try {
      await post('/financing-requests', {
        ...form,
        currencyCode: form.currencyCode.trim().toUpperCase(),
        purpose: form.purpose.trim(),
        facilityType: form.facilityType.trim().toUpperCase(),
        partnerName: form.partnerName.trim() || undefined,
        tradeOrderId: form.tradeOrderId || undefined,
      })
      toast.success('Financing request submitted')
      const defaultPartner = response?.defaultPartner
      setForm({
        amount: selectedOrder?.totalAmount || 10000,
        currencyCode: selectedOrder?.currencyCode || 'USD',
        purpose: '',
        facilityType: 'WORKING_CAPITAL',
        termDays: 30,
        partnerId: defaultPartner?.id || '',
        partnerName: defaultPartner?.name || '',
        tradeOrderId: selectedOrder?.id || '',
      })
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to submit financing request'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Supplier financing
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Working capital desk</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#616b64]">
              Raise financing against real trade momentum, route requests to financing partners, and keep score-backed review visibility in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Requests', value: summary.total, icon: Landmark },
              { label: 'Reviewing', value: summary.underReview, icon: ShieldCheck },
              { label: 'Approved', value: summary.approved, icon: LineChart },
              { label: 'Requested', value: `$${summary.requestedAmount.toLocaleString()}`, icon: Wallet },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-[#e4e7e0] bg-[#fbfbf9] p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eef2e7] text-[#4f5d49]">
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-[#1f2937]">{item.value}</p>
                <p className="mt-1 text-xs text-[#6e786f]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#d9ddd4] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1f2937]">Submit request</h2>
            <p className="mt-1 text-sm text-[#68726b]">Link an order, choose a financing partner, and submit a scored working-capital request.</p>
          </div>
          {selectedOrder ? (
            <div className="rounded-[22px] border border-[#e4e7e0] bg-[#fbfbf9] px-4 py-3 text-sm text-[#49544e]">
              {selectedOrder.productName} · {selectedOrder.currencyCode} {selectedOrder.totalAmount.toLocaleString()}
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Field label="Linked trade order">
            <select
              value={form.tradeOrderId}
              onChange={(event) => {
                const order = tradeOrders.find((item) => item.id === event.target.value)
                setForm((current) => ({
                  ...current,
                  tradeOrderId: event.target.value,
                  amount: order ? order.totalAmount : current.amount,
                  currencyCode: order ? order.currencyCode : current.currencyCode,
                }))
              }}
              className={inputCls}
            >
              <option value="">No linked order</option>
              {tradeOrders.map((order) => (
                <option key={order.id} value={order.id}>{order.productName} · {order.buyerName}</option>
              ))}
            </select>
          </Field>
          <Field label="Financing partner">
            <select
              value={form.partnerId}
              onChange={(event) => setForm((current) => ({
                ...current,
                partnerId: event.target.value,
                partnerName: partnerCatalog.find((item) => item.id === event.target.value)?.name || '',
              }))}
              className={inputCls}
            >
              <option value="">Select financing partner</option>
              {partnerCatalog.map((partner) => (
                <option key={partner.id} value={partner.id}>{partner.name} ({partner.code})</option>
              ))}
            </select>
          </Field>
          <Field label="Requested amount">
            <input type="number" value={form.amount} onChange={(event) => setForm((value) => ({ ...value, amount: Number(event.target.value) }))} className={inputCls} />
          </Field>
          <Field label="Currency">
            <input value={form.currencyCode} onChange={(event) => setForm((value) => ({ ...value, currencyCode: event.target.value.toUpperCase() }))} className={inputCls} />
          </Field>
          <Field label="Facility type">
            <select value={form.facilityType} onChange={(event) => setForm((value) => ({ ...value, facilityType: event.target.value }))} className={inputCls}>
              {['WORKING_CAPITAL', 'PURCHASE_ORDER_FINANCING', 'INVOICE_FINANCING', 'RAW_MATERIAL_BRIDGE'].map((option) => (
                <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="Term days">
            <input type="number" value={form.termDays} onChange={(event) => setForm((value) => ({ ...value, termDays: Number(event.target.value) }))} className={inputCls} />
          </Field>
          <Field label="Purpose and trade context" className="md:col-span-2">
            <textarea value={form.purpose} onChange={(event) => setForm((value) => ({ ...value, purpose: event.target.value }))} rows={4} className={inputCls} />
          </Field>
          <div className="md:col-span-2">
            <button onClick={submit} disabled={isSubmitting} className="inline-flex items-center justify-center rounded-2xl bg-[#243127] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d271f] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? 'Submitting...' : 'Request financing'}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Request activity</h2>
          <p className="mt-1 text-sm text-[#68726b]">Status, risk scoring, and recommended limits across every financing request</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : !requests.length ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No financing requests yet.</div>
        ) : (
          <div className="divide-y divide-[#eef1eb]">
            {requests.map((request) => (
              <article key={request.id} className="px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#1f2937]">{request.facilityType.replaceAll('_', ' ')}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusTone(request.status)}`}>
                        {request.statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#49544e]">{request.partner?.name || request.partnerName || 'No partner selected'}</p>
                    <p className="mt-2 text-sm text-[#68726b]">{request.purpose}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#738076]">
                      <span>Risk score {request.riskScore}</span>
                      {request.recommendedLimit != null ? <span>Recommended limit {request.currencyCode} {request.recommendedLimit.toLocaleString()}</span> : null}
                    </div>
                    {request.riskNotes ? <p className="mt-2 text-xs text-[#738076]">{request.riskNotes}</p> : null}
                  </div>
                  <div className="text-sm text-[#5f6862] lg:text-right">
                    <p className="font-semibold text-[#1f2937]">{request.currencyCode} {request.amount.toLocaleString()}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`space-y-2 text-sm text-[#49544e] ${className || ''}`}>
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}

function getStatusTone(status: string) {
  switch (status) {
    case 'SUBMITTED': return 'bg-[#fff4de] text-[#a66a00]'
    case 'UNDER_REVIEW': return 'bg-[#e7f1ff] text-[#265ea8]'
    case 'APPROVED': return 'bg-[#e7f6ec] text-[#216c43]'
    case 'DISBURSED': return 'bg-[#ede9fe] text-[#6b46c1]'
    case 'REJECTED': return 'bg-[#fdecec] text-[#b64242]'
    case 'CLOSED': return 'bg-[#eef1eb] text-[#5f6862]'
    default: return 'bg-[#eef1eb] text-[#5f6862]'
  }
}
