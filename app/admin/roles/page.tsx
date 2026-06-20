'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { get, patch, post } from '@/lib/utils/api-client'

interface PermissionRow {
  id: string
  name: string
  description?: string | null
  module: string
  action: string
}

interface RoleRow {
  id: string
  name: string
  description?: string | null
  isSystem: boolean
  rolePermissions: Array<{
    permission: PermissionRow
  }>
  userRoles: Array<{ id: string }>
}

interface RolesPayload {
  roles: RoleRow[]
  permissions: PermissionRow[]
}

type RoleFormState = {
  name: string
  description: string
  permissionIds: string[]
}

const emptyForm: RoleFormState = {
  name: '',
  description: '',
  permissionIds: [],
}

export default function AdminRolesPage() {
  const qc = useQueryClient()
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyForm)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => get<RolesPayload>('/admin/roles'),
  })

  const payload = data?.data as RolesPayload | undefined
  const roles = useMemo(() => payload?.roles || [], [payload])
  const permissions = useMemo(() => payload?.permissions || [], [payload])

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return roles
    return roles.filter((role) => {
      const haystack = [role.name, role.description || '', ...role.rolePermissions.map(({ permission }) => permission.name)].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [roles, search])

  const selectedRole = useMemo(() => {
    if (!filteredRoles.length && !roles.length) return null
    const activeId = selectedRoleId || filteredRoles[0]?.id || roles[0]?.id || null
    return roles.find((role) => role.id === activeId) || filteredRoles[0] || roles[0] || null
  }, [filteredRoles, roles, selectedRoleId])

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, PermissionRow[]>>((groups, permission) => {
      const moduleName = permission.module
      if (!groups[moduleName]) groups[moduleName] = []
      groups[moduleName].push(permission)
      return groups
    }, {})
  }, [permissions])

  const roleStats = useMemo(() => {
    const totalAssignments = roles.reduce((sum, role) => sum + role.userRoles.length, 0)
    const systemRoles = roles.filter((role) => role.isSystem).length
    return {
      totalRoles: roles.length,
      totalPermissions: permissions.length,
      totalAssignments,
      customRoles: roles.length - systemRoles,
    }
  }, [permissions.length, roles])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modalMode === 'create') {
        return post('/admin/roles', roleForm)
      }
      if (!selectedRole) throw new Error('No role selected')
      return patch(`/admin/roles/${selectedRole.id}`, roleForm)
    },
    onSuccess: () => {
      toast.success(modalMode === 'create' ? 'Role created successfully' : 'Role updated successfully')
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      setModalOpen(false)
      setRoleForm(emptyForm)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Role save failed')
    },
  })

  function openCreateModal() {
    setModalMode('create')
    setRoleForm(emptyForm)
    setModalOpen(true)
  }

  function openEditModal(role: RoleRow) {
    setSelectedRoleId(role.id)
    setModalMode('edit')
    setRoleForm({
      name: role.name,
      description: role.description || '',
      permissionIds: role.rolePermissions.map(({ permission }) => permission.id),
    })
    setModalOpen(true)
  }

  function togglePermission(permissionId: string) {
    setRoleForm((current) => ({
      ...current,
      permissionIds: current.permissionIds.includes(permissionId)
        ? current.permissionIds.filter((id) => id !== permissionId)
        : [...current.permissionIds, permissionId],
    }))
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900 px-6 py-7 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">Access control studio</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Roles & Permissions</h1>
              <p className="mt-3 text-sm leading-6 text-blue-100/85">
                Manage platform access with a cleaner enterprise-style role matrix. Create custom roles, review coverage by module,
                and keep system roles under control without leaving this workspace.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Create new role
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<KeyRound className="h-5 w-5" />} label="Total roles" value={roleStats.totalRoles} tone="blue" />
          <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="Permission catalog" value={roleStats.totalPermissions} tone="emerald" />
          <StatCard icon={<Users className="h-5 w-5" />} label="User assignments" value={roleStats.totalAssignments} tone="amber" />
          <StatCard icon={<Sparkles className="h-5 w-5" />} label="Custom roles" value={roleStats.customRoles} tone="slate" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Role directory</h2>
              <p className="mt-1 text-sm text-slate-500">System and custom access groups in one place.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{filteredRoles.length}</span>
          </div>

          <div className="mt-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search role or permission"
              className={inputCls}
            />
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredRoles.length ? (
              filteredRoles.map((role) => {
                const active = selectedRole?.id === role.id
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`w-full rounded-[22px] border p-4 text-left transition ${
                      active ? 'border-blue-300 bg-blue-50/70 shadow-sm' : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-950">{role.name}</p>
                          {role.isSystem ? <TagPill tone="blue">System</TagPill> : <TagPill tone="orange">Custom</TagPill>}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{role.description || 'No description provided yet.'}</p>
                      </div>
                      <div className={`mt-1 h-2.5 w-2.5 rounded-full ${active ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <span>{role.rolePermissions.length} permissions</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>{role.userRoles.length} users</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                No matching roles found.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {selectedRole ? (
            <>
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{selectedRole.name}</h2>
                      {selectedRole.isSystem ? <TagPill tone="blue">Protected system role</TagPill> : <TagPill tone="orange">Custom role</TagPill>}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {selectedRole.description || 'This role does not have a description yet. Add one to clarify its access scope for your team.'}
                    </p>
                  </div>
                  <button
                    onClick={() => openEditModal(selectedRole)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit role
                  </button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MiniStat label="Assigned users" value={selectedRole.userRoles.length} icon={<Users className="h-4 w-4" />} />
                  <MiniStat label="Enabled permissions" value={selectedRole.rolePermissions.length} icon={<BadgeCheck className="h-4 w-4" />} />
                  <MiniStat label="Coverage" value={`${Math.round((selectedRole.rolePermissions.length / Math.max(permissions.length, 1)) * 100)}%`} icon={<BriefcaseBusiness className="h-4 w-4" />} />
                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">Permission matrix</h3>
                    <p className="mt-1 text-sm text-slate-500">Grouped by module so admins can review access at a glance.</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {selectedRole.rolePermissions.length} active permissions
                  </span>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {Object.entries(groupedPermissions).map(([moduleName, modulePermissions]) => {
                    const activeCount = modulePermissions.filter((permission) =>
                      selectedRole.rolePermissions.some(({ permission: linkedPermission }) => linkedPermission.id === permission.id)
                    ).length

                    return (
                      <div key={moduleName} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-bold capitalize text-slate-950">{formatModuleLabel(moduleName)}</h4>
                            <p className="mt-1 text-sm text-slate-500">
                              {activeCount} of {modulePermissions.length} permissions enabled
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{activeCount}/{modulePermissions.length}</span>
                        </div>

                        <div className="mt-4 space-y-2">
                          {modulePermissions.map((permission) => {
                            const enabled = selectedRole.rolePermissions.some(({ permission: linkedPermission }) => linkedPermission.id === permission.id)
                            return (
                              <div key={permission.id} className={`flex items-start gap-3 rounded-2xl border px-3 py-3 ${enabled ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-white'}`}>
                                <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ${enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900">{permission.name}</p>
                                  <p className="mt-1 text-xs leading-5 text-slate-500">{permission.description || `${formatModuleLabel(moduleName)} ${permission.action} permission`}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
              <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">No role selected</h2>
              <p className="mt-2 text-sm text-slate-500">Choose a role from the left to inspect its permissions and user access.</p>
            </div>
          )}
        </div>
      </section>

      <RoleModal
        open={modalOpen}
        mode={modalMode}
        roleForm={roleForm}
        groupedPermissions={groupedPermissions}
        onClose={() => {
          setModalOpen(false)
          setRoleForm(emptyForm)
        }}
        onChange={setRoleForm}
        onTogglePermission={togglePermission}
        onSubmit={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
        lockName={modalMode === 'edit' && !!selectedRole?.isSystem}
      />
    </div>
  )
}

function RoleModal({
  open,
  mode,
  roleForm,
  groupedPermissions,
  onClose,
  onChange,
  onTogglePermission,
  onSubmit,
  saving,
  lockName,
}: {
  open: boolean
  mode: 'create' | 'edit'
  roleForm: RoleFormState
  groupedPermissions: Record<string, PermissionRow[]>
  onClose: () => void
  onChange: React.Dispatch<React.SetStateAction<RoleFormState>>
  onTogglePermission: (permissionId: string) => void
  onSubmit: () => void
  saving: boolean
  lockName: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.03em] text-slate-950">
              {mode === 'create' ? 'Create new role' : 'Update role permissions'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Build a professional access profile by choosing exactly which modules and actions this role can use.
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Role name">
              <input
                value={roleForm.name}
                onChange={(e) => onChange((current) => ({ ...current, name: e.target.value }))}
                className={inputCls}
                placeholder="e.g. CONTENT_MANAGER"
                disabled={lockName}
              />
              {lockName ? <p className="mt-1 text-xs text-slate-400">System role names are locked to protect platform logic.</p> : null}
            </Field>
            <Field label="Description">
              <input
                value={roleForm.description}
                onChange={(e) => onChange((current) => ({ ...current, description: e.target.value }))}
                className={inputCls}
                placeholder="Short summary of this role's responsibility"
              />
            </Field>
          </div>

          <div className="mt-6 space-y-4">
            {Object.entries(groupedPermissions).map(([moduleName, modulePermissions]) => (
              <div key={moduleName} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold capitalize text-slate-950">{formatModuleLabel(moduleName)}</h3>
                    <p className="mt-1 text-sm text-slate-500">Select the actions this role should be allowed to perform.</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {modulePermissions.filter((permission) => roleForm.permissionIds.includes(permission.id)).length}/{modulePermissions.length}
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {modulePermissions.map((permission) => {
                    const checked = roleForm.permissionIds.includes(permission.id)
                    return (
                      <label
                        key={permission.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                          checked ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onTogglePermission(permission.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{permission.name}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{permission.description || `${formatModuleLabel(moduleName)} ${permission.action}`}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Create role' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'blue' | 'emerald' | 'amber' | 'slate' }) {
  const toneClass =
    tone === 'blue'
      ? 'bg-blue-50 text-blue-700'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-700'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-slate-100 text-slate-700'

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950">{value}</p>
    </div>
  )
}

function MiniStat({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  )
}

function TagPill({ children, tone }: { children: React.ReactNode; tone: 'blue' | 'orange' }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
      {children}
    </span>
  )
}

function formatModuleLabel(moduleName: string) {
  return moduleName.replace(/_/g, ' ')
}

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100 disabled:text-slate-500'
