'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { post } from '@/lib/utils/api-client'

export default function AdPaymentReturnPage() {
  const searchParams = useSearchParams()
  const payment = searchParams.get('payment') || 'success'
  const gateway = searchParams.get('gateway') || 'unknown'
  const campaignId = searchParams.get('campaignId') || ''

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (campaignId) {
      void post('/ad-campaigns/payment-return', {
        campaignId,
        payment,
        gateway,
      }).catch(() => {
        // The opener will still refetch and reconcile the latest state.
      })
    }

    window.opener?.postMessage({
      type: 'KGT_AD_PAYMENT_RESULT',
      payment,
      gateway,
      campaignId,
    }, window.location.origin)

    const closeTimer = window.setTimeout(() => {
      window.close()
    }, 1200)

    return () => window.clearTimeout(closeTimer)
  }, [campaignId, gateway, payment])

  return (
    <main className="min-h-screen bg-[#f4f6fb] px-6 py-16 text-[#111827]">
      <div className="mx-auto max-w-lg rounded-[28px] border border-[#dbe2f0] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4b5563]">Advertising payment</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          {payment === 'success' ? 'Payment received' : payment === 'cancelled' ? 'Payment cancelled' : 'Payment failed'}
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#4b5563]">
          {payment === 'success'
            ? 'Your campaign payment result has been sent back to the dashboard. This window can close automatically.'
            : 'Return to the advertising dashboard to review the campaign and retry payment if needed.'}
        </p>
        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#6b7280]">Gateway: {gateway}</p>
        <Link
          href="/dashboard/ads"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white"
        >
          Back to advertising
        </Link>
      </div>
    </main>
  )
}
