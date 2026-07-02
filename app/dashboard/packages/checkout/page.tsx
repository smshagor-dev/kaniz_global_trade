'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import { CreditCard, ExternalLink, Loader2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface BillingData {
  company: { id: string; name: string } | null
  packageRequired: boolean
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
  paymentMethods: Array<{ key: string; label: string; enabled: boolean; mode: string }>
}

export default function DashboardPackageCheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCycle = searchParams.get('billingCycle') === 'YEARLY' ? 'YEARLY' : 'MONTHLY'
  const planId = searchParams.get('planId') || ''
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>(initialCycle)
  const [activeProvider, setActiveProvider] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['billing-overview', 'package-checkout'],
    queryFn: () => get<BillingData>('/billing'),
  })

  const billing = data?.data
  const company = billing?.company
  const enabledMethods = billing?.paymentMethods.filter((item) => item.enabled) || []
  const checkoutPlan = useMemo(
    () => (billing?.plans || []).find((plan) => plan.id === planId) || null,
    [billing?.plans, planId]
  )

  const activePaymentMethod = useMemo(
    () => enabledMethods.find((method) => method.key === activeProvider) || enabledMethods[0] || null,
    [activeProvider, enabledMethods]
  )

  useEffect(() => {
    if (!enabledMethods.length) {
      setActiveProvider(null)
      return
    }

    if (!activeProvider || !enabledMethods.some((method) => method.key === activeProvider)) {
      setActiveProvider(enabledMethods[0].key)
    }
  }, [activeProvider, enabledMethods])

  useEffect(() => {
    if (!planId) {
      router.replace('/dashboard/packages')
    }
  }, [planId, router])

  const subscribeMutation = useMutation({
    mutationFn: ({ paymentMethod }: { paymentMethod: string }) =>
      post<{ checkoutUrl?: string }>('/subscriptions', {
        companyId: company?.id,
        planId,
        billingCycle,
        paymentMethod,
      }),
    onSuccess: (response) => {
      if (response.data?.checkoutUrl) {
        window.location.href = response.data.checkoutUrl
        return
      }
      toast.success(response.message || 'Package request submitted')
      router.push('/dashboard/packages')
    },
    onError: (error: Error) => toast.error(error.message || 'Package request failed'),
  })

  function getDisplayedPrice() {
    if (!checkoutPlan) return 0
    return Number(billingCycle === 'YEARLY' ? checkoutPlan.yearlyPrice : checkoutPlan.monthlyPrice)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!billing || !company || !checkoutPlan) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Checkout plan was not found. <Link href="/dashboard/packages" className="font-semibold text-blue-700">Return to packages</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard/packages"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Go Back
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-hidden rounded-md border border-slate-300 bg-white">
          <div className="border-b border-slate-200 px-6 py-6 text-center">
            <h1 className="text-3xl font-bold text-slate-950">Secure Checkout</h1>
            <p className="mt-2 text-base text-slate-500">Choose your preferred payment method</p>
          </div>

          <div className="px-6 py-6">
            <div className="flex flex-wrap justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              {enabledMethods.map((method) => {
                const isActive = activePaymentMethod?.key === method.key
                return (
                  <button
                    key={method.key}
                    onClick={() => setActiveProvider(method.key)}
                    className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'bg-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {method.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-8 space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Payment form</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {activePaymentMethod?.key === 'STRIPE'
                        ? 'Enter billing details to continue with secure card checkout.'
                        : `Review and complete the required details for ${activePaymentMethod?.label || 'the selected provider'}.`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                      activePaymentMethod?.mode === 'sandbox'
                        ? 'bg-amber-100 text-amber-700'
                        : activePaymentMethod?.mode === 'live'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {activePaymentMethod?.mode || 'offline'}
                  </span>
                </div>

                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)]">
                  <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${getProviderIconClass(activePaymentMethod?.key || '')}`}>
                          <CreditCard className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{activePaymentMethod?.label || 'Payment provider'}</p>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                            {activePaymentMethod?.mode === 'sandbox'
                              ? 'Test checkout environment'
                              : activePaymentMethod?.mode === 'live'
                                ? 'Live checkout environment'
                                : 'Manual or offline flow'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">VISA</span>
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">MC</span>
                        <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">SECURE</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                          <ShieldCheck className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">Provider-hosted checkout</p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Card, wallet, bank, or crypto details are collected only on the secure {activePaymentMethod?.label || 'payment provider'} page after redirect.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoCard
                        label="Billing company"
                        value={company.name}
                        hint="This package will be applied to the primary supplier company on your account."
                      />
                      <InfoCard
                        label="Gateway environment"
                        value={
                          activePaymentMethod?.mode === 'sandbox'
                            ? 'Sandbox'
                            : activePaymentMethod?.mode === 'live'
                              ? 'Live'
                              : activePaymentMethod?.mode || 'Offline'
                        }
                        hint="Use sandbox mode only for test credentials and callback verification."
                      />
                    </div>

                    <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm leading-6 text-sky-800">
                      Final payment confirmation continues in the hosted checkout window after you click continue. No raw card data is collected on this page.
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => activePaymentMethod && subscribeMutation.mutate({ paymentMethod: activePaymentMethod.key })}
                disabled={!activePaymentMethod || subscribeMutation.isPending}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[linear-gradient(135deg,#22c55e_0%,#16a34a_100%)] px-5 py-4 text-base font-semibold text-white shadow-[0_18px_38px_-24px_rgba(22,163,74,0.55)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_44px_-24px_rgba(22,163,74,0.6)] disabled:translate-y-0 disabled:opacity-60"
              >
                {subscribeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue Payment
                <ExternalLink className="ml-2 h-4 w-4" />
              </button>

              <div className="border-t border-slate-200 pt-4 text-center text-sm text-slate-500">
                Secure payment powered by your selected gateway
              </div>
            </div>
          </div>
        </div>

        <div className="h-fit overflow-hidden rounded-md border border-slate-300 bg-white">
          <div className="bg-sky-500 px-5 py-5 text-white">
            <h2 className="text-2xl font-bold">Your Order</h2>
          </div>

          <div className="space-y-5 px-5 py-5">
            <div className="border-b border-slate-200 pb-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{checkoutPlan.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{checkoutPlan.description || 'Supplier package access'}</p>
                </div>
                <p className="text-lg font-semibold text-sky-500">${getDisplayedPrice().toLocaleString()}</p>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {billingCycle === 'YEARLY' ? 'Quantity: 1 yearly package' : 'Quantity: 1 monthly package'}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-950">${getDisplayedPrice().toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Payment method</span>
                <span className="font-semibold text-slate-950">{activePaymentMethod?.label || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Environment</span>
                <span className="font-semibold text-slate-950">
                  {activePaymentMethod?.mode === 'sandbox'
                    ? 'Sandbox'
                    : activePaymentMethod?.mode === 'live'
                      ? 'Live'
                      : activePaymentMethod?.mode || 'Offline'}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-950">Order Total</span>
                <span className="text-3xl font-bold text-slate-950">${getDisplayedPrice().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getProviderIconClass(provider: string) {
  if (provider === 'STRIPE') return 'bg-violet-100 text-violet-700'
  if (provider === 'SSLCOMMERZ') return 'bg-emerald-100 text-emerald-700'
  if (provider === 'AAMARPAY') return 'bg-amber-100 text-amber-700'
  if (provider === 'NOWPAYMENTS') return 'bg-sky-100 text-sky-700'
  if (provider === 'MANUAL') return 'bg-slate-100 text-slate-700'
  return 'bg-slate-100 text-slate-700'
}

function InfoCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  )
}
