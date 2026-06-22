'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { FileBadge, FileCheck2, Loader2, Shield, Wallet } from 'lucide-react'

interface Policy {
  id: string
  providerName: string
  policyType: string
  insuredAmount: number
  premiumAmount: number
  currencyCode: string
  status: string
  statusLabel: string
  policyNumber?: string | null
  sourceType: string
  sourceLabel: string
  claimCount: number
  latestClaimStatus?: string | null
  partner?: { id: string; name: string; code: string } | null
}

interface PartnerCatalogResponse {
  items: Policy[]
  partners: Array<{ id: string; name: string; code: string; description?: string | null; isDefault?: boolean }>
  sources: {
    products: Array<{
      id: string
      name: string
      slug: string
      sku?: string | null
      barcode?: string | null
      priceMin?: number | null
      currencyCode: string
    }>
    tradeOrders: Array<{
      id: string
      productName: string
      totalAmount: number
      currencyCode: string
      status: string
      shippingAddress?: string | null
      buyerName: string
    }>
    sampleOrders: Array<{
      id: string
      title: string
      totalAmount: number
      currencyCode: string
      status: string
      shippingAddress?: string | null
      buyerName: string
    }>
  }
}

type SourceKind = 'PRODUCT' | 'TRADE_ORDER' | 'SAMPLE_ORDER'

const inputCls =
  'w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none transition focus:border-[#9daf98] focus:ring-2 focus:ring-[#eef2e7]'

const policyTypes = ['CARGO_INSURANCE', 'TRADE_CREDIT', 'MARINE_COVER', 'WAREHOUSE_COVER']

