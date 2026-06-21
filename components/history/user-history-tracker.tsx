'use client'

import { useEffect, useRef } from 'react'
import { useAccessToken } from '@/store/auth'

type SearchPayload = {
  type: 'SEARCH'
  query: string
  normalizedQuery?: string
  scope: string
  mode?: string
  resultsCount?: number
  filters?: Record<string, unknown>
}

type ViewPayload = {
  type: 'VIEW'
  entityType: 'PRODUCT' | 'COMPANY'
  entityId: string
  productId?: string
  companyId?: string
  title?: string
  slug?: string
  metadata?: Record<string, unknown>
}

export function UserHistoryTracker({
  payload,
}: {
  payload: SearchPayload | ViewPayload
}) {
  const accessToken = useAccessToken()
  const sentRef = useRef(false)

  useEffect(() => {
    if (!accessToken || sentRef.current) return

    sentRef.current = true

    fetch('/api/me/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      sentRef.current = false
    })
  }, [accessToken, payload])

  return null
}
