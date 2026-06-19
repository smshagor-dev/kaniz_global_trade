'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

interface Shipment {
  id: string
  carrier: string
  trackingNumber: string
  awbNumber?: string | null
  status: string
  lastLocation?: string | null
  estimatedDeliveryAt?: string | null
}

export default function AdminShipmentsPage() {
  const { data: tradeData } = useQuery({
    queryKey: ['admin-trade-shipments'],
    queryFn: () => get<Array<{ shipments: Shipment[] }>>('/trade-orders?limit=100'),
  })

  const { data: sampleData } = useQuery({
    queryKey: ['admin-sample-shipments'],
    queryFn: () => get<Array<{ shipments: Shipment[] }>>('/sample-orders?limit=100'),
  })

  const shipments = useMemo(() => {
    const tradeShipments = ((tradeData?.data as Array<{ shipments: Shipment[] }>) || []).flatMap((item) => item.shipments || [])
    const sampleShipments = ((sampleData?.data as Array<{ shipments: Shipment[] }>) || []).flatMap((item) => item.shipments || [])
    return [...tradeShipments, ...sampleShipments]
  }, [sampleData?.data, tradeData?.data])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        <p className="text-sm text-gray-500 mt-1">Central shipment tracking across trade assurance and sample orders.</p>
      </div>

      {shipments.map((shipment) => (
        <div key={shipment.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{shipment.carrier}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Tracking: {shipment.trackingNumber} {shipment.awbNumber ? `| AWB: ${shipment.awbNumber}` : ''}
              </p>
              <p className="text-xs text-gray-400 mt-1">Location: {shipment.lastLocation || 'Pending update'}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-gray-900">{shipment.status}</p>
              <p className="text-gray-500">
                {shipment.estimatedDeliveryAt ? new Date(shipment.estimatedDeliveryAt).toLocaleDateString() : 'No ETA'}
              </p>
            </div>
          </div>
        </div>
      ))}

      {shipments.length === 0 && <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">No shipments found.</div>}
    </div>
  )
}
