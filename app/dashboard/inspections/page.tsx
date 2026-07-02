'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { del, get, patch, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import api from '@/lib/utils/api-client'
import { CheckCircle2, ClipboardCheck, ExternalLink, FileText, Loader2, Pencil, ShieldCheck, Trash2, Upload } from 'lucide-react'

interface Company {
  id: string
  name?: string
}

interface InspectionReport {
  id: string
  companyId: string
  providerName: string
  inspectorName?: string | null
  reportNumber: string
  score?: number | null
  summary?: string | null
  findings?: string | null
  reportUrl?: string | null
  reportStorageKey?: string | null
  reportFilename?: string | null
  reportMimeType?: string | null
  adminReviewNotes?: string | null
  inspectedAt?: string | null
  verifiedAt?: string | null
  status: 'REQUESTED' | 'SCHEDULED' | 'COMPLETED' | 'VERIFIED' | 'REJECTED'
  createdAt: string
  updatedAt: string
}

type InspectionFilter = 'ALL' | InspectionReport['status']

const inputCls =
  'w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937] outline-none transition focus:border-[#9daf98] focus:ring-2 focus:ring-[#eef2e7]'

const emptyForm = {
  id: '',
  providerName: '',
  inspectorName: '',
  reportNumber: '',
  score: '',
  summary: '',
  findings: '',
  inspectedAt: '',
  status: 'COMPLETED' as InspectionReport['status'],
}

