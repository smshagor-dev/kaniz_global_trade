'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { del, get, post, put } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { CheckCircle2, Copy, Loader2, ShieldAlert } from 'lucide-react'
import { ServiceFeeSettingsPanel } from '@/components/admin/service-fee-settings-panel'
import { TaxVatSettingsPanel } from '@/components/admin/tax-vat-settings-panel'

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

interface CurrencySnapshotResponse {
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

interface LanguageAdminSnapshotResponse {
  baseLanguage: string
  totalKeys: number
  languages: Array<{
    id: string
    code: string
    name: string
    nativeName?: string | null
    isDefault: boolean
    isActive: boolean
    isRtl: boolean
    autoTranslateReady: boolean
    lastTranslatedAt: string | null
    translationCount: number
  }>
}

interface ServicePartnerRecord {
  id: string
  type: 'FINANCING' | 'INSURANCE'
  code: string
  name: string
  slug: string
  description?: string | null
  website?: string | null
  contactEmail?: string | null
  apiBaseUrl?: string | null
  apiKey: string
  apiSecret: string
  accessToken: string
  metadata: string
  isDefault: boolean
  isActive: boolean
  hasApiKey: boolean
  hasApiSecret: boolean
  hasAccessToken: boolean
  requestCount: number
  createdAt: string
  updatedAt: string
}

interface FfmpegVerifyResponse {
  binary: string
  ok: boolean
  code: number | null
  message: string
}

interface PaymentReadinessCheck {
  level: 'ok' | 'warning' | 'error'
  message: string
}

interface PaymentGatewayReadiness {
  gateway: string
  enabled: boolean
  mode: string
  status: 'ok' | 'warning' | 'error'
  checks: PaymentReadinessCheck[]
}

interface PaymentReadinessResponse {
  appUrl: string | null
  overallStatus: 'ok' | 'warning' | 'error'
  checks: PaymentReadinessCheck[]
  gateways: PaymentGatewayReadiness[]
}

interface AIProviderRecord {
  id: string
  provider: 'gemini' | 'claude' | 'chatgpt'
  label: string
  textModel: string
  imageModel: string
  baseUrl?: string
  enabled: boolean
  hasApiKey: boolean
  createdAt: string
  updatedAt: string
}

const CURRENCY_PAGE_SIZE = 15

function createAIProviderForm(provider: AIProviderRecord['provider'] = 'gemini') {
  if (provider === 'claude') {
    return {
      id: '',
      provider,
      label: 'Claude',
      apiKey: '',
      textModel: 'claude-3-5-sonnet-latest',
      imageModel: 'claude-3-5-sonnet-latest',
      baseUrl: '',
      enabled: true,
    }
  }

  if (provider === 'chatgpt') {
    return {
      id: '',
      provider,
      label: 'ChatGPT',
      apiKey: '',
      textModel: 'gpt-4o-mini',
      imageModel: 'gpt-4o-mini',
      baseUrl: '',
      enabled: true,
    }
  }

  return {
    id: '',
    provider,
    label: 'Gemini',
    apiKey: '',
    textModel: 'gemini-2.0-flash',
    imageModel: 'gemini-2.0-flash',
    baseUrl: '',
    enabled: true,
  }
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
  'service-fees': 'SERVICE_FEES',
  'tax-vat': 'TAX_VAT',
  ai: 'AI',
  home: 'HOME',
  payment: 'PAYMENT',
  currency: 'CURRENCY',
  language: 'LANGUAGE',
  advertising: 'ADVERTISING',
  social: 'SOCIAL',
  shipping: 'SHIPPING',
  partners: 'PARTNERS',
  email: 'EMAIL',
  storage: 'STORAGE',
  media: 'MEDIA',
}

const PAYMENT_CARDS: GatewayCardConfig[] = [
  {
    id: 'stripe',
    title: 'Stripe',
    subtitle: 'Card checkout and webhook-driven payment confirmation.',
    accentClass: 'from-blue-600 to-cyan-500',
    keyMatcher: (key) => key.startsWith('STRIPE_'),
    enabledKey: 'STRIPE_ENABLED',
    modeKey: 'STRIPE_MODE',
    modeType: 'string',
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
  resetting,
  compact = false,
}: {
  item: SettingItem
  value: string
  onChange: (value: string) => void
  onReset: () => Promise<void>
  resetting?: boolean
  compact?: boolean
}) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-gray-50/70 ${compact ? 'p-3' : 'p-4'}`}>
      <div className={`flex items-start justify-between gap-3 ${compact ? 'mb-2' : 'mb-3'}`}>
        <div>
          <h3 className={`${compact ? 'text-sm' : ''} font-medium text-gray-900`}>{item.label || item.key}</h3>
          <p className="mt-1 text-[11px] text-gray-400">{item.key}</p>
          {item.description && (
            <p className={`mt-1 text-gray-500 ${compact ? 'line-clamp-2 text-xs' : 'text-sm'}`}>{item.description}</p>
          )}
        </div>
        <button
          onClick={() => void onReset()}
          disabled={resetting}
          className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resetting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {resetting ? 'Resetting...' : 'Reset'}
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
          className={`w-full rounded-lg border border-gray-200 bg-white text-sm ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}
        />
      )}
    </div>
  )
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'neutral' | 'success' | 'danger'
  children: React.ReactNode
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : tone === 'danger'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-slate-100 text-slate-600 border-slate-200'

  return (
    <div className={`rounded-xl border px-3 py-2 text-xs font-medium ${toneClass}`}>
      {children}
    </div>
  )
}

