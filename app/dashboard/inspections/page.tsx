'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Company {
  id: string
}

export default function SupplierInspectionsPage() {
  const [form, setForm] = useState({
    providerName: '',
    inspectorName: '',
    reportNumber: '',
    summary: '',
    findings: '',
    reportUrl: '',
    status: 'COMPLETED',
  })

  const { data: companyData } = useQuery({
    queryKey: ['my-company-for-inspections'],
    queryFn: () => get<Company>('/me/company'),
  })
  const company = companyData?.data as Company | undefined

  const { data, refetch } = useQuery({
    queryKey: ['inspection-reports', company?.id],
    queryFn: () => get<Record<string, unknown>[]>(`/companies/${company?.id}/inspections`),
    enabled: !!company?.id,
  })

  async function submit() {
    if (!company?.id) return
    await post(`/companies/${company.id}/inspections`, form)
    toast.success('Inspection report added')
    setForm({ providerName: '', inspectorName: '', reportNumber: '', summary: '', findings: '', reportUrl: '', status: 'COMPLETED' })
    refetch()
  }

  const reports = (data?.data || []) as Array<Record<string, unknown>>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Third-Party Inspections</h1>
        <p className="text-sm text-gray-500 mt-1">Upload SGS, Bureau Veritas, or other inspection results to strengthen buyer confidence.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 grid md:grid-cols-2 gap-4">
        <input value={form.providerName} onChange={(e) => setForm((prev) => ({ ...prev, providerName: e.target.value }))} placeholder="Provider name" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.inspectorName} onChange={(e) => setForm((prev) => ({ ...prev, inspectorName: e.target.value }))} placeholder="Inspector name" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.reportNumber} onChange={(e) => setForm((prev) => ({ ...prev, reportNumber: e.target.value }))} placeholder="Report number" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.reportUrl} onChange={(e) => setForm((prev) => ({ ...prev, reportUrl: e.target.value }))} placeholder="Report URL" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <textarea value={form.summary} onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))} placeholder="Inspection summary" className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-24" />
        <textarea value={form.findings} onChange={(e) => setForm((prev) => ({ ...prev, findings: e.target.value }))} placeholder="Detailed findings" className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-32" />
        <div className="md:col-span-2">
          <button onClick={submit} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm">Save Inspection</button>
        </div>
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <div key={String(report.id)} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">{String(report.providerName)} #{String(report.reportNumber)}</h2>
                <p className="text-sm text-gray-500 mt-1">{String(report.summary || '')}</p>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-full">{String(report.status)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
