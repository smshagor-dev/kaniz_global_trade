'use client'

import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2, MapPinned, PackageCheck, QrCode, Truck } from 'lucide-react'
import { get } from '@/lib/utils/api-client'

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
  trackingNumber?: string | null
  estimatedDeliveryAt?: string | null
  sourceType: string
  sourceLabel: string
  sourceDescription: string
  verificationUrl?: string | null
  qrCodeDataUrl?: string | null
  barcodeValue?: string | null
}

interface LogisticsResponse {
  items: Booking[]
  providers: Array<{ name: string; hasCredentials: boolean }>
}

export default function BuyerLogisticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['buyer-logistics'],
    queryFn: () => get<LogisticsResponse>('/logistics-bookings'),
  })

  const response = data?.data as LogisticsResponse | undefined
  const bookings = response?.items || []

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
          Buyer logistics
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Logistics hub</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
          Every booking now includes a live QR verification page so you can scan and confirm status any time.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total bookings', value: bookings.length, icon: Truck },
          { label: 'In transit', value: bookings.filter((booking) => booking.status === 'IN_TRANSIT').length, icon: MapPinned },
          { label: 'Delivered', value: bookings.filter((booking) => booking.status === 'DELIVERED').length, icon: PackageCheck },
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
          <h2 className="text-lg font-semibold text-[#1f2937]">Booking activity</h2>
          <p className="mt-1 text-sm text-[#68726b]">Scan the QR or open the live verify link to confirm the latest logistics status</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : !bookings.length ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No logistics bookings yet.</div>
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
                    </div>
                    <p className="mt-2 text-sm text-[#49544e]">{booking.sourceLabel}</p>
                    <p className="mt-1 text-sm text-[#68726b]">{booking.sourceDescription || 'Cargo attached to booking'}</p>
                    <p className="mt-3 text-sm text-[#68726b]">{booking.origin} to {booking.destination}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#738076]">
                      {booking.barcodeValue ? <span>Barcode: {booking.barcodeValue}</span> : null}
                      <span>{booking.trackingNumber || 'Tracking pending'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 xl:items-end">
                    <div className="text-sm text-[#5f6862] xl:text-right">
                      <p className="font-semibold text-[#1f2937]">
                        {booking.currencyCode} {Number(booking.finalCost ?? booking.quotedCost).toLocaleString()}
                      </p>
                      <p className="mt-1">
                        {booking.estimatedDeliveryAt ? `ETA ${new Date(booking.estimatedDeliveryAt).toLocaleDateString()}` : 'ETA pending'}
                      </p>
                    </div>

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
