'use client'

import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Booking {
  id: string
  providerName: string
  serviceMode: string
  origin: string
  destination: string
  quotedCost: number
  currencyCode: string
  status: string
  company: { name: string }
}

export default function AdminLogisticsBookingsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-logistics-bookings'],
    queryFn: () => get<Booking[]>('/admin/logistics-bookings'),
  })

  async function update(bookingId: string, status: 'BOOKED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED') {
    await patch('/admin/logistics-bookings', { bookingId, status })
    toast.success(`Booking ${status.toLowerCase()}`)
    refetch()
  }

  const bookings = (data?.data || []) as Booking[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logistics Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">Oversee direct freight partner bookings and shipping execution.</p>
      </div>
      {bookings.map((booking) => (
        <div key={booking.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{booking.providerName} | {booking.serviceMode}</h2>
              <p className="text-sm text-gray-500 mt-1">{booking.company.name} | {booking.origin} to {booking.destination}</p>
              <p className="text-xs text-gray-400 mt-1">{booking.currencyCode} {Number(booking.quotedCost).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => update(booking.id, 'BOOKED')} className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm">Book</button>
              <button onClick={() => update(booking.id, 'IN_TRANSIT')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Transit</button>
              <button onClick={() => update(booking.id, 'DELIVERED')} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Deliver</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
