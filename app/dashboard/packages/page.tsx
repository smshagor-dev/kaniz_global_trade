'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import { BadgeCheck, CheckCircle2, Loader2, Shield, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

interface BillingData {
  company: { id: string; name: string } | null
  packageRequired: boolean
  subscription: {
    id: string
    status: string
    billingCycle: string
    currentPeriodEnd: string
    plan: {
      id: string
      slug: string
      name: string
      monthlyPrice: number
      yearlyPrice: number
      maxProducts: number
      maxStaff: number
      analytics: boolean
      verificationBadge: boolean
      featuredCompany: boolean
      isDefault: boolean
    }
    invoices: Array<{
      id: string
      invoiceNumber: string
      total: number
      currency: string
      status: string
      paidAt?: string | null
      createdAt: string
      payments: Array<{ method: string }>
    }>
  } | null
  plans: Array<{
    id: string
    slug: string
    name: string
    description?: string | null
    monthlyPrice: number
    yearlyPrice: number
    maxProducts: number
    maxStaff: number
    analytics: boolean
    verificationBadge: boolean
    featuredCompany: boolean
    isDefault: boolean
    sortOrder: number
  }>
  manualRequests: Array<{
    id: string
    amount: number
    currency: string
    status: string
    createdAt: string
    reviewNotes?: string | null
  }>
  paymentMethods: Array<{ key: string; label: string; enabled: boolean; mode: string }>
}