export default function AdminSettingsGroupPage() {
  const params = useParams<{ group: string }>()
  const groupSlug = params.group
  if (groupSlug === 'service-fees') {
    return <ServiceFeeSettingsPanel />
  }
  if (groupSlug === 'tax-vat') {
    return <TaxVatSettingsPanel />
  }
  const group = GROUP_MAP[groupSlug] || 'PAYMENT'

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin-settings-group', group],
    queryFn: () => get<SettingsResponse>(`/admin/settings?group=${group}`),
  })

  const { data: currencySnapshot, refetch: refetchCurrencySnapshot } = useQuery({
    queryKey: ['admin-currency-snapshot', group],
    queryFn: () => get<CurrencySnapshotResponse>('/currencies'),
    enabled: group === 'CURRENCY',
  })

  const { data: languageSnapshot, refetch: refetchLanguageSnapshot } = useQuery({
    queryKey: ['admin-language-snapshot', group],
    queryFn: () => get<LanguageAdminSnapshotResponse>('/admin/languages'),
    enabled: group === 'LANGUAGE',
  })
  const { data: partnersSnapshot, refetch: refetchPartnersSnapshot } = useQuery({
    queryKey: ['admin-partners-snapshot', group],
    queryFn: () => get<ServicePartnerRecord[]>('/admin/partners'),
    enabled: group === 'PARTNERS',
  })
  const { data: aiProvidersSnapshot, refetch: refetchAiProvidersSnapshot } = useQuery({
    queryKey: ['admin-ai-providers', group],
    queryFn: () => get<AIProviderRecord[]>('/admin/ai/providers'),
    enabled: group === 'AI',
  })

  const settings = useMemo(
    () =>
      (((data?.data as SettingsResponse | undefined)?.items || []) as SettingItem[]).filter(
        (item) => !(group === 'AI' && item.key === 'AI_MULTI_AGENT_PROVIDERS')
      ),
    [data?.data, group]
  )
  const label = (data?.data as SettingsResponse | undefined)?.groupLabel || group
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [resettingKey, setResettingKey] = useState<string | null>(null)
  const [currencyPage, setCurrencyPage] = useState(1)
  const [creatingLanguage, setCreatingLanguage] = useState(false)
  const [translatingLanguageId, setTranslatingLanguageId] = useState<string | null>(null)
  const [savingPartner, setSavingPartner] = useState(false)
  const [deletingPartnerId, setDeletingPartnerId] = useState<string | null>(null)
  const [verifyingFfmpeg, setVerifyingFfmpeg] = useState(false)
  const [ffmpegStatus, setFfmpegStatus] = useState<FfmpegVerifyResponse | null>(null)
  const [verifyingPayments, setVerifyingPayments] = useState(false)
  const [paymentReadiness, setPaymentReadiness] = useState<PaymentReadinessResponse | null>(null)
  const [languageForm, setLanguageForm] = useState({
    code: '',
    name: '',
    nativeName: '',
    isRtl: false,
  })
  const [partnerForm, setPartnerForm] = useState({
    id: '',
    type: 'FINANCING' as 'FINANCING' | 'INSURANCE',
    code: '',
    name: '',
    description: '',
    website: '',
    contactEmail: '',
    apiBaseUrl: '',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
    metadata: '',
    isDefault: false,
    isActive: true,
  })
  const [savingAiProvider, setSavingAiProvider] = useState(false)
  const [deletingAiProviderId, setDeletingAiProviderId] = useState<string | null>(null)
  const [aiProviderForm, setAiProviderForm] = useState(createAIProviderForm())

  const mergedValues = settings.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = values[item.key] ?? item.value ?? ''
    return acc
  }, {})

  const setValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function resetSetting(key: string) {
    setResettingKey(key)
    try {
      await del('/admin/settings', { key })
      setValues((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      toast.success('Setting reset')
      refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Setting reset failed'
      toast.error(message)
    } finally {
      setResettingKey(null)
    }
  }

  async function save() {
    setSaving(true)
    try {
      await put('/admin/settings', {
        group,
        values: settings.map((item) => ({
          key: item.key,
          value: mergedValues[item.key] ?? '',
        })),
      })
      toast.success('Settings saved')
      refetch()
      if (group === 'CURRENCY') refetchCurrencySnapshot()
      if (group === 'LANGUAGE') refetchLanguageSnapshot()
      if (group === 'PARTNERS') refetchPartnersSnapshot()
      if (group === 'AI') refetchAiProvidersSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Settings save failed'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function syncCurrencyRates() {
    setSyncing(true)
    try {
      await post('/admin/currencies/sync')
      toast.success('Currency rates synced')
      refetch()
      refetchCurrencySnapshot()
      setCurrencyPage(1)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Currency sync failed'
      toast.error(message)
    } finally {
      setSyncing(false)
    }
  }

  async function createLanguageRecord() {
    setCreatingLanguage(true)
    try {
      await post('/admin/languages', {
        code: languageForm.code,
        name: languageForm.name,
        nativeName: languageForm.nativeName,
        isRtl: languageForm.isRtl,
      })
      toast.success('Language added')
      setLanguageForm({ code: '', name: '', nativeName: '', isRtl: false })
      refetchLanguageSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Language create failed'
      toast.error(message)
    } finally {
      setCreatingLanguage(false)
    }
  }

  async function translateSingleLanguage(languageId: string) {
    setTranslatingLanguageId(languageId)
    try {
      await post(`/admin/languages/${languageId}/translate`)
      toast.success('Language translated')
      refetchLanguageSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Language translate failed'
      toast.error(message)
    } finally {
      setTranslatingLanguageId(null)
    }
  }

  async function savePartnerRecord() {
    setSavingPartner(true)
    try {
      await post('/admin/partners', partnerForm)
      toast.success(partnerForm.id ? 'Partner updated' : 'Partner created')
      setPartnerForm({
        id: '',
        type: 'FINANCING',
        code: '',
        name: '',
        description: '',
        website: '',
        contactEmail: '',
        apiBaseUrl: '',
        apiKey: '',
        apiSecret: '',
        accessToken: '',
        metadata: '',
        isDefault: false,
        isActive: true,
      })
      refetchPartnersSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Partner save failed'
      toast.error(message)
    } finally {
      setSavingPartner(false)
    }
  }

  async function deletePartnerRecord(id: string) {
    setDeletingPartnerId(id)
    try {
      await del('/admin/partners', { id })
      toast.success('Partner removed')
      if (partnerForm.id === id) {
        setPartnerForm({
          id: '',
          type: 'FINANCING',
          code: '',
          name: '',
          description: '',
          website: '',
          contactEmail: '',
          apiBaseUrl: '',
          apiKey: '',
          apiSecret: '',
          accessToken: '',
          metadata: '',
          isDefault: false,
          isActive: true,
        })
      }
      refetchPartnersSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Partner delete failed'
      toast.error(message)
    } finally {
      setDeletingPartnerId(null)
    }
  }

  async function saveAiProviderRecord() {
    setSavingAiProvider(true)
    try {
      await post('/admin/ai/providers', aiProviderForm)
      toast.success(aiProviderForm.id ? 'AI provider updated' : 'AI provider added')
      setAiProviderForm(createAIProviderForm())
      refetchAiProvidersSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI provider save failed'
      toast.error(message)
    } finally {
      setSavingAiProvider(false)
    }
  }

  async function deleteAiProviderRecord(id: string) {
    setDeletingAiProviderId(id)
    try {
      await del('/admin/ai/providers', { id })
      toast.success('AI provider removed')
      if (aiProviderForm.id === id) {
        setAiProviderForm(createAIProviderForm())
      }
      refetchAiProvidersSnapshot()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI provider delete failed'
      toast.error(message)
    } finally {
      setDeletingAiProviderId(null)
    }
  }

  async function verifyFfmpegPath() {
    setVerifyingFfmpeg(true)
    try {
      const response = await post<FfmpegVerifyResponse>('/admin/settings/media/verify', {
        path: mergedValues.FFMPEG_PATH || '',
      })
      setFfmpegStatus((response.data as FfmpegVerifyResponse) || null)
      toast.success(response.message || 'FFmpeg verify completed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'FFmpeg verification failed'
      setFfmpegStatus({
        binary: mergedValues.FFMPEG_PATH || '',
        ok: false,
        code: null,
        message,
      })
      toast.error(message)
    } finally {
      setVerifyingFfmpeg(false)
    }
  }

  async function verifyPaymentReadiness() {
    setVerifyingPayments(true)
    try {
      const response = await post<PaymentReadinessResponse>('/admin/settings/payment/verify')
      setPaymentReadiness((response.data as PaymentReadinessResponse) || null)
      toast.success(response.message || 'Payment readiness completed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Payment readiness failed'
      toast.error(message)
    } finally {
      setVerifyingPayments(false)
    }
  }

  async function copyText(value: string, label: string) {
    if (!value) {
      toast.error(`No ${label.toLowerCase()} available`)
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error(`Unable to copy ${label.toLowerCase()}`)
    }
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

  const currencySnapshotData = currencySnapshot?.data as CurrencySnapshotResponse | undefined
  const languageSnapshotData = languageSnapshot?.data as LanguageAdminSnapshotResponse | undefined
  const partnersSnapshotData = (partnersSnapshot?.data as ServicePartnerRecord[] | undefined) || []
  const aiProvidersSnapshotData = (aiProvidersSnapshot?.data as AIProviderRecord[] | undefined) || []
  const isAIGroup = group === 'AI'
  const isCurrencyGroup = group === 'CURRENCY'
  const isLanguageGroup = group === 'LANGUAGE'
  const isPartnersGroup = group === 'PARTNERS'
  const isMediaGroup = group === 'MEDIA'
  const allCurrencies = currencySnapshotData?.currencies || []
  const totalCurrencyPages = Math.max(1, Math.ceil(allCurrencies.length / CURRENCY_PAGE_SIZE))
  const normalizedCurrencyPage = Math.min(currencyPage, totalCurrencyPages)
  const paginatedCurrencies = allCurrencies.slice(
    (normalizedCurrencyPage - 1) * CURRENCY_PAGE_SIZE,
    normalizedCurrencyPage * CURRENCY_PAGE_SIZE
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {group === 'AI'
              ? 'Run AI Search and Image Search as a multi-agent system. Add Gemini, Claude, and ChatGPT providers, then keep orchestration toggles in the same screen.'
              : group === 'HOME'
              ? 'Control homepage section visibility, item limits, and the final CTA copy from Kaniz Global Trade settings.'
              : group === 'PAYMENT'
              ? 'Keep each gateway isolated in its own card with quick enable, live/sandbox, and credential controls.'
              : group === 'CURRENCY'
                ? 'Manage the ExchangeRate-API key and sync controls, then review the live currency rows saved in the database.'
                : group === 'LANGUAGE'
                  ? 'Add languages, store every translation key in the database, and run one-click Google translation per language.'
                  : group === 'PARTNERS'
                    ? 'Manage financing and insurance partners, including API keys and secrets, directly from the database.'
                    : group === 'MEDIA'
                      ? 'Save the FFmpeg binary path in the database, verify it from Kaniz Global Trade, and control server-side video thumbnail generation.'
                    : group === 'ADVERTISING'
                      ? 'Control campaign availability, placement access, approval workflow, and supplier-facing defaults for advertising.'
                : 'Manage database-backed runtime settings for this integration group.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {group === 'CURRENCY' ? (
            <button
              onClick={() => void syncCurrencyRates()}
              disabled={syncing || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {syncing ? 'Syncing...' : 'Sync Rates Now'}
            </button>
          ) : null}
          {group === 'MEDIA' ? (
            <button
              onClick={() => void verifyFfmpegPath()}
              disabled={verifyingFfmpeg || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifyingFfmpeg ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {verifyingFfmpeg ? 'Verifying...' : 'Verify FFmpeg Path'}
            </button>
          ) : null}
          {group === 'PAYMENT' ? (
            <button
              onClick={() => void verifyPaymentReadiness()}
              disabled={verifyingPayments || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {verifyingPayments ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {verifyingPayments ? 'Checking...' : 'Run Payment Readiness Check'}
            </button>
          ) : null}
          {!isLanguageGroup && !isPartnersGroup ? (
            <button
              onClick={() => void save()}
              disabled={saving || syncing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : null}
        </div>
      </div>

      {isAIGroup ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Multi-Agent Controls</h2>
              <p className="text-sm text-gray-500">These runtime settings control orchestration, fallback behavior, and the legacy Gemini bridge. The provider JSON row is managed below automatically.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {settings.map((item) => (
                <SettingField
                  key={item.key}
                  item={item}
                  value={mergedValues[item.key] ?? ''}
                  onChange={(value) => setValue(item.key, value)}
                  onReset={() => resetSetting(item.key)}
                  resetting={resettingKey === item.key}
                  compact
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Add Provider Agent</h2>
              <p className="text-sm text-gray-500">Add provider-based agents for Gemini, Claude, or ChatGPT. Enabled agents join the search orchestrator and appear in the table below.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select
                value={aiProviderForm.provider}
                onChange={(event) => setAiProviderForm(createAIProviderForm(event.target.value as AIProviderRecord['provider']))}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <option value="gemini">Gemini</option>
                <option value="claude">Claude</option>
                <option value="chatgpt">ChatGPT</option>
              </select>
              <input value={aiProviderForm.label} onChange={(event) => setAiProviderForm((prev) => ({ ...prev, label: event.target.value }))} placeholder="Label" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
              <input value={aiProviderForm.textModel} onChange={(event) => setAiProviderForm((prev) => ({ ...prev, textModel: event.target.value }))} placeholder="Text model" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
              <input value={aiProviderForm.imageModel} onChange={(event) => setAiProviderForm((prev) => ({ ...prev, imageModel: event.target.value }))} placeholder="Image model" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
              <input value={aiProviderForm.apiKey} onChange={(event) => setAiProviderForm((prev) => ({ ...prev, apiKey: event.target.value }))} placeholder="API key" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm md:col-span-2" />
              <input value={aiProviderForm.baseUrl} onChange={(event) => setAiProviderForm((prev) => ({ ...prev, baseUrl: event.target.value }))} placeholder="Base URL (optional)" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm md:col-span-2" />
              <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <span>Enabled agent</span>
                <input type="checkbox" checked={aiProviderForm.enabled} onChange={(event) => setAiProviderForm((prev) => ({ ...prev, enabled: event.target.checked }))} />
              </label>
            </div>

            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => void saveAiProviderRecord()}
                disabled={savingAiProvider || !aiProviderForm.label.trim() || !aiProviderForm.textModel.trim() || !aiProviderForm.imageModel.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingAiProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingAiProvider ? 'Saving...' : aiProviderForm.id ? 'Update Provider' : 'Add Provider'}
              </button>
              {aiProviderForm.id ? (
                <button type="button" onClick={() => setAiProviderForm(createAIProviderForm())} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
                  Clear
                </button>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-base font-semibold text-gray-900">Configured Agent Providers</h2>
              <p className="text-sm text-gray-500">Each row is an agent the orchestrator can use for AI Search and AI Image Search.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 font-medium">Label</th>
                    <th className="px-4 py-3 font-medium">Text Model</th>
                    <th className="px-4 py-3 font-medium">Image Model</th>
                    <th className="px-4 py-3 font-medium">API Key</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {aiProvidersSnapshotData.map((provider) => (
                    <tr key={provider.id} className="text-gray-700">
                      <td className="px-4 py-3 uppercase">{provider.provider}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{provider.label}</td>
                      <td className="px-4 py-3">{provider.textModel}</td>
                      <td className="px-4 py-3">{provider.imageModel}</td>
                      <td className="px-4 py-3">{provider.hasApiKey ? 'Saved' : 'Missing'}</td>
                      <td className="px-4 py-3">{provider.enabled ? 'Enabled' : 'Disabled'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(provider.updatedAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setAiProviderForm({
                              id: provider.id,
                              provider: provider.provider,
                              label: provider.label,
                              apiKey: '',
                              textModel: provider.textModel,
                              imageModel: provider.imageModel,
                              baseUrl: provider.baseUrl || '',
                              enabled: provider.enabled,
                            })}
                            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteAiProviderRecord(provider.id)}
                            disabled={deletingAiProviderId === provider.id}
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingAiProviderId === provider.id ? 'Removing...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!aiProvidersSnapshotData.length && (
              <div className="px-4 py-6 text-sm text-gray-500">No AI provider agents configured yet.</div>
            )}
          </section>
        </div>
      ) : group === 'PAYMENT' ? (
        <div className="space-y-5">
          {paymentReadiness ? (
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Payment Launch Readiness</h2>
                  <p className="mt-1 text-sm text-gray-500">Quick operational audit for hosted redirects, gateway credentials, and live-mode safety.</p>
                </div>
                <StatusPill
                  tone={
                    paymentReadiness.overallStatus === 'ok'
                      ? 'success'
                      : paymentReadiness.overallStatus === 'error'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {paymentReadiness.overallStatus === 'ok'
                    ? 'Ready'
                    : paymentReadiness.overallStatus === 'error'
                      ? 'Blocking Issues'
                      : 'Warnings'}
                </StatusPill>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {paymentReadiness.checks.map((check, index) => (
                  <StatusPill
                    key={`${check.message}-${index}`}
                    tone={check.level === 'ok' ? 'success' : check.level === 'error' ? 'danger' : 'neutral'}
                  >
                    {check.message}
                  </StatusPill>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-2">
          {paymentCards.map((card) => {
            const enabledValue = card.enabledKey ? mergedValues[card.enabledKey] || 'false' : 'true'
            const modeValue = card.modeKey ? mergedValues[card.modeKey] || '' : ''
            const visibleItems = card.items.filter(
              (item) => item.key !== card.enabledKey && item.key !== card.modeKey
            )
            const gatewayReadiness = paymentReadiness?.gateways.find((gateway) => {
              const normalizedGateway = gateway.gateway.toLowerCase().replace(/[^a-z0-9]/g, '')
              const normalizedCard = card.title.toLowerCase().replace(/[^a-z0-9]/g, '')
              return normalizedGateway === normalizedCard
            })

            return (
              <section key={card.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className={`bg-gradient-to-r ${card.accentClass} p-5 text-white`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{card.title}</h2>
                      <p className="mt-1 max-w-xl text-sm text-white/80">{card.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {gatewayReadiness ? (
                        <StatusPill
                          tone={
                            gatewayReadiness.status === 'ok'
                              ? 'success'
                              : gatewayReadiness.status === 'error'
                                ? 'danger'
                                : 'neutral'
                          }
                        >
                          {gatewayReadiness.status === 'ok'
                            ? 'Ready'
                            : gatewayReadiness.status === 'error'
                              ? 'Needs Fix'
                              : 'Check Warnings'}
                        </StatusPill>
                      ) : null}
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
                  {gatewayReadiness ? (
                    <div className="grid gap-2">
                      {gatewayReadiness.checks.map((check, index) => (
                        <StatusPill
                          key={`${gatewayReadiness.gateway}-${index}-${check.message}`}
                          tone={check.level === 'ok' ? 'success' : check.level === 'error' ? 'danger' : 'neutral'}
                        >
                          {check.message}
                        </StatusPill>
                      ))}
                    </div>
                  ) : null}

                  {visibleItems.map((item) => (
                    <SettingField
                      key={item.key}
                      item={item}
                      value={mergedValues[item.key] ?? ''}
                      onChange={(value) => setValue(item.key, value)}
                      onReset={() => resetSetting(item.key)}
                      resetting={resettingKey === item.key}
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
        </div>
      ) : isPartnersGroup ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Partner CRUD</h2>
              <p className="text-sm text-gray-500">Create or update financing and insurance partners. Secrets stay in the database and are used at runtime from there.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select value={partnerForm.type} onChange={(event) => setPartnerForm((prev) => ({ ...prev, type: event.target.value as 'FINANCING' | 'INSURANCE' }))} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                <option value="FINANCING">Financing</option>
                <option value="INSURANCE">Insurance</option>
              </select>
              <input value={partnerForm.code} onChange={(event) => setPartnerForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="Code" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
              <input value={partnerForm.name} onChange={(event) => setPartnerForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Name" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
              <input value={partnerForm.website} onChange={(event) => setPartnerForm((prev) => ({ ...prev, website: event.target.value }))} placeholder="Website" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
              <input value={partnerForm.contactEmail} onChange={(event) => setPartnerForm((prev) => ({ ...prev, contactEmail: event.target.value }))} placeholder="Contact email" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
              <input value={partnerForm.apiBaseUrl} onChange={(event) => setPartnerForm((prev) => ({ ...prev, apiBaseUrl: event.target.value }))} placeholder="API base URL" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
              <input value={partnerForm.apiKey} onChange={(event) => setPartnerForm((prev) => ({ ...prev, apiKey: event.target.value }))} placeholder="API key" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
              <input value={partnerForm.apiSecret} onChange={(event) => setPartnerForm((prev) => ({ ...prev, apiSecret: event.target.value }))} placeholder="API secret" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
              <input value={partnerForm.accessToken} onChange={(event) => setPartnerForm((prev) => ({ ...prev, accessToken: event.target.value }))} placeholder="Access token" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm md:col-span-2 xl:col-span-2" />
              <input value={partnerForm.description} onChange={(event) => setPartnerForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm md:col-span-2" />
              <textarea value={partnerForm.metadata} onChange={(event) => setPartnerForm((prev) => ({ ...prev, metadata: event.target.value }))} placeholder="Metadata / JSON / notes" rows={3} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm md:col-span-2" />
              <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <span>Default partner</span>
                <input type="checkbox" checked={partnerForm.isDefault} onChange={(event) => setPartnerForm((prev) => ({ ...prev, isDefault: event.target.checked }))} />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <span>Active</span>
                <input type="checkbox" checked={partnerForm.isActive} onChange={(event) => setPartnerForm((prev) => ({ ...prev, isActive: event.target.checked }))} />
              </label>
            </div>

            <div className="mt-3 flex gap-3">
              <button type="button" onClick={() => void savePartnerRecord()} disabled={savingPartner || !partnerForm.code.trim() || !partnerForm.name.trim()} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                {savingPartner ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {savingPartner ? 'Saving...' : partnerForm.id ? 'Update Partner' : 'Create Partner'}
              </button>
              {partnerForm.id ? (
                <button type="button" onClick={() => setPartnerForm({ id: '', type: 'FINANCING', code: '', name: '', description: '', website: '', contactEmail: '', apiBaseUrl: '', apiKey: '', apiSecret: '', accessToken: '', metadata: '', isDefault: false, isActive: true })} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
                  Clear
                </button>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-base font-semibold text-gray-900">Saved Partners</h2>
              <p className="text-sm text-gray-500">Financing and insurance partners now run from DB-backed records, including key and secret storage.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Credentials</th>
                    <th className="px-4 py-3 font-medium">Default</th>
                    <th className="px-4 py-3 font-medium">Active</th>
                    <th className="px-4 py-3 font-medium">Requests</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {partnersSnapshotData.map((partner) => (
                    <tr key={partner.id} className="text-gray-700">
                      <td className="px-4 py-3">{partner.type}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{partner.code}</td>
                      <td className="px-4 py-3">
                        <div>{partner.name}</div>
                        <div className="text-xs text-gray-400">{partner.contactEmail || partner.website || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        Key: {partner.hasApiKey ? 'Yes' : 'No'} | Secret: {partner.hasApiSecret ? 'Yes' : 'No'} | Token: {partner.hasAccessToken ? 'Yes' : 'No'}
                      </td>
                      <td className="px-4 py-3">{partner.isDefault ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3">{partner.isActive ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3">{partner.requestCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setPartnerForm({ id: partner.id, type: partner.type, code: partner.code, name: partner.name, description: partner.description || '', website: partner.website || '', contactEmail: partner.contactEmail || '', apiBaseUrl: partner.apiBaseUrl || '', apiKey: partner.apiKey || '', apiSecret: partner.apiSecret || '', accessToken: partner.accessToken || '', metadata: partner.metadata || '', isDefault: partner.isDefault, isActive: partner.isActive })} className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700">
                            Edit
                          </button>
                          <button type="button" onClick={() => void deletePartnerRecord(partner.id)} disabled={deletingPartnerId === partner.id} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-60">
                            {deletingPartnerId === partner.id ? 'Removing...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!partnersSnapshotData.length && (
              <div className="px-4 py-6 text-sm text-gray-500">No partner records found in the database.</div>
            )}
          </section>
        </div>
      ) : isLanguageGroup ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Add Language</h2>
                <p className="text-sm text-gray-500">Create a language row first. The system will create all translation keys in DB for that language.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 md:flex md:items-center md:gap-4">
                <span>Base: <strong className="text-gray-900">{languageSnapshotData?.baseLanguage || 'en'}</strong></span>
                <span>Keys: <strong className="text-gray-900">{languageSnapshotData?.totalKeys || 0}</strong></span>
                <span>Languages: <strong className="text-gray-900">{languageSnapshotData?.languages.length || 0}</strong></span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="text"
                value={languageForm.code}
                onChange={(event) => setLanguageForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="Code (e.g. fr)"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={languageForm.name}
                onChange={(event) => setLanguageForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Language name"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={languageForm.nativeName}
                onChange={(event) => setLanguageForm((prev) => ({ ...prev, nativeName: event.target.value }))}
                placeholder="Native name"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
              <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <span>RTL language</span>
                <input
                  type="checkbox"
                  checked={languageForm.isRtl}
                  onChange={(event) => setLanguageForm((prev) => ({ ...prev, isRtl: event.target.checked }))}
                />
              </label>
            </div>

            <div className="mt-3">
              <button
                type="button"
                onClick={() => void createLanguageRecord()}
                disabled={creatingLanguage || !languageForm.code.trim() || !languageForm.name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingLanguage ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {creatingLanguage ? 'Adding...' : 'Add Language'}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-base font-semibold text-gray-900">Languages In Database</h2>
              <p className="text-sm text-gray-500">Each language has its own one-click translation button. New and old languages both use the same flow.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Native</th>
                    <th className="px-4 py-3 font-medium">Keys</th>
                    <th className="px-4 py-3 font-medium">Direction</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Last Translate</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {(languageSnapshotData?.languages || []).map((language) => (
                    <tr key={language.id} className="text-gray-700">
                      <td className="px-4 py-3 font-semibold text-gray-900">{language.code.toUpperCase()}</td>
                      <td className="px-4 py-3">{language.name}</td>
                      <td className="px-4 py-3">{language.nativeName || '-'}</td>
                      <td className="px-4 py-3">{language.translationCount}</td>
                      <td className="px-4 py-3">{language.isRtl ? 'RTL' : 'LTR'}</td>
                      <td className="px-4 py-3">
                        {language.isDefault ? 'Base' : language.autoTranslateReady ? 'Translated' : 'Pending'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {language.lastTranslatedAt ? new Date(language.lastTranslatedAt).toLocaleString() : 'Not yet'}
                      </td>
                      <td className="px-4 py-3">
                        {language.isDefault ? (
                          <span className="text-xs font-medium text-gray-400">Base language</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void translateSingleLanguage(language.id)}
                            disabled={translatingLanguageId === language.id}
                            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {translatingLanguageId === language.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            {translatingLanguageId === language.id ? 'Translating...' : 'Translate Now'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!languageSnapshotData?.languages?.length && (
              <div className="px-4 py-6 text-sm text-gray-500">No language rows found in the database.</div>
            )}
          </section>
        </div>
      ) : isCurrencyGroup ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Currency Settings</h2>
                <p className="text-sm text-gray-500">Compact inputs for the DB-backed exchange rate configuration.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 md:flex md:items-center md:gap-4">
                <span>Base: <strong className="text-gray-900">{currencySnapshotData?.baseCode || 'USD'}</strong></span>
                <span>Display: <strong className="text-gray-900">{currencySnapshotData?.defaultDisplayCode || 'USD'}</strong></span>
                <span>Status: <strong className="text-gray-900">{currencySnapshotData?.enabled ? 'Enabled' : 'Disabled'}</strong></span>
                <span>Synced: <strong className="text-gray-900">{currencySnapshotData?.lastSyncedAt ? new Date(currencySnapshotData.lastSyncedAt).toLocaleString() : 'Not yet'}</strong></span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {settings.map((item) => (
                <SettingField
                  key={item.key}
                  item={item}
                  value={mergedValues[item.key] ?? ''}
                  onChange={(value) => setValue(item.key, value)}
                  onReset={() => resetSetting(item.key)}
                  resetting={resettingKey === item.key}
                  compact
                />
              ))}
            </div>

            {!isLoading && settings.length === 0 && (
              <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
                No settings found for this group.
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Saved Currency Rates</h2>
                  <p className="text-sm text-gray-500">These rows are being read from the database and shown directly in the admin table.</p>
                </div>
                <div className="text-xs text-gray-500">
                  Showing {allCurrencies.length === 0 ? 0 : (normalizedCurrencyPage - 1) * CURRENCY_PAGE_SIZE + 1}
                  -
                  {Math.min(normalizedCurrencyPage * CURRENCY_PAGE_SIZE, allCurrencies.length)} of {allCurrencies.length}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Symbol</th>
                    <th className="px-4 py-3 font-medium">Rate</th>
                    <th className="px-4 py-3 font-medium">Default</th>
                    <th className="px-4 py-3 font-medium">Active</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedCurrencies.map((currency) => (
                    <tr key={currency.id} className="text-gray-700">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{currency.id}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{currency.code}</td>
                      <td className="px-4 py-3">{currency.name}</td>
                      <td className="px-4 py-3">{currency.symbol}</td>
                      <td className="px-4 py-3">{currency.rate}</td>
                      <td className="px-4 py-3">{currency.isDefault ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3">{currency.isActive ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(currency.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {allCurrencies.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setCurrencyPage((page) => Math.max(1, page - 1))}
                  disabled={normalizedCurrencyPage <= 1}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="text-xs text-gray-500">
                  Page {normalizedCurrencyPage} / {totalCurrencyPages}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrencyPage((page) => Math.min(totalCurrencyPages, page + 1))}
                  disabled={normalizedCurrencyPage >= totalCurrencyPages}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}

            {!allCurrencies.length && (
              <div className="px-4 py-6 text-sm text-gray-500">No currency rows found in the database.</div>
            )}
          </section>
        </div>
      ) : isMediaGroup ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">FFmpeg Verification</h2>
                <p className="text-sm text-gray-500">Use the saved database path or type a new one below, then verify the binary directly from Kaniz Global Trade.</p>
              </div>
              <StatusPill tone={!ffmpegStatus ? 'neutral' : ffmpegStatus.ok ? 'success' : 'danger'}>
                {ffmpegStatus ? (ffmpegStatus.ok ? 'Verified' : 'Last verify failed') : 'Not verified yet'}
              </StatusPill>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-400">Configured path</p>
                    <p className="mt-2 break-all text-sm text-gray-700">{mergedValues.FFMPEG_PATH || 'ffmpeg'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyText(mergedValues.FFMPEG_PATH || 'ffmpeg', 'FFmpeg path')}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">Thumbnail generation</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusPill tone={mergedValues.VIDEO_THUMBNAILS_ENABLED === 'false' ? 'danger' : 'success'}>
                    {mergedValues.VIDEO_THUMBNAILS_ENABLED === 'false' ? 'Disabled' : 'Enabled'}
                  </StatusPill>
                  <span className="text-xs text-gray-500">Controls product video thumbnail generation during upload.</span>
                </div>
              </div>
            </div>

            {ffmpegStatus ? (
              <div className={`mt-4 rounded-xl border p-4 text-sm ${ffmpegStatus.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
                <div className="flex items-start gap-3">
                  {ffmpegStatus.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" /> : <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-semibold">{ffmpegStatus.ok ? 'FFmpeg is ready' : 'FFmpeg verification failed'}</p>
                    <p className="mt-1 break-all">{ffmpegStatus.binary}</p>
                    <p className="mt-1">{ffmpegStatus.message}</p>
                    <p className="mt-2 text-xs opacity-80">Exit code: {ffmpegStatus.code ?? 'n/a'}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            {settings.map((item) => (
              <SettingField
                key={item.key}
                item={item}
                value={mergedValues[item.key] ?? ''}
                onChange={(value) => setValue(item.key, value)}
                onReset={() => resetSetting(item.key)}
                resetting={resettingKey === item.key}
              />
            ))}

            {!isLoading && settings.length === 0 && (
              <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
                No settings found for this group.
              </div>
            )}
          </section>
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
              resetting={resettingKey === item.key}
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
