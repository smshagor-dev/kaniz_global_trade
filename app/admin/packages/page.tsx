'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Crown, Loader2, Package2, Pencil, Plus, Sparkles, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { get, post, put } from '@/lib/utils/api-client'

type PackageRow = {
  id: string
  name: string
  slug: string
  description?: string | null
  monthlyPrice: number
  yearlyPrice: number
  trialDays: number
  maxProducts: number
  maxStaff: number
  maxImages: number
  featuredProducts: boolean
  featuredCompany: boolean
  verificationBadge: boolean
  analytics: boolean
  priorityRanking: boolean
  apiAccess: boolean
  dedicatedSupport: boolean
  isActive: boolean
  isDefault: boolean
  sortOrder: number
  stripePriceIdMonthly?: string | null
  stripePriceIdYearly?: string | null
  _count: { subscriptions: number }
  activeSubscriptions: number
}

type PackageFormState = {
  name: string
  slug: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  trialDays: number
  maxProducts: number
  maxStaff: number
  maxImages: number
  featuredProducts: boolean
  featuredCompany: boolean
  verificationBadge: boolean
  analytics: boolean
  priorityRanking: boolean
  apiAccess: boolean
  dedicatedSupport: boolean
  isActive: boolean
  isDefault: boolean
  sortOrder: number
}

const emptyForm: PackageFormState = {
  name: '',
  slug: '',
  description: '',
  monthlyPrice: 0,
  yearlyPrice: 0,
  trialDays: 0,
  maxProducts: 10,
  maxStaff: 1,
  maxImages: 5,
  featuredProducts: false,
  featuredCompany: false,
  verificationBadge: false,
  analytics: false,
  priorityRanking: false,
  apiAccess: false,
  dedicatedSupport: false,
  isActive: true,
  isDefault: false,
  sortOrder: 0,
}

