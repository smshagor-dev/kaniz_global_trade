'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { post } from '@/lib/utils/api-client'
import { LoadingButton } from '@/components/ui/loading-button'
import { useCurrentUser, useIsAdmin, useIsAuthenticated, useIsBuyer } from '@/store/auth'

type Option = {
  id: string
  name: string
  code?: string | null
  symbol?: string | null
}

export function RFQCreateForm({
  categories,
  countries,
  currencies,
}: {
  categories: Option[]
  countries: Option[]
  currencies: Option[]
}) {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const isAuthenticated = useIsAuthenticated()
  const isBuyer = useIsBuyer()
  const isAdmin = useIsAdmin()
  const user = useCurrentUser()
  const [form, setForm] = useState({
    categoryId: '',
    productName: '',
    quantity: '',
    unit: 'Pieces',
    destinationCountryId: '',
    budget: '',
    currencyId: currencies[0]?.id || '',
    requiredDate: '',
    description: '',
    isPublic: true,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!hydrated) return

    if (!isAuthenticated) {
      toast.error('Please sign in as a buyer to post an RFQ')
      router.push('/auth/login?redirect=/rfqs/create')
      return
    }

    if (!isBuyer && !isAdmin) {
      toast.error('Only buyer or Kaniz Global Trade team accounts can create RFQs')
      return
    }

    setLoading(true)
    try {
      await post('/rfqs', {
        ...form,
        categoryId: form.categoryId || undefined,
        destinationCountryId: form.destinationCountryId || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
      })
      toast.success('RFQ submitted successfully')
      router.push('/rfqs')
      router.refresh()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to submit RFQ'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)]">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Product name">
          <input
            required
            value={form.productName}
            onChange={(event) => update('productName', event.target.value)}
            placeholder="e.g. Cotton T-shirt, Solar panel, Packaging box"
            className={inputCls}
          />
        </Field>
        <Field label="Category">
          <select value={form.categoryId} onChange={(event) => update('categoryId', event.target.value)} className={inputCls}>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Quantity">
          <input
            required
            value={form.quantity}
            onChange={(event) => update('quantity', event.target.value)}
            placeholder="e.g. 1000"
            className={inputCls}
          />
        </Field>
        <Field label="Unit">
          <input value={form.unit} onChange={(event) => update('unit', event.target.value)} className={inputCls} />
        </Field>
        <Field label="Destination country">
          <select value={form.destinationCountryId} onChange={(event) => update('destinationCountryId', event.target.value)} className={inputCls}>
            <option value="">Select destination country</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>{country.name}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_160px]">
          <Field label="Budget">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.budget}
              onChange={(event) => update('budget', event.target.value)}
              placeholder="Optional"
              className={inputCls}
            />
          </Field>
          <Field label="Currency">
            <select value={form.currencyId} onChange={(event) => update('currencyId', event.target.value)} className={inputCls}>
              {currencies.map((currency) => (
                <option key={currency.id} value={currency.id}>
                  {currency.code} {currency.symbol || ''}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <Field label="Required by">
        <input
          type="date"
          value={form.requiredDate}
          onChange={(event) => update('requiredDate', event.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Requirements">
        <textarea
          rows={6}
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder="Share material, quality, packing, shipping, compliance, or customization requirements..."
          className={`${inputCls} min-h-[140px] resize-y`}
        />
      </Field>

      <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={form.isPublic}
          onChange={(event) => update('isPublic', event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
        />
        Make this RFQ visible to matching suppliers
      </label>

      <LoadingButton
        type="submit"
        loading={loading}
        loadingText="Submitting RFQ..."
        disabled={!hydrated || !isAuthenticated || (!isBuyer && !isAdmin)}
        className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 text-sm font-semibold text-white shadow-[0_18px_34px_-18px_rgba(249,115,22,0.7)]"
      >
        Submit RFQ
      </LoadingButton>
      {hydrated && isAuthenticated && !isBuyer && !isAdmin ? (
        <p className="text-sm text-amber-700">
          Signed in as {user?.firstName} {user?.lastName}. Switch to a buyer or Kaniz Global Trade team account to submit this RFQ.
        </p>
      ) : null}
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100'
