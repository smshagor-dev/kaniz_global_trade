'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import { ExternalLink, Loader2, MapPin, PackageCheck, Truck } from 'lucide-react'

interface ShipmentEvent {
  id: string
  status: string
  description: string
  location?: string | null
  eventTime: string
}

interface Shipment {
  id: string
  carrier: string
  trackingNumber: string
  trackingUrl?: string | null
  status: string
  lastEvent?: string | null
  lastLocation?: string | null
  estimatedDeliveryAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  events?: ShipmentEvent[]
}

interface ShipmentOwner {
  productName?: string
  title?: string
  shipments: Shipment[]
}

interface ShipmentRow extends Shipment {
  sourceType: 'TRADE' | 'SAMPLE'
  sourceLabel: string
}

export default function SupplierShipmentsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: tradeData, isLoading: tradeLoading } = useQuery({
    queryKey: ['supplier-trade-shipments'],
    queryFn: () => get<ShipmentOwner[]>('/trade-orders?limit=100'),
  })
  const { data: sampleData, isLoading: sampleLoading } = useQuery({
    queryKey: ['supplier-sample-shipments'],
    queryFn: () => get<ShipmentOwner[]>('/sample-orders?limit=100'),
  })

  const shipments = useMemo<ShipmentRow[]>(() => {
    const tradeRows = (tradeData?.data || []).flatMap((item) =>
      (item.shipments || []).map((shipment) => ({
        ...shipment,
        sourceType: 'TRADE' as const,
        sourceLabel: item.productName || 'Trade order',
      }))
    )
    const sampleRows = (sampleData?.data || []).flatMap((item) =>
      (item.shipments || []).map((shipment) => ({
        ...shipment,
        sourceType: 'SAMPLE' as const,
        sourceLabel: item.title || 'Sample order',
      }))
    )
    return [...tradeRows, ...sampleRows].sort((a, b) => {
      const aTime = new Date(a.deliveredAt || a.shippedAt || a.events?.[0]?.eventTime || 0).getTime()
      const bTime = new Date(b.deliveredAt || b.shippedAt || b.events?.[0]?.eventTime || 0).getTime()
      return bTime - aTime
    })
  }, [sampleData?.data, tradeData?.data])

  useEffect(() => {
    if (!shipments.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !shipments.some((shipment) => shipment.id === selectedId)) {
      setSelectedId(shipments[0].id)
    }
  }, [selectedId, shipments])

  const selectedShipment = shipments.find((shipment) => shipment.id === selectedId) || null
  const isLoading = tradeLoading || sampleLoading

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div>
          <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
            Shipment tracking
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Shipments</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
            Track trade-order and sample shipments directly inside your dashboard with live milestone history, while keeping external carrier tracking available when needed.
          </p>
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" />
        </div>
      ) : !shipments.length ? (
        <div className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-12 text-sm text-[#68726b] shadow-sm">
          No shipments found yet.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-[#d9ddd4] bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f5ef] text-[#4f5d49]">
                <Truck className="h-4 w-4" />
              </div>
              <p className="mt-4 text-3xl font-semibold text-[#1f2937]">{shipments.length}</p>
              <p className="mt-1 text-sm text-[#68726b]">Total shipments</p>
            </div>
            <div className="rounded-[24px] border border-[#d9ddd4] bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f5ef] text-[#4f5d49]">
                <MapPin className="h-4 w-4" />
              </div>
              <p className="mt-4 text-3xl font-semibold text-[#1f2937]">
                {shipments.filter((shipment) => shipment.status === 'IN_TRANSIT').length}
              </p>
              <p className="mt-1 text-sm text-[#68726b]">In transit</p>
            </div>
            <div className="rounded-[24px] border border-[#d9ddd4] bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f5ef] text-[#4f5d49]">
                <PackageCheck className="h-4 w-4" />
              </div>
              <p className="mt-4 text-3xl font-semibold text-[#1f2937]">
                {shipments.filter((shipment) => shipment.status === 'DELIVERED').length}
              </p>
              <p className="mt-1 text-sm text-[#68726b]">Delivered</p>
            </div>
          </div>

          <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
            <div className="border-b border-[#e7eae3] px-6 py-5">
              <h2 className="text-lg font-semibold text-[#1f2937]">Shipment table</h2>
              <p className="mt-1 text-sm text-[#68726b]">Select any row to view internal tracking history below</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1120px] divide-y divide-[#e7eae3] text-sm">
                <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                  <tr>
                    <th className="px-6 py-4">Shipment</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last update</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">ETA</th>
                    <th className="px-6 py-4">Tracking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1eb]">
                  {shipments.map((shipment) => (
                    <tr
                      key={shipment.id}
                      className={`cursor-pointer align-top transition ${
                        selectedId === shipment.id ? 'bg-[#f7f8f5]' : 'hover:bg-[#fbfbf9]'
                      }`}
                      onClick={() => setSelectedId(shipment.id)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1f2937]">{shipment.carrier}</p>
                        <p className="mt-1 text-xs text-[#738076]">{shipment.trackingNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-[#eef2e7] px-2.5 py-1 text-xs font-semibold text-[#3e5840]">
                          {shipment.sourceType}
                        </span>
                        <p className="mt-2 text-sm text-[#5f6862]">{shipment.sourceLabel}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getShipmentStatusTone(shipment.status)}`}>
                          {humanizeStatus(shipment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#5f6862]">{shipment.lastEvent || 'Pending update'}</td>
                      <td className="px-6 py-4 text-[#5f6862]">{shipment.lastLocation || 'Unknown'}</td>
                      <td className="px-6 py-4 text-[#5f6862]">
                        {shipment.estimatedDeliveryAt ? new Date(shipment.estimatedDeliveryAt).toLocaleDateString() : 'No ETA'}
                      </td>
                      <td className="px-6 py-4">
                        {shipment.trackingUrl ? (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[#3e5840] hover:text-[#243127]"
                            onClick={(event) => event.stopPropagation()}
                          >
                            External
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="text-[#738076]">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {selectedShipment ? (
            <section className="grid gap-6">
              <div className="rounded-[28px] border border-[#d9ddd4] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#1f2937]">Shipment detail</h2>
                <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b857c]">Carrier</p>
                    <p className="mt-1 font-medium text-[#1f2937]">{selectedShipment.carrier}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b857c]">Tracking number</p>
                    <p className="mt-1 font-medium text-[#1f2937]">{selectedShipment.trackingNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b857c]">Current status</p>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getShipmentStatusTone(selectedShipment.status)}`}>
                      {humanizeStatus(selectedShipment.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b857c]">Latest update</p>
                    <p className="mt-1 text-[#5f6862]">{selectedShipment.lastEvent || 'Pending update'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b857c]">Last location</p>
                    <p className="mt-1 text-[#5f6862]">{selectedShipment.lastLocation || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b857c]">Source</p>
                    <p className="mt-1 text-[#5f6862]">{selectedShipment.sourceType} | {selectedShipment.sourceLabel}</p>
                  </div>
                  {selectedShipment.trackingUrl ? (
                    <div className="sm:col-span-2 xl:col-span-3">
                      <a
                        href={selectedShipment.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-2xl bg-[#243127] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d271f]"
                      >
                        Open external tracking
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#d9ddd4] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#1f2937]">Internal tracking timeline</h2>
                <div className="mt-5 space-y-4">
                  {(selectedShipment.events || []).length ? (
                    selectedShipment.events!.map((event, index) => (
                      <div key={event.id} className="relative rounded-[24px] border border-[#e4e7e0] bg-[#fbfbf9] p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getShipmentStatusTone(event.status)}`}>
                              {humanizeStatus(event.status)}
                            </span>
                            <p className="mt-3 font-medium text-[#1f2937]">{event.description}</p>
                            <p className="mt-1 text-sm text-[#68726b]">{event.location || 'Location not reported'}</p>
                          </div>
                          <p className="text-sm text-[#68726b]">{new Date(event.eventTime).toLocaleString()}</p>
                        </div>
                        {index === 0 ? (
                          <span className="mt-3 inline-flex rounded-full bg-[#eef2e7] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#3e5840]">
                            Latest
                          </span>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-[#d9ddd4] px-5 py-10 text-sm text-[#68726b]">
                      No internal tracking events found for this shipment yet.
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

function humanizeStatus(value: string) {
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function getShipmentStatusTone(status: string) {
  switch (status) {
    case 'LABEL_CREATED': return 'bg-[#fff4de] text-[#a66a00]'
    case 'IN_TRANSIT': return 'bg-[#e7f1ff] text-[#265ea8]'
    case 'OUT_FOR_DELIVERY': return 'bg-[#ede9fe] text-[#6b46c1]'
    case 'DELIVERED': return 'bg-[#e7f6ec] text-[#216c43]'
    case 'EXCEPTION': return 'bg-[#fdecec] text-[#b64242]'
    case 'DELAYED': return 'bg-[#fff1f2] text-[#be123c]'
    case 'RETURNED': return 'bg-[#eef1eb] text-[#5f6862]'
    case 'CANCELLED': return 'bg-[#eef1eb] text-[#5f6862]'
    default: return 'bg-[#eef1eb] text-[#5f6862]'
  }
}
