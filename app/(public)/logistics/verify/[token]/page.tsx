'use client'

import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2, MapPinned, Package, QrCode, Truck } from 'lucide-react'

interface VerificationBooking {
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
  sourceDescription: string
  bookingReference?: string | null
  trackingNumber?: string | null
  estimatedDeliveryAt?: string | null
  barcodeValue?: string | null
  barcodeSource?: string | null
  qrCodeDataUrl?: string | null
  companyName?: string | null
  buyerName?: string | null
}

interface VerificationResponse {
  success: boolean
  message: string
  data?: VerificationBooking
}

export default function LogisticsVerificationPage({
  params,
}: {
  params: { token: string }
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-logistics-verification', params.token],
    queryFn: async () => {
      const response = await fetch(`/api/logistics-bookings/verify/${params.token}`, {
        cache: 'no-store',
      })
      const payload = await response.json() as VerificationResponse
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || 'Unable to verify booking')
      }
      return payload.data
    },
    refetchInterval: 15000,
  })

  return (
    <main className="min-h-screen bg-[#f4f6f1] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[32px] border border-[#d9ddd4] bg-white px-6 py-8 shadow-sm">
          <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
            Live logistics verification
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Scan and verify shipment status</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#616b64]">
            This page updates automatically so supplier, buyer, and Kaniz Global Trade can all verify the same logistics record in real time.
          </p>
        </section>

        {isLoading ? (
          <div className="flex justify-center rounded-[28px] border border-[#d9ddd4] bg-white py-20 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" />
          </div>
        ) : isError || !data ? (
          <div className="rounded-[28px] border border-[#e7cfcf] bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#7c2d2d]">Verification record not found</p>
            <p className="mt-2 text-sm text-[#7a6b6b]">The QR code may be invalid or the booking is no longer available.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Current status', value: data.statusLabel, icon: CheckCircle2 },
                { label: 'Provider', value: data.providerName, icon: Truck },
                { label: 'Barcode', value: data.barcodeValue || 'Not available', icon: QrCode },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] border border-[#d9ddd4] bg-white p-5 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef2e7] text-[#4f5d49]">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <p className="mt-4 text-sm text-[#6b756e]">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-[#1f2937]">{item.value}</p>
                </div>
              ))}
            </div>

            <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="rounded-[28px] border border-[#d9ddd4] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#1f2937]">{data.sourceLabel}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getBookingStatusTone(data.status)}`}>
                    {data.statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#68726b]">{data.sourceDescription || 'Cargo attached to booking'}</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <InfoCard label="Booking reference" value={data.bookingReference || 'Pending'} />
                  <InfoCard label="Tracking number" value={data.trackingNumber || 'Pending'} />
                  <InfoCard label="Route" value={`${data.origin} to ${data.destination}`} />
                  <InfoCard
                    label="Shipment value"
                    value={`${data.currencyCode} ${Number(data.finalCost ?? data.quotedCost).toLocaleString()}`}
                  />
                  <InfoCard label="Supplier" value={data.companyName || 'Not available'} />
                  <InfoCard label="Buyer" value={data.buyerName || 'Not available'} />
                  <InfoCard
                    label="ETA"
                    value={data.estimatedDeliveryAt ? new Date(data.estimatedDeliveryAt).toLocaleDateString() : 'Not set'}
                  />
                  <InfoCard label="Barcode source" value={data.barcodeSource || 'Manual / unavailable'} />
                </div>
              </div>

              <aside className="rounded-[28px] border border-[#d9ddd4] bg-white p-6 shadow-sm">
                {data.qrCodeDataUrl ? (
                  <img src={data.qrCodeDataUrl} alt="Logistics verification QR code" className="mx-auto h-52 w-52 rounded-2xl border border-[#e7eae3] p-3" />
                ) : (
                  <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-[#d9ddd4] text-sm text-[#68726b]">
                    QR unavailable
                  </div>
                )}
                <p className="mt-4 text-center text-sm font-medium text-[#33403a]">Re-scan to reopen this live page</p>
              </aside>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#e7eae3] bg-[#fbfbf9] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7b857c]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[#1f2937]">{value}</p>
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
