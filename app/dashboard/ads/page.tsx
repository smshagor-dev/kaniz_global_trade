'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api, { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { AlertCircle, CreditCard, ImagePlus, Loader2, Megaphone, Rocket, Video, Wallet } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

interface Campaign {
  id: string
  title: string
  placement: string
  budget: number
  bidAmount: number
  spent: number
  status: string
  product?: { id: string; name: string } | null
  paymentStatus?: string | null
  paymentMethod?: string | null
  paymentFailureReason?: string | null
}

interface ProductOption {
  id: string
  name: string
  slug: string
  thumbnailUrl?: string | null
}

interface PaymentMethod {
  key: string
  label: string
  enabled: boolean
  mode: string
}

interface CampaignResponse {
  items: Campaign[]
  products: ProductOption[]
  paymentMethods: PaymentMethod[]
}

interface AdvertisingSettingsResponse {
  enabled: boolean
  autoApprove: boolean
  requireProductLink: boolean
  defaultBudget: number
  defaultBid: number
  minBudget: number
  maxBudget: number
  minBid: number
  maxBid: number
  defaultDurationDays: number
  allowedPlacements: string[]
}

const popupEventType = 'KGT_AD_PAYMENT_RESULT'
const paymentMethodDescriptions: Record<string, string> = {
  STRIPE: 'Card checkout in a secure hosted Stripe popup.',
  SSLCOMMERZ: 'Hosted payment for Bangladesh card and wallet methods.',
  AAMARPAY: 'Hosted aamarPay checkout with local payment rails.',
  NOWPAYMENTS: 'Crypto invoice checkout with hosted confirmation.',
}

function openCenteredPopup(url: string, title: string) {
  if (typeof window === 'undefined') return null
  const width = 720
  const height = 820
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2)
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2)
  return window.open(
    url,
    title,
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  )
}

function isVideoAsset(url: string) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url)
}

