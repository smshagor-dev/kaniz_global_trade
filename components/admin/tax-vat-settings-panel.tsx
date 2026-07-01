'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { get, post, put } from '@/lib/utils/api-client'
import { Loader2 } from 'lucide-react'

type TaxRule = {
  id: string
  code: string
  country: string
  stateRegion?: string | null
  taxName: string
  taxRate: number
  taxType: 'VAT' | 'GST' | 'SALES_TAX' | 'WITHHOLDING' | 'OTHER'
  applicationMode: 'INCLUSIVE' | 'EXCLUSIVE'
  appliesToBuyer: boolean
  appliesToSupplier: boolean
  appliesToServiceFee: boolean
  appliesToSubscription: boolean
  isActive: boolean
}

type TaxForm = {
  id: string
  code: string
  country: string
  stateRegion: string
  taxName: string
  taxRate: number
  taxType: 'VAT' | 'GST' | 'SALES_TAX' | 'WITHHOLDING' | 'OTHER'
  applicationMode: 'INCLUSIVE' | 'EXCLUSIVE'
  appliesToBuyer: boolean
  appliesToSupplier: boolean
  appliesToServiceFee: boolean
  appliesToSubscription: boolean
  isActive: boolean
}

const emptyForm: TaxForm = {
  id: '',
  code: '',
  country: '',
  stateRegion: '',
  taxName: '',
  taxRate: 0,
  taxType: 'VAT' as const,
  applicationMode: 'EXCLUSIVE' as const,
  appliesToBuyer: true,
  appliesToSupplier: false,
  appliesToServiceFee: true,
  appliesToSubscription: true,
  isActive: true,
}

export function TaxVatSettingsPanel() {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [form, setForm] = useState<TaxForm>(emptyForm)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-tax-vat', statusFilter],
    queryFn: () => get<TaxRule[]>(`/admin/tax-vat?status=${statusFilter}`),
  })

  const items = (data?.data as TaxRule[] | undefined) || []

  function startEdit(item: TaxRule) {
    setForm({
      id: item.id,
      code: item.code,
      country: item.country,
      stateRegion: item.stateRegion || '',
      taxName: item.taxName,
      taxRate: item.taxRate,
      taxType: item.taxType,
      applicationMode: item.applicationMode,
      appliesToBuyer: item.appliesToBuyer,
      appliesToSupplier: item.appliesToSupplier,
      appliesToServiceFee: item.appliesToServiceFee,
      appliesToSubscription: item.appliesToSubscription,
      isActive: item.isActive,
    })
  }

  async function save() {
    setSaving(true)
    try {
      await post('/admin/tax-vat', {
        ...form,
        stateRegion: form.stateRegion || null,
      })
      toast.success(form.id ? 'Tax rule updated' : 'Tax rule created')
      setForm(emptyForm)
      refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save tax rule'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(item: TaxRule) {
    setTogglingId(item.id)
    try {
      await put('/admin/tax-vat', { id: item.id, isActive: !item.isActive })
      toast.success(item.isActive ? 'Tax rule disabled' : 'Tax rule enabled')
      refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update tax rule'
      toast.error(message)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Settings / Tax & VAT</h2>
            <p className="mt-1 text-sm text-gray-500">
              Tax rules are version-safe and only affect new calculations. Old snapshots remain unchanged.
            </p>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={inputCls}>
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active only</option>
            <option value="INACTIVE">Inactive only</option>
          </select>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-base font-semibold text-gray-900">Tax rules</h3>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-700" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Rule</th>
                    <th className="px-4 py-3">Geo</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{item.taxName}</div>
                        <div className="text-xs text-gray-500">{item.code} | {item.taxType}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.country}{item.stateRegion ? ` / ${item.stateRegion}` : ''}</td>
                      <td className="px-4 py-3 text-gray-600">{item.taxRate}%</td>
                      <td className="px-4 py-3 text-gray-600">{item.applicationMode}</td>
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
              {!items.length ? <div className="px-4 py-8 text-sm text-gray-500">No tax rules found.</div> : null}
            </div>
          )}
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">{form.id ? 'Edit tax rule' : 'Create tax rule'}</h3>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <input value={form.code} onChange={(e) => setForm((current) => ({ ...current, code: e.target.value }))} placeholder="Code" className={inputCls} />
              <input value={form.taxName} onChange={(e) => setForm((current) => ({ ...current, taxName: e.target.value }))} placeholder="Tax name" className={inputCls} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={form.country} onChange={(e) => setForm((current) => ({ ...current, country: e.target.value }))} placeholder="Country" className={inputCls} />
              <input value={form.stateRegion} onChange={(e) => setForm((current) => ({ ...current, stateRegion: e.target.value }))} placeholder="State / region" className={inputCls} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <input type="number" value={form.taxRate} onChange={(e) => setForm((current) => ({ ...current, taxRate: Number(e.target.value) }))} placeholder="Tax rate" className={inputCls} />
              <select value={form.taxType} onChange={(e) => setForm((current) => ({ ...current, taxType: e.target.value as typeof form.taxType }))} className={inputCls}>
                <option value="VAT">VAT</option>
                <option value="GST">GST</option>
                <option value="SALES_TAX">Sales Tax</option>
                <option value="WITHHOLDING">Withholding</option>
                <option value="OTHER">Other</option>
              </select>
              <select value={form.applicationMode} onChange={(e) => setForm((current) => ({ ...current, applicationMode: e.target.value as typeof form.applicationMode }))} className={inputCls}>
                <option value="EXCLUSIVE">Exclusive</option>
                <option value="INCLUSIVE">Inclusive</option>
              </select>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {[
                ['appliesToBuyer', 'Applies to buyer'],
                ['appliesToSupplier', 'Applies to supplier'],
                ['appliesToServiceFee', 'Applies to service fee'],
                ['appliesToSubscription', 'Applies to subscription'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.checked }))} />
              Active
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => void save()} disabled={saving} className={primaryButtonCls}>
                {saving ? 'Saving...' : form.id ? 'Update rule' : 'Create rule'}
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
