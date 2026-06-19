'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
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
  bookingReference?: string | null
}

interface LogisticsResponse {
  items: Booking[]
  providers: Array<{ name: string; hasCredentials: boolean }>
}

export default function SupplierLogisticsPage() {
  const [form, setForm] = useState({ providerName: 'DHL', serviceMode: 'AIR_FREIGHT', origin: '', destination: '', quotedCost: 250, currencyCode: 'USD', notes: '' })
  const { data, refetch } = useQuery({
    queryKey: ['supplier-logistics-bookings'],
    queryFn: () => get<LogisticsResponse>('/logistics-bookings'),
  })

  async function submit() {
    await post('/logistics-bookings', form)
    toast.success('Logistics quote created')
    setForm({ providerName: 'DHL', serviceMode: 'AIR_FREIGHT', origin: '', destination: '', quotedCost: 250, currencyCode: 'USD', notes: '' })
    refetch()
  }

  const response = data?.data as LogisticsResponse | undefined
  const bookings = response?.items || []
  const providers = response?.providers || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logistics Integration</h1>
        <p className="text-sm text-gray-500 mt-1">Create direct freight quotes and manage provider bookings from one place.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-900 mb-2">Provider Credentials</p>
        <div className="flex flex-wrap gap-2">
          {providers.map((provider) => (
            <span key={provider.name} className={`px-2.5 py-1 rounded-full text-xs ${provider.hasCredentials ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {provider.name}: {provider.hasCredentials ? 'Connected' : 'Manual'}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 grid md:grid-cols-2 gap-3">
        <input value={form.providerName} onChange={(e) => setForm((v) => ({ ...v, providerName: e.target.value }))} placeholder="Provider" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.serviceMode} onChange={(e) => setForm((v) => ({ ...v, serviceMode: e.target.value }))} placeholder="Service mode" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.origin} onChange={(e) => setForm((v) => ({ ...v, origin: e.target.value }))} placeholder="Origin" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.destination} onChange={(e) => setForm((v) => ({ ...v, destination: e.target.value }))} placeholder="Destination" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input type="number" value={form.quotedCost} onChange={(e) => setForm((v) => ({ ...v, quotedCost: Number(e.target.value) }))} placeholder="Quoted cost" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.currencyCode} onChange={(e) => setForm((v) => ({ ...v, currencyCode: e.target.value }))} placeholder="Currency" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <textarea value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} placeholder="Notes" rows={3} className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2" />
        <button onClick={submit} className="md:col-span-2 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium">Create Logistics Quote</button>
      </div>

      <div className="space-y-3">
        {bookings.map((booking) => (
          <div key={booking.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{booking.providerName} | {booking.serviceMode}</h2>
              <p className="text-sm text-gray-500">{booking.origin} to {booking.destination} | {booking.currencyCode} {Number(booking.quotedCost).toLocaleString()}</p>
            </div>
            <p className="text-sm font-medium text-gray-900">{booking.status}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