export default function SupplierAdsPage() {
  const params = useSearchParams()
  const popupRef = useRef<Window | null>(null)
  const imageUploadRef = useRef<HTMLInputElement | null>(null)
  const videoUploadRef = useRef<HTMLInputElement | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [retryCampaignId, setRetryCampaignId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingCreative, setUploadingCreative] = useState<'image' | 'video' | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('STRIPE')
  const [form, setForm] = useState({
    productId: '',
    title: '',
    placement: 'SEARCH_TOP',
    budget: 0,
    bidAmount: 0,
    targetKeyword: '',
    creativeUrl: '',
    startsAt: '',
    endsAt: '',
  })

  const { data: settingsData } = useQuery({
    queryKey: ['advertising-settings'],
    queryFn: () => get<AdvertisingSettingsResponse>('/ad-campaigns/settings'),
  })

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['supplier-ad-campaigns'],
    queryFn: () => get<CampaignResponse>('/ad-campaigns'),
  })

  const advertisingSettings = settingsData?.data as AdvertisingSettingsResponse | undefined
  const response = data?.data as CampaignResponse | undefined
  const campaigns = response?.items || []
  const products = response?.products || []
  const paymentMethods = response?.paymentMethods || []

  useEffect(() => {
    const productId = params.get('productId') || ''
    const title = params.get('title') || ''
    const creativeUrl = params.get('creativeUrl') || ''
    if (!productId && !title && !creativeUrl) return

    setForm((current) => ({
      ...current,
      productId: productId || current.productId,
      title: title || current.title,
      creativeUrl: creativeUrl || current.creativeUrl,
    }))
  }, [params])

  useEffect(() => {
    if (!advertisingSettings) return

    const today = new Date()
    const end = new Date(today)
    end.setDate(end.getDate() + Math.max(1, advertisingSettings.defaultDurationDays))

    setForm((current) => ({
      ...current,
      placement: advertisingSettings.allowedPlacements.includes(current.placement)
        ? current.placement
        : advertisingSettings.allowedPlacements[0] || current.placement,
      budget: current.budget > 0 ? current.budget : advertisingSettings.defaultBudget,
      bidAmount: current.bidAmount > 0 ? current.bidAmount : advertisingSettings.defaultBid,
      startsAt: current.startsAt || today.toISOString().slice(0, 10),
      endsAt: current.endsAt || end.toISOString().slice(0, 10),
    }))
  }, [advertisingSettings])

  useEffect(() => {
    if (paymentMethods.length && !paymentMethods.some((item) => item.key === selectedPaymentMethod)) {
      setSelectedPaymentMethod(paymentMethods[0].key)
    }
  }, [paymentMethods, selectedPaymentMethod])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const payload = event.data as { type?: string; payment?: string; gateway?: string; campaignId?: string }
      if (payload?.type !== popupEventType) return

      popupRef.current = null
      setIsPaymentModalOpen(false)
      setRetryCampaignId(null)

      if (payload.payment === 'success') toast.success(`Payment confirmed via ${payload.gateway || 'gateway'}`)
      else if (payload.payment === 'cancelled') toast('Payment was cancelled')
      else toast.error('Payment failed. You can retry from the draft campaign row.')

      refetch()
      if (payload.payment === 'success') {
        window.setTimeout(() => { refetch() }, 2500)
        window.setTimeout(() => { refetch() }, 6000)
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [refetch])

  const selectedProduct = products.find((product) => product.id === form.productId) || null
  const selectedRetryCampaign = campaigns.find((campaign) => campaign.id === retryCampaignId) || null
  const isCreativeVideo = isVideoAsset(form.creativeUrl)

  const summary = useMemo(() => ({
    total: campaigns.length,
    active: campaigns.filter((campaign) => campaign.status === 'ACTIVE').length,
    awaitingPayment: campaigns.filter((campaign) => campaign.status === 'DRAFT').length,
    committedBudget: campaigns.reduce((sum, campaign) => sum + Number(campaign.budget || 0), 0),
  }), [campaigns])

  function validateForPayment() {
    if (!advertisingSettings?.enabled) {
      toast.error('Advertising is disabled by Kaniz Global Trade')
      return false
    }

    if (advertisingSettings.requireProductLink && !form.productId) {
      toast.error('Select a linked product first')
      return false
    }

    if (!form.title.trim()) {
      toast.error('Campaign title is required')
      return false
    }

    if (!form.startsAt || !form.endsAt) {
      toast.error('Choose both start and end dates')
      return false
    }

    if (!paymentMethods.length) {
      toast.error('No payment methods are enabled for advertising')
      return false
    }

    return true
  }

  async function uploadCreativeAsset(file: File, type: 'product_image' | 'product_video') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const { data: result } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return result.data.url as string
  }

  async function handleCreativeUpload(file: File, kind: 'image' | 'video') {
    setUploadingCreative(kind)
    try {
      const url = await uploadCreativeAsset(file, kind === 'image' ? 'product_image' : 'product_video')
      setForm((current) => ({ ...current, creativeUrl: url }))
      toast.success(kind === 'image' ? 'Creative image uploaded' : 'Creative video uploaded')
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        `Creative ${kind} upload failed`
      toast.error(message)
    } finally {
      setUploadingCreative(null)
    }
  }

  async function submitNewCampaign() {
    if (!validateForPayment()) return

    setIsSubmitting(true)
    try {
      const response = await post<{ campaign: Campaign; checkoutUrl: string }>('/ad-campaigns', {
        ...form,
        title: form.title.trim(),
        targetKeyword: form.targetKeyword.trim() || undefined,
        creativeUrl: form.creativeUrl.trim() || undefined,
        paymentMethod: selectedPaymentMethod,
      })

      const checkoutUrl = response.data?.checkoutUrl
      const campaignId = response.data?.campaign?.id
      if (!checkoutUrl || !campaignId) throw new Error('Checkout session did not return a popup URL')

      const popup = openCenteredPopup(checkoutUrl, 'AdvertisingPayment')
      if (!popup) {
        window.location.href = checkoutUrl
        return
      }

      popupRef.current = popup
      setIsPaymentModalOpen(false)
      toast.success('Complete payment in the popup window')
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unable to start campaign checkout')
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function retryPayment() {
    if (!retryCampaignId) return

    setIsSubmitting(true)
    try {
      const response = await post<{ checkoutUrl: string }>(`/ad-campaigns/${retryCampaignId}/checkout`, {
        paymentMethod: selectedPaymentMethod,
      })

      const checkoutUrl = response.data?.checkoutUrl
      if (!checkoutUrl) throw new Error('Checkout session did not return a popup URL')

      const popup = openCenteredPopup(checkoutUrl, 'AdvertisingPayment')
      if (!popup) {
        window.location.href = checkoutUrl
        return
      }

      popupRef.current = popup
      setIsPaymentModalOpen(false)
      toast.success('Complete payment in the popup window')
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : 'Unable to reopen campaign checkout')
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function openCreatePaymentModal() {
    if (!validateForPayment()) return
    setRetryCampaignId(null)
    setIsPaymentModalOpen(true)
  }

  function openRetryPaymentModal(campaignId: string) {
    setRetryCampaignId(campaignId)
    setIsPaymentModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9e0f0] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#3157a3]">
              Supplier advertising
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0f172a]">Campaign launch desk</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#475569]">
              Build a campaign, pay for the budget in a popup checkout, and keep every draft, approval, and live placement visible from one screen.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Campaigns', value: summary.total, icon: Megaphone },
              { label: 'Active', value: summary.active, icon: Rocket },
              { label: 'Awaiting payment', value: summary.awaitingPayment, icon: CreditCard },
              { label: 'Budget', value: `$${summary.committedBudget.toLocaleString()}`, icon: Wallet },
            ].map((item) => (
              <div key={item.label} className="rounded-[22px] border border-[#e2e8f0] bg-[#f8fbff] p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#e7efff] text-[#3157a3]">
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-[#0f172a]">{item.value}</p>
                <p className="mt-1 text-xs text-[#64748b]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {advertisingSettings ? (
        <div className={`rounded-[24px] border p-4 text-sm ${advertisingSettings.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
          <p className="font-semibold">{advertisingSettings.enabled ? 'Advertising is enabled' : 'Advertising is disabled by Kaniz Global Trade'}</p>
          <p className="mt-1 text-xs opacity-80">
            Allowed placements: {advertisingSettings.allowedPlacements.join(', ') || 'None'} | Budget {advertisingSettings.minBudget}-{advertisingSettings.maxBudget} | Bid {advertisingSettings.minBid}-{advertisingSettings.maxBid}
          </p>
        </div>
      ) : null}

      <section className="rounded-[28px] border border-[#d9e0f0] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">Create a paid campaign</h2>
            <p className="mt-1 text-sm text-[#64748b]">Campaigns stay in draft until payment completes, then move into approval or active delivery automatically.</p>
          </div>
          {selectedProduct ? (
            <div className="rounded-2xl border border-[#d9e0f0] bg-[#f8fbff] px-4 py-3 text-sm text-[#334155]">
              Linked product: <span className="font-semibold text-[#0f172a]">{selectedProduct.name}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Field label={`Linked product${advertisingSettings?.requireProductLink ? ' *' : ''}`}>
            <select value={form.productId} onChange={(event) => setForm((value) => ({ ...value, productId: event.target.value }))} className={inputCls}>
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Campaign title">
            <input value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="Summer export push" className={inputCls} />
          </Field>
          <Field label="Placement">
            <select value={form.placement} onChange={(event) => setForm((value) => ({ ...value, placement: event.target.value }))} className={inputCls}>
              {(advertisingSettings?.allowedPlacements || ['SEARCH_TOP']).map((placement) => (
                <option key={placement} value={placement}>{placement.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="Target keyword">
            <input value={form.targetKeyword} onChange={(event) => setForm((value) => ({ ...value, targetKeyword: event.target.value }))} placeholder="cotton t-shirt bulk" className={inputCls} />
          </Field>
          <Field label="Budget (USD)">
            <input type="number" value={form.budget} onChange={(event) => setForm((value) => ({ ...value, budget: Number(event.target.value) }))} className={inputCls} />
          </Field>
          <Field label="Bid amount (USD)">
            <input type="number" value={form.bidAmount} onChange={(event) => setForm((value) => ({ ...value, bidAmount: Number(event.target.value) }))} className={inputCls} />
          </Field>
          <Field label="Creative asset URL" className="md:col-span-2">
            <div className="space-y-3">
              <input
                value={form.creativeUrl}
                onChange={(event) => setForm((value) => ({ ...value, creativeUrl: event.target.value }))}
                placeholder="Paste image or video URL"
                className={inputCls}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => imageUploadRef.current?.click()}
                  disabled={uploadingCreative != null}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d9e0f0] bg-white px-4 py-2 text-sm font-medium text-[#334155] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingCreative === 'image' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  Upload image
                </button>
                <button
                  type="button"
                  onClick={() => videoUploadRef.current?.click()}
                  disabled={uploadingCreative != null}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d9e0f0] bg-white px-4 py-2 text-sm font-medium text-[#334155] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingCreative === 'video' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                  Upload video
                </button>
                {form.creativeUrl ? (
                  <button
                    type="button"
                    onClick={() => setForm((value) => ({ ...value, creativeUrl: '' }))}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
                  >
                    Clear asset
                  </button>
                ) : null}
                <input
                  ref={imageUploadRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleCreativeUpload(file, 'image')
                    event.target.value = ''
                  }}
                  disabled={uploadingCreative != null}
                />
                <input
                  ref={videoUploadRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleCreativeUpload(file, 'video')
                    event.target.value = ''
                  }}
                  disabled={uploadingCreative != null}
                />
              </div>
              <p className="text-xs text-[#64748b]">Images and short MP4/WebM/Ogg videos are supported for ad creatives.</p>
              {form.creativeUrl ? (
                <div className="overflow-hidden rounded-[22px] border border-[#d9e0f0] bg-[#f8fbff]">
                  {isCreativeVideo ? (
                    <video src={form.creativeUrl} controls className="aspect-video w-full bg-[#0f172a]" />
                  ) : (
                    <img src={form.creativeUrl} alt="Creative preview" className="max-h-72 w-full object-cover" />
                  )}
                </div>
              ) : null}
            </div>
          </Field>
          <Field label="Campaign dates" className="md:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.startsAt} onChange={(event) => setForm((value) => ({ ...value, startsAt: event.target.value }))} className={inputCls} />
              <input type="date" value={form.endsAt} onChange={(event) => setForm((value) => ({ ...value, endsAt: event.target.value }))} className={inputCls} />
            </div>
          </Field>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreatePaymentModal}
              disabled={advertisingSettings?.enabled === false || !paymentMethods.length}
              className="inline-flex items-center justify-center rounded-2xl bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue to payment
            </button>
            <p className="text-xs text-[#64748b]">Payment opens in a popup and the campaign stays draft until payment succeeds.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#d9e0f0] bg-white shadow-sm">
        <div className="border-b border-[#e2e8f0] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#0f172a]">Campaign activity</h2>
          <p className="mt-1 text-sm text-[#64748b]">Track payment status, approval queue, and live delivery readiness for every ad.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#3157a3]" /></div>
        ) : !campaigns.length ? (
          <div className="px-6 py-12 text-sm text-[#64748b]">No advertising campaigns yet.</div>
        ) : (
          <div className="divide-y divide-[#eef2f7]">
            {campaigns.map((campaign) => (
              <article key={campaign.id} className="px-6 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#0f172a]">{campaign.title}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getCampaignStatusTone(campaign.status)}`}>
                        {campaign.status.replaceAll('_', ' ')}
                      </span>
                      {campaign.paymentStatus ? (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatusTone(campaign.paymentStatus)}`}>
                          Payment {campaign.paymentStatus.replaceAll('_', ' ')}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-[#475569]">
                      {campaign.placement.replaceAll('_', ' ')} · Budget ${campaign.budget.toLocaleString()} · Bid ${campaign.bidAmount.toLocaleString()}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#64748b]">
                      {campaign.product ? <span>Product: {campaign.product.name}</span> : <span>No linked product</span>}
                      {campaign.paymentMethod ? <span>Gateway: {campaign.paymentMethod}</span> : null}
                    </div>
                    {campaign.paymentFailureReason ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {campaign.paymentFailureReason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {campaign.status === 'DRAFT' ? (
                      <button
                        type="button"
                        onClick={() => openRetryPaymentModal(campaign.id)}
                        className="inline-flex items-center justify-center rounded-xl bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Pay now
                      </button>
                    ) : null}
                    <span className="text-xs uppercase tracking-[0.14em] text-[#64748b]">Spent ${campaign.spent.toLocaleString()}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isPaymentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/45 p-4">
          <div className="w-full max-w-2xl rounded-[28px] border border-[#d9e0f0] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Advertising checkout</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#0f172a]">
                  {retryCampaignId ? 'Retry draft campaign payment' : 'Pay before campaign submission'}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#475569]">
                  {retryCampaignId
                    ? 'This campaign stayed in draft because payment did not complete. Choose a gateway and continue.'
                    : 'You will pay the configured campaign budget now. After successful payment, the campaign moves to approval or straight to active delivery.'}
                </p>
              </div>
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="rounded-full border border-[#d9e0f0] px-3 py-1 text-sm text-[#475569]">
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.key}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(method.key)}
                    className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                      selectedPaymentMethod === method.key
                        ? 'border-[#1d4ed8] bg-[#eff6ff]'
                        : 'border-[#d9e0f0] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[#0f172a]">{method.label}</span>
                      <span className="text-xs uppercase tracking-[0.14em] text-[#64748b]">{method.mode}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#475569]">{paymentMethodDescriptions[method.key] || 'Secure hosted checkout.'}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-[24px] border border-[#d9e0f0] bg-[#f8fbff] p-5">
                <p className="text-sm font-semibold text-[#0f172a]">Payment summary</p>
                <div className="mt-4 space-y-3 text-sm text-[#475569]">
                  <div className="flex items-center justify-between gap-3">
                    <span>Campaign</span>
                    <span className="font-semibold text-[#0f172a]">{selectedRetryCampaign?.title || form.title || 'New campaign'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Placement</span>
                    <span className="font-semibold text-[#0f172a]">{(selectedRetryCampaign?.placement || form.placement).replaceAll('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Budget charged now</span>
                    <span className="font-semibold text-[#0f172a]">${Number(selectedRetryCampaign?.budget || form.budget || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Status after payment</span>
                    <span className="font-semibold text-[#0f172a]">{advertisingSettings?.autoApprove ? 'Active' : 'Pending approval'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={retryCampaignId ? retryPayment : submitNewCampaign}
                  disabled={isSubmitting}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#1d4ed8] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {retryCampaignId ? 'Open payment popup' : 'Create draft and open payment'}
                </button>
                <p className="mt-3 flex gap-2 text-xs leading-6 text-[#64748b]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Keep this page open. The popup will report payment success back here automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`space-y-2 text-sm text-[#334155] ${className || ''}`}>
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-2xl border border-[#d9e0f0] bg-white px-3 py-2.5 text-sm text-[#0f172a] outline-none transition focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe]'

function getCampaignStatusTone(status: string) {
  switch (status) {
    case 'ACTIVE': return 'bg-[#dcfce7] text-[#166534]'
    case 'PENDING_APPROVAL': return 'bg-[#fef3c7] text-[#92400e]'
    case 'PAUSED': return 'bg-[#e2e8f0] text-[#334155]'
    case 'COMPLETED': return 'bg-[#dbeafe] text-[#1d4ed8]'
    case 'REJECTED': return 'bg-[#fee2e2] text-[#b91c1c]'
    default: return 'bg-[#f1f5f9] text-[#475569]'
  }
}

function getPaymentStatusTone(status: string) {
  switch (status) {
    case 'PAID': return 'bg-[#dcfce7] text-[#166534]'
    case 'PENDING': return 'bg-[#dbeafe] text-[#1d4ed8]'
    case 'FAILED': return 'bg-[#fee2e2] text-[#b91c1c]'
    case 'CANCELLED': return 'bg-[#fef3c7] text-[#92400e]'
    default: return 'bg-[#f1f5f9] text-[#475569]'
  }
}
