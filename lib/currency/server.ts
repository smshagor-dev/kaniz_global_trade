import prisma from '@/lib/db/prisma'
import { getSettingsMap } from '@/lib/settings/system'

const CURRENCY_SETTING_KEYS = [
  'MULTI_CURRENCY_ENABLED',
  'EXCHANGE_RATE_API_KEY',
  'EXCHANGE_RATE_API_BASE_URL',
  'MULTI_CURRENCY_BASE_CODE',
  'MULTI_CURRENCY_DEFAULT_DISPLAY',
  'MULTI_CURRENCY_SYNC_HOURS',
] as const

type CurrencyRow = {
  id: string
  code: string
  name: string
  symbol: string
  rate: { toString(): string } | number | string
  isDefault: boolean
  isActive: boolean
  updatedAt: Date
}

export type CurrencySnapshot = {
  enabled: boolean
  baseCode: string
  defaultDisplayCode: string
  lastSyncedAt: string | null
  currencies: Array<{
    id: string
    code: string
    name: string
    symbol: string
    rate: number
    isDefault: boolean
    isActive: boolean
    updatedAt: string
  }>
}

function normalizeRate(value: { toString(): string } | number | string) {
  const numeric = Number(value.toString())
  return Number.isFinite(numeric) ? numeric : 1
}

function getCurrencyName(code: string) {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'currency' })
    return displayNames.of(code.toUpperCase()) || code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

function getCurrencySymbol(code: string) {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code.toUpperCase(),
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0)

    return parts.find((part) => part.type === 'currency')?.value || code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

async function getCurrencySettings() {
  const settings = await getSettingsMap([...CURRENCY_SETTING_KEYS])
  const enabled = settings.MULTI_CURRENCY_ENABLED !== 'false'
  const baseCode = (settings.MULTI_CURRENCY_BASE_CODE || 'USD').toUpperCase()
  const defaultDisplayCode = (settings.MULTI_CURRENCY_DEFAULT_DISPLAY || baseCode).toUpperCase()
  const syncHours = Math.max(1, Number(settings.MULTI_CURRENCY_SYNC_HOURS || '6') || 6)
  const apiBaseUrl = (settings.EXCHANGE_RATE_API_BASE_URL || 'https://v6.exchangerate-api.com/v6').replace(/\/+$/, '')

  return {
    enabled,
    apiKey: settings.EXCHANGE_RATE_API_KEY || '',
    apiBaseUrl,
    baseCode,
    defaultDisplayCode,
    syncHours,
  }
}

async function fetchExchangeRates(apiBaseUrl: string, apiKey: string, baseCode: string) {
  const response = await fetch(`${apiBaseUrl}/${apiKey}/latest/${baseCode}`, {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Exchange rate sync failed with status ${response.status}`)
  }

  const payload = await response.json() as {
    result?: string
    base_code?: string
    conversion_rates?: Record<string, number>
    time_last_update_utc?: string
    error_type?: string
  }

  if (payload.result !== 'success' || !payload.conversion_rates) {
    throw new Error(payload.error_type || 'Exchange rate sync returned an invalid payload')
  }

  return payload
}

async function listActiveCurrencies() {
  return prisma.currency.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
  })
}

export async function syncCurrencyRates(options?: { force?: boolean }) {
  const settings = await getCurrencySettings()
  const currencies = await listActiveCurrencies()

  const baseCurrency = currencies.find((currency) => currency.code === settings.baseCode) || currencies[0]
  const lastUpdatedAt = baseCurrency?.updatedAt ? new Date(baseCurrency.updatedAt).getTime() : 0
  const staleAfterMs = settings.syncHours * 60 * 60 * 1000
  const shouldSync = !!options?.force || !lastUpdatedAt || Date.now() - lastUpdatedAt >= staleAfterMs

  if ((!settings.enabled && !options?.force) || !shouldSync) {
    return {
      settings,
      currencies,
      synced: false,
      lastSyncedAt: baseCurrency?.updatedAt ? baseCurrency.updatedAt.toISOString() : null,
    }
  }

  if (!settings.apiKey) {
    if (options?.force) {
      throw new Error('ExchangeRate API key is missing in system settings')
    }

    return {
      settings,
      currencies,
      synced: false,
      lastSyncedAt: baseCurrency?.updatedAt ? baseCurrency.updatedAt.toISOString() : null,
    }
  }

  const payload = await fetchExchangeRates(settings.apiBaseUrl, settings.apiKey, settings.baseCode)
  const rateEntries = Object.entries(payload.conversion_rates || {})

  await prisma.$transaction(
    rateEntries.map(([code, rate]) =>
      prisma.currency.upsert({
        where: { code },
        create: {
          code,
          name: getCurrencyName(code),
          symbol: getCurrencySymbol(code),
          rate: normalizeRate(rate),
          isDefault: code === settings.baseCode,
          isActive: true,
        },
        update: {
          rate: normalizeRate(rate),
          isDefault: code === settings.baseCode,
          isActive: true,
          name: getCurrencyName(code),
          symbol: getCurrencySymbol(code),
        },
      })
    )
  )

  const refreshed = await listActiveCurrencies()

  return {
    settings,
    currencies: refreshed,
    synced: true,
    lastSyncedAt: payload.time_last_update_utc || new Date().toISOString(),
  }
}

export async function getCurrencySnapshot(options?: { forceSync?: boolean }): Promise<CurrencySnapshot> {
  const { settings, currencies, lastSyncedAt } = await syncCurrencyRates({ force: options?.forceSync })
  const activeCodes = new Set(currencies.map((currency) => currency.code))
  const fallbackCode = activeCodes.has(settings.defaultDisplayCode)
    ? settings.defaultDisplayCode
    : activeCodes.has(settings.baseCode)
      ? settings.baseCode
      : currencies[0]?.code || 'USD'

  return {
    enabled: settings.enabled,
    baseCode: settings.baseCode,
    defaultDisplayCode: fallbackCode,
    lastSyncedAt,
    currencies: currencies.map((currency) => ({
      id: currency.id,
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      rate: normalizeRate(currency.rate),
      isDefault: currency.code === settings.baseCode,
      isActive: currency.isActive,
      updatedAt: currency.updatedAt.toISOString(),
    })),
  }
}
