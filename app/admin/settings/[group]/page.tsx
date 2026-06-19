'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { del, get, put } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface SettingItem {
  key: string
  value: string | null
  type: string
  label?: string | null
  description?: string | null
  isSecret: boolean
}

interface SettingsResponse {
  group: string
  groupLabel: string
  items: SettingItem[]
}

interface GatewayCardConfig {
  id: string
  title: string
  subtitle: string
  accentClass: string
  keyMatcher: (key: string) => boolean
  enabledKey?: string
  modeKey?: string
  modeType?: 'boolean' | 'string'
}

const GROUP_MAP: Record<string, string> = {
  payment: 'PAYMENT',
  shipping: 'SHIPPING',
  partners: 'PARTNERS',
  email: 'EMAIL',
  storage: 'STORAGE',
}

const PAYMENT_CARDS: GatewayCardConfig[] = [
  {
    id: 'stripe',
    title: 'Stripe',
    subtitle: 'Card checkout and webhook-driven payment confirmation.',
    accentClass: 'from-blue-600 to-cyan-500',
    keyMatcher: (key) => key.startsWith('STRIPE_'),
    enabledKey: 'STRIPE_ENABLED',
  },
  {
    id: 'sslcommerz',
    title: 'SSLCommerz',
    subtitle: 'Bangladesh gateway with hosted checkout and IPN validation.',
    accentClass: 'from-emerald-600 to-teal-500',
    keyMatcher: (key) => key.startsWith('SSLCOMMERZ_'),
    enabledKey: 'SSLCOMMERZ_ENABLED',
    modeKey: 'SSLCOMMERZ_SANDBOX_MODE',
    modeType: 'boolean',
  },
  {
    id: 'aamarpay',
    title: 'aamarPay',
    subtitle: 'Bangladesh hosted checkout with transaction search verification.',
    accentClass: 'from-sky-600 to-indigo-500',
    keyMatcher: (key) => key.startsWith('AAMARPAY_'),
    enabledKey: 'AAMARPAY_ENABLED',
    modeKey: 'AAMARPAY_SANDBOX_MODE',
    modeType: 'boolean',
  },
  {
    id: 'nowpayments',
    title: 'NOWPayments',
    subtitle: 'Crypto invoice checkout with signed IPN callbacks for payment confirmation.',
    accentClass: 'from-orange-500 to-amber-500',
    keyMatcher: (key) => key.startsWith('NOWPAYMENTS_'),
    enabledKey: 'NOWPAYMENTS_ENABLED',
    modeKey: 'NOWPAYMENTS_SANDBOX_MODE',
    modeType: 'boolean',
  },
  {
    id: 'paypal',
    title: 'PayPal',
    subtitle: 'Merchant credentials and environment mode for future integrations.',
    accentClass: 'from-slate-700 to-slate-500',
    keyMatcher: (key) => key.startsWith('PAYPAL_'),
    enabledKey: 'PAYPAL_ENABLED',
    modeKey: 'PAYPAL_MODE',
    modeType: 'string',
  },
]

