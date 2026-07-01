'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { get, post, put } from '@/lib/utils/api-client'
import { Loader2 } from 'lucide-react'

type ServiceFeeCategory = {
  id: string
  code: string
  name: string
}

type ServiceFeeSetting = {
  id: string
  code: string
  name: string
  categoryId: string
  feeType: 'PERCENTAGE' | 'FIXED' | 'FREE'
  feeValue: number
  minFee?: number | null
  maxFee?: number | null
  currency: string
  appliesTo: string
  isActive: boolean
  description?: string | null
  category: ServiceFeeCategory
}

type ResponsePayload = {
  categories: ServiceFeeCategory[]
  items: ServiceFeeSetting[]
}

type ServiceFeeForm = {
  id: string
  code: string
  name: string
  categoryId: string
  feeType: 'PERCENTAGE' | 'FIXED' | 'FREE'
  feeValue: number
  minFee: string
  maxFee: string
  currency: string
  appliesTo: string
  isActive: boolean
  description: string
}

const emptyForm: ServiceFeeForm = {
  id: '',
  code: '',
  name: '',
  categoryId: '',
  feeType: 'PERCENTAGE' as const,
  feeValue: 0,
  minFee: '',
  maxFee: '',
  currency: 'USD',
  appliesTo: '',
  isActive: true,
  description: '',
}

export function ServiceFeeSettingsPanel() {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [form, setForm] = useState<ServiceFeeForm>(emptyForm)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-service-fees', statusFilter, categoryFilter],
    queryFn: () =>
      get<ResponsePayload>(
        `/admin/service-fees?status=${statusFilter}${categoryFilter === 'ALL' ? '' : `&categoryId=${categoryFilter}`}`
      ),
  })

  const payload = data?.data as ResponsePayload | undefined
  const categories = payload?.categories || []
  const items = payload?.items || []

  const filteredItems = useMemo(() => items, [items])

  function startEdit(item: ServiceFeeSetting) {
    setForm({
      id: item.id,
      code: item.code,
      name: item.name,
      categoryId: item.categoryId,
      feeType: item.feeType,
      feeValue: item.feeValue,
      minFee: item.minFee == null ? '' : String(item.minFee),
      maxFee: item.maxFee == null ? '' : String(item.maxFee),
      currency: item.currency,
      appliesTo: item.appliesTo,
      isActive: item.isActive,
      description: item.description || '',
    })
  }

  async function save() {
    setSaving(true)
    try {
      await post('/admin/service-fees', {
        ...form,
        minFee: form.minFee === '' ? null : Number(form.minFee),
        maxFee: form.maxFee === '' ? null : Number(form.maxFee),
        feeValue: Number(form.feeValue),
      })
      toast.success(form.id ? 'Service fee updated' : 'Service fee created')
      setForm(emptyForm)
      refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save service fee'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(item: ServiceFeeSetting) {
    setTogglingId(item.id)
    try {
      await put('/admin/service-fees', { id: item.id, isActive: !item.isActive })
      toast.success(item.isActive ? 'Service fee disabled' : 'Service fee enabled')
      refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update service fee status'
      toast.error(message)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Settings / Service Fees</h2>
            <p className="mt-1 text-sm text-gray-500">
              All platform fees are controlled here. Buyers and suppliers only see calculated outputs from these rules.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputCls}>
              <option value="ALL">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={inputCls}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active only</option>
              <option value="INACTIVE">Inactive only</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">Fee settings</h3>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-700" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Bounds</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.code} | {item.appliesTo}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.category.name}</td>
                      <td className="px-4 py-3 text-gray-600">{item.feeType}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {item.feeType === 'PERCENTAGE' ? `${item.feeValue}%` : `${item.currency} ${item.feeValue}`}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        Min: {item.minFee ?? '-'} | Max: {item.maxFee ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => startEdit(item)} className={secondaryButtonCls}>Edit</button>
                          <button type="button" onClick={() => void toggle(item)} disabled={togglingId === item.id} className={secondaryButtonCls}>
                            {togglingId === item.id ? 'Saving...' : item.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredItems.length ? <div className="px-4 py-8 text-sm text-gray-500">No service fees found.</div> : null}
            </div>
          )}
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">{form.id ? 'Edit fee' : 'Create fee'}</h3>
          <div className="mt-4 grid gap-3">
            <input value={form.code} onChange={(e) => setForm((current) => ({ ...current, code: e.target.value }))} placeholder="Code" className={inputCls} />
            <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Name" className={inputCls} />
            <select value={form.categoryId} onChange={(e) => setForm((current) => ({ ...current, categoryId: e.target.value }))} className={inputCls}>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <div className="grid gap-3 md:grid-cols-2">
              <select value={form.feeType} onChange={(e) => setForm((current) => ({ ...current, feeType: e.target.value as typeof form.feeType }))} className={inputCls}>
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed</option>
                <option value="FREE">Free</option>
              </select>
              <input type="number" value={form.feeValue} onChange={(e) => setForm((current) => ({ ...current, feeValue: Number(e.target.value) }))} placeholder="Fee value" className={inputCls} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={form.minFee} onChange={(e) => setForm((current) => ({ ...current, minFee: e.target.value }))} placeholder="Minimum fee" className={inputCls} />
              <input value={form.maxFee} onChange={(e) => setForm((current) => ({ ...current, maxFee: e.target.value }))} placeholder="Maximum fee" className={inputCls} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={form.currency} onChange={(e) => setForm((current) => ({ ...current, currency: e.target.value.toUpperCase() }))} placeholder="Currency" className={inputCls} />
              <input value={form.appliesTo} onChange={(e) => setForm((current) => ({ ...current, appliesTo: e.target.value }))} placeholder="Applies to" className={inputCls} />
            </div>
            <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} placeholder="Description" rows={4} className={inputCls} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.checked }))} />
              Active
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => void save()} disabled={saving} className={primaryButtonCls}>
                {saving ? 'Saving...' : form.id ? 'Update fee' : 'Create fee'}
              </button>
              {form.id ? (
                <button type="button" onClick={() => setForm(emptyForm)} className={secondaryButtonCls}>Cancel</button>
              ) : null}
            </div>
          </div>
        </section>
      </section>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900'
const primaryButtonCls = 'rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60'
const secondaryButtonCls = 'rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-60'
