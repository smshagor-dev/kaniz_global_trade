'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import { AlertCircle, BadgeCheck, CheckCircle2, CreditCard, Loader2, Shield } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

interface BillingData {
  company: { id: string; name: string } | null
  subscription: {
    id: string
    status: string
    billingCycle: string
    currentPeriodStart: string
    currentPeriodEnd: string
    plan: { id: string; name: string; monthlyPrice: number; yearlyPrice: number; maxProducts: number; maxStaff: number; analytics: boolean; verificationBadge: boolean; featuredCompany: boolean }
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
    name: string
    description?: string | null
    monthlyPrice: number
    yearlyPrice: number
    maxProducts: number
    maxStaff: number
    analytics: boolean
    verificationBadge: boolean
    featuredCompany: boolean
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

export default function DashboardSubscriptionPage() {
  const qc = useQueryClient()
  const searchParams = useSearchParams()
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [paymentMethod, setPaymentMethod] = useState('STRIPE')

  const { data, isLoading } = useQuery({
    queryKey: ['billing-overview'],
    queryFn: () => get<BillingData>('/billing'),
  })

  const billing = data?.data
  const company = billing?.company
  const enabledMethods = billing?.paymentMethods.filter((item) => item.enabled) || []

  useEffect(() => {
    const payment = searchParams.get('payment')
    if (payment === 'success') toast.success('Payment completed successfully')
    if (payment === 'failed') toast.error('Payment failed. Please try again.')
    if (payment === 'cancelled') toast('Payment was cancelled')
  }, [searchParams])

  useEffect(() => {
    if (enabledMethods.length && !enabledMethods.some((item) => item.key === paymentMethod)) {
      setPaymentMethod(enabledMethods[0].key)
    }
  }, [enabledMethods, paymentMethod])

  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => post<{ checkoutUrl?: string }>('/subscriptions', {
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
      toast.success(response.message || 'Subscription request submitted')
      qc.invalidateQueries({ queryKey: ['billing-overview'] })
    },
    onError: (error: Error) => toast.error(error.message || 'Subscription request failed'),
  })

  const currentPlanId = billing?.subscription?.plan.id
  const summary = useMemo(() => ({
    invoiceCount: billing?.subscription?.invoices.length || 0,
    pendingManual: billing?.manualRequests.filter((item) => item.status === 'PENDING').length || 0,
  }), [billing])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription & Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your plan, payment method, and invoice history from one place.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : !billing || !company ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-500">No company billing profile found.</div>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 lg:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">Current subscription</p>
                  <h2 className="text-2xl font-bold text-gray-900 mt-1">{billing.subscription?.plan.name || 'No active plan'}</h2>
                  <p className="text-sm text-gray-500 mt-2">
                    Status: <span className="font-semibold text-gray-900">{billing.subscription?.status || 'INACTIVE'}</span>
                    {billing.subscription?.currentPeriodEnd ? ` | Renews/ends on ${new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                  {billing.subscription?.billingCycle || 'MONTHLY'}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 mt-5">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Invoices</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{summary.invoiceCount}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Pending Manual Reviews</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{summary.pendingManual}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Primary Method</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{paymentMethod}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-sm text-gray-500">Checkout settings</p>
              <div className="flex rounded-xl bg-gray-100 p-1 mt-4">
                {(['MONTHLY', 'YEARLY'] as const).map((cycle) => (
                  <button
                    key={cycle}
                    onClick={() => setBillingCycle(cycle)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${billingCycle === cycle ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                  >
                    {cycle}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {enabledMethods.map((method) => (
                  <button
                    key={method.key}
                    onClick={() => setPaymentMethod(method.key)}
                    className={`w-full flex items-center justify-between rounded-xl border px-3 py-3 text-left ${paymentMethod === method.key ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-900"><CreditCard className="w-4 h-4" /> {method.label}</span>
                    <span className="text-xs uppercase text-gray-500">{method.mode}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-2 gap-6">
            <div className="space-y-4">
              {billing.plans.map((plan) => (
                <div key={plan.id} className={`bg-white border rounded-2xl p-5 ${currentPlanId === plan.id ? 'border-blue-300 shadow-sm' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                        {currentPlanId === plan.id && <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">Current</span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        ${Number(billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{billingCycle === 'YEARLY' ? 'per year' : 'per month'}</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 mt-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> Up to {plan.maxProducts} products</div>
                    <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" /> Up to {plan.maxStaff} staff</div>
                    {plan.analytics && <div className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-purple-600" /> Analytics access</div>}
                    {plan.verificationBadge && <div className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-emerald-600" /> Verification badge</div>}
                    {plan.featuredCompany && <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-600" /> Featured company boost</div>}
                  </div>
                  <button
                    onClick={() => subscribeMutation.mutate(plan.id)}
                    disabled={subscribeMutation.isPending}
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                  >
                    {subscribeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {paymentMethod === 'MANUAL' ? 'Submit Manual Request' : currentPlanId === plan.id ? 'Renew / Change Plan' : 'Choose Plan'}
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Invoice History</h3>
                  <span className="text-xs text-gray-500">{billing.subscription?.invoices.length || 0} records</span>
                </div>
                <div className="space-y-3">
                  {(billing.subscription?.invoices || []).map((invoice) => (
                    <div key={invoice.id} className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {invoice.currency} {Number(invoice.total).toLocaleString()} | {invoice.payments[0]?.method || 'N/A'}
                          </p>
                        </div>
                        <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">{invoice.status}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        {invoice.paidAt ? `Paid on ${new Date(invoice.paidAt).toLocaleDateString()}` : `Created on ${new Date(invoice.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  ))}
                  {!billing.subscription?.invoices.length && <p className="text-sm text-gray-500">No invoices yet.</p>}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="font-bold text-gray-900 mb-4">Manual Payment Requests</h3>
                <div className="space-y-3">
                  {billing.manualRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border border-gray-100 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{request.currency} {Number(request.amount).toLocaleString()}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(request.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${request.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : request.status === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {request.status}
                        </span>
                      </div>
                      {request.reviewNotes && <p className="text-sm text-gray-500 mt-2">{request.reviewNotes}</p>}
                    </div>
                  ))}
                  {!billing.manualRequests.length && <p className="text-sm text-gray-500">No manual payment requests yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
