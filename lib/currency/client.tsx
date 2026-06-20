'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

type CurrencyEntry = {
  code: string
  name: string
  symbol: string
  rate: number
  isDefault: boolean
  isActive: boolean
}

type CurrencyApiResponse = {
  enabled: boolean
  baseCode: string
  defaultDisplayCode: string
  lastSyncedAt: string | null
  currencies: CurrencyEntry[]
}

type CurrencyContextValue = {
  ready: boolean
  enabled: boolean
  selectedCurrency: string
  baseCode: string
  lastSyncedAt: string | null
  currencies: CurrencyEntry[]
  setSelectedCurrency: (currencyCode: string) => void
  convertAmount: (amount: number, fromCode?: string | null) => number
  formatAmount: (
    amount: number | string | { toString(): string } | null | undefined,
    fromCode?: string | null,
    options?: Intl.NumberFormatOptions & { showCode?: boolean }
  ) => string | null
}

const STORAGE_KEY = 'kgt-currency'
const COOKIE_KEY = 'kgt_currency'
const EVENT_NAME = 'kgt:currency-change'

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

function readStoredCurrency() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(STORAGE_KEY) || ''
}

function persistCurrency(currencyCode: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, currencyCode)
  document.cookie = `${COOKIE_KEY}=${currencyCode}; path=/; max-age=31536000; samesite=lax`
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { currency: currencyCode } }))
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState('USD')

  const { data, isLoading } = useQuery({
    queryKey: ['currency-snapshot'],
    queryFn: async () => {
      const response = await fetch('/api/currencies', {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Failed to load currencies')
      }

      const payload = await response.json() as { data?: CurrencyApiResponse }
      return payload.data as CurrencyApiResponse
    },
    staleTime: 5 * 60 * 1000,
  })

  const currencies = useMemo(() => data?.currencies || [], [data?.currencies])

  useEffect(() => {
    const stored = readStoredCurrency()
    const nextCurrency = stored || data?.defaultDisplayCode || 'USD'
    if (!currencies.length) {
      setSelectedCurrencyState(nextCurrency)
      return
    }

    const supported = currencies.some((currency) => currency.code === nextCurrency)
    const fallback = data?.defaultDisplayCode || currencies[0]?.code || 'USD'
    const resolved = supported ? nextCurrency : fallback
    setSelectedCurrencyState(resolved)
    persistCurrency(resolved)
  }, [currencies, data?.defaultDisplayCode])

  useEffect(() => {
    function handleCurrencyChange(event: Event) {
      const customEvent = event as CustomEvent<{ currency?: string }>
      const nextCurrency = customEvent.detail?.currency || readStoredCurrency()
      if (nextCurrency) setSelectedCurrencyState(nextCurrency)
    }

    window.addEventListener(EVENT_NAME, handleCurrencyChange as EventListener)
    return () => {
      window.removeEventListener(EVENT_NAME, handleCurrencyChange as EventListener)
    }
  }, [])

  const value = useMemo<CurrencyContextValue>(() => {
    const baseCode = data?.baseCode || 'USD'
    const enabled = data?.enabled !== false
    const rateMap = new Map(currencies.map((currency) => [currency.code, currency]))

    function convertAmount(amount: number, fromCode?: string | null) {
      if (!enabled || !Number.isFinite(amount)) return amount
      const sourceCode = (fromCode || baseCode).toUpperCase()
      const sourceRate = rateMap.get(sourceCode)?.rate || 1
      const targetRate = rateMap.get(selectedCurrency)?.rate || sourceRate || 1
      const normalized = amount / sourceRate
      return normalized * targetRate
    }

    function formatAmount(
      amount: number | string | { toString(): string } | null | undefined,
      fromCode?: string | null,
      options?: Intl.NumberFormatOptions & { showCode?: boolean }
    ) {
      if (amount == null || amount === '') return null
      const numeric = Number(amount)
      if (!Number.isFinite(numeric)) return String(amount)

      const converted = convertAmount(numeric, fromCode)
      const currencyMeta = rateMap.get(selectedCurrency) || rateMap.get((fromCode || baseCode).toUpperCase())
      const formatted = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        ...options,
      }).format(converted)

      const prefix = currencyMeta?.symbol || ''
      const suffix = options?.showCode ? ` ${selectedCurrency}` : ''
      return `${prefix}${formatted}${suffix}`
    }

    return {
      ready: !isLoading,
      enabled,
      selectedCurrency,
      baseCode,
      lastSyncedAt: data?.lastSyncedAt || null,
      currencies,
      setSelectedCurrency: (currencyCode: string) => {
        const next = currencyCode.toUpperCase()
        setSelectedCurrencyState(next)
        persistCurrency(next)
      },
      convertAmount,
      formatAmount,
    }
  }, [currencies, data?.baseCode, data?.enabled, data?.lastSyncedAt, isLoading, selectedCurrency])

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider')
  }
  return context
}
