'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

export default function BuyerOverviewPage() {
  const { data: ordersData } = useQuery({
    queryKey: ['buyer-trade-orders-preview'],
    queryFn: () => get<unknown[]>('/trade-orders?limit=5'),
  })
  const { data: samplesData } = useQuery({
    queryKey: ['buyer-sample-orders-preview'],
    queryFn: () => get<unknown[]>('/sample-orders?limit=5'),
  })
  const { data: verificationData } = useQuery({
    queryKey: ['buyer-verification-preview'],
    queryFn: () => get<{ status?: string } | null>('/buyer-verification'),
  })
  const { data: logisticsData } = useQuery({
    queryKey: ['buyer-logistics-preview'],
    queryFn: () => get<unknown[]>('/logistics-bookings'),
  })
  const { data: insuranceData } = useQuery({
    queryKey: ['buyer-insurance-preview'],
    queryFn: () => get<{ items?: unknown[] }>('/insurance-policies'),
  })
  const { data: inspectionsData } = useQuery({
    queryKey: ['buyer-inspections-preview'],
    queryFn: () => get<{ stats?: { totalReports?: number } }>('/buyer/inspections'),
  })

  const orders = ordersData?.data || []
  const samples = samplesData?.data || []
  const verification = verificationData?.data
  const logistics = ((logisticsData?.data as { items?: unknown[] } | undefined)?.items || [])
  const insurance = (insuranceData?.data?.items || [])
  const inspectionReports = inspectionsData?.data?.stats?.totalReports || 0

  const cards = [
    { label: 'Trade Assurance Orders', value: orders.length, href: '/buyer/trade-orders' },
    { label: 'Sample Orders', value: samples.length, href: '/buyer/sample-orders' },
    { label: 'Verification Status', value: verification?.status || 'NOT_STARTED', href: '/buyer/verification' },
    { label: 'Logistics Bookings', value: logistics.length, href: '/buyer/logistics' },
    { label: 'Insurance Policies', value: insurance.length, href: '/buyer/insurance' },
    { label: 'Inspection Reports', value: inspectionReports, href: '/buyer/inspections' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buyer Trust Center</h1>
        <p className="text-sm text-gray-500 mt-1">Manage verification, escrow-protected orders, samples, and shipments.</p>
      </div>

      <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
