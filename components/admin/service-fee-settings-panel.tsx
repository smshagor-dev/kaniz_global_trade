'use client'

import { useEffect, useState } from 'react'
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

type FeeDraft = {
  feeType: 'PERCENTAGE' | 'FIXED' | 'FREE'
  feeValue: number
  isActive: boolean
}

export function ServiceFeeSettingsPanel() {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [drafts, setDrafts] = useState<Record<string, FeeDraft>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

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

  useEffect(() => {
    const nextDrafts: Record<string, FeeDraft> = {}
    for (const item of items) {
      nextDrafts[item.id] = {
        feeType: item.feeType,
        feeValue: item.feeValue,
        isActive: item.isActive,
      }
    }
    setDrafts(nextDrafts)
  }, [items])

  function updateDraft(id: string, value: Partial<FeeDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...value,
      },
    }))
  }

  async function saveItem(item: ServiceFeeSetting) {
    const draft = drafts[item.id]
    if (!draft) return

    setSavingId(item.id)
    try {
      await post('/admin/service-fees', {
        id: item.id,
        code: item.code,
        name: item.name,
        categoryId: item.categoryId,
        feeType: draft.feeType,
        feeValue: Number(draft.feeValue),
        minFee: item.minFee ?? null,
        maxFee: item.maxFee ?? null,
        currency: item.currency,
        appliesTo: item.appliesTo,
        isActive: draft.isActive,
        description: item.description ?? null,
      })
      toast.success(`${item.name} updated`)
      setEditingId(null)
      refetch()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save service fee'
      toast.error(message)
    } finally {
      setSavingId(null)
    }
  }

  async function toggle(item: ServiceFeeSetting) {
    const nextActive = !(drafts[item.id]?.isActive ?? item.isActive)
    updateDraft(item.id, { isActive: nextActive })
    setTogglingId(item.id)
    try {
      await put('/admin/service-fees', { id: item.id, isActive: nextActive })
      toast.success(nextActive ? 'Service fee enabled' : 'Service fee disabled')
      refetch()
    } catch (error) {
      updateDraft(item.id, { isActive: item.isActive })
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
              Each fee card can be edited directly from this view. Change the type or amount, then save that section.
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

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Fee settings</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-700" /></div>
        ) : !items.length ? (
          <div className="px-4 py-8 text-sm text-gray-500">No service fees found.</div>
        ) : (
          <div className="grid gap-4 p-4 xl:grid-cols-2">
            {items.map((item) => {
              const draft = drafts[item.id] || {
                feeType: item.feeType,
                feeValue: item.feeValue,
                isActive: item.isActive,
              }
              const isEditing = editingId === item.id

              return (
                <article key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{item.name}</div>
                      <div className="mt-1 text-xs text-gray-500">{item.code} | {item.appliesTo}</div>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${draft.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {draft.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Category</div>
                      <div className="mt-1 text-sm font-medium text-gray-900">{item.category.name}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
                      <button
                        type="button"
                        onClick={() => void toggle(item)}
                        disabled={togglingId === item.id}
                        className="mt-1 text-sm font-medium text-blue-700 disabled:opacity-60"
                      >
                        {togglingId === item.id ? 'Saving...' : draft.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-white p-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">Fee type</label>
                      {isEditing ? (
                        <select
                          value={draft.feeType}
                          onChange={(e) => updateDraft(item.id, { feeType: e.target.value as FeeDraft['feeType'] })}
                          className={inputCls}
                        >
                          <option value="PERCENTAGE">Percentage</option>
                          <option value="FIXED">Fixed</option>
                          <option value="FREE">Free</option>
                        </select>
                      ) : (
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
                          {draft.feeType === 'PERCENTAGE' ? 'Percentage' : draft.feeType === 'FIXED' ? 'Fixed' : 'Free'}
                        </div>
                      )}
                        </div>
                        <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-gray-500">
                        {draft.feeType === 'PERCENTAGE' ? 'Percentage amount' : 'Fixed amount'}
                      </label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={draft.feeValue}
                          onChange={(e) => updateDraft(item.id, { feeValue: Number(e.target.value) })}
                          className={inputCls}
                        />
                      ) : (
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900">
                          {draft.feeType === 'FREE' ? '0' : draft.feeValue} {draft.feeType === 'PERCENTAGE' ? '%' : item.currency}
                        </div>
                      )}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className={secondaryButtonCls}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveItem(item)}
                            disabled={savingId === item.id}
                            className={primaryButtonCls}
                          >
                            {savingId === item.id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {item.description ? (
                    <p className="mt-4 text-sm text-gray-600">{item.description}</p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-500">
                      {draft.feeType === 'PERCENTAGE' ? '%' : item.currency}
                    </div>
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => setEditingId(item.id)}
                        className={secondaryButtonCls}
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900'
const primaryButtonCls = 'rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60'
const secondaryButtonCls = 'rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60'
