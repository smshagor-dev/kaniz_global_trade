'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { del, get, put } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

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

const GROUP_MAP: Record<string, string> = {
  payment: 'PAYMENT',
  shipping: 'SHIPPING',
  partners: 'PARTNERS',
  email: 'EMAIL',
  storage: 'STORAGE',
}

export default function AdminSettingsGroupPage() {
  const params = useParams<{ group: string }>()
  const groupSlug = params.group
  const group = GROUP_MAP[groupSlug] || 'PAYMENT'

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin-settings-group', group],
    queryFn: () => get<SettingsResponse>(`/admin/settings?group=${group}`),
  })

  const settings = useMemo(() => ((data?.data as SettingsResponse | undefined)?.items || []), [data?.data])
  const label = (data?.data as SettingsResponse | undefined)?.groupLabel || group
  const [values, setValues] = useState<Record<string, string>>({})

  const mergedValues = settings.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = values[item.key] ?? item.value ?? ''
    return acc
  }, {})

  async function save() {
    await put('/admin/settings', {
      group,
      values: settings.map((item) => ({
        key: item.key,
        value: mergedValues[item.key] ?? '',
      })),
    })
    toast.success('Settings saved')
    refetch()
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
          <p className="text-sm text-gray-500 mt-1">Manage database-backed runtime settings for this integration group.</p>
        </div>
        <button onClick={save} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium">
          Save Changes
        </button>
      </div>

      <div className="space-y-4">
        {settings.map((item) => (
          <div key={item.key} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="font-semibold text-gray-900">{item.label || item.key}</h2>
                <p className="text-xs text-gray-400 mt-1">{item.key}</p>
                {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
              </div>
                      <button
                        onClick={async () => {
                          await del('/admin/settings', { key: item.key })
                          toast.success('Setting reset')
                          refetch()
                        }}
                className="text-xs text-red-600 hover:underline"
              >
                Reset
              </button>
            </div>
            {item.type === 'BOOLEAN' ? (
              <select
                value={mergedValues[item.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                type={item.isSecret || item.type === 'PASSWORD' ? 'password' : item.type === 'NUMBER' ? 'number' : 'text'}
                value={mergedValues[item.key]}
                onChange={(e) => setValues((prev) => ({ ...prev, [item.key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            )}
          </div>
        ))}

        {!isLoading && settings.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">
            No settings found for this group.
          </div>
        )}
      </div>
    </div>
  )
}
