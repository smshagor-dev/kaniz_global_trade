'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { get, post } from '@/lib/utils/api-client'
import { useHasRole } from '@/store/auth'
import { Loader2, Plus, Settings, ShieldCheck } from 'lucide-react'

type SettingsPayload = {
  roles: Array<{
    id: string
    name: string
    dashboardAccess: string[]
  }>
  availableSections: Array<{
    key: string
    label: string
    href: string
  }>
}

type RoleForm = {
  name: string
  dashboardAccess: string[]
}

export default function DashboardSettingsPage() {
  const queryClient = useQueryClient()
  const isOwner = useHasRole('SUPPLIER_OWNER')
  const [settingsMenu, setSettingsMenu] = useState('role-permissions')
  const [roleForm, setRoleForm] = useState<RoleForm>({
    name: '',
    dashboardAccess: ['overview'],
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['company-staff-roles'],
    queryFn: () => get<SettingsPayload>('/company-staff/roles'),
  })

  const payload = data?.data
  const roles = payload?.roles || []
  const availableSections = payload?.availableSections || []

  const createRoleMutation = useMutation({
    mutationFn: () => post('/company-staff/roles', roleForm),
    onSuccess: (response) => {
      toast.success(response.message || 'Staff role created successfully')
      setRoleForm({
        name: '',
        dashboardAccess: ['overview'],
      })
      queryClient.invalidateQueries({ queryKey: ['company-staff-roles'] })
      queryClient.invalidateQueries({ queryKey: ['company-staff'] })
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create staff role'
      toast.error(message)
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !payload) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
        Settings could not be loaded right now.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/75">Supplier Settings</p>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold">
              <Settings className="h-8 w-8 text-sky-300" />
              Settings & Role Permissions
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              Create company staff roles here, then assign those roles while creating staff accounts.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Company Roles</p>
              <p className="mt-2 text-2xl font-bold">{roles.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Available Sections</p>
              <p className="mt-2 text-2xl font-bold">{availableSections.length}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-gray-700">Settings Menu</span>
              <select value={settingsMenu} onChange={(e) => setSettingsMenu(e.target.value)} className={inputCls}>
                <option value="role-permissions">Role Permissions</option>
              </select>
            </label>
          </div>

          {settingsMenu === 'role-permissions' ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-100 bg-slate-50 p-5">
                <h2 className="text-xl font-bold text-gray-900">Role Permissions</h2>
                <p className="mt-1 text-sm text-gray-500">These roles are company-specific. Staff creation will only assign one of these roles.</p>
              </div>

              {isOwner ? (
                <div className="rounded-3xl border border-gray-100 p-5">
                  <div className="mb-5">
                    <h3 className="text-lg font-bold text-gray-900">Create Role</h3>
                    <p className="mt-1 text-sm text-gray-500">Choose the supplier dashboard menus this role can access.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Role Name">
                      <input value={roleForm.name} onChange={(e) => setRoleForm((current) => ({ ...current, name: e.target.value }))} className={inputCls} placeholder="Sales Staff" />
                    </Field>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm font-semibold text-gray-900">Dashboard Menus</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {availableSections.map((section) => {
                        const checked = roleForm.dashboardAccess.includes(section.key)
                        return (
                          <label key={section.key} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${checked ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setRoleForm((current) => ({
                                  ...current,
                                  dashboardAccess: e.target.checked
                                    ? [...current.dashboardAccess, section.key]
                                    : current.dashboardAccess.filter((key) => key !== section.key),
                                }))
                              }}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-500"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{section.label}</p>
                              <p className="mt-1 text-xs text-gray-500">{section.href}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => createRoleMutation.mutate()}
                      disabled={createRoleMutation.isPending}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                    >
                      {createRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Create Role
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                  Only supplier owners can create role permissions.
                </div>
              )}

              <div className="overflow-hidden rounded-3xl border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <th className="px-5 py-4">Role Name</th>
                        <th className="px-5 py-4">Accessible Menus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {roles.map((role) => (
                        <tr key={role.id} className="align-top text-sm text-gray-600">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-blue-700" />
                              <span className="font-semibold text-gray-900">{role.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex max-w-2xl flex-wrap gap-2">
                              {role.dashboardAccess.map((sectionKey) => {
                                const section = availableSections.find((item) => item.key === sectionKey)
                                return (
                                  <span key={sectionKey} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                    {section?.label || sectionKey}
                                  </span>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {!roles.length ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                  No company staff roles created yet.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-400'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</span>
      {children}
    </label>
  )
}
