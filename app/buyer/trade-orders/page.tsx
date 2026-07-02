'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { useCurrentUser } from '@/store/auth'
import toast from 'react-hot-toast'
import { AlertTriangle, FileText, Loader2, ShieldCheck, Star, Upload, Wallet } from 'lucide-react'
import { uploadAsset } from '@/lib/utils/upload'

interface TradeOrder {
  id: string
  productName: string
  subtotal: number
  shippingCost: number
  escrowFee: number
  platformCommissionAmount: number
  totalAmount: number
  currencyCode: string
  status: string
  createdAt: string
  supplierCompany: { id: string; name: string; slug: string }
  quotation?: { deliveryTime?: string | null } | null
  escrowAccount?: { status: string; fundedAt?: string | null; releasedAt?: string | null } | null
  shipments: Array<{
    id: string
    carrier: string
    trackingNumber: string
    trackingUrl?: string | null
    status: string
    lastEvent?: string | null
  }>
  disputes: Array<{ id: string; status: string }>
  ratings?: Array<{ id: string; authorUserId: string; rating: number; createdAt: string }>
}

type OrderFilter =
  | 'ALL'
  | 'PENDING_ESCROW_PAYMENT'
  | 'ESCROW_FUNDED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'

const inputCls =
  'w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none transition focus:border-[#9daf98] focus:ring-2 focus:ring-[#eef2e7]'

