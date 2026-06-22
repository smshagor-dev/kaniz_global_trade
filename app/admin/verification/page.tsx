'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface VerificationRecord {
  companyId: string
  status: string
  submittedAt?: string | null
  company: {
    name: string
    slug: string
    country?: { name: string } | null
  }
}

export default function AdminVerificationPage() {
  const [status, setStatus] = useState('DOCUMENT_SUBMITTED')
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['admin-verification', status],
    queryFn: () => get<VerificationRecord[]>(`/admin/verification?status=${status}`),
  })

  const action = useMutation({
    mutationFn: ({ companyId, type }: { companyId: string; type: 'APPROVE' | 'REJECT' }) =>
      post('/admin/verification', { companyId, action: type }),
    onSuccess: () => {
      toast.success('Verification updated')
      qc.invalidateQueries({ queryKey: ['admin-verification'] })
    },
  })

  const records = (data?.data || []) as VerificationRecord[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verification Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Review supplier company verification submissions from Kaniz Global Trade.</p>
      </div>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
      >
        <option value="DOCUMENT_SUBMITTED">Document Submitted</option>
        <option value="REJECTED">Rejected</option>
        <option value="ADMIN_VERIFIED">Kaniz Global Trade Verified</option>
      </select>

      {records.map((record) => (
        <div key={record.companyId} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{record.company.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {record.company.country?.name || 'No country'} | {record.status}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => action.mutate({ companyId: record.companyId, type: 'APPROVE' })}
                className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm"
              >
                Approve
              </button>
              <button
                onClick={() => action.mutate({ companyId: record.companyId, type: 'REJECT' })}
                className="px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}

      {records.length === 0 && <div className="bg-white border border-gray-100 rounded-xl p-6 text-sm text-gray-500">No verification records found.</div>}
    </div>
  )
}
