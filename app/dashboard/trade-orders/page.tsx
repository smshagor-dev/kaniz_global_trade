'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { useCurrentUser } from '@/store/auth'
import toast from 'react-hot-toast'
import { FileText, Loader2, PackageCheck, ShieldCheck, Truck } from 'lucide-react'

interface TradeOrder {
  id: string
  productName: string
  quantity: number
  unit: string
  subtotal: number
  shippingCost: number
  escrowFee: number
  platformCommissionAmount: number
  totalAmount: number
  currencyCode: string
  status: string
  createdAt: string
  acceptedAt?: string | null
  completedAt?: string | null
  buyer: { id: string; firstName: string; lastName: string; email: string }
  escrowAccount?: { status: string; fundedAt?: string | null; releasedAt?: string | null } | null
  shipments: Array<{
    id: string
    carrier: string
    trackingNumber: string
    trackingUrl?: string | null
    status: string
    lastEvent?: string | null
    lastLocation?: string | null
    shippedAt?: string | null
    deliveredAt?: string | null
  }>
  disputes: Array<{ id: string; status: string }>
  ratings?: Array<{ id: string; authorUserId: string; createdAt: string }>
}

interface LogisticsProvidersResponse {
  items: Array<unknown>
  providers: Array<{ name: string; hasCredentials: boolean }>
}

type OrderFilter =
  | 'ALL'
  | 'PENDING_ESCROW_PAYMENT'
  | 'ESCROW_FUNDED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'

const inputCls =
  'w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none transition focus:border-[#9daf98] focus:ring-2 focus:ring-[#eef2e7]'