export default function BuyerTradeOrdersPage() {
  const user = useCurrentUser()
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('ALL')
  const [disputeReason, setDisputeReason] = useState<Record<string, string>>({})
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string[]>>({})
  const [rating, setRating] = useState<Record<string, number>>({})
  const [documentType, setDocumentType] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({})

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['buyer-trade-orders'],
    queryFn: () => get<TradeOrder[]>('/trade-orders?limit=100'),
  })

  const orders = data?.data || []
  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ALL') return orders
    return orders.filter((order) => order.status === activeFilter)
  }, [activeFilter, orders])

  const summary = {
    total: orders.length,
    pendingPayment: orders.filter((order) => order.status === 'PENDING_ESCROW_PAYMENT').length,
    active: orders.filter((order) => ['ESCROW_FUNDED', 'SHIPPED', 'DELIVERED'].includes(order.status)).length,
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

  async function fund(orderId: string, method: 'STRIPE' | 'SSLCOMMERZ' | 'AAMARPAY' | 'NOWPAYMENTS') {
    setRowLoading(orderId, `fund-${method}`)
    try {
      const response = await post<{ checkoutUrl?: string }>(`/trade-orders/${orderId}/fund`, { method })
      const checkoutUrl = response.data?.checkoutUrl
      if (checkoutUrl) {
        window.location.href = checkoutUrl
        return
      }
      toast.success('Escrow funding started')
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to start escrow funding'
      toast.error(message)
    } finally {
      setRowLoading(orderId, null)
    }
  }

  async function release(orderId: string) {
    await runAction(orderId, 'release', async () => {
      await post(`/trade-orders/${orderId}/release`, { action: 'RELEASE' })
      toast.success('Escrow released')
    })
  }

  async function dispute(orderId: string) {
    const reason = disputeReason[orderId]?.trim() || ''
    if (reason.length < 10) {
      toast.error('Please enter at least 10 characters before opening a dispute')
      return
    }

    await runAction(orderId, 'dispute', async () => {
      await post(`/trade-orders/${orderId}/dispute`, {
        reason,
        description: reason,
        evidenceUrls: evidenceUrls[orderId] || [],
      })
      toast.success('Dispute opened')
    })
  }

  async function generateDocument(orderId: string) {
    await runAction(orderId, 'document', async () => {
      const type = documentType[orderId] || 'PROFORMA_INVOICE'
      await post(`/trade-orders/${orderId}/documents`, { type })
      toast.success(`${type.replace(/_/g, ' ')} generated`)
    })
  }

  async function rate(orderId: string) {
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
        title: 'Buyer rating',
        comment: 'Transaction completed through platform trade assurance.',
      })
      toast.success('Supplier rated')
    })
  }

  async function reportFraud(orderId: string) {
    const reason = disputeReason[orderId]?.trim() || ''
    if (reason.length < 10) {
      toast.error('Please describe the fraud concern with at least 10 characters')
      return
    }

    await runAction(orderId, 'fraud', async () => {
      await post('/fraud-alerts', {
        tradeOrderId: orderId,
        targetCompanyId: orders.find((order) => order.id === orderId)?.supplierCompany.id,
        reason,
        description: reason,
        evidenceUrls: evidenceUrls[orderId] || [],
      })
      toast.success('Fraud alert submitted')
    })
  }

  async function uploadEvidence(orderId: string, fileList: FileList | null) {
    if (!fileList?.length) return

    setRowLoading(orderId, 'evidence')
    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(fileList)) {
        const uploaded = await uploadAsset(file, 'dispute_evidence')
        uploadedUrls.push(uploaded.url)
      }
      setEvidenceUrls((current) => ({
        ...current,
        [orderId]: [...(current[orderId] || []), ...uploadedUrls],
      }))
      toast.success('Evidence uploaded')
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to upload evidence'
      toast.error(message)
    } finally {
      setRowLoading(orderId, null)
    }
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
              Fund escrow, track supplier progress, release payment when delivery is confirmed, and keep disputes or ratings aligned with the actual order state.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'PENDING_ESCROW_PAYMENT', label: 'Pending payment' },
              { key: 'ESCROW_FUNDED', label: 'Funded' },
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
          { label: 'Pending payment', value: summary.pendingPayment, icon: Wallet },
          { label: 'Active pipeline', value: summary.active, icon: ShieldCheck },
          { label: 'Disputed', value: summary.disputes, icon: AlertTriangle },
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
            <table className="min-w-[1380px] divide-y divide-[#e7eae3] text-sm">
              <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                <tr>
                  <th className="px-6 py-4">Order</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Escrow</th>
                  <th className="px-6 py-4">Shipment</th>
                  <th className="px-6 py-4">Funding</th>
                  <th className="px-6 py-4">Documents</th>
                  <th className="px-6 py-4">Dispute / fraud</th>
                  <th className="px-6 py-4">Rating / release</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1eb]">
                {filteredOrders.map((order) => {
                  const latestShipment = order.shipments[0]
                  const myRating = order.ratings?.some((entry) => entry.authorUserId === user?.id) || false
                  const rowLoading = actionLoading[order.id]
                  const canFund = order.status === 'PENDING_ESCROW_PAYMENT'
                  const canRelease =
                    ['ESCROW_FUNDED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status) &&
                    ['HELD', 'RELEASE_REQUESTED'].includes(order.escrowAccount?.status || '')
                  const canDispute = !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)
                  const canRate = order.status === 'COMPLETED' && !myRating

                  return (
                    <tr key={order.id} className="align-top hover:bg-[#fbfbf9]">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1f2937]">{order.productName}</p>
                        <p className="mt-1 text-xs text-[#738076]">Created {new Date(order.createdAt).toLocaleDateString()}</p>
                        <div className="mt-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getTradeOrderStatusTone(order.status)}`}>
                            {humanizeStatus(order.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-[#1f2937]">{order.supplierCompany.name}</p>
                        <p className="mt-1 text-xs text-[#738076]">{order.quotation?.deliveryTime || 'Delivery time not specified'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1f2937]">
                          <CurrencyAmount amount={order.totalAmount} currencyCode={order.currencyCode} showCode />
                        </p>
                        <p className="mt-2 text-xs text-[#738076]">
                          Base: <CurrencyAmount amount={order.subtotal} currencyCode={order.currencyCode} showCode />
                        </p>
                        <p className="mt-1 text-xs text-[#738076]">
                          Supplier platform deduction: <CurrencyAmount amount={order.platformCommissionAmount} currencyCode={order.currencyCode} showCode />
                        </p>
                        <p className="mt-1 text-xs text-[#738076]">
                          Escrow protection fee: <CurrencyAmount amount={order.escrowFee} currencyCode={order.currencyCode} showCode />
                        </p>
                        <p className="mt-1 text-xs text-[#738076]">
                          Shipping: <CurrencyAmount amount={order.shippingCost} currencyCode={order.currencyCode} showCode />
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#1f2937]">
                          You pay: <CurrencyAmount amount={order.totalAmount} currencyCode={order.currencyCode} showCode />
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEscrowStatusTone(order.escrowAccount?.status)}`}>
                          {humanizeStatus(order.escrowAccount?.status || 'PENDING')}
                        </span>
                        <p className="mt-2 text-xs text-[#738076]">
                          {order.escrowAccount?.fundedAt
                            ? `Funded ${new Date(order.escrowAccount.fundedAt).toLocaleDateString()}`
                            : 'Awaiting funding'}
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
                          <p className="text-sm text-[#738076]">No shipment updates yet</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[210px] space-y-2">
                          <button
                            type="button"
                            onClick={() => fund(order.id, 'STRIPE')}
                            disabled={!canFund || !!rowLoading}
                            className="w-full rounded-2xl bg-[#243127] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d271f] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {rowLoading === 'fund-STRIPE' ? 'Redirecting...' : 'Pay with Stripe'}
                          </button>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => fund(order.id, 'SSLCOMMERZ')}
                              disabled={!canFund || !!rowLoading}
                              className="rounded-2xl border border-[#d9ddd4] px-2 py-2 text-xs font-semibold text-[#3e5840] transition hover:border-[#c9d0c1] disabled:opacity-50"
                            >
                              SSL
                            </button>
                            <button
                              type="button"
                              onClick={() => fund(order.id, 'AAMARPAY')}
                              disabled={!canFund || !!rowLoading}
                              className="rounded-2xl border border-[#d9ddd4] px-2 py-2 text-xs font-semibold text-[#3e5840] transition hover:border-[#c9d0c1] disabled:opacity-50"
                            >
                              aamarPay
                            </button>
                            <button
                              type="button"
                              onClick={() => fund(order.id, 'NOWPAYMENTS')}
                              disabled={!canFund || !!rowLoading}
                              className="rounded-2xl border border-[#d9ddd4] px-2 py-2 text-xs font-semibold text-[#3e5840] transition hover:border-[#c9d0c1] disabled:opacity-50"
                            >
                              Crypto
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[190px] space-y-2">
                          <select
                            value={documentType[order.id] || 'PROFORMA_INVOICE'}
                            onChange={(event) =>
                              setDocumentType((current) => ({ ...current, [order.id]: event.target.value }))
                            }
                            className={inputCls}
                            disabled={rowLoading === 'document'}
                          >
                            <option value="PROFORMA_INVOICE">Proforma Invoice</option>
                            <option value="COMMERCIAL_INVOICE">Commercial Invoice</option>
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
                        <div className="min-w-[220px] space-y-2">
                          <input
                            placeholder="Describe dispute or fraud concern"
                            value={disputeReason[order.id] || ''}
                            onChange={(event) =>
                              setDisputeReason((current) => ({ ...current, [order.id]: event.target.value }))
                            }
                            className={inputCls}
                            disabled={!canDispute || rowLoading === 'dispute' || rowLoading === 'fraud'}
                          />
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d9ddd4] px-3 py-2.5 text-sm font-semibold text-[#58635d] hover:border-[#c9d0c1]">
                            {rowLoading === 'evidence' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {rowLoading === 'evidence' ? 'Uploading...' : 'Upload evidence'}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                void uploadEvidence(order.id, event.target.files)
                                event.target.value = ''
                              }}
                              disabled={!canDispute || !!rowLoading}
                            />
                          </label>
                          {evidenceUrls[order.id]?.length ? (
                            <div className="grid gap-2">
                              {evidenceUrls[order.id].map((url) => (
                                <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#d9ddd4] bg-white px-3 py-2 text-xs text-[#1f2937]">
                                  <span className="truncate">{url.split('/').pop() || 'Evidence file'}</span>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault()
                                      setEvidenceUrls((current) => ({
                                        ...current,
                                        [order.id]: (current[order.id] || []).filter((item) => item !== url),
                                      }))
                                    }}
                                    className="font-semibold text-[#b64242]"
                                  >
                                    Remove
                                  </button>
                                </a>
                              ))}
                            </div>
                          ) : null}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => dispute(order.id)}
                              disabled={!canDispute || !!rowLoading}
                              className="rounded-2xl border border-[#efc2c2] px-3 py-2.5 text-sm font-semibold text-[#b64242] transition hover:border-[#e4aaaa] disabled:opacity-50"
                            >
                              Open dispute
                            </button>
                            <button
                              type="button"
                              onClick={() => reportFraud(order.id)}
                              disabled={!canDispute || !!rowLoading}
                              className="rounded-2xl border border-[#e8d5a2] px-3 py-2.5 text-sm font-semibold text-[#9a6a00] transition hover:border-[#dcc687] disabled:opacity-50"
                            >
                              Report fraud
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[180px] space-y-2">
                          {myRating ? (
                            <>
                              <p className="text-sm font-medium text-[#3e5840]">You already rated this supplier</p>
                              <div className="flex items-center gap-1">
                                <StaticStars
                                  value={order.ratings?.find((entry) => entry.authorUserId === user?.id)?.rating || 5}
                                />
                              </div>
                            </>
                          ) : canRate ? (
                            <>
                              <StarPicker
                                value={rating[order.id] || 5}
                                onChange={(value) =>
                                  setRating((current) => ({ ...current, [order.id]: value }))
                                }
                                disabled={rowLoading === 'rating'}
                              />
                              <p className="text-xs text-[#738076]">{rating[order.id] || 5} of 5 stars</p>
                              <button
                                type="button"
                                onClick={() => rate(order.id)}
                                disabled={rowLoading === 'rating'}
                                className="w-full rounded-2xl border border-[#d9ddd4] px-3 py-2.5 text-sm font-semibold text-[#3e5840] transition hover:border-[#c9d0c1] disabled:opacity-50"
                              >
                                {rowLoading === 'rating' ? 'Saving...' : 'Rate supplier'}
                              </button>
                            </>
                          ) : (
                            <p className="text-sm text-[#738076]">Rating available after completion</p>
                          )}
                          <button
                            type="button"
                            onClick={() => release(order.id)}
                            disabled={!canRelease || !!rowLoading}
                            className="w-full rounded-2xl bg-[#2f7a4f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#276540] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {rowLoading === 'release' ? 'Releasing...' : 'Release payment'}
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

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          disabled={disabled}
          className="rounded-full p-1 transition hover:bg-[#f3f5ef] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            className={`h-5 w-5 ${star <= value ? 'fill-[#f4b740] text-[#f4b740]' : 'text-[#c8d0c1]'}`}
          />
        </button>
      ))}
    </div>
  )
}

function StaticStars({ value }: { value: number }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= value ? 'fill-[#f4b740] text-[#f4b740]' : 'text-[#c8d0c1]'}`}
        />
      ))}
    </>
  )
}
