'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { Boxes, ExternalLink, Loader2, Plane, QrCode, ShieldCheck, Truck } from 'lucide-react'

interface Booking {
  id: string
  providerName: string
  serviceMode: string
  origin: string
  destination: string
  quotedCost: number
  finalCost?: number | null
  currencyCode: string
  status: string
  statusLabel: string
  bookingReference?: string | null
  trackingNumber?: string | null
  estimatedDeliveryAt?: string | null
  sourceType: 'PRODUCT' | 'TRADE_ORDER' | 'SAMPLE_ORDER' | 'MANUAL'
  sourceLabel: string
  buyerName?: string | null
  verificationUrl?: string | null
  qrCodeDataUrl?: string | null
  barcodeValue?: string | null
}

interface Provider {
  name: string
  hasCredentials: boolean
}

interface ProductSource {
  id: string
  name: string
  sku?: string | null
  barcode?: string | null
  moq?: number | null
  moqUnit?: string | null
  currencyCode: string
  leadTime?: string | null
  productionCapacity?: string | null
}

interface TradeOrderSource {
  id: string
  productName: string
  quantity: number
  unit?: string | null
  currencyCode: string
  shippingAddress?: string | null
  status: string
  buyerName: string
  product?: { id: string; name: string; sku?: string | null; barcode?: string | null } | null
}

interface SampleOrderSource {
  id: string
  title: string
  quantity: number
  unit?: string | null
  currencyCode: string
  shippingAddress?: string | null
  status: string
  buyerName: string
  product?: { id: string; name: string; sku?: string | null; barcode?: string | null } | null
}

interface LogisticsResponse {
  items: Booking[]
  providers: Provider[]
  sources: {
    products: ProductSource[]
    tradeOrders: TradeOrderSource[]
    sampleOrders: SampleOrderSource[]
  }
}

type SourceKind = 'PRODUCT' | 'TRADE_ORDER' | 'SAMPLE_ORDER'

const inputCls =
  'w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none transition focus:border-[#9daf98] focus:ring-2 focus:ring-[#eef2e7]'

const serviceModes = ['AIR_FREIGHT', 'SEA_FREIGHT', 'ROAD_FREIGHT', 'COURIER', 'WAREHOUSING']

