'use client'

import { useQuery } from '@tanstack/react-query'
import { get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Alert {
  id: string
  reason: string
  status: string
  signalScore: number
  reportedBy: { firstName: string; lastName: string; email: string }
  targetCompany?: { name: string; slug: string }
}

export default function AdminFraudAlertsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-fraud-alerts'],
    queryFn: () => get<Alert[]>('/fraud-alerts'),
  })

  async function update(alertId: string, status: 'INVESTIGATING' | 'WATCHLIST' | 'RESOLVED' | 'DISMISSED') {
    await patch('/fraud-alerts', { alertId, status })
    toast.success(`Alert set to ${status.toLowerCase()}`)
    refetch()
  }

  const alerts = (data?.data || []) as Alert[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fraud Alerts</h1>
        <p className="text-sm text-gray-500 mt-1">Review user-submitted fraud reports and move risky companies to a watchlist.</p>
      </div>
      {alerts.map((alert) => (
        <div key={alert.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{alert.reason}</h2>
              <p className="text-sm text-gray-500 mt-1">Reported by {alert.reportedBy.firstName} {alert.reportedBy.lastName} | Target: {alert.targetCompany?.name || 'User'}</p>
              <p className="text-xs text-gray-400 mt-1">Signal Score: {alert.signalScore} | Status: {alert.status}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => update(alert.id, 'INVESTIGATING')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">Investigate</button>
              <button onClick={() => update(alert.id, 'WATCHLIST')} className="px-3 py-2 rounded-lg bg-amber-600 text-white text-sm">Watchlist</button>
              <button onClick={() => update(alert.id, 'RESOLVED')} className="px-3 py-2 rounded-lg bg-green-700 text-white text-sm">Resolve</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
