'use client'

import { ChevronDown, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useCurrency } from '@/lib/currency/client'

export function CurrencySelector({
  compact = false,
  className = '',
}: {
  compact?: boolean
  className?: string
}) {
  const { currencies, selectedCurrency, setSelectedCurrency, ready } = useCurrency()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return currencies
    return currencies.filter((currency) =>
      [currency.code, currency.name, currency.symbol].join(' ').toLowerCase().includes(needle)
    )
  }, [currencies, query])

  if (!ready) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading currency
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 ${compact ? 'min-w-[96px]' : 'min-w-[132px]'}`}
      >
        <span className="font-semibold">{selectedCurrency}</span>
        {!compact ? <span className="truncate text-xs text-slate-400">{currencies.find((currency) => currency.code === selectedCurrency)?.symbol || ''}</span> : null}
        <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-200 p-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search currency"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.map((currency) => (
              <button
                key={currency.code}
                type="button"
                onClick={() => {
                  setSelectedCurrency(currency.code)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                  selectedCurrency === currency.code ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div>
                  <p className="font-semibold">{currency.code}</p>
                  <p className="text-xs text-slate-400">{currency.name}</p>
                </div>
                <span className="text-xs text-slate-500">{currency.symbol}</span>
              </button>
            ))}
            {!filtered.length ? <div className="px-3 py-4 text-sm text-slate-500">No currency found.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