export default function SupplierTradeOrdersPage() {
  const user = useCurrentUser()
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('ALL')
  const [tracking, setTracking] = useState<Record<string, { carrier: string; trackingNumber: string }>>({})
  const [rating, setRating] = useState<Record<string, number>>({})
  const [documentType, setDocumentType] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({})

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['supplier-trade-orders'],
    queryFn: () => get<TradeOrder[]>('/trade-orders?limit=100'),
  })
  const { data: logisticsData } = useQuery({
    queryKey: ['supplier-trade-carriers'],
    queryFn: () => get<LogisticsProvidersResponse>('/logistics-bookings'),
  })

  const orders = data?.data || []
  const carrierOptions = logisticsData?.data?.providers || []
  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') return orders
    return orders.filter((order) => order.status === activeFilter)
  }, [activeFilter, orders])

  const summary = {
    total: orders.length,
    active: orders.filter((order) => ['ESCROW_FUNDED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)).length,
    completed: orders.filter((order) => order.status === 'COMPLETED').length,
    disputes: orders.filter((order) => order.status === 'DISPUTED').length,
  }

  function setRowLoading(orderId: string, action: string | null) {
    setActionLoading((current) => ({ ...current, [orderId]: action }))
  }

  async function runAction(orderId: string, action: string, fn: () => Promise<void>) {
    setRowLoading(orderId, action)
    try {
      await fn()
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to complete trade order action'
      toast.error(message)
    } finally {
      setRowLoading(orderId, null)
    }
  }

  async function createShipment(orderId: string) {
    const current = tracking[orderId]
    const selectedCarrier = current?.carrier?.trim() || carrierOptions[0]?.name || ''
    if (!selectedCarrier || !current?.trackingNumber?.trim()) {
      toast.error('Carrier and tracking number are required before creating a shipment')
      return
    }

    await runAction(orderId, 'shipment', async () => {
      await post(`/trade-orders/${orderId}/shipment`, {
        carrier: selectedCarrier,
        trackingNumber: current.trackingNumber.trim(),
      })
      toast.success('Shipment created')
    })
  }

  async function requestRelease(orderId: string) {
    await runAction(orderId, 'release', async () => {
      await post(`/trade-orders/${orderId}/release`, { action: 'REQUEST_RELEASE' })
      toast.success('Escrow release requested')
    })
  }

  async function generateDocument(orderId: string) {
    await runAction(orderId, 'document', async () => {
      const type = documentType[orderId] || 'COMMERCIAL_INVOICE'
      await post(`/trade-orders/${orderId}/documents`, { type })
      toast.success(`${type.replace(/_/g, ' ')} generated`)
    })
  }

  async function rateBuyer(orderId: string) {
    const score = rating[orderId] || 5
    if (score < 1 || score > 5) {
      toast.error('Rating must be between 1 and 5')
      return
    }

    await runAction(orderId, 'rating', async () => {
      await post(`/trade-orders/${orderId}/rating`, {
        rating: score,
        qualityRating: score,
        communicationRating: score,
        deliveryRating: score,
        title: 'Supplier rating',
        comment: 'Buyer completed this trade order successfully.',
      })
      toast.success('Buyer rated successfully')
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Trade assurance
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Trade orders</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
              Monitor escrow-backed supplier orders, create shipments, request payout release, and keep every order action controlled by its real lifecycle state.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'ESCROW_FUNDED', label: 'Funded' },
              { key: 'PROCESSING', label: 'Processing' },
              { key: 'SHIPPED', label: 'Shipped' },
              { key: 'DELIVERED', label: 'Delivered' },
              { key: 'COMPLETED', label: 'Completed' },
              { key: 'DISPUTED', label: 'Disputed' },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key as OrderFilter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter.key
                    ? 'bg-[#243127] text-white'
                    : 'border border-[#d9ddd4] bg-white text-[#58635d] hover:border-[#c9d0c1]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total orders', value: summary.total, icon: FileText },
          { label: 'Active pipeline', value: summary.active, icon: Truck },
          { label: 'Completed', value: summary.completed, icon: PackageCheck },
          { label: 'Disputed', value: summary.disputes, icon: ShieldCheck },
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
          <h2 className="text-lg font-semibold text-[#1f2937]">Trade order table</h2>
          <p className="mt-1 text-sm text-[#68726b]">{filteredOrders.length} orders in this view</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No trade assurance orders found for this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1320px] divide-y divide-[#e7eae3] text-sm">
              <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                <tr>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Buyer</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Escrow</th>
                  <th className="px-6 py-4">Shipment</th>
                  <th className="px-6 py-4">Tracking input</th>
                  <th className="px-6 py-4">Documents</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1eb]">
                {filteredOrders.map((order) => {
                  const latestShipment = order.shipments[0]
                  const myRating = order.ratings?.some((entry) => entry.authorUserId === user?.id) || false
                  const rowLoading = actionLoading[order.id]
                  const canCreateShipment = ['ESCROW_FUNDED', 'PROCESSING', 'SHIPPED'].includes(order.status)
                  const canRequestRelease =
                    ['ESCROW_FUNDED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) &&
                    order.escrowAccount?.status === 'HELD'
                  const canRate = order.status === 'COMPLETED' && !myRating

                  return (
                    <tr key={order.id} className="align-top hover:bg-[#fbfbf9]">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1f2937]">{order.productName}</p>
                        <p className="mt-1 text-xs text-[#738076]">
                          {Number(order.quantity).toLocaleString()} {order.unit} | Created {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getTradeOrderStatusTone(order.status)}`}>
                            {humanizeStatus(order.status)}
                          </span>
                          {order.disputes.length ? (
                            <span className="rounded-full bg-[#fdecec] px-2.5 py-1 text-xs font-semibold text-[#b64242]">
                              {order.disputes.length} dispute{order.disputes.length === 1 ? '' : 's'}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-[#1f2937]">
                          {order.buyer.firstName} {order.buyer.lastName}
                        </p>
                        <p className="mt-1 text-xs text-[#738076]">{order.buyer.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1f2937]">
                          <CurrencyAmount amount={order.totalAmount} currencyCode={order.currencyCode} showCode />
                        </p>
                        <p className="mt-2 text-xs text-[#738076]">
                          Gross order: <CurrencyAmount amount={order.subtotal} currencyCode={order.currencyCode} showCode />
                        </p>
                        <p className="mt-1 text-xs text-[#738076]">
                          Platform deduction: <CurrencyAmount amount={order.platformCommissionAmount} currencyCode={order.currencyCode} showCode />
                        </p>
                        <p className="mt-1 text-xs text-[#738076]">
                          Escrow deduction: <CurrencyAmount amount={order.escrowFee} currencyCode={order.currencyCode} showCode />
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#1f2937]">
                          Net receivable: <CurrencyAmount amount={Number(order.subtotal) - Number(order.platformCommissionAmount)} currencyCode={order.currencyCode} showCode />
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEscrowStatusTone(order.escrowAccount?.status)}`}>
                          {humanizeStatus(order.escrowAccount?.status || 'PENDING')}
                        </span>
                        <p className="mt-2 text-xs text-[#738076]">
                          {order.escrowAccount?.fundedAt
                            ? `Funded ${new Date(order.escrowAccount.fundedAt).toLocaleDateString()}`
                            : 'Awaiting buyer funding'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {latestShipment ? (
                          <>
                            <p className="font-medium text-[#1f2937]">
                              {latestShipment.carrier} | {latestShipment.trackingNumber}
                            </p>
                            <p className="mt-1 text-xs text-[#738076]">
                              {humanizeStatus(latestShipment.status)}
                              {latestShipment.lastEvent ? ` | ${latestShipment.lastEvent}` : ''}
                            </p>
                            {latestShipment.trackingUrl ? (
                              <a
                                href={latestShipment.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-block text-xs font-semibold text-[#3e5840] hover:text-[#243127]"
                              >
                                Open tracking
                              </a>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-sm text-[#738076]">No shipment created yet</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[220px] space-y-2">
                          {carrierOptions.length > 0 ? (
                            <select
                              value={tracking[order.id]?.carrier || carrierOptions[0]?.name || ''}
                              onChange={(event) =>
                                setTracking((current) => ({
                                  ...current,
                                  [order.id]: { ...current[order.id], carrier: event.target.value },
                                }))
                              }
                              className={inputCls}
                              disabled={!canCreateShipment || rowLoading === 'shipment'}
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
                            disabled={!canCreateShipment || rowLoading === 'shipment'}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[190px] space-y-2">
                          <select
                            value={documentType[order.id] || 'COMMERCIAL_INVOICE'}
                            onChange={(event) =>
                              setDocumentType((current) => ({ ...current, [order.id]: event.target.value }))
                            }
                            className={inputCls}
                            disabled={rowLoading === 'document'}
                          >
                            <option value="COMMERCIAL_INVOICE">Commercial Invoice</option>
                            <option value="PROFORMA_INVOICE">Proforma Invoice</option>
                            <option value="PACKING_LIST">Packing List</option>
                            <option value="BILL_OF_LADING">Bill of Lading</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => generateDocument(order.id)}
                            disabled={rowLoading === 'document'}
                            className="w-full rounded-2xl border border-[#d9ddd4] px-3 py-2.5 text-sm font-semibold text-[#3e5840] transition hover:border-[#c9d0c1] disabled:opacity-50"
                          >
                            {rowLoading === 'document' ? 'Generating...' : 'Generate document'}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {myRating ? (
                          <p className="text-sm font-medium text-[#3e5840]">You already rated this buyer</p>
                        ) : canRate ? (
                          <div className="min-w-[140px] space-y-2">
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={rating[order.id] || 5}
                              onChange={(event) =>
                                setRating((current) => ({ ...current, [order.id]: Number(event.target.value) }))
                              }
                              className={inputCls}
                              disabled={rowLoading === 'rating'}
                            />
                            <button
                              type="button"
                              onClick={() => rateBuyer(order.id)}
                              disabled={rowLoading === 'rating'}
                              className="w-full rounded-2xl border border-[#d9ddd4] px-3 py-2.5 text-sm font-semibold text-[#3e5840] transition hover:border-[#c9d0c1] disabled:opacity-50"
                            >
                              {rowLoading === 'rating' ? 'Saving...' : 'Rate buyer'}
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-[#738076]">Available after completion</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex min-w-[180px] flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => createShipment(order.id)}
                            disabled={!canCreateShipment || rowLoading === 'shipment'}
                            className="rounded-2xl bg-[#243127] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d271f] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {rowLoading === 'shipment' ? 'Shipping...' : 'Create shipment'}
                          </button>
                          <button
                            type="button"
                            onClick={() => requestRelease(order.id)}
                            disabled={!canRequestRelease || rowLoading === 'release'}
                            className="rounded-2xl border border-[#d9ddd4] px-4 py-2.5 text-sm font-semibold text-[#3e5840] transition hover:border-[#c9d0c1] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {rowLoading === 'release' ? 'Requesting...' : 'Request release'}
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
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getTradeOrderStatusTone(status: string) {
  switch (status) {
    case 'PENDING_ESCROW_PAYMENT':
      return 'bg-[#fff4de] text-[#a66a00]'
    case 'ESCROW_FUNDED':
      return 'bg-[#e7f1ff] text-[#265ea8]'
    case 'PROCESSING':
      return 'bg-[#eef2e7] text-[#3e5840]'
    case 'SHIPPED':
      return 'bg-[#ede9fe] text-[#6b46c1]'
    case 'DELIVERED':
      return 'bg-[#e0f2fe] text-[#0369a1]'
    case 'COMPLETED':
      return 'bg-[#e7f6ec] text-[#216c43]'
    case 'DISPUTED':
      return 'bg-[#fdecec] text-[#b64242]'
    default:
      return 'bg-[#eef1eb] text-[#5f6862]'
  }
}

function getEscrowStatusTone(status?: string) {
  switch (status) {
    case 'HELD':
      return 'bg-[#e7f1ff] text-[#265ea8]'
    case 'RELEASE_REQUESTED':
      return 'bg-[#fff4de] text-[#a66a00]'
    case 'RELEASED':
      return 'bg-[#e7f6ec] text-[#216c43]'
    case 'DISPUTED':
      return 'bg-[#fdecec] text-[#b64242]'
    default:
      return 'bg-[#eef1eb] text-[#5f6862]'
  }
}
