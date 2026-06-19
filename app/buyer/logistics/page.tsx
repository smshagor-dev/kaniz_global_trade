'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

interface Booking {
  id: string
  providerName: string
  serviceMode: string
  origin: string
  destination: string
  quotedCost: number
  currencyCode: string
  status: string
  trackingNumber?: string | null
}

interface LogisticsResponse {
  items: Booking[]
  providers: Array<{ name: string; hasCredentials: boolean }>
}

export default function BuyerLogisticsPage() {
  const { data } = useQuery({
    queryKey: ['buyer-logistics'],
    queryFn: () => get<LogisticsResponse>('/logistics-bookings'),
  })

  const response = data?.data as LogisticsResponse | undefined
  const bookings = response?.items || []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logistics Hub</h1>
        <p className="text-sm text-gray-500 mt-1">Track direct freight bookings from DHL, FedEx, Maersk, and other partners.</p>
      </div>
      {bookings.map((booking) => (
        <div key={booking.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <h2 className="font-semibold text-gray-900">{booking.providerName} | {booking.serviceMode}</h2>
          <p className="text-sm text-gray-500 mt-1">{booking.origin} to {booking.destination}</p>
          <p className="text-xs text-gray-400 mt-1">{booking.currencyCode} {Number(booking.quotedCost).toLocaleString()} | {booking.trackingNumber || 'No tracking yet'} | {booking.status}</p>
        </div>
      ))}
      {bookings.length === 0 && <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">No logistics bookings yet.</div>}
    </div>
  )
}
