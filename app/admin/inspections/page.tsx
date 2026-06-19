'use client'

import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'

interface Report {
  id: string
  company: { name: string; slug: string }
  providerName: string
  reportNumber: string
  status: string
  score?: number
  createdAt: string
}

export default function AdminInspectionsPage() {
  const { data } = useQuery({
    queryKey: ['admin-inspections'],
    queryFn: () => get<Report[]>('/admin/inspections?limit=100'),
  })

  const reports = (data?.data || []) as Report[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inspection Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Third-party factory inspection visibility for compliance operations.</p>
      </div>
      {reports.map((report) => (
        <div key={report.id} className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">{report.providerName}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Company: {report.company.name} | Report: {report.reportNumber}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Status: {report.status} {typeof report.score === 'number' ? `| Score: ${report.score}` : ''}
              </p>
            </div>
            <p className="text-sm text-gray-500">{new Date(report.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      ))}

      {reports.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 text-sm text-gray-600">
          No inspection reports found yet.
        </div>
      )}
    </div>
  )
}
