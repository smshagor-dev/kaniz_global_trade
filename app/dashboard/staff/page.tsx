'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { get, post } from '@/lib/utils/api-client'
import { useCurrentUser, useHasRole, useIsSupplier } from '@/store/auth'
import { Loader2, Plus, ShieldCheck, Users, X } from 'lucide-react'
import { supplierDashboardSections } from '@/lib/supplier-dashboard-access'

type StaffResponse = {
  company: {
    id: string
    name: string
    subscription: {
      status: string
      plan: {
        name: string
        maxStaff: number
      }
    } | null
  }
  companyRoles: Array<{
    id: string
    name: string
    dashboardAccess: string[]
  }>
  members: Array<{
    id: string
    title?: string | null
    permissions?: string | null
    dashboardAccess: string[]
    assignedRoleId?: string | null
    assignedRoleName?: string | null
    isPrimary: boolean
    createdAt: string
    user: {
      id: string
      firstName: string
      lastName: string
      email: string
      status: string
      lastLoginAt?: string | null
      roles: string[]
    }
  }>
}

type CreateStaffForm = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  title: string
  staffRoleId: string
}

function formatRole(role: string) {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatStatus(status: string) {
  return status.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function DashboardStaffPage() {
  const queryClient = useQueryClient()
  const isSupplier = useIsSupplier()
  const isOwner = useHasRole('SUPPLIER_OWNER')
  const currentUser = useCurrentUser()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [form, setForm] = useState<CreateStaffForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    title: '',
    staffRoleId: '',
  })
  const { data, isLoading, error } = useQuery({
    queryKey: ['company-staff'],
    queryFn: () => get<StaffResponse>('/company-staff'),
    enabled: isSupplier,
  })

  const staff = data?.data
  const memberLimit = staff?.company.subscription?.plan.maxStaff ?? 1
  const companyRoles = staff?.companyRoles || []
  const members = staff?.members || []
  const staffSeatsUsed = members.filter((member) => !member.isPrimary).length
  const seatsRemaining = Math.max(memberLimit - staffSeatsUsed, 0)

  const createStaffMutation = useMutation({
    mutationFn: () => post('/company-staff', form),
    onSuccess: (response) => {
      toast.success(response.message || 'Staff account created successfully')
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        title: '',
        staffRoleId: '',
      })
      setCreateModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['company-staff'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-dashboard-access'] })
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create staff account'
      toast.error(message)
    },
  })

  if (!isSupplier) {
    return (
      <div className="rounded-3xl border border-red-100 bg-red-50 p-8 text-sm text-red-700">
        Only supplier owner and supplier staff accounts can access the staff page.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !staff) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
        Staff data could not be loaded right now.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/75">Supplier Team</p>
            <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold">
              <Users className="h-8 w-8 text-sky-300" />
              {staff.company.name} Staff Directory
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              This page is available only for supplier owner and supplier staff roles.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Team Members</p>
              <p className="mt-2 text-2xl font-bold">{members.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Staff Seats Used</p>
              <p className="mt-2 text-2xl font-bold">{staffSeatsUsed} / {memberLimit}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">Current Plan</p>
              <p className="mt-2 text-lg font-bold">{staff.company.subscription?.plan.name || 'Starter'}</p>
            </div>
          </div>
        </div>
      </section>

      {isOwner ? (
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Staff Access</h2>
              <p className="mt-1 text-sm text-gray-500">Supplier owners can create staff login accounts for their own company.</p>
            </div>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {seatsRemaining} seat{seatsRemaining === 1 ? '' : 's'} remaining
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-3xl border border-dashed border-gray-200 bg-slate-50 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Add a new staff login</p>
              <p className="mt-1 text-sm text-gray-500">Create staff roles in Settings first, then assign one role during staff creation.</p>
            </div>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              disabled={seatsRemaining === 0 || !companyRoles.length}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Create Staff
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Company Members</h2>
            <p className="mt-1 text-sm text-gray-500">Owner and staff members assigned to your supplier company.</p>
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {staffSeatsUsed} / {memberLimit} staff seats used
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">System Role</th>
                  <th className="px-5 py-4">Assigned Role</th>
                  <th className="px-5 py-4">Title</th>
                  <th className="px-5 py-4">Dashboard Access</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Joined</th>
                  <th className="px-5 py-4">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {members.map((member) => {
                  const fullName = `${member.user.firstName} ${member.user.lastName}`.trim()
                  const isCurrentUser = currentUser?.id === member.user.id

                  return (
                    <tr key={member.id} className="align-top text-sm text-gray-600">
                      <td className="px-5 py-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900">{fullName || member.user.email}</span>
                            {member.isPrimary ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                <ShieldCheck className="h-3 w-3" />
                                Owner
                              </span>
                            ) : null}
                            {isCurrentUser ? (
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">You</span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">{member.user.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {member.user.roles.map((role) => (
                            <span key={role} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                              {formatRole(role)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-900">{member.assignedRoleName || 'Unassigned role'}</td>
                      <td className="px-5 py-4 text-gray-900">{member.title || 'Team member'}</td>
                      <td className="px-5 py-4">
                        <div className="flex max-w-sm flex-wrap gap-2">
                          {member.dashboardAccess.map((sectionKey) => {
                            const section = supplierDashboardSections.find((item) => item.key === sectionKey)
                            return (
                              <span key={sectionKey} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                {section?.label || sectionKey}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          {formatStatus(member.user.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-900">{new Date(member.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-gray-900">
                        {member.user.lastLoginAt ? new Date(member.user.lastLoginAt).toLocaleDateString() : 'No login yet'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!members.length ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
            No staff members are assigned to this supplier company yet.
          </div>
        ) : null}
      </section>

      {createModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-3xl rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create Staff Account</h2>
                <p className="mt-1 text-sm text-gray-500">Create a supplier staff login for your own company from this popup.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {seatsRemaining} seat{seatsRemaining === 1 ? '' : 's'} remaining
                </div>
                <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Plan: {staff.company.subscription?.plan.name || 'Starter'}
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Roles available: {companyRoles.length}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="First Name">
                  <input value={form.firstName} onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))} className={inputCls} placeholder="Staff first name" />
                </Field>
                <Field label="Last Name">
                  <input value={form.lastName} onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))} className={inputCls} placeholder="Staff last name" />
                </Field>
                <Field label="Email">
                  <input value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} type="email" className={inputCls} placeholder="staff@company.com" />
                </Field>
                <Field label="Phone">
                  <input value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} className={inputCls} placeholder="+880..." />
                </Field>
                <Field label="Job Title">
                  <input value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} className={inputCls} placeholder="Sales Executive" />
                </Field>
                <Field label="Temporary Password">
                  <input value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} type="password" className={inputCls} placeholder="At least 8 chars, upper/lower/number" />
                </Field>
                <Field label="Staff Role">
                  <select value={form.staffRoleId} onChange={(e) => setForm((current) => ({ ...current, staffRoleId: e.target.value }))} className={inputCls}>
                    <option value="">Select a role</option>
                    {companyRoles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {!companyRoles.length ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  No company staff roles found. Create a role first from `/dashboard/settings`.
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-5">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createStaffMutation.mutate()}
                disabled={createStaffMutation.isPending || seatsRemaining === 0 || !companyRoles.length || !form.staffRoleId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Staff
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
