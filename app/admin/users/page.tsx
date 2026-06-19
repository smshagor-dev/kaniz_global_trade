'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

interface UserRecord {
  id: string
  email: string
  firstName: string
  lastName: string
  status: string
  createdAt: string
  roles: Array<{ role: { name: string } }>
  companyUsers: Array<{ company: { id: string; name: string } }>
}

export default function AdminUsersPage() {
  const { data } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => get<UserRecord[]>('/admin/users?limit=100'),
  })

  const users = (data?.data || []) as UserRecord[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">Admin visibility across buyers, suppliers, and staff accounts.</p>
      </div>

      {users.map((user) => (
        <div key={user.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{user.firstName} {user.lastName}</h2>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
              <p className="text-xs text-gray-400 mt-1">
                Roles: {user.roles.map((role) => role.role.name).join(', ') || 'None'}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-gray-900">{user.status}</p>
              <p className="text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      ))}

      {users.length === 0 && <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">No users found.</div>}
    </div>
  )
}