export default function SupplierInspectionsPage() {
  const [activeFilter, setActiveFilter] = useState<InspectionFilter>('ALL')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  const { data: companyData } = useQuery({
    queryKey: ['my-company-for-inspections'],
    queryFn: () => get<Company>('/me/company'),
  })
  const company = companyData?.data as Company | undefined

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['inspection-reports', company?.id],
    queryFn: () => get<InspectionReport[]>(`/companies/${company?.id}/inspections`),
    enabled: !!company?.id,
  })

  const reports = (data?.data || []) as InspectionReport[]
  const filteredReports = useMemo(() => {
    if (activeFilter === 'ALL') return reports
    return reports.filter((report) => report.status === activeFilter)
  }, [activeFilter, reports])

  const summary = {
    total: reports.length,
    verified: reports.filter((report) => report.status === 'VERIFIED').length,
    completed: reports.filter((report) => report.status === 'COMPLETED').length,
    pending: reports.filter((report) => ['REQUESTED', 'SCHEDULED'].includes(report.status)).length,
  }
  const supplierStatusOptions = Array.from(new Set([
    form.status,
    'REQUESTED',
    'SCHEDULED',
    'COMPLETED',
  ])) as InspectionReport['status'][]

  function resetForm() {
    setForm(emptyForm)
  }

  function startEditing(report: InspectionReport) {
    setForm({
      id: report.id,
      providerName: report.providerName,
      inspectorName: report.inspectorName || '',
      reportNumber: report.reportNumber,
      score: report.score != null ? String(report.score) : '',
      summary: report.summary || '',
      findings: report.findings || '',
      inspectedAt: report.inspectedAt ? report.inspectedAt.slice(0, 10) : '',
      status: report.status,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit() {
    if (!company?.id) return
    if (!form.providerName.trim() || !form.reportNumber.trim()) {
      toast.error('Provider name and report number are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        providerName: form.providerName.trim(),
        inspectorName: form.inspectorName.trim() || undefined,
        reportNumber: form.reportNumber.trim(),
        score: form.score.trim() ? Number(form.score) : undefined,
        summary: form.summary.trim() || undefined,
        findings: form.findings.trim() || undefined,
        reportStorageKey: undefined,
        reportFilename: undefined,
        reportMimeType: undefined,
        inspectedAt: form.inspectedAt || undefined,
        status: form.status,
      }

      if (form.id) {
        await patch(`/companies/${company.id}/inspections`, {
          id: form.id,
          action: 'UPDATE',
          ...payload,
        })
        toast.success('Inspection updated')
      } else {
        await post(`/companies/${company.id}/inspections`, payload)
        toast.success('Inspection created')
      }

      resetForm()
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to save inspection report'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function removeReport(id: string) {
    if (!company?.id) return
    if (!window.confirm('Delete this inspection report?')) return

    setDeletingId(id)
    try {
      await del(`/companies/${company.id}/inspections`, { id })
      toast.success('Inspection deleted')
      if (form.id === id) resetForm()
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to delete inspection report'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  async function uploadInspectionAttachment(file: File) {
    const body = new FormData()
    body.append('file', file)
    body.append('type', 'inspection_report')

    const { data: result } = await api.post('/upload', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return result.data as { url: string; key: string; filename: string; mimeType: string }
  }

  async function attachReportFile(file: File) {
    if (!company?.id || !form.id) {
      toast.error('Save the inspection first, then upload a private attachment')
      return
    }

    setUploadingAttachment(true)
    try {
      const uploaded = await uploadInspectionAttachment(file)
      await patch(`/companies/${company.id}/inspections`, {
        id: form.id,
        action: 'UPDATE',
        reportStorageKey: uploaded.key,
        reportFilename: uploaded.filename,
        reportMimeType: uploaded.mimeType,
      })
      toast.success('Private inspection attachment uploaded')
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to upload inspection attachment'
      toast.error(message)
    } finally {
      setUploadingAttachment(false)
    }
  }

  async function openPrivateReport(report: InspectionReport) {
    try {
      const response = await get<{ url: string }>(`/companies/${report.companyId}/inspections/${report.id}/report-url`)
      const url = response.data?.url
      if (!url) throw new Error('Signed URL not available')
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to open private attachment'
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#f3f5ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#667161]">
              Trust operations
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Third-party inspections</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
              Upload factory inspections from SGS, Bureau Veritas, Intertek, or similar agencies so buyers and Kaniz Global Trade can validate your compliance posture with real evidence.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'REQUESTED', 'SCHEDULED', 'COMPLETED', 'VERIFIED', 'REJECTED'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter as InspectionFilter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter
                    ? 'bg-[#243127] text-white'
                    : 'border border-[#d9ddd4] bg-white text-[#58635d] hover:border-[#c9d0c1]'
                }`}
              >
                {filter === 'ALL' ? 'All' : humanizeStatus(filter)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total reports', value: summary.total, icon: FileText },
          { label: 'Verified', value: summary.verified, icon: ShieldCheck },
          { label: 'Completed', value: summary.completed, icon: CheckCircle2 },
          { label: 'Pending review', value: summary.pending, icon: ClipboardCheck },
        ].map((item) => (
          <div key={item.label} className="rounded-[24px] border border-[#d9ddd4] bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3f5ef] text-[#4f5d49]">
              <item.icon className="h-4 w-4" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-[#1f2937]">{item.value}</p>
            <p className="mt-1 text-sm text-[#68726b]">{item.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[28px] border border-[#d9ddd4] bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1f2937]">{form.id ? 'Edit inspection report' : 'Add inspection report'}</h2>
            <p className="mt-1 text-sm text-[#68726b]">Use direct third-party report details. Kaniz Global Trade controls the final verify or reject decision after review.</p>
          </div>
          {form.id ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[#d9ddd4] px-4 py-2 text-sm font-medium text-[#58635d]"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input value={form.providerName} onChange={(e) => setForm((prev) => ({ ...prev, providerName: e.target.value }))} placeholder="Provider name" className={inputCls} />
          <input value={form.inspectorName} onChange={(e) => setForm((prev) => ({ ...prev, inspectorName: e.target.value }))} placeholder="Inspector name" className={inputCls} />
          <input value={form.reportNumber} onChange={(e) => setForm((prev) => ({ ...prev, reportNumber: e.target.value }))} placeholder="Report number" className={inputCls} />
          <input value={form.score} onChange={(e) => setForm((prev) => ({ ...prev, score: e.target.value }))} placeholder="Score (0-100)" type="number" min="0" max="100" className={inputCls} />
          <input value={form.inspectedAt} onChange={(e) => setForm((prev) => ({ ...prev, inspectedAt: e.target.value }))} type="date" className={inputCls} />
          <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as InspectionReport['status'] }))} className={inputCls}>
            {supplierStatusOptions.map((status) => (
              <option key={status} value={status}>{humanizeStatus(status)}</option>
            ))}
          </select>
          <textarea value={form.summary} onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))} placeholder="Inspection summary" className={`${inputCls} min-h-24 md:col-span-2`} />
          <textarea value={form.findings} onChange={(e) => setForm((prev) => ({ ...prev, findings: e.target.value }))} placeholder="Detailed findings, observations, non-conformities, and corrective actions" className={`${inputCls} min-h-32 md:col-span-2 xl:col-span-4`} />
        </div>

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => void submit()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#243127] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving...' : form.id ? 'Update inspection' : 'Save inspection'}
          </button>
          {form.id ? (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#d9ddd4] px-4 py-2 text-sm font-medium text-[#58635d]">
              {uploadingAttachment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingAttachment ? 'Uploading...' : 'Upload private report'}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void attachReportFile(file)
                  event.target.value = ''
                }}
                disabled={uploadingAttachment}
              />
            </label>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Inspection register</h2>
          <p className="mt-1 text-sm text-[#68726b]">{filteredReports.length} reports in this view</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : filteredReports.length === 0 ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No inspection reports found for this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1320px] divide-y divide-[#e7eae3] text-sm">
              <thead className="bg-[#f7f8f5] text-left text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">
                <tr>
                  <th className="px-6 py-4">Report</th>
                  <th className="px-6 py-4">Inspector</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Summary</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1eb]">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="align-top hover:bg-[#fbfbf9]">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#1f2937]">{report.providerName}</p>
                      <p className="mt-1 text-xs text-[#738076]">#{report.reportNumber}</p>
                      {report.reportUrl ? (
                        <a href={report.reportUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#3e5840]">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open report
                        </a>
                      ) : null}
                      {report.reportStorageKey ? (
                        <button type="button" onClick={() => void openPrivateReport(report)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2b5f77]">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open private attachment
                        </button>
                      ) : null}
                      {report.reportFilename ? <p className="mt-1 text-xs text-[#738076]">{report.reportFilename}</p> : null}
                    </td>
                    <td className="px-6 py-4 text-[#5f6862]">{report.inspectorName || 'Not specified'}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getInspectionStatusTone(report.status)}`}>
                        {humanizeStatus(report.status)}
                      </span>
                      {report.verifiedAt ? (
                        <p className="mt-2 text-xs text-[#738076]">Verified {new Date(report.verifiedAt).toLocaleDateString()}</p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#1f2937]">{report.score ?? '-'}</td>
                    <td className="px-6 py-4 text-[#5f6862]">{report.inspectedAt ? new Date(report.inspectedAt).toLocaleDateString() : new Date(report.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-[#5f6862]">
                      <p className="max-w-md whitespace-pre-wrap">{report.summary || 'No summary added yet.'}</p>
                      {report.adminReviewNotes ? (
                        <div className="mt-3 rounded-xl border border-[#eef1eb] bg-[#fafbf8] p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#748078]">Kaniz Global Trade review note</p>
                          <p className="mt-1 whitespace-pre-wrap text-xs text-[#5f6862]">{report.adminReviewNotes}</p>
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEditing(report)} className="inline-flex items-center gap-1 rounded-lg border border-[#d9ddd4] px-3 py-1.5 text-xs font-medium text-[#58635d]">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button type="button" onClick={() => void removeReport(report.id)} disabled={deletingId === report.id} className="inline-flex items-center gap-1 rounded-lg border border-[#f1c7c7] px-3 py-1.5 text-xs font-medium text-[#b64242] disabled:opacity-60">
                          {deletingId === report.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function humanizeStatus(value: string) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function getInspectionStatusTone(status: InspectionReport['status']) {
  switch (status) {
    case 'VERIFIED':
      return 'bg-[#eef7ee] text-[#2f6b39]'
    case 'COMPLETED':
      return 'bg-[#eef2e7] text-[#3e5840]'
    case 'SCHEDULED':
      return 'bg-[#edf4fb] text-[#356082]'
    case 'REJECTED':
      return 'bg-[#fdecec] text-[#b64242]'
    default:
      return 'bg-[#f5f2e8] text-[#8a6a1f]'
  }
}