export default function SupplierInsurancePage() {
  const [sourceKind, setSourceKind] = useState<SourceKind>('TRADE_ORDER')
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    partnerId: '',
    providerName: 'Allianz Trade',
    policyType: 'CARGO_INSURANCE',
    insuredAmount: 10000,
    premiumAmount: 120,
    currencyCode: 'USD',
    coverageSummary: '',
    claimInstructions: '',
    startsAt: '',
    endsAt: '',
  })

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['supplier-insurance-policies'],
    queryFn: () => get<PartnerCatalogResponse>('/insurance-policies'),
  })

  const response = data?.data as PartnerCatalogResponse | undefined
  const policies = response?.items || []
  const partners = response?.partners || []
  const products = response?.sources?.products || []
  const tradeOrders = response?.sources?.tradeOrders || []
  const sampleOrders = response?.sources?.sampleOrders || []

  const sourceOptions = sourceKind === 'PRODUCT' ? products : sourceKind === 'TRADE_ORDER' ? tradeOrders : sampleOrders
  const selectedProduct = sourceKind === 'PRODUCT'
    ? products.find((item) => item.id === selectedSourceId) || null
    : null
  const selectedTradeOrder = sourceKind === 'TRADE_ORDER'
    ? tradeOrders.find((item) => item.id === selectedSourceId) || null
    : null
  const selectedSampleOrder = sourceKind === 'SAMPLE_ORDER'
    ? sampleOrders.find((item) => item.id === selectedSourceId) || null
    : null

  useEffect(() => {
    const defaultPartner = partners.find((partner) => partner.isDefault) || partners[0]
    if (defaultPartner && !form.partnerId) {
      setForm((current) => ({
        ...current,
        partnerId: defaultPartner.id,
        providerName: defaultPartner.name,
      }))
    }
  }, [form.partnerId, partners])

  useEffect(() => {
    const nextDefault = sourceOptions[0]?.id || ''
    setSelectedSourceId((current) => (current && current === nextDefault ? current : nextDefault))
  }, [sourceKind, sourceOptions])

  useEffect(() => {
    if (selectedProduct) {
      setForm((current) => ({
        ...current,
        insuredAmount: selectedProduct.priceMin || current.insuredAmount,
        currencyCode: selectedProduct.currencyCode || current.currencyCode,
        coverageSummary: `Standalone product coverage for ${selectedProduct.name}`,
      }))
      return
    }

    const selectedSource = selectedTradeOrder || selectedSampleOrder
    if (selectedSource) {
      setForm((current) => ({
        ...current,
        insuredAmount: selectedSource.totalAmount || current.insuredAmount,
        currencyCode: selectedSource.currencyCode || current.currencyCode,
        coverageSummary: `${sourceKind === 'TRADE_ORDER' ? 'Trade order' : 'Sample order'} coverage for ${'productName' in selectedSource ? selectedSource.productName : selectedSource.title}`,
      }))
    }
  }, [selectedProduct, selectedSampleOrder, selectedTradeOrder, sourceKind])

  const summary = useMemo(() => ({
    total: policies.length,
    active: policies.filter((policy) => policy.status === 'ACTIVE').length,
    openClaims: policies.filter((policy) => policy.status === 'CLAIM_OPEN').length,
    totalProtected: policies.reduce((sum, policy) => sum + Number(policy.insuredAmount || 0), 0),
  }), [policies])

  async function submit() {
    if (!selectedSourceId) {
      toast.error('Select a source order first')
      return
    }

    const payload: Record<string, unknown> = {
      partnerId: form.partnerId || undefined,
      providerName: form.providerName,
      policyType: form.policyType,
      insuredAmount: Number(form.insuredAmount),
      premiumAmount: Number(form.premiumAmount),
      currencyCode: form.currencyCode.trim().toUpperCase() || 'USD',
      coverageSummary: form.coverageSummary.trim() || undefined,
      claimInstructions: form.claimInstructions.trim() || undefined,
      startsAt: form.startsAt || undefined,
      endsAt: form.endsAt || undefined,
    }

    if (sourceKind === 'PRODUCT') payload.productId = selectedSourceId
    if (sourceKind === 'TRADE_ORDER') payload.tradeOrderId = selectedSourceId
    if (sourceKind === 'SAMPLE_ORDER') payload.sampleOrderId = selectedSourceId

    setIsSubmitting(true)
    try {
      await post('/insurance-policies', payload)
      toast.success('Insurance policy quoted')
      setForm((current) => ({
        ...current,
        premiumAmount: 120,
        coverageSummary: '',
        claimInstructions: '',
        startsAt: '',
        endsAt: '',
      }))
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to create insurance policy'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentSourceTitle = selectedProduct?.name || selectedTradeOrder?.productName || selectedSampleOrder?.title || 'No source selected'
  const currentSourceMeta = selectedProduct
    ? [
        selectedProduct.barcode ? `Barcode ${selectedProduct.barcode}` : null,
        selectedProduct.sku ? `SKU ${selectedProduct.sku}` : null,
      ]
    : selectedTradeOrder
    ? [selectedTradeOrder.buyerName, selectedTradeOrder.status, selectedTradeOrder.shippingAddress || null]
    : selectedSampleOrder
      ? [selectedSampleOrder.buyerName, selectedSampleOrder.status, selectedSampleOrder.shippingAddress || null]
      : []

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Supplier insurance
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Insurance control desk</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#616b64]">
              Quote coverage directly against real trade and sample orders, then monitor claims and lifecycle from one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Policies', value: summary.total, icon: FileBadge },
              { label: 'Active', value: summary.active, icon: Shield },
              { label: 'Open claims', value: summary.openClaims, icon: FileCheck2 },
              { label: 'Protected', value: summary.totalProtected.toLocaleString(), icon: Wallet },
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1f2937]">Create policy</h2>
            <p className="mt-1 text-sm text-[#68726b]">Pick an order, choose an underwriting partner, and issue coverage.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ['PRODUCT', 'Product'],
              ['TRADE_ORDER', 'Trade order'],
              ['SAMPLE_ORDER', 'Sample order'],
            ] as Array<[SourceKind, string]>).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                onClick={() => setSourceKind(kind)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  sourceKind === kind
                    ? 'bg-[#243127] text-white'
                    : 'border border-[#d9ddd4] bg-white text-[#58635d] hover:border-[#c9d0c1]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-14"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-[22px] border border-[#e4e7e0] bg-[#fbfbf9] p-4">
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b857c]">Source order</label>
                <select value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)} className={`${inputCls} mt-2`}>
                  <option value="">Select order</option>
                  {sourceKind === 'PRODUCT' && products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                  {sourceKind === 'TRADE_ORDER' && tradeOrders.map((order) => (
                    <option key={order.id} value={order.id}>{order.productName}</option>
                  ))}
                  {sourceKind === 'SAMPLE_ORDER' && sampleOrders.map((order) => (
                    <option key={order.id} value={order.id}>{order.title}</option>
                  ))}
                </select>
                <p className="mt-3 text-xs text-[#7b857c]">{sourceOptions.length} available</p>
              </div>

              <div className="rounded-[22px] border border-[#e4e7e0] bg-[#fbfbf9] p-4">
                <p className="text-sm font-semibold text-[#1f2937]">{currentSourceTitle}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentSourceMeta.filter(Boolean).map((entry) => (
                    <span key={entry} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#556159]">
                      {entry}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[22px] border border-[#e4e7e0] bg-[#fbfbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b857c]">Partners</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {partners.map((partner) => (
                    <span key={partner.id} className={`rounded-full px-3 py-1 text-xs font-semibold ${partner.isDefault ? 'bg-[#e7f6ec] text-[#216c43]' : 'bg-white text-[#7b857c]'}`}>
                      {partner.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Insurance partner">
                <select
                  value={form.partnerId}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    partnerId: event.target.value,
                    providerName: partners.find((item) => item.id === event.target.value)?.name || current.providerName,
                  }))}
                  className={inputCls}
                >
                  <option value="">Select insurance partner</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>{partner.name} ({partner.code})</option>
                  ))}
                </select>
              </Field>
              <Field label="Policy type">
                <select value={form.policyType} onChange={(event) => setForm((current) => ({ ...current, policyType: event.target.value }))} className={inputCls}>
                  {policyTypes.map((policyType) => (
                    <option key={policyType} value={policyType}>{policyType.replaceAll('_', ' ')}</option>
                  ))}
                </select>
              </Field>
              <Field label="Insured amount">
                <input type="number" value={form.insuredAmount} onChange={(event) => setForm((current) => ({ ...current, insuredAmount: Number(event.target.value) }))} className={inputCls} />
              </Field>
              <Field label="Premium amount">
                <input type="number" value={form.premiumAmount} onChange={(event) => setForm((current) => ({ ...current, premiumAmount: Number(event.target.value) }))} className={inputCls} />
              </Field>
              <Field label="Currency">
                <input value={form.currencyCode} onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} className={inputCls} />
              </Field>
              <Field label="Coverage start">
                <input type="date" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} className={inputCls} />
              </Field>
              <Field label="Coverage end">
                <input type="date" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} className={inputCls} />
              </Field>
              <Field label="Coverage summary" className="md:col-span-2">
                <textarea value={form.coverageSummary} onChange={(event) => setForm((current) => ({ ...current, coverageSummary: event.target.value }))} rows={3} className={inputCls} />
              </Field>
              <Field label="Claim instructions" className="md:col-span-2">
                <textarea value={form.claimInstructions} onChange={(event) => setForm((current) => ({ ...current, claimInstructions: event.target.value }))} rows={4} className={inputCls} />
              </Field>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#243127] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d271f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Creating policy...' : 'Create insurance policy'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Policy activity</h2>
          <p className="mt-1 text-sm text-[#68726b]">Coverage quotes, active policies, and claim states in one view</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : !policies.length ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No insurance policies yet.</div>
        ) : (
          <div className="divide-y divide-[#eef1eb]">
            {policies.map((policy) => (
              <article key={policy.id} className="px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#1f2937]">{policy.partner?.name || policy.providerName} · {policy.policyType.replaceAll('_', ' ')}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getPolicyStatusTone(policy.status)}`}>
                        {policy.statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#33403a]">{policy.sourceLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#738076]">
                      <span>{policy.policyNumber || 'Policy number pending'}</span>
                      <span>{policy.sourceType.replaceAll('_', ' ')}</span>
                      <span>{policy.claimCount} claims</span>
                      {policy.latestClaimStatus ? <span>Latest claim: {policy.latestClaimStatus}</span> : null}
                    </div>
                  </div>

                  <div className="text-sm text-[#5f6862] lg:text-right">
                    <p className="font-semibold text-[#1f2937]">
                      {policy.currencyCode} {policy.insuredAmount.toLocaleString()} insured
                    </p>
                    <p className="mt-1">Premium {policy.currencyCode} {policy.premiumAmount.toLocaleString()}</p>
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

function getPolicyStatusTone(status: string) {
  switch (status) {
    case 'QUOTED': return 'bg-[#fff4de] text-[#a66a00]'
    case 'ACTIVE': return 'bg-[#e7f6ec] text-[#216c43]'
    case 'CLAIM_OPEN': return 'bg-[#fff1f2] text-[#be123c]'
    case 'CLAIM_SETTLED': return 'bg-[#e7f1ff] text-[#265ea8]'
    case 'EXPIRED': return 'bg-[#eef1eb] text-[#5f6862]'
    case 'CANCELLED': return 'bg-[#fdecec] text-[#b64242]'
    default: return 'bg-[#eef1eb] text-[#5f6862]'
  }
}
