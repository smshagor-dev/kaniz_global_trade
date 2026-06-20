'use client'

import { useCurrency } from '@/lib/currency/client'

export function CurrencyAmount({
  amount,
  currencyCode,
  fallback = 'N/A',
  showCode = false,
  className,
}: {
  amount: number | string | { toString(): string } | null | undefined
  currencyCode?: string | null
  fallback?: string
  showCode?: boolean
  className?: string
}) {
  const { formatAmount } = useCurrency()
  const value = formatAmount(amount, currencyCode, { showCode })

  return <span className={className}>{value || fallback}</span>
}
