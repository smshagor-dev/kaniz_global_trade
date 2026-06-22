'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2, QrCode } from 'lucide-react'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Booking {
  id: string
  providerName: string
  serviceMode: string
  origin: string
  destination: string
  quotedCost: number
  finalCost?: number | null
  currencyCode: string
  status: string
  statusLabel: string
  sourceType: string
  sourceLabel: string
  trackingNumber?: string | null
  company: { name: string }
  buyer: { firstName: string; lastName: string }
  verificationUrl?: string | null
  qrCodeDataUrl?: string | null
  barcodeValue?: string | null
}

export default function AdminLogisticsBookingsPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin-logistics-bookings'],
    queryFn: () => get<Booking[]>('/admin/logistics-bookings'),
  })

  async function update(bookingId: string, status: 'BOOKED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED') {
    setLoadingId(`${bookingId}-${status}`)
    try {
      await patch('/admin/logistics-bookings', { bookingId, status })
      toast.success(`Booking moved to ${status.toLowerCase()}`)
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update booking'
      toast.error(message)
    } finally {
      setLoadingId(null)
    }
  }

  const bookings = (data?.data || []) as Booking[]

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#1f2937]">Logistics bookings</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
          Kaniz Global Trade can scan the same QR as buyer and supplier, verify the linked barcode, and update live status from one place.
        </p>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Operations queue</h2>
          <p className="mt-1 text-sm text-[#68726b]">{bookings.length} logistics bookings in the system</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : !bookings.length ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No logistics bookings found.</div>
        ) : (
          <div className="divide-y divide-[#eef1eb]">
            {bookings.map((booking) => (
              <div key={booking.id} className="px-6 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[#1f2937]">{booking.providerName} · {booking.serviceMode.replaceAll('_', ' ')}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getBookingStatusTone(booking.status)}`}>
                        {booking.statusLabel}
                      </span>
                      <span className="rounded-full bg-[#eef2e7] px-2.5 py-1 text-xs font-semibold text-[#3e5840]">
                        {booking.sourceType.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#49544e]">{booking.sourceLabel}</p>
                    <p className="mt-1 text-sm text-[#68726b]">{booking.company.name} · Buyer {booking.buyer.firstName} {booking.buyer.lastName}</p>
                    <p className="mt-1 text-sm text-[#68726b]">{booking.origin} to {booking.destination}</p>
                    <p className="mt-1 text-sm text-[#68726b]">
                      {booking.currencyCode} {Number(booking.finalCost ?? booking.quotedCost).toLocaleString()}
                      {booking.trackingNumber ? ` · Tracking ${booking.trackingNumber}` : ''}
                    </p>
                    {booking.barcodeValue ? <p className="mt-1 text-xs text-[#738076]">Barcode: {booking.barcodeValue}</p> : null}
                  </div>

                  <div className="flex flex-col gap-3 xl:items-end">
                    <div className="flex items-center gap-3">
                      {booking.qrCodeDataUrl ? (
                        <img src={booking.qrCodeDataUrl} alt="Booking QR code" className="h-20 w-20 rounded-2xl border border-[#e7eae3] p-2" />
                      ) : null}
                      {booking.verificationUrl ? (
                        <a
                          href={booking.verificationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-2xl border border-[#d9ddd4] bg-white px-4 py-2 text-sm font-semibold text-[#243127] transition hover:border-[#c9d0c1]"
                        >
                          <QrCode className="h-4 w-4" />
                          Verify live
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(['BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => update(booking.id, status)}
                          disabled={loadingId === `${booking.id}-${status}`}
                          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                            status === 'DELIVERED'
                              ? 'bg-[#216c43] text-white'
                              : status === 'BOOKED'
                                ? 'bg-[#265ea8] text-white'
                                : status === 'CANCELLED'
                                  ? 'bg-[#b64242] text-white'
                                  : 'border border-[#d9ddd4] bg-white text-[#49544e]'
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {loadingId === `${booking.id}-${status}` ? 'Updating...' : status.replaceAll('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function getBookingStatusTone(status: string) {
  switch (status) {
    case 'QUOTED': return 'bg-[#fff4de] text-[#a66a00]'
    case 'BOOKED': return 'bg-[#e7f1ff] text-[#265ea8]'
    case 'IN_TRANSIT': return 'bg-[#ede9fe] text-[#6b46c1]'
    case 'DELIVERED': return 'bg-[#e7f6ec] text-[#216c43]'
    case 'CANCELLED': return 'bg-[#fdecec] text-[#b64242]'
    default: return 'bg-[#eef1eb] text-[#5f6862]'
  }
}