function Toggle({
  checked,
  onChange,
  activeLabel,
  inactiveLabel,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  activeLabel?: string
  inactiveLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-3 rounded-full border px-3 py-2 text-sm transition ${
        checked
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-gray-200 bg-gray-50 text-gray-600'
      }`}
    >
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? 'bg-emerald-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </span>
      <span>{checked ? activeLabel || 'Enabled' : inactiveLabel || 'Disabled'}</span>
    </button>
  )
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string
  options: Array<{ label: string; value: string }>
  onChange: (value: string) => void
}) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function SettingField({
  item,
  value,
  onChange,
  onReset,
}: {
  item: SettingItem
  value: string
  onChange: (value: string) => void
  onReset: () => Promise<void>
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-900">{item.label || item.key}</h3>
          <p className="mt-1 text-xs text-gray-400">{item.key}</p>
          {item.description && <p className="mt-1 text-sm text-gray-500">{item.description}</p>}
        </div>
        <button onClick={onReset} className="text-xs text-red-600 hover:underline">
          Reset
        </button>
      </div>

      {item.type === 'BOOLEAN' ? (
        <SegmentedControl
          value={value || 'false'}
          options={[
            { label: 'True', value: 'true' },
            { label: 'False', value: 'false' },
          ]}
          onChange={onChange}
        />
      ) : (
        <input
          type={item.isSecret || item.type === 'PASSWORD' ? 'password' : item.type === 'NUMBER' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        />
      )}
    </div>
  )
}

export default function AdminSettingsGroupPage() {
  const params = useParams<{ group: string }>()
  const groupSlug = params.group
  const group = GROUP_MAP[groupSlug] || 'PAYMENT'

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin-settings-group', group],
    queryFn: () => get<SettingsResponse>(`/admin/settings?group=${group}`),
  })

  const settings = useMemo(() => ((data?.data as SettingsResponse | undefined)?.items || []), [data?.data])
  const label = (data?.data as SettingsResponse | undefined)?.groupLabel || group
  const [values, setValues] = useState<Record<string, string>>({})

  const mergedValues = settings.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = values[item.key] ?? item.value ?? ''
    return acc
  }, {})

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function resetSetting(key: string) {
    await del('/admin/settings', { key })
    setValues((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    toast.success('Setting reset')
    refetch()
  }

  async function save() {
    await put('/admin/settings', {
      group,
      values: settings.map((item) => ({
        key: item.key,
        value: mergedValues[item.key] ?? '',
      })),
    })
    toast.success('Settings saved')
    refetch()
  }

  const paymentCards = useMemo(() => {
    if (group !== 'PAYMENT') return []

    const remaining = new Set(settings.map((item) => item.key))
    const cards = PAYMENT_CARDS.map((card) => {
      const items = settings.filter((item) => card.keyMatcher(item.key))
      items.forEach((item) => remaining.delete(item.key))
      return { ...card, items }
    }).filter((card) => card.items.length > 0)

    const uncategorized = settings.filter((item) => remaining.has(item.key))
    if (uncategorized.length > 0) {
      cards.push({
        id: 'general',
        title: 'Other Payment Controls',
        subtitle: 'Additional payment-related settings that do not belong to a specific gateway.',
        accentClass: 'from-gray-700 to-gray-500',
        keyMatcher: () => false,
        items: uncategorized,
      })
    }

    return cards
  }, [group, settings])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {group === 'PAYMENT'
              ? 'Keep each gateway isolated in its own card with quick enable, live/sandbox, and credential controls.'
              : 'Manage database-backed runtime settings for this integration group.'}
          </p>
        </div>
        <button onClick={save} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white">
          Save Changes
        </button>
      </div>

      {group === 'PAYMENT' ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {paymentCards.map((card) => {
            const enabledValue = card.enabledKey ? mergedValues[card.enabledKey] || 'false' : 'true'
            const modeValue = card.modeKey ? mergedValues[card.modeKey] || '' : ''
            const visibleItems = card.items.filter(
              (item) => item.key !== card.enabledKey && item.key !== card.modeKey
            )

            return (
              <section key={card.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className={`bg-gradient-to-r ${card.accentClass} p-5 text-white`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{card.title}</h2>
                      <p className="mt-1 max-w-xl text-sm text-white/80">{card.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {card.enabledKey && (
                        <Toggle
                          checked={enabledValue === 'true'}
                          onChange={(value) => setValue(card.enabledKey!, value ? 'true' : 'false')}
                        />
                      )}
                      {card.modeKey && card.modeType === 'boolean' && (
                        <SegmentedControl
                          value={modeValue || 'true'}
                          options={[
                            { label: 'Sandbox', value: 'true' },
                            { label: 'Live', value: 'false' },
                          ]}
                          onChange={(value) => setValue(card.modeKey!, value)}
                        />
                      )}
                      {card.modeKey && card.modeType === 'string' && (
                        <SegmentedControl
                          value={modeValue || 'sandbox'}
                          options={[
                            { label: 'Sandbox', value: 'sandbox' },
                            { label: 'Live', value: 'live' },
                          ]}
                          onChange={(value) => setValue(card.modeKey!, value)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  {visibleItems.map((item) => (
                    <SettingField
                      key={item.key}
                      item={item}
                      value={mergedValues[item.key] ?? ''}
                      onChange={(value) => setValue(item.key, value)}
                      onReset={() => resetSetting(item.key)}
                    />
                  ))}

                  {visibleItems.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                      No additional settings inside this gateway card yet.
                    </div>
                  )}
                </div>
              </section>
            )
          })}

          {!isLoading && paymentCards.length === 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
              No settings found for this group.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {settings.map((item) => (
            <SettingField
              key={item.key}
              item={item}
              value={mergedValues[item.key] ?? ''}
              onChange={(value) => setValue(item.key, value)}
              onReset={() => resetSetting(item.key)}
            />
          ))}

          {!isLoading && settings.length === 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
              No settings found for this group.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