export default function DashboardPackagesPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const searchParams = useSearchParams()
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')

  const { data, isLoading } = useQuery({
    queryKey: ['billing-overview'],
    queryFn: () => get<BillingData>('/billing'),
  })

  const billing = data?.data
  const company = billing?.company
  const enabledMethods = billing?.paymentMethods.filter((item) => item.enabled) || []
  const selectedPlanSlug = searchParams.get('plan')

  useEffect(() => {
    const payment = searchParams.get('payment')
    const success = searchParams.get('success')
    if (payment === 'success') toast.success('Payment completed successfully')
    if (payment === 'failed') toast.error('Payment failed. Please try again.')
    if (payment === 'cancelled') toast('Payment was cancelled')
    if (success === 'true') toast.success('Payment completed successfully')
  }, [searchParams])

  const subscribeMutation = useMutation({
    mutationFn: ({ planId, paymentMethod }: { planId: string; paymentMethod: string }) =>
      post<{ checkoutUrl?: string }>('/subscriptions', {
        companyId: company?.id,
        planId,
        billingCycle,
        paymentMethod,
      }),
    onSuccess: (response) => {
      toast.success(response.message || 'Package request submitted')
      qc.invalidateQueries({ queryKey: ['billing-overview'] })
      if (response.data?.checkoutUrl) {
        window.location.href = response.data.checkoutUrl
      }
    },
    onError: (error: Error) => toast.error(error.message || 'Package request failed'),
  })

  const currentPlanId = billing?.subscription?.plan.id
  const featuredPlanId = useMemo(() => {
    const allPlans = billing?.plans || []
    const premium = allPlans.find((plan) => plan.slug === 'premium')
    return premium?.id || allPlans[Math.min(2, Math.max(allPlans.length - 1, 0))]?.id
  }, [billing?.plans])

  const plans = useMemo(() => {
    const allPlans = billing?.plans || []
    if (!selectedPlanSlug) return allPlans

    return [...allPlans].sort((a, b) => {
      if (a.slug === selectedPlanSlug) return -1
      if (b.slug === selectedPlanSlug) return 1
      return 0
    })
  }, [billing?.plans, selectedPlanSlug])

  const summary = useMemo(
    () => ({
      invoiceCount: billing?.subscription?.invoices.length || 0,
      pendingManual: billing?.manualRequests.filter((item) => item.status === 'PENDING').length || 0,
    }),
    [billing]
  )

  function getDisplayedPrice(plan: BillingData['plans'][number]) {
    return Number(billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice)
  }

  function handlePlanAction(plan: BillingData['plans'][number]) {
    const amount = getDisplayedPrice(plan)
    if (amount <= 0) {
      subscribeMutation.mutate({ planId: plan.id, paymentMethod: 'STRIPE' })
      return
    }

    router.push(`/dashboard/packages/checkout?planId=${plan.id}&billingCycle=${billingCycle}`)
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94)_48%,rgba(30,64,175,0.92))] px-6 py-7 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.6)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.26),transparent_42%),radial-gradient(circle_at_65%_60%,rgba(96,165,250,0.28),transparent_36%)]" />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Supplier growth</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">Supplier Packages</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
              Choose, activate, or upgrade the package that powers your supplier storefront.
            </p>
          </div>
          {billing?.packageRequired ? (
            <div className="rounded-2xl border border-amber-300/40 bg-amber-300/12 px-4 py-3 text-sm text-amber-100 backdrop-blur">
              Package activation is required before you can access the rest of the supplier dashboard.
            </div>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : !billing || !company ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">
          No company billing profile found.
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 lg:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">Current package</p>
                  <h2 className="mt-1 text-2xl font-bold text-gray-900">
                    {billing.subscription?.plan.name || 'No active package'}
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Status: <span className="font-semibold text-gray-900">{billing.subscription?.status || 'INACTIVE'}</span>
                    {billing.subscription?.currentPeriodEnd
                      ? ` | Renews/ends on ${new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {billing.subscription?.billingCycle || 'MONTHLY'}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Invoices</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{summary.invoiceCount}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Pending Manual Reviews</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{summary.pendingManual}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Available Providers</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{enabledMethods.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <p className="text-sm text-gray-500">Billing cycle</p>
              <div className="mt-4 flex rounded-xl bg-gray-100 p-1">
                {(['MONTHLY', 'YEARLY'] as const).map((cycle) => (
                  <button
                    key={cycle}
                    onClick={() => setBillingCycle(cycle)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      billingCycle === cycle ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {cycle}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-sm font-semibold text-slate-900">Provider selection happens on the checkout page</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  When you click a paid package, a full checkout page opens with the exact amount and all enabled payment providers.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
              {plans.map((plan, index) => {
                const isSelected = selectedPlanSlug === plan.slug
                const isFeatured = plan.id === featuredPlanId
                const palette = getPlanPalette(index, isFeatured)

                return (
                  <div key={plan.id} className={`relative ${isFeatured ? 'z-10 md:-my-2' : ''}`}>
                    {isFeatured ? (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-white/80 bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-800 shadow-sm">
                        Featured
                      </div>
                    ) : null}

                    <div
                      className={`overflow-hidden rounded-[20px] border bg-white transition duration-300 ${
                        currentPlanId === plan.id
                          ? 'border-blue-300 shadow-[0_20px_50px_-34px_rgba(37,99,235,0.38)]'
                          : isSelected
                            ? 'border-amber-300 shadow-[0_20px_50px_-34px_rgba(245,158,11,0.34)]'
                            : 'border-slate-200 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.2)]'
                      } ${isFeatured ? 'scale-[1.03]' : 'hover:-translate-y-2 hover:scale-[1.03]'}`}
                    >
                      <div className="px-6 py-6 text-white" style={{ background: palette }}>
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                          {plan.isDefault ? <Sparkles className="h-4.5 w-4.5 text-white" /> : <Shield className="h-4.5 w-4.5 text-white" />}
                        </div>
                        <div className="mt-5 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl font-bold">{plan.name}</h3>
                              {currentPlanId === plan.id ? (
                                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">Current</span>
                              ) : null}
                              {plan.isDefault ? (
                                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">Default</span>
                              ) : null}
                            </div>
                            <p className="mt-4 text-4xl font-black tracking-[-0.05em]">
                              {getDisplayedPrice(plan) === 0 ? 'Free' : `$${getDisplayedPrice(plan).toLocaleString()}`}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/75">
                              {getDisplayedPrice(plan) === 0
                                ? 'Instant activation'
                                : billingCycle === 'YEARLY'
                                  ? 'Billed yearly'
                                  : 'Billed monthly'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 py-6">
                        <p className="min-h-[48px] text-sm leading-6 text-slate-600">{plan.description}</p>

                        <button
                          onClick={() => handlePlanAction(plan)}
                          disabled={subscribeMutation.isPending}
                          className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition duration-300 ${
                            isFeatured
                              ? 'bg-slate-950 text-white shadow-[0_18px_34px_-22px_rgba(15,23,42,0.42)] hover:bg-orange-600'
                              : 'bg-slate-100 text-slate-900 hover:bg-slate-950 hover:text-white'
                          } disabled:opacity-60`}
                        >
                          {subscribeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {getDisplayedPrice(plan) === 0
                            ? currentPlanId === plan.id
                              ? 'Keep This Package'
                              : 'Activate Free Package'
                            : currentPlanId === plan.id
                              ? 'Renew / Change Package'
                              : 'Buy Package'}
                        </button>

                        <div className="my-6 h-px bg-slate-200" />

                        <div className="space-y-3 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" /> Up to {plan.maxProducts} products
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-600" /> Up to {plan.maxStaff} staff
                          </div>
                          {plan.analytics ? (
                            <div className="flex items-center gap-2">
                              <BadgeCheck className="h-4 w-4 text-purple-600" /> Analytics access
                            </div>
                          ) : null}
                          {plan.verificationBadge ? (
                            <div className="flex items-center gap-2">
                              <BadgeCheck className="h-4 w-4 text-emerald-600" /> Verification badge
                            </div>
                          ) : null}
                          {plan.featuredCompany ? (
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-amber-600" /> Featured company boost
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Invoice History</h3>
                  <span className="text-xs text-gray-500">{billing.subscription?.invoices.length || 0} records</span>
                </div>
                <div className="space-y-3">
                  {(billing.subscription?.invoices || []).map((invoice) => (
                    <div key={invoice.id} className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                          <p className="mt-1 text-sm text-gray-500">
                            {invoice.currency} {Number(invoice.total).toLocaleString()} | {invoice.payments[0]?.method || 'N/A'}
                          </p>
                        </div>
                        <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                          {invoice.status}
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-gray-400">
                        {invoice.paidAt
                          ? `Paid on ${new Date(invoice.paidAt).toLocaleDateString()}`
                          : `Created on ${new Date(invoice.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  ))}
                  {!billing.subscription?.invoices.length ? <p className="text-sm text-gray-500">No invoices yet.</p> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <h3 className="mb-4 font-bold text-gray-900">Manual Payment Requests</h3>
                <div className="space-y-3">
                  {billing.manualRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {request.currency} {Number(request.amount).toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">{new Date(request.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            request.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700'
                              : request.status === 'PAID'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>
                      {request.reviewNotes ? <p className="mt-2 text-sm text-gray-500">{request.reviewNotes}</p> : null}
                    </div>
                  ))}
                  {!billing.manualRequests.length ? <p className="text-sm text-gray-500">No manual payment requests yet.</p> : null}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function getPlanPalette(index: number, featured: boolean) {
  const palettes = [
    'linear-gradient(135deg, #7dd3fc 0%, #38bdf8 52%, #0ea5e9 100%)',
    'linear-gradient(135deg, #2dd4bf 0%, #10b981 52%, #059669 100%)',
    'linear-gradient(135deg, #fb923c 0%, #f97316 56%, #fb7185 100%)',
    'linear-gradient(135deg, #1e3a8a 0%, #2563eb 52%, #312e81 100%)',
  ]

  if (featured) return palettes[2]
  return palettes[index % palettes.length]
}
