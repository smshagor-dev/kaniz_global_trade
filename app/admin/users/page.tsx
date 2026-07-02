'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  CheckCircle2,
  CircleAlert,
  Loader2,
  MailCheck,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { del, get, patch, post } from '@/lib/utils/api-client'

interface UserRecord {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string | null
  avatar?: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'
  emailVerified?: string | null
  lastLoginAt?: string | null
  createdAt: string
  updatedAt: string
  roles: Array<{ role: { name: string } }>
  companyUsers: Array<{ company: { id: string; name: string } }>
  kycProfile?: {
    id: string
    status: string
    reviewedAt?: string | null
  } | null
  b2bCompanyOwned?: {
    id: string
    companyName: string
    companyType: string
    buyerVerificationStatus: string
    supplierVerificationStatus: string
  } | null
}

interface RoleOption {
  id: string
  name: string
}

interface RolesPayload {
  roles: RoleOption[]
}

type UserFormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'
  emailVerified: boolean
  roles: string[]
}

const emptyForm: UserFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  status: 'ACTIVE',
  emailVerified: false,
  roles: [],
}

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [verificationFilter, setVerificationFilter] = useState('ALL')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [userForm, setUserForm] = useState<UserFormState>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
  const [statusTarget, setStatusTarget] = useState<UserRecord | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', '15')
    if (search.trim()) params.set('q', search.trim())
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (roleFilter !== 'ALL') params.set('role', roleFilter)
    if (verificationFilter !== 'ALL') params.set('verification', verificationFilter)
    return params.toString()
  }, [page, roleFilter, search, statusFilter, verificationFilter])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', queryString],
    queryFn: () => get<UserRecord[]>(`/admin/users?${queryString}`),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['admin-role-options'],
    queryFn: () => get<RolesPayload>('/admin/roles'),
  })

  const users = useMemo(() => (data?.data || []) as UserRecord[], [data])
  const meta = data?.meta
  const roleOptions = useMemo(() => ((rolesData?.data as unknown as { roles?: RoleOption[] })?.roles || []), [rolesData])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, roleFilter, verificationFilter])

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((user) => user.status === 'ACTIVE').length,
      verified: users.filter((user) => !!user.emailVerified).length,
      suppliers: users.filter((user) => user.roles.some((role) => role.role.name.includes('SUPPLIER'))).length,
    }
  }, [users])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (modalMode === 'create') {
        return post('/admin/users', userForm)
      }
      if (!selectedUser) throw new Error('No user selected')
      return patch('/admin/users', {
        userId: selectedUser.id,
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        email: userForm.email,
        phone: userForm.phone,
        password: userForm.password || undefined,
        status: userForm.status,
        emailVerified: userForm.emailVerified,
        roles: userForm.roles,
      })
    },
    onSuccess: () => {
      toast.success(modalMode === 'create' ? 'User created successfully' : 'User updated successfully')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setModalOpen(false)
      setSelectedUser(null)
      setUserForm(emptyForm)
    },
    onError: (error: Error) => toast.error(error.message || 'User save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => del(`/admin/users/${userId}`),
    onSuccess: () => {
      toast.success('User deleted successfully')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setDeleteTarget(null)
    },
    onError: (error: Error) => toast.error(error.message || 'User delete failed'),
  })

  const quickStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: UserFormState['status'] }) =>
      patch('/admin/users', { userId, status }),
    onSuccess: (_, variables) => {
      toast.success(variables.status === 'SUSPENDED' ? 'User banned successfully' : 'User unbanned successfully')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setStatusTarget(null)
    },
    onError: (error: Error) => toast.error(error.message || 'User status update failed'),
  })

  function openCreateModal(defaultRoles?: string[]) {
    setModalMode('create')
    setSelectedUser(null)
    setUserForm({ ...emptyForm, roles: defaultRoles || [] })
    setModalOpen(true)
  }

  function openEditModal(user: UserRecord) {
    setModalMode('edit')
    setSelectedUser(user)
    setUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      password: '',
      status: user.status,
      emailVerified: !!user.emailVerified,
      roles: user.roles.map((role) => role.role.name),
    })
    setModalOpen(true)
  }

  function toggleRole(roleName: string) {
    setUserForm((current) => ({
      ...current,
      roles: current.roles.includes(roleName)
        ? current.roles.filter((role) => role !== roleName)
        : [...current.roles, roleName],
    }))
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 px-6 py-7 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">User administration</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">Users</h1>
              <p className="mt-3 text-sm leading-6 text-blue-100/85">
                Manage buyers, suppliers, staff, verification status, and role assignments from one professional control center.
              </p>
            </div>
            <button
              onClick={() => openCreateModal()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Create user
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Users className="h-5 w-5" />} label="Visible users" value={stats.total} tone="blue" />
          <StatCard icon={<UserRound className="h-5 w-5" />} label="Active users" value={stats.active} tone="emerald" />
          <StatCard icon={<MailCheck className="h-5 w-5" />} label="Verified users" value={stats.verified} tone="amber" />
          <StatCard icon={<Shield className="h-5 w-5" />} label="Supplier accounts" value={stats.suppliers} tone="slate" />
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => openCreateModal(['BUYER'])} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">
            <Plus className="h-4 w-4" />
            Add buyer
          </button>
          <button onClick={() => openCreateModal(['SUPPLIER_OWNER'])} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
            <Plus className="h-4 w-4" />
            Add supplier
          </button>
          <button onClick={() => setRoleFilter('BUYER')} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Show buyers
          </button>
          <button onClick={() => setRoleFilter('SUPPLIER')} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Show suppliers
          </button>
          <button onClick={() => setRoleFilter('ALL')} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Show registered list
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
          {[
            { key: 'ALL', label: 'All Registered', hint: `${users.length} users`, tone: 'slate' },
            { key: 'BUYER', label: 'Buyers', hint: `${users.filter((user) => user.roles.some((role) => role.role.name.includes('BUYER'))).length} accounts`, tone: 'blue' },
            { key: 'SUPPLIER', label: 'Suppliers', hint: `${users.filter((user) => user.roles.some((role) => role.role.name.includes('SUPPLIER'))).length} accounts`, tone: 'emerald' },
          ].map((tab) => {
            const active = roleFilter === tab.key
            const activeClass =
              tab.tone === 'blue'
                ? 'bg-blue-600 text-white'
                : tab.tone === 'emerald'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-white'

            return (
              <button
                key={tab.key}
                onClick={() => setRoleFilter(tab.key)}
                className={`rounded-2xl px-4 py-3 text-left transition ${active ? activeClass : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                <p className="text-sm font-semibold">{tab.label}</p>
                <p className={`text-xs ${active ? 'text-white/80' : 'text-slate-500'}`}>{tab.hint}</p>
              </button>
            )
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className={inputCls} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_VERIFICATION">Pending verification</option>
          </select>
          <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} className={inputCls}>
            <option value="ALL">All verification</option>
            <option value="VERIFIED">Verified</option>
            <option value="UNVERIFIED">Unverified</option>
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputCls}>
            <option value="ALL">All roles</option>
            {roleOptions.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-950">User directory</h2>
            <p className="mt-1 text-sm text-slate-500">Clean registered user table with role, company, KYC, and action controls.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {meta?.total || users.length} records
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : users.length ? (
          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Roles</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">KYC</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {users.map((user) => (
                    <tr key={user.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div className="min-w-[220px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">{user.firstName} {user.lastName}</p>
                            <VerifyBadge verified={!!user.emailVerified} />
                          </div>
                          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                          <p className="mt-1 text-xs text-slate-500">{user.phone || 'No phone'}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[180px] flex-wrap gap-2">
                          {user.roles.map((role) => (
                            <span key={role.role.name} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {role.role.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-[220px] text-sm text-slate-600">
                          {user.b2bCompanyOwned ? (
                            <>
                              <p className="font-semibold text-slate-900">{user.b2bCompanyOwned.companyName}</p>
                              <p className="mt-1 text-xs text-slate-500">{user.b2bCompanyOwned.companyType.replace(/_/g, ' ')}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  Buyer: {user.b2bCompanyOwned.buyerVerificationStatus}
                                </span>
                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                  Supplier: {user.b2bCompanyOwned.supplierVerificationStatus}
                                </span>
                              </div>
                            </>
                          ) : (
                            <p className="text-sm text-slate-500">No registered B2B company.</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-[130px]">
                          {user.kycProfile ? (
                            <>
                              <p className="text-sm font-semibold text-slate-900">{user.kycProfile.status}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {user.kycProfile.reviewedAt ? new Date(user.kycProfile.reviewedAt).toLocaleDateString() : 'Awaiting review'}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-slate-500">No KYC</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="min-w-[90px] text-sm text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[250px] flex-wrap gap-2">
                          {user.b2bCompanyOwned ? (
                            <Link
                              href={`/admin/b2b/companies/${user.b2bCompanyOwned.id}?audience=${user.roles.some((role) => role.role.name.includes('SUPPLIER')) ? 'supplier' : 'buyer'}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Building2 className="h-3.5 w-3.5" />
                              Company
                            </Link>
                          ) : null}
                          {user.kycProfile ? (
                            <Link
                              href={`/admin/kyc?userId=${user.id}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              KYC
                            </Link>
                          ) : null}
                          <button
                            onClick={() => openEditModal(user)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                          <button
                            onClick={() => setStatusTarget(user)}
                            disabled={quickStatusMutation.isPending}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                              user.status === 'SUSPENDED'
                                ? 'border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                                : 'border border-amber-200 bg-white text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            <Ban className="h-3.5 w-3.5" />
                            {user.status === 'SUSPENDED' ? 'Unban' : 'Ban'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing page {meta?.page || page} of {Math.max(meta?.totalPages || 1, 1)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={(meta?.page || page) <= 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                  {(meta?.page || page)} / {Math.max(meta?.totalPages || 1, 1)}
                </span>
                <button
                  onClick={() => setPage((current) => current + 1)}
                  disabled={(meta?.page || page) >= Math.max(meta?.totalPages || 1, 1)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-sm text-slate-500">
            No users found for the current filters.
          </div>
        )}
      </section>

      <UserModal
        open={modalOpen}
        mode={modalMode}
        form={userForm}
        roles={roleOptions}
        onClose={() => {
          setModalOpen(false)
          setSelectedUser(null)
          setUserForm(emptyForm)
        }}
        onChange={setUserForm}
        onToggleRole={toggleRole}
        onSubmit={() => saveMutation.mutate()}
        saving={saveMutation.isPending}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-950">Delete user</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will archive the account and remove it from active Kaniz Global Trade listings. The user email will be released for future reuse.
            </p>
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
              {deleteTarget.firstName} {deleteTarget.lastName} ({deleteTarget.email})
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {statusTarget ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${statusTarget.status === 'SUSPENDED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                <CircleAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-950">{statusTarget.status === 'SUSPENDED' ? 'Unban registered user' : 'Ban registered user'}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {statusTarget.status === 'SUSPENDED'
                    ? 'This will restore account access and return the user to the active marketplace unless other restrictions still apply.'
                    : 'This will immediately suspend account access across buyer, supplier, and admin entry points until the user is restored.'}
                </p>
              </div>
            </div>

            <div className={`mt-5 rounded-2xl border px-4 py-4 text-sm ${
              statusTarget.status === 'SUSPENDED'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                : 'border-amber-100 bg-amber-50 text-amber-800'
            }`}>
              <p className="font-semibold">{statusTarget.firstName} {statusTarget.lastName}</p>
              <p className="mt-1">{statusTarget.email}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.14em]">
                Current status: {statusTarget.status.replace('_', ' ')}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setStatusTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() =>
                  quickStatusMutation.mutate({
                    userId: statusTarget.id,
                    status: statusTarget.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED',
                  })
                }
                disabled={quickStatusMutation.isPending}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
                  statusTarget.status === 'SUSPENDED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {quickStatusMutation.isPending
                  ? 'Updating...'
                  : statusTarget.status === 'SUSPENDED'
                    ? 'Confirm unban'
                    : 'Confirm ban'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function UserModal({
  open,
  mode,
  form,
  roles,
  onClose,
  onChange,
  onToggleRole,
  onSubmit,
  saving,
}: {
  open: boolean
  mode: 'create' | 'edit'
  form: UserFormState
  roles: RoleOption[]
  onClose: () => void
  onChange: React.Dispatch<React.SetStateAction<UserFormState>>
  onToggleRole: (roleName: string) => void
  onSubmit: () => void
  saving: boolean
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.03em] text-slate-950">{mode === 'create' ? 'Create user' : 'Edit user'}</h2>
            <p className="mt-1 text-sm text-slate-500">Manage account identity, verification, status, and role access from one modal.</p>
          </div>
          <button onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="First name">
              <input value={form.firstName} onChange={(e) => onChange((current) => ({ ...current, firstName: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Last name">
              <input value={form.lastName} onChange={(e) => onChange((current) => ({ ...current, lastName: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => onChange((current) => ({ ...current, email: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => onChange((current) => ({ ...current, phone: e.target.value }))} className={inputCls} />
            </Field>
            <Field label={mode === 'create' ? 'Password' : 'New password'}>
              <input
                type="password"
                value={form.password}
                onChange={(e) => onChange((current) => ({ ...current, password: e.target.value }))}
                className={inputCls}
                placeholder={mode === 'create' ? 'At least 8 chars, upper/lower/number' : 'Leave blank to keep current password'}
              />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => onChange((current) => ({ ...current, status: e.target.value as UserFormState['status'] }))} className={inputCls}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="PENDING_VERIFICATION">Pending verification</option>
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.emailVerified}
                onChange={(e) => onChange((current) => ({ ...current, emailVerified: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
              />
              Mark email as verified
            </label>
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Roles</h3>
                <p className="mt-1 text-sm text-slate-500">Assign one or more roles to define what this account can access.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">{form.roles.length} selected</span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {roles.map((role) => {
                const checked = form.roles.includes(role.name)
                return (
                  <label
                    key={role.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                      checked ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleRole(role.name)}
                      className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-300"
                    />
                    <span className="text-sm font-semibold text-slate-900">{role.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onSubmit} disabled={saving} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
            {saving ? 'Saving...' : mode === 'create' ? 'Create user' : 'Save changes'}
          </button>
        </div>
      </div>
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

function StatusBadge({ status }: { status: UserRecord['status'] }) {
  const toneClass =
    status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'SUSPENDED'
        ? 'bg-red-50 text-red-700'
        : status === 'PENDING_VERIFICATION'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-slate-100 text-slate-700'

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{status.replace('_', ' ')}</span>
}

function VerifyBadge({ verified }: { verified: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${verified ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
      {verified ? 'Verified' : 'Unverified'}
    </span>
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

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100'
