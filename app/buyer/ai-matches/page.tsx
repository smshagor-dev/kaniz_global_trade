'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { get } from '@/lib/utils/api-client'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'

interface RFQ {
  id: string
  productName: string
  createdAt: string
  category?: { name: string }
}

interface MatchResponse {
  rfq: {
    id: string
    productName: string
    categoryName: string | null
    destinationCountry: string | null
    signals: string[]
    generatedAt: string | null
    expiresAt: string | null
    strategy: string
    usedAI: boolean
    providersUsed: string[]
    cached: boolean
    summary: string | null
  }
  matches: Array<{
    companyId: string
    companyName: string
    companySlug: string
    score: number
    baseScore: number
    aiScoreBonus: number
    reasons: string[]
    product: { id: string; name: string; slug: string; category: string; shortDescription?: string | null }
  }>
}

export default function BuyerAiMatchesPage() {
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const { data } = useQuery({
    queryKey: ['buyer-rfqs-for-matches'],
    queryFn: () => get<RFQ[]>('/rfqs'),
  })

  const rfqs = useMemo(() => (data?.data || []) as RFQ[], [data])
  const activeRfqId = selectedRfqId || rfqs[0]?.id || null

  const matchesResult = useQuery({
    queryKey: ['rfq-smart-matches', activeRfqId, refreshTick],
    queryFn: () =>
      get<MatchResponse>(`/rfqs/${activeRfqId}/matches${refreshTick ? '?refresh=1' : ''}`),
    enabled: !!activeRfqId,
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
          {matchesResult.isLoading && activeRfqId ? (
            <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating supplier matches...
            </div>
          ) : payload?.matches?.length ? (
            <>
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{payload.rfq.productName}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {payload.rfq.categoryName || 'Uncategorized'}
                      {payload.rfq.destinationCountry ? ` | Destination: ${payload.rfq.destinationCountry}` : ''}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Signals detected: {payload.rfq.signals.length ? payload.rfq.signals.join(', ') : 'general product fit'}
                    </p>
                    {payload.rfq.summary ? (
                      <p className="text-sm text-gray-600 mt-3">{payload.rfq.summary}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {payload.rfq.strategy === 'AI_ENRICHED' ? 'AI Enriched' : 'Deterministic'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {payload.rfq.cached ? 'Cached snapshot' : 'Fresh snapshot'}
                      </span>
                    </div>
                    {payload.rfq.providersUsed.length ? (
                      <div className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Sparkles className="h-3.5 w-3.5" />
                        {payload.rfq.providersUsed.join(', ')}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setRefreshTick((current) => current + 1)}
                      disabled={matchesResult.isFetching}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 disabled:opacity-60"
                    >
                      <RefreshCw className={`h-4 w-4 ${matchesResult.isFetching ? 'animate-spin' : ''}`} />
                      Refresh matches
                    </button>
                  </div>
                </div>
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
                      {match.aiScoreBonus ? (
                        <div className="text-xs text-blue-600 mt-1">
                          AI boost {match.aiScoreBonus > 0 ? '+' : ''}{match.aiScoreBonus}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {match.product.shortDescription ? (
                    <p className="text-sm text-gray-600 mt-3">{match.product.shortDescription}</p>
                  ) : null}
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
          ) : matchesResult.isError ? (
            <div className="bg-white border border-red-100 rounded-xl p-6 text-sm text-red-600">
              Unable to load supplier matches right now.
            </div>
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
