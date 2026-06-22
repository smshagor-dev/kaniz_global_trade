'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import { FileText, Loader2, PackageCheck, ShieldCheck, Truck } from 'lucide-react'

interface SampleOrder {
  id: string
  title: string
  quantity: number
  unit?: string | null
  totalAmount: number
  currencyCode: string
  status: string
  createdAt: string
  buyer: { firstName: string; lastName: string; email: string }
  supplierCompany: { name: string; slug: string }
  shipments: Array<{ id: string; carrier: string; trackingNumber: string; status: string; trackingUrl?: string | null }>
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

export default function AdminSampleOrdersPage() {
  const [activeFilter, setActiveFilter] = useState<SampleFilter>('ALL')
  const { data, isLoading } = useQuery({
    queryKey: ['admin-sample-orders'],
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

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Kaniz Global Trade operations
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Sample orders</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
              Review sample request flow across buyers and suppliers with clear visibility into payment state, confirmation, shipment, and delivery.
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
            <table className="min-w-[1260px] divide-y divide-[#e7eae3] text-sm">
              <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                <tr>
                  <th className="px-6 py-4">Sample</th>
                  <th className="px-6 py-4">Buyer</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Shipment</th>
                  <th className="px-6 py-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1eb]">
                {filteredOrders.map((order) => {
                  const latestShipment = order.shipments[0]

                  return (
                    <tr key={order.id} className="align-top hover:bg-[#fbfbf9]">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1f2937]">{order.title}</p>
                        <p className="mt-1 text-xs text-[#738076]">{Number(order.quantity).toLocaleString()} {order.unit || 'PCS'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-[#1f2937]">{order.buyer.firstName} {order.buyer.lastName}</p>
                        <p className="mt-1 text-xs text-[#738076]">{order.buyer.email}</p>
                      </td>
                      <td className="px-6 py-4 text-[#5f6862]">{order.supplierCompany.name}</td>
                      <td className="px-6 py-4 font-semibold text-[#1f2937]">{order.currencyCode} {Number(order.totalAmount).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSampleStatusTone(order.status)}`}>
                          {humanizeStatus(order.status)}
                        </span>
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
                      <td className="px-6 py-4 text-[#5f6862]">{new Date(order.createdAt).toLocaleDateString()}</td>
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
