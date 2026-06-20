'use client'

import { useCurrency } from '@/lib/currency/client'

export function CurrencyRange({
  minAmount,
  maxAmount,
  currencyCode,
  fallback = 'Price on request',
  showCode = false,
  className,
}: {
  minAmount?: number | string | { toString(): string } | null
  maxAmount?: number | string | { toString(): string } | null
  currencyCode?: string | null
  fallback?: string
  showCode?: boolean
  className?: string
}) {
  const { formatAmount } = useCurrency()
  const min = formatAmount(minAmount, currencyCode, { showCode })
  const max = formatAmount(maxAmount, currencyCode, { showCode })

  let text = fallback
  if (min && max && min !== max) text = `${min} - ${max}`
  else if (min) text = min
  else if (max) text = max

  return <span className={className}>{text}</span>
}
