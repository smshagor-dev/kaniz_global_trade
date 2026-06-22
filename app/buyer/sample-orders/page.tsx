'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, patch, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { FileText, Loader2, PackageCheck, ShoppingCart, Truck } from 'lucide-react'

interface SampleOrder {
  id: string
  title: string
  quantity: number
  unit?: string | null
  totalAmount: number
  currencyCode: string
  status: string
  shippingAddress?: string | null
  createdAt: string
  supplierCompany: { id: string; name: string; slug: string }
  product?: { id: string; name: string; slug: string } | null
  shipments: Array<{ id: string; carrier: string; trackingNumber: string; trackingUrl?: string | null; status: string }>
}

type SampleFilter =
  | 'ALL'
  | 'PENDING_PAYMENT'
  | 'PENDING_SUPPLIER_CONFIRMATION'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED'

const inputCls =
  'w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none transition focus:border-[#9daf98] focus:ring-2 focus:ring-[#eef2e7]'

export default function BuyerSampleOrdersPage() {
  const [activeFilter, setActiveFilter] = useState<SampleFilter>('ALL')
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({})
  const [form, setForm] = useState({
    supplierCompanyId: '',
    productId: '',
    title: '',
    quantity: 1,
    unit: 'PCS',
    samplePrice: 25,
    shippingCost: 10,
    shippingAddress: '',
    requirements: '',
    buyerNotes: '',
    paymentMethod: 'STRIPE',
  })

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['buyer-sample-orders'],
    queryFn: () => get<SampleOrder[]>('/sample-orders?limit=100'),
  })

  const orders = data?.data || []
  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') return orders
    return orders.filter((order) => order.status === activeFilter)
  }, [activeFilter, orders])

  const summary = {
    total: orders.length,
    pending: orders.filter((order) => order.status === 'PENDING_SUPPLIER_CONFIRMATION').length,
    shipped: orders.filter((order) => order.status === 'SHIPPED').length,
    delivered: orders.filter((order) => order.status === 'DELIVERED').length,
  }

  async function createOrder() {
    if (!form.supplierCompanyId.trim() && !form.productId.trim()) {
      toast.error('Supplier company ID or product ID is required')
      return
    }
    if (!form.shippingAddress.trim() || form.shippingAddress.trim().length < 10) {
      toast.error('A complete shipping address is required')
      return
    }

    setCreating(true)
    try {
      const response = await post<{ checkoutUrl?: string }>('/sample-orders', {
        supplierCompanyId: form.supplierCompanyId.trim() || undefined,
        productId: form.productId.trim() || undefined,
        title: form.title.trim() || undefined,
        quantity: form.quantity,
        unit: form.unit.trim() || undefined,
        samplePrice: form.samplePrice,
        shippingCost: form.shippingCost,
        shippingAddress: form.shippingAddress.trim(),
        requirements: form.requirements.trim() || undefined,
        buyerNotes: form.buyerNotes.trim() || undefined,
        paymentMethod: form.paymentMethod,
        currencyCode: 'USD',
      })
      const checkoutUrl = response.data?.checkoutUrl
      if (checkoutUrl) {
        window.location.href = checkoutUrl
        return
      }
      toast.success('Sample order created')
      setForm({
        supplierCompanyId: '',
        productId: '',
        title: '',
        quantity: 1,
        unit: 'PCS',
        samplePrice: 25,
        shippingCost: 10,
        shippingAddress: '',
        requirements: '',
        buyerNotes: '',
        paymentMethod: 'STRIPE',
      })
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to create sample order'
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  async function runAction(orderId: string, actionKey: string, payload: Record<string, unknown>, successMessage: string) {
    setActionLoading((current) => ({ ...current, [orderId]: actionKey }))
    try {
      await patch(`/sample-orders/${orderId}`, payload)
      toast.success(successMessage)
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update sample order'
      toast.error(message)
    } finally {
      setActionLoading((current) => ({ ...current, [orderId]: null }))
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Buyer sourcing
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Sample orders</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
              Request paid samples before committing to bulk production, track supplier handling, and confirm delivery when the shipment arrives.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'PENDING_PAYMENT', 'PENDING_SUPPLIER_CONFIRMATION', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'REJECTED', 'CANCELLED'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter as SampleFilter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter
                    ? 'bg-[#243127] text-white'
                    : 'border border-[#d9ddd4] bg-white text-[#58635d] hover:border-[#c9d0c1]'
                }`}
              >
                {filter === 'ALL' ? 'All' : humanizeStatus(filter)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total orders', value: summary.total, icon: FileText },
          { label: 'Awaiting supplier', value: summary.pending, icon: ShoppingCart },
          { label: 'Shipped', value: summary.shipped, icon: Truck },
          { label: 'Delivered', value: summary.delivered, icon: PackageCheck },
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
        <h2 className="text-lg font-semibold text-[#1f2937]">Create sample order</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input value={form.supplierCompanyId} onChange={(event) => setForm((current) => ({ ...current, supplierCompanyId: event.target.value }))} placeholder="Supplier company ID" className={inputCls} />
          <input value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))} placeholder="Product ID (optional)" className={inputCls} />
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Sample title" className={inputCls} />
          <input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} placeholder="Unit" className={inputCls} />
          <input type="number" min="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: Number(event.target.value) }))} placeholder="Quantity" className={inputCls} />
          <input type="number" min="0" value={form.samplePrice} onChange={(event) => setForm((current) => ({ ...current, samplePrice: Number(event.target.value) }))} placeholder="Sample price" className={inputCls} />
          <input type="number" min="0" value={form.shippingCost} onChange={(event) => setForm((current) => ({ ...current, shippingCost: Number(event.target.value) }))} placeholder="Shipping cost" className={inputCls} />
          <select value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} className={inputCls}>
            <option value="STRIPE">Stripe</option>
            <option value="SSLCOMMERZ">SSLCommerz</option>
            <option value="AAMARPAY">aamarPay</option>
            <option value="NOWPAYMENTS">NOWPayments</option>
            <option value="MANUAL">Manual</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
          <textarea value={form.shippingAddress} onChange={(event) => setForm((current) => ({ ...current, shippingAddress: event.target.value }))} placeholder="Shipping address" rows={3} className={`${inputCls} md:col-span-2`} />
          <textarea value={form.requirements} onChange={(event) => setForm((current) => ({ ...current, requirements: event.target.value }))} placeholder="Requirements" rows={3} className={inputCls} />
          <textarea value={form.buyerNotes} onChange={(event) => setForm((current) => ({ ...current, buyerNotes: event.target.value }))} placeholder="Buyer notes" rows={3} className={inputCls} />
          <div className="md:col-span-2">
            <button onClick={createOrder} disabled={creating} className="rounded-2xl bg-[#243127] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d271f] disabled:opacity-50">
              {creating ? 'Creating...' : 'Create sample order'}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Sample order table</h2>
          <p className="mt-1 text-sm text-[#68726b]">{filteredOrders.length} sample orders in this view</p>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : !filteredOrders.length ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No sample orders found for this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1320px] divide-y divide-[#e7eae3] text-sm">
              <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                <tr>
                  <th className="px-6 py-4">Sample</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Shipment</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1eb]">
                {filteredOrders.map((order) => {
                  const latestShipment = order.shipments[0]
                  const rowLoading = actionLoading[order.id]
                  const canMarkDelivered = order.status === 'SHIPPED'
                  const canCancel = ['PENDING_PAYMENT', 'PENDING_SUPPLIER_CONFIRMATION', 'CONFIRMED'].includes(order.status)

                  return (
                    <tr key={order.id} className="align-top hover:bg-[#fbfbf9]">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1f2937]">{order.title}</p>
                        <p className="mt-1 text-xs text-[#738076]">
                          {Number(order.quantity).toLocaleString()} {order.unit || 'PCS'}
                          {order.product?.name ? ` | ${order.product.name}` : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-[#5f6862]">{order.supplierCompany.name}</td>
                      <td className="px-6 py-4 font-semibold text-[#1f2937]">{order.currencyCode} {Number(order.totalAmount).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSampleStatusTone(order.status)}`}>
                          {humanizeStatus(order.status)}
                        </span>
                        <p className="mt-2 text-xs text-[#738076]">Created {new Date(order.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        {latestShipment ? (
                          <>
                            <p className="font-medium text-[#1f2937]">{latestShipment.carrier} | {latestShipment.trackingNumber}</p>
                            <p className="mt-1 text-xs text-[#738076]">{humanizeStatus(latestShipment.status)}</p>
                            {latestShipment.trackingUrl ? (
                              <a href={latestShipment.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#3e5840] hover:text-[#243127]">
                                Open tracking
                              </a>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-sm text-[#738076]">No shipment yet</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#5f6862]">{order.shippingAddress || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex min-w-[180px] flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => runAction(order.id, 'deliver', { action: 'MARK_DELIVERED' }, 'Sample marked delivered')}
                            disabled={!canMarkDelivered || !!rowLoading}
                            className="rounded-2xl bg-[#243127] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d271f] disabled:opacity-50"
                          >
                            {rowLoading === 'deliver' ? 'Saving...' : 'Mark delivered'}
                          </button>
                          <button
                            type="button"
                            onClick={() => runAction(order.id, 'cancel', { action: 'CANCEL' }, 'Sample order cancelled')}
                            disabled={!canCancel || !!rowLoading}
                            className="rounded-2xl border border-[#efc2c2] px-4 py-2.5 text-sm font-semibold text-[#b64242] transition hover:border-[#e4aaaa] disabled:opacity-50"
                          >
                            {rowLoading === 'cancel' ? 'Cancelling...' : 'Cancel order'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function humanizeStatus(value: string) {
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function getSampleStatusTone(status: string) {
  switch (status) {
    case 'PENDING_PAYMENT': return 'bg-[#fff4de] text-[#a66a00]'
    case 'PENDING_SUPPLIER_CONFIRMATION': return 'bg-[#e7f1ff] text-[#265ea8]'
    case 'CONFIRMED': return 'bg-[#eef2e7] text-[#3e5840]'
    case 'SHIPPED': return 'bg-[#ede9fe] text-[#6b46c1]'
    case 'DELIVERED': return 'bg-[#e0f2fe] text-[#0369a1]'
    case 'COMPLETED': return 'bg-[#e7f6ec] text-[#216c43]'
    case 'REJECTED': return 'bg-[#fdecec] text-[#b64242]'
    case 'CANCELLED': return 'bg-[#eef1eb] text-[#5f6862]'
    default: return 'bg-[#eef1eb] text-[#5f6862]'
  }
}
