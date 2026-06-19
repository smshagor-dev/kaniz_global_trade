'use client'

import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { get } from '@/lib/utils/api-client'

interface RFQ {
  id: string
  productName: string
  createdAt: string
  category?: { name: string }
}

interface MatchResponse {
  rfq: { id: string; productName: string; categoryName: string | null; signals: string[] }
  matches: Array<{
    companyId: string
    companyName: string
    companySlug: string
    score: number
    reasons: string[]
    product: { id: string; name: string; slug: string; category: string }
  }>
}

export default function BuyerAiMatchesPage() {
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null)
  const { data } = useQuery({
    queryKey: ['buyer-rfqs-for-matches'],
    queryFn: () => get<RFQ[]>('/rfqs'),
  })

  const rfqs = useMemo(() => (data?.data || []) as RFQ[], [data])
  const activeRfqId = selectedRfqId || rfqs[0]?.id || null

  const [matchesResult] = useQueries({
    queries: [
      {
        queryKey: ['rfq-smart-matches', activeRfqId],
        queryFn: () => get<MatchResponse>(`/rfqs/${activeRfqId}/matches`),
        enabled: !!activeRfqId,
      },
    ],
  })

  const payload = matchesResult.data?.data as MatchResponse | undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Supplier Matching</h1>
        <p className="text-sm text-gray-500 mt-1">
          Analyze RFQs beyond category-level matching and prioritize verified suppliers with the right product signals.
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px,1fr] gap-6">
        <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-2">
          <h2 className="font-semibold text-gray-900">Your RFQs</h2>
          {rfqs.map((rfq) => (
            <button
              key={rfq.id}
              onClick={() => setSelectedRfqId(rfq.id)}
              className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
                activeRfqId === rfq.id ? 'border-blue-300 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="font-medium text-gray-900">{rfq.productName}</div>
              <div className="text-xs text-gray-500 mt-1">{rfq.category?.name || 'Uncategorized'}</div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {payload?.matches?.length ? (
            <>
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900">{payload.rfq.productName}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Signals detected: {payload.rfq.signals.length ? payload.rfq.signals.join(', ') : 'general product fit'}
                </p>
              </div>
              {payload.matches.map((match) => (
                <div key={match.companyId} className="bg-white border border-gray-100 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link href={`/companies/${match.companySlug}`} className="text-lg font-semibold text-blue-700 hover:underline">
                        {match.companyName}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">Best matched product: {match.product.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{match.score}</div>
                      <div className="text-xs text-gray-400">match score</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {match.reasons.map((reason) => (
                      <span key={reason} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-full">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">
              Select an RFQ to view AI-ranked supplier matches.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