export default function SupplierLogisticsPage() {
  const [sourceKind, setSourceKind] = useState<SourceKind>('PRODUCT')
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    providerName: 'DHL',
    serviceMode: 'AIR_FREIGHT',
    origin: '',
    destination: '',
    quotedCost: 250,
    currencyCode: 'USD',
    estimatedDeliveryAt: '',
    cargoReadyAt: '',
    productQuantity: 1,
    productUnit: 'PCS',
    notes: '',
  })

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['supplier-logistics-bookings'],
    queryFn: () => get<LogisticsResponse>('/logistics-bookings'),
  })

  const response = data?.data as LogisticsResponse | undefined
  const bookings = response?.items || []
  const providers = response?.providers || []
  const products = response?.sources?.products || []
  const tradeOrders = response?.sources?.tradeOrders || []
  const sampleOrders = response?.sources?.sampleOrders || []

  useEffect(() => {
    if (providers.length && !providers.some((provider) => provider.name === form.providerName)) {
      setForm((current) => ({ ...current, providerName: providers[0].name }))
    }
  }, [form.providerName, providers])

  useEffect(() => {
    const nextDefault =
      sourceKind === 'PRODUCT'
        ? products[0]?.id
        : sourceKind === 'TRADE_ORDER'
          ? tradeOrders[0]?.id
          : sampleOrders[0]?.id

    setSelectedSourceId((current) => (current && current === nextDefault ? current : nextDefault || ''))
  }, [products, sampleOrders, sourceKind, tradeOrders])

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
    if (selectedProduct) {
      setForm((current) => ({
        ...current,
        currencyCode: selectedProduct.currencyCode || current.currencyCode,
        productUnit: selectedProduct.moqUnit || current.productUnit || 'PCS',
        productQuantity: current.productQuantity > 0 ? current.productQuantity : Number(selectedProduct.moq || 1),
        notes: current.notes || `Supplier-owned cargo for ${selectedProduct.name}`,
      }))
    }
  }, [selectedProduct])

  useEffect(() => {
    if (selectedTradeOrder) {
      setForm((current) => ({
        ...current,
        destination: selectedTradeOrder.shippingAddress || current.destination,
        currencyCode: selectedTradeOrder.currencyCode || current.currencyCode,
        productQuantity: selectedTradeOrder.quantity || current.productQuantity,
        productUnit: selectedTradeOrder.unit || current.productUnit || 'PCS',
        notes: `Delivery for trade order ${selectedTradeOrder.productName}`,
      }))
    }
  }, [selectedTradeOrder])

  useEffect(() => {
    if (selectedSampleOrder) {
      setForm((current) => ({
        ...current,
        destination: selectedSampleOrder.shippingAddress || current.destination,
        currencyCode: selectedSampleOrder.currencyCode || current.currencyCode,
        productQuantity: selectedSampleOrder.quantity || current.productQuantity,
        productUnit: selectedSampleOrder.unit || current.productUnit || 'PCS',
        notes: `Sample shipment for ${selectedSampleOrder.title}`,
      }))
    }
  }, [selectedSampleOrder])

  const summary = useMemo(() => ({
    total: bookings.length,
    active: bookings.filter((booking) => ['QUOTED', 'BOOKED', 'IN_TRANSIT'].includes(booking.status)).length,
    delivered: bookings.filter((booking) => booking.status === 'DELIVERED').length,
    connectedProviders: providers.filter((provider) => provider.hasCredentials).length,
  }), [bookings, providers])

  const sourceOptions = useMemo(() => (
    sourceKind === 'PRODUCT' ? products : sourceKind === 'TRADE_ORDER' ? tradeOrders : sampleOrders
  ), [products, sampleOrders, sourceKind, tradeOrders])

  const currentSourceTitle =
    sourceKind === 'PRODUCT'
      ? selectedProduct?.name
      : sourceKind === 'TRADE_ORDER'
        ? selectedTradeOrder?.productName
        : selectedSampleOrder?.title

  const currentSourceMeta =
    sourceKind === 'PRODUCT'
      ? [
          selectedProduct?.barcode ? `Barcode ${selectedProduct.barcode}` : null,
          selectedProduct?.sku ? `SKU ${selectedProduct.sku}` : null,
          selectedProduct?.moq ? `MOQ ${selectedProduct.moq} ${selectedProduct.moqUnit || ''}`.trim() : null,
        ]
      : sourceKind === 'TRADE_ORDER'
        ? [
            selectedTradeOrder?.product?.barcode ? `Barcode ${selectedTradeOrder.product.barcode}` : null,
            selectedTradeOrder ? `${selectedTradeOrder.quantity} ${selectedTradeOrder.unit || 'PCS'}` : null,
            selectedTradeOrder?.buyerName || null,
          ]
        : [
            selectedSampleOrder?.product?.barcode ? `Barcode ${selectedSampleOrder.product.barcode}` : null,
            selectedSampleOrder ? `${selectedSampleOrder.quantity} ${selectedSampleOrder.unit || 'PCS'}` : null,
            selectedSampleOrder?.buyerName || null,
          ]

  async function submit() {
    if (!form.origin.trim() || !form.destination.trim()) {
      toast.error('Origin and destination are required')
      return
    }
    if (!selectedSourceId) {
      toast.error('Select a source first')
      return
    }

    const payload: Record<string, unknown> = {
      providerName: form.providerName,
      serviceMode: form.serviceMode,
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      quotedCost: Number(form.quotedCost),
      currencyCode: form.currencyCode.trim().toUpperCase() || 'USD',
      estimatedDeliveryAt: form.estimatedDeliveryAt || undefined,
      cargoReadyAt: form.cargoReadyAt || undefined,
      productQuantity: Number(form.productQuantity),
      productUnit: form.productUnit.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }

    if (sourceKind === 'PRODUCT') payload.productId = selectedSourceId
    if (sourceKind === 'TRADE_ORDER') payload.tradeOrderId = selectedSourceId
    if (sourceKind === 'SAMPLE_ORDER') payload.sampleOrderId = selectedSourceId

    setIsSubmitting(true)
    try {
      await post('/logistics-bookings', payload)
      toast.success('Logistics booking created with QR verification')
      setForm((current) => ({
        ...current,
        origin: '',
        destination: '',
        quotedCost: 250,
        estimatedDeliveryAt: '',
        cargoReadyAt: '',
        notes: '',
      }))
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to create logistics booking'
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
              Supplier logistics
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Logistics control tower</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#616b64]">
              Every booking now carries a barcode-linked QR so buyer, supplier, and Kaniz Global Trade can verify the same live status.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total', value: summary.total, icon: Boxes },
              { label: 'Active', value: summary.active, icon: Truck },
              { label: 'Delivered', value: summary.delivered, icon: ShieldCheck },
              { label: 'Carriers', value: summary.connectedProviders, icon: Plane },
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
            <h2 className="text-lg font-semibold text-[#1f2937]">Create booking</h2>
            <p className="mt-1 text-sm text-[#68726b]">Select a source and generate a live verification QR automatically.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ['PRODUCT', 'Product'],
              ['TRADE_ORDER', 'Trade'],
              ['SAMPLE_ORDER', 'Sample'],
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
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b857c]">
                  Source
                </label>
                <select
                  value={selectedSourceId}
                  onChange={(event) => setSelectedSourceId(event.target.value)}
                  className={`${inputCls} mt-2`}
                >
                  <option value="">Select source</option>
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
                <p className="text-sm font-semibold text-[#1f2937]">{currentSourceTitle || 'No source selected'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentSourceMeta.filter(Boolean).map((entry) => (
                    <span key={entry} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#556159]">
                      {entry}
                    </span>
                  ))}
                </div>
                {sourceKind === 'TRADE_ORDER' && selectedTradeOrder?.shippingAddress ? (
                  <p className="mt-3 text-sm text-[#68726b]">{selectedTradeOrder.shippingAddress}</p>
                ) : null}
                {sourceKind === 'SAMPLE_ORDER' && selectedSampleOrder?.shippingAddress ? (
                  <p className="mt-3 text-sm text-[#68726b]">{selectedSampleOrder.shippingAddress}</p>
                ) : null}
                {sourceKind === 'PRODUCT' && selectedProduct?.productionCapacity ? (
                  <p className="mt-3 text-sm text-[#68726b]">Capacity: {selectedProduct.productionCapacity}</p>
                ) : null}
              </div>

              <div className="rounded-[22px] border border-[#e4e7e0] bg-[#fbfbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b857c]">Carriers</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {providers.map((provider) => (
                    <span
                      key={provider.name}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        provider.hasCredentials ? 'bg-[#e7f6ec] text-[#216c43]' : 'bg-white text-[#7b857c]'
                      }`}
                    >
                      {provider.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Provider">
                <select value={form.providerName} onChange={(event) => setForm((v) => ({ ...v, providerName: event.target.value }))} className={inputCls}>
                  {providers.map((provider) => (
                    <option key={provider.name} value={provider.name}>{provider.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Service mode">
                <select value={form.serviceMode} onChange={(event) => setForm((v) => ({ ...v, serviceMode: event.target.value }))} className={inputCls}>
                  {serviceModes.map((serviceMode) => (
                    <option key={serviceMode} value={serviceMode}>{serviceMode.replaceAll('_', ' ')}</option>
                  ))}
                </select>
              </Field>
              <Field label="Origin">
                <input value={form.origin} onChange={(event) => setForm((v) => ({ ...v, origin: event.target.value }))} placeholder="Origin" className={inputCls} />
              </Field>
              <Field label="Destination">
                <input value={form.destination} onChange={(event) => setForm((v) => ({ ...v, destination: event.target.value }))} placeholder="Destination" className={inputCls} />
              </Field>
              <Field label="Quoted cost">
                <input type="number" value={form.quotedCost} onChange={(event) => setForm((v) => ({ ...v, quotedCost: Number(event.target.value) }))} placeholder="Quoted cost" className={inputCls} />
              </Field>
              <Field label="Currency">
                <input value={form.currencyCode} onChange={(event) => setForm((v) => ({ ...v, currencyCode: event.target.value.toUpperCase() }))} placeholder="Currency" className={inputCls} />
              </Field>
              <Field label="Quantity">
                <input type="number" value={form.productQuantity} onChange={(event) => setForm((v) => ({ ...v, productQuantity: Number(event.target.value) }))} placeholder="Quantity" className={inputCls} />
              </Field>
              <Field label="Unit">
                <input value={form.productUnit} onChange={(event) => setForm((v) => ({ ...v, productUnit: event.target.value }))} placeholder="Unit" className={inputCls} />
              </Field>
              <Field label="Cargo ready date">
                <input type="date" value={form.cargoReadyAt} onChange={(event) => setForm((v) => ({ ...v, cargoReadyAt: event.target.value }))} className={inputCls} />
              </Field>
              <Field label="Estimated delivery date">
                <input type="date" value={form.estimatedDeliveryAt} onChange={(event) => setForm((v) => ({ ...v, estimatedDeliveryAt: event.target.value }))} className={inputCls} />
              </Field>
              <Field label="Notes" className="md:col-span-2">
                <textarea value={form.notes} onChange={(event) => setForm((v) => ({ ...v, notes: event.target.value }))} placeholder="Notes" rows={4} className={inputCls} />
              </Field>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#243127] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d271f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Creating booking...' : 'Create logistics booking'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Recent bookings</h2>
          <p className="mt-1 text-sm text-[#68726b]">Each booking includes a live QR verification link</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : !bookings.length ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No logistics bookings yet.</div>
        ) : (
          <div className="divide-y divide-[#eef1eb]">
            {bookings.map((booking) => (
              <article key={booking.id} className="px-6 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#1f2937]">{booking.providerName} · {booking.serviceMode.replaceAll('_', ' ')}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getBookingStatusTone(booking.status)}`}>
                        {booking.statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#33403a]">{booking.sourceLabel}</p>
                    <p className="mt-1 text-sm text-[#68726b]">{booking.origin} to {booking.destination}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#738076]">
                      <span>{booking.bookingReference || 'Reference pending'}</span>
                      <span>{booking.sourceType.replaceAll('_', ' ')}</span>
                      {booking.barcodeValue ? <span>Barcode: {booking.barcodeValue}</span> : null}
                      {booking.buyerName ? <span>Buyer: {booking.buyerName}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 xl:items-end">
                    <div className="text-sm text-[#5f6862] xl:text-right">
                      <p className="font-semibold text-[#1f2937]">
                        {booking.currencyCode} {Number(booking.finalCost ?? booking.quotedCost).toLocaleString()}
                      </p>
                      <p className="mt-1">
                        {booking.estimatedDeliveryAt ? new Date(booking.estimatedDeliveryAt).toLocaleDateString() : 'ETA not set'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {booking.qrCodeDataUrl ? (
                        <img src={booking.qrCodeDataUrl} alt="Booking QR code" className="h-20 w-20 rounded-2xl border border-[#e7eae3] p-2" />
                      ) : null}
                      {booking.verificationUrl ? (
                        <a
                          href={booking.verificationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-2xl border border-[#d9ddd4] bg-white px-4 py-2 text-sm font-semibold text-[#243127] transition hover:border-[#c9d0c1]"
                        >
                          <QrCode className="h-4 w-4" />
                          Verify live
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
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

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`space-y-2 text-sm text-[#49544e] ${className || ''}`}>
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}

function getBookingStatusTone(status: string) {
  switch (status) {
    case 'QUOTED': return 'bg-[#fff4de] text-[#a66a00]'
    case 'BOOKED': return 'bg-[#e7f1ff] text-[#265ea8]'
    case 'IN_TRANSIT': return 'bg-[#ede9fe] text-[#6b46c1]'
    case 'DELIVERED': return 'bg-[#e7f6ec] text-[#216c43]'
    case 'CANCELLED': return 'bg-[#fdecec] text-[#b64242]'
    default: return 'bg-[#eef1eb] text-[#5f6862]'
  }
}
