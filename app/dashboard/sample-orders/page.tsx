'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { FileText, Loader2, PackageCheck, ShieldCheck, Truck } from 'lucide-react'

interface SampleOrder {
  id: string
  title: string
  quantity: number
  unit?: string | null
  totalAmount: number
  currencyCode: string
  status: string
  shippingAddress?: string | null
  buyerNotes?: string | null
  supplierNotes?: string | null
  createdAt: string
  confirmedAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  buyer: { id: string; firstName: string; lastName: string; email: string }
  product?: { id: string; name: string; slug: string } | null
  shipments: Array<{ id: string; carrier: string; trackingNumber: string; trackingUrl?: string | null; status: string }>
}

interface LogisticsResponse {
  items: Array<unknown>
  providers: Array<{ name: string; hasCredentials: boolean }>
}

type SampleFilter =
  | 'ALL'
  | 'PENDING_SUPPLIER_CONFIRMATION'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED'

const inputCls =
  'w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none transition focus:border-[#9daf98] focus:ring-2 focus:ring-[#eef2e7]'

export default function SupplierSampleOrdersPage() {
  const [activeFilter, setActiveFilter] = useState<SampleFilter>('ALL')
  const [tracking, setTracking] = useState<Record<string, { trackingCarrier: string; trackingNumber: string }>>({})
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({})

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['supplier-sample-orders'],
    queryFn: () => get<SampleOrder[]>('/sample-orders?limit=100'),
  })
  const { data: logisticsData } = useQuery({
    queryKey: ['supplier-sample-carriers'],
    queryFn: () => get<LogisticsResponse>('/logistics-bookings'),
  })

  const orders = data?.data || []
  const carrierOptions = logisticsData?.data?.providers || []
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

  function setRowLoading(orderId: string, action: string | null) {
    setActionLoading((current) => ({ ...current, [orderId]: action }))
  }

  async function runAction(orderId: string, action: string, payload: Record<string, unknown>) {
    setRowLoading(orderId, action)
    try {
      await patch(`/sample-orders/${orderId}`, payload)
      toast.success(`Sample order ${action.toLowerCase()}ed`)
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update sample order'
      toast.error(message)
    } finally {
      setRowLoading(orderId, null)
    }
  }

  async function confirmOrder(orderId: string) {
    await runAction(orderId, 'confirm', { action: 'CONFIRM' })
  }

  async function rejectOrder(orderId: string) {
    await runAction(orderId, 'reject', { action: 'REJECT' })
  }

  async function shipOrder(orderId: string) {
    const selectedCarrier = tracking[orderId]?.trackingCarrier || carrierOptions[0]?.name || ''
    const trackingNumber = tracking[orderId]?.trackingNumber?.trim() || ''
    if (!selectedCarrier || !trackingNumber) {
      toast.error('Carrier and tracking number are required before shipping a sample order')
      return
    }
    await runAction(orderId, 'ship', {
      action: 'SHIP',
      trackingCarrier: selectedCarrier,
      trackingNumber,
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Sample workflow
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Sample orders</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
              Confirm paid sample requests, reject unworkable requests, and ship samples using the same Kaniz Global Trade carrier list used across the platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'PENDING_SUPPLIER_CONFIRMATION', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'REJECTED', 'CANCELLED'].map((filter) => (
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
          { label: 'Awaiting supplier', value: summary.pending, icon: ShieldCheck },
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
            <table className="min-w-[1380px] divide-y divide-[#e7eae3] text-sm">
              <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                <tr>
                  <th className="px-6 py-4">Sample</th>
                  <th className="px-6 py-4">Buyer</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Shipment</th>
                  <th className="px-6 py-4">Tracking input</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1eb]">
                {filteredOrders.map((order) => {
                  const latestShipment = order.shipments[0]
                  const rowLoading = actionLoading[order.id]
                  const canConfirm = order.status === 'PENDING_SUPPLIER_CONFIRMATION'
                  const canReject = ['PENDING_SUPPLIER_CONFIRMATION', 'CONFIRMED'].includes(order.status)
                  const canShip = order.status === 'CONFIRMED'

                  return (
                    <tr key={order.id} className="align-top hover:bg-[#fbfbf9]">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1f2937]">{order.title}</p>
                        <p className="mt-1 text-xs text-[#738076]">
                          {Number(order.quantity).toLocaleString()} {order.unit || 'PCS'}
                          {order.product?.name ? ` | ${order.product.name}` : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-[#1f2937]">{order.buyer.firstName} {order.buyer.lastName}</p>
                        <p className="mt-1 text-xs text-[#738076]">{order.buyer.email}</p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-[#1f2937]">
                        {order.currencyCode} {Number(order.totalAmount).toLocaleString()}
                      </td>
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
                          <p className="text-sm text-[#738076]">No shipment created</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[220px] space-y-2">
                          {carrierOptions.length > 0 ? (
                            <select
                              value={tracking[order.id]?.trackingCarrier || carrierOptions[0]?.name || ''}
                              onChange={(event) =>
                                setTracking((current) => ({
                                  ...current,
                                  [order.id]: { ...current[order.id], trackingCarrier: event.target.value },
                                }))
                              }
                              className={inputCls}
                              disabled={!canShip || rowLoading === 'ship'}
                            >
                              {carrierOptions.map((provider) => (
                                <option key={provider.name} value={provider.name}>
                                  {provider.name}{provider.hasCredentials ? '' : ' (Manual)'}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="rounded-2xl border border-[#e8d5a2] bg-[#fff9eb] px-3 py-2.5 text-sm text-[#9a6a00]">
                              No active carriers set by Kaniz Global Trade
                            </div>
                          )}
                          <input
                            placeholder="Tracking number"
                            value={tracking[order.id]?.trackingNumber || ''}
                            onChange={(event) =>
                              setTracking((current) => ({
                                ...current,
                                [order.id]: { ...current[order.id], trackingNumber: event.target.value },
                              }))
                            }
                            className={inputCls}
                            disabled={!canShip || rowLoading === 'ship'}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex min-w-[200px] flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => confirmOrder(order.id)}
                            disabled={!canConfirm || !!rowLoading}
                            className="rounded-2xl bg-[#243127] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d271f] disabled:opacity-50"
                          >
                            {rowLoading === 'confirm' ? 'Confirming...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => shipOrder(order.id)}
                            disabled={!canShip || !!rowLoading}
                            className="rounded-2xl border border-[#d9ddd4] px-4 py-2.5 text-sm font-semibold text-[#3e5840] transition hover:border-[#c9d0c1] disabled:opacity-50"
                          >
                            {rowLoading === 'ship' ? 'Shipping...' : 'Ship'}
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectOrder(order.id)}
                            disabled={!canReject || !!rowLoading}
                            className="rounded-2xl border border-[#efc2c2] px-4 py-2.5 text-sm font-semibold text-[#b64242] transition hover:border-[#e4aaaa] disabled:opacity-50"
                          >
                            {rowLoading === 'reject' ? 'Rejecting...' : 'Reject'}
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
