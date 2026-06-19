'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

interface Shipment {
  id: string
  carrier: string
  trackingNumber: string
  trackingUrl?: string
  status: string
  lastEvent?: string
}

export default function BuyerShipmentsPage() {
  const { data: tradeData } = useQuery({
    queryKey: ['buyer-trade-order-shipments'],
    queryFn: () => get<Array<{ shipments: Shipment[] }>>('/trade-orders'),
  })
  const { data: sampleData } = useQuery({
    queryKey: ['buyer-sample-order-shipments'],
    queryFn: () => get<Array<{ shipments: Shipment[] }>>('/sample-orders'),
  })

  const shipments = useMemo(() => {
    const tradeShipments = (tradeData?.data || []).flatMap((item) => item.shipments || [])
    const sampleShipments = (sampleData?.data || []).flatMap((item) => item.shipments || [])
    return [...tradeShipments, ...sampleShipments]
  }, [tradeData, sampleData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shipment Tracking</h1>
        <p className="text-sm text-gray-500 mt-1">Track every bulk order and sample delivery in one place.</p>
      </div>

      <div className="space-y-4">
        {shipments.map((shipment) => (
          <div key={shipment.id} className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="font-bold text-gray-900">{shipment.carrier} - {shipment.trackingNumber}</h2>
            <p className="text-sm text-gray-500 mt-1">{shipment.status} {shipment.lastEvent ? `| ${shipment.lastEvent}` : ''}</p>
            {shipment.trackingUrl && <a href={shipment.trackingUrl} target="_blank" className="text-sm text-blue-700 hover:underline mt-2 inline-block">Open carrier tracking</a>}
          </div>
        ))}

        {shipments.length === 0 && <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">No shipments yet.</div>}
      </div>
    </div>
  )
}