export default function AdminPackagesPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<PackageRow | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PackageFormState>(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => get<PackageRow[]>('/admin/packages'),
  })

  const packages = useMemo(() => (data?.data || []) as PackageRow[], [data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return put(`/admin/packages/${editing.id}`, form)
      }
      return post('/admin/packages', form)
    },
    onSuccess: () => {
      toast.success(editing ? 'Package updated' : 'Package created')
      qc.invalidateQueries({ queryKey: ['admin-packages'] })
      closeModal()
    },
    onError: (error: Error) => toast.error(error.message || 'Could not save package'),
  })

  function closeModal() {
    setOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  function openCreate() {
    setEditing(null)
    setForm({
      ...emptyForm,
      sortOrder: packages.length + 1,
      isDefault: !packages.some((item) => item.isDefault),
    })
    setOpen(true)
  }

  function openEdit(item: PackageRow) {
    setEditing(item)
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      monthlyPrice: Number(item.monthlyPrice),
      yearlyPrice: Number(item.yearlyPrice),
      trialDays: item.trialDays,
      maxProducts: item.maxProducts,
      maxStaff: item.maxStaff,
      maxImages: item.maxImages,
      featuredProducts: item.featuredProducts,
      featuredCompany: item.featuredCompany,
      verificationBadge: item.verificationBadge,
      analytics: item.analytics,
      priorityRanking: item.priorityRanking,
      apiAccess: item.apiAccess,
      dedicatedSupport: item.dedicatedSupport,
      isActive: item.isActive,
      isDefault: item.isDefault,
      sortOrder: item.sortOrder,
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Supplier monetization</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Supplier Packages</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Create supplier packages, choose the default onboarding option, and control which package suppliers must buy to start selling.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          Create New
        </button>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : !packages.length ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
            <Package2 className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">No packages created yet</h2>
            <p className="mt-2 text-sm text-slate-500">Create the first supplier package to start onboarding sellers.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Supplier Package</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Pricing</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Limits</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Adoption</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Features</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {packages.map((item) => (
                    <tr key={item.id} className={item.isDefault ? 'bg-amber-50/50' : ''}>
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <Package2 className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-950">{item.name}</p>
                              {item.isDefault ? <Badge tone="amber">Default</Badge> : null}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{item.slug}</p>
                            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{item.description || 'No package description added yet.'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <Badge tone={item.isActive ? 'green' : 'slate'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1 text-sm text-slate-600">
                          <p><span className="font-semibold text-slate-900">Monthly:</span> {Number(item.monthlyPrice) === 0 ? 'Free' : `$${Number(item.monthlyPrice).toFixed(2)}`}</p>
                          <p><span className="font-semibold text-slate-900">Yearly:</span> {Number(item.yearlyPrice) === 0 ? 'Free' : `$${Number(item.yearlyPrice).toFixed(2)}`}</p>
                          <p><span className="font-semibold text-slate-900">Trial:</span> {item.trialDays} days</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1 text-sm text-slate-600">
                          <p><span className="font-semibold text-slate-900">Products:</span> {item.maxProducts >= 999999 ? 'Unlimited' : item.maxProducts}</p>
                          <p><span className="font-semibold text-slate-900">Staff:</span> {item.maxStaff}</p>
                          <p><span className="font-semibold text-slate-900">Images:</span> {item.maxImages}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="space-y-1 text-sm text-slate-600">
                          <p><span className="font-semibold text-slate-900">Active:</span> {item.activeSubscriptions}</p>
                          <p><span className="font-semibold text-slate-900">Total:</span> {item._count.subscriptions}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex max-w-xs flex-wrap gap-2">
                          <Feature enabled={item.featuredProducts}>Featured products</Feature>
                          <Feature enabled={item.featuredCompany}>Featured company</Feature>
                          <Feature enabled={item.verificationBadge}>Badge</Feature>
                          <Feature enabled={item.analytics}>Analytics</Feature>
                          <Feature enabled={item.priorityRanking}>Ranking</Feature>
                          <Feature enabled={item.apiAccess}>API</Feature>
                          <Feature enabled={item.dedicatedSupport}>Support</Feature>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-right">
                        <button
                          onClick={() => openEdit(item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {open ? (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-[2px]">
          <div className="flex min-h-full items-center justify-center py-4">
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">{editing ? 'Edit Package' : 'Create Package'}</h2>
                <p className="mt-1 text-sm text-slate-500">Configure how supplier onboarding, limits, and package upsells should behave.</p>
              </div>
              <button
                onClick={closeModal}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Package name"><input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className={inputCls} /></Field>
              <Field label="Slug"><input value={form.slug} onChange={(e) => setForm((current) => ({ ...current, slug: e.target.value }))} className={inputCls} /></Field>
              <Field label="Monthly price"><input type="number" min="0" step="0.01" value={form.monthlyPrice} onChange={(e) => setForm((current) => ({ ...current, monthlyPrice: Number(e.target.value) }))} className={inputCls} /></Field>
              <Field label="Yearly price"><input type="number" min="0" step="0.01" value={form.yearlyPrice} onChange={(e) => setForm((current) => ({ ...current, yearlyPrice: Number(e.target.value) }))} className={inputCls} /></Field>
              <Field label="Trial days"><input type="number" min="0" value={form.trialDays} onChange={(e) => setForm((current) => ({ ...current, trialDays: Number(e.target.value) }))} className={inputCls} /></Field>
              <Field label="Sort order"><input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm((current) => ({ ...current, sortOrder: Number(e.target.value) }))} className={inputCls} /></Field>
              <Field label="Max products"><input type="number" min="1" value={form.maxProducts} onChange={(e) => setForm((current) => ({ ...current, maxProducts: Number(e.target.value) }))} className={inputCls} /></Field>
              <Field label="Max staff"><input type="number" min="1" value={form.maxStaff} onChange={(e) => setForm((current) => ({ ...current, maxStaff: Number(e.target.value) }))} className={inputCls} /></Field>
              <Field label="Max images / product"><input type="number" min="1" value={form.maxImages} onChange={(e) => setForm((current) => ({ ...current, maxImages: Number(e.target.value) }))} className={inputCls} /></Field>
              <Field label="Description" className="md:col-span-2">
                <textarea rows={4} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} className={inputCls} />
              </Field>

              <div className="md:col-span-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Toggle checked={form.isActive} label="Package active" onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))} />
                <Toggle checked={form.isDefault} label="Default package" onChange={(checked) => setForm((current) => ({ ...current, isDefault: checked }))} />
                <Toggle checked={form.featuredProducts} label="Featured products" onChange={(checked) => setForm((current) => ({ ...current, featuredProducts: checked }))} />
                <Toggle checked={form.featuredCompany} label="Featured company" onChange={(checked) => setForm((current) => ({ ...current, featuredCompany: checked }))} />
                <Toggle checked={form.verificationBadge} label="Verification badge" onChange={(checked) => setForm((current) => ({ ...current, verificationBadge: checked }))} />
                <Toggle checked={form.analytics} label="Analytics access" onChange={(checked) => setForm((current) => ({ ...current, analytics: checked }))} />
                <Toggle checked={form.priorityRanking} label="Priority ranking" onChange={(checked) => setForm((current) => ({ ...current, priorityRanking: checked }))} />
                <Toggle checked={form.apiAccess} label="API access" onChange={(checked) => setForm((current) => ({ ...current, apiAccess: checked }))} />
                <Toggle checked={form.dedicatedSupport} label="Dedicated support" onChange={(checked) => setForm((current) => ({ ...current, dedicatedSupport: checked }))} />
              </div>
            </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5">
              <button onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {saveMutation.isPending ? 'Saving...' : editing ? 'Update Package' : 'Create Package'}
              </button>
            </div>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'green' | 'amber' | 'slate' }) {
  const toneClass = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>
}

function Feature({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${enabled ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
      {enabled ? <Sparkles className="h-3.5 w-3.5" /> : <Package2 className="h-3.5 w-3.5" />}
      {children}
    </span>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${checked ? 'border-blue-200 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${checked ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
        {checked ? <Check className="h-3.5 w-3.5" /> : <Crown className="h-3.5 w-3.5" />}
      </span>
    </button>
  )
}

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100'
