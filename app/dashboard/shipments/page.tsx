'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

interface Shipment {
  id: string
  carrier: string
  trackingNumber: string
  status: string
  trackingUrl?: string
}

export default function SupplierShipmentsPage() {
  const { data: tradeData } = useQuery({
    queryKey: ['supplier-trade-shipments'],
    queryFn: () => get<Array<{ shipments: Shipment[] }>>('/trade-orders'),
  })
  const { data: sampleData } = useQuery({
    queryKey: ['supplier-sample-shipments'],
    queryFn: () => get<Array<{ shipments: Shipment[] }>>('/sample-orders'),
  })

  const shipments = useMemo(() => {
    const trade = (tradeData?.data || []).flatMap((item) => item.shipments || [])
    const sample = (sampleData?.data || []).flatMap((item) => item.shipments || [])
    return [...trade, ...sample]
  }, [tradeData, sampleData])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor all active trade and sample shipments from one supplier dashboard.</p>
      </div>

      <div className="space-y-4">
        {shipments.map((shipment) => (
          <div key={shipment.id} className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="font-bold text-gray-900">{shipment.carrier} - {shipment.trackingNumber}</h2>
            <p className="text-sm text-gray-500 mt-1">{shipment.status}</p>
            {shipment.trackingUrl && <a href={shipment.trackingUrl} target="_blank" className="text-sm text-blue-700 hover:underline mt-2 inline-block">Open external tracking</a>}
          </div>
        ))}
      </div>
    </div>
  )
}
