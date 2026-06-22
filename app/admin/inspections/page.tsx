'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { del, get, patch } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, ShieldCheck, XCircle } from 'lucide-react'

interface Report {
  id: string
  companyId: string
  company: { id: string; name: string; slug: string }
  providerName: string
  inspectorName?: string | null
  reportNumber: string
  summary?: string | null
  findings?: string | null
  reportUrl?: string | null
  reportStorageKey?: string | null
  reportFilename?: string | null
  reportMimeType?: string | null
  adminReviewNotes?: string | null
  status: 'REQUESTED' | 'SCHEDULED' | 'COMPLETED' | 'VERIFIED' | 'REJECTED'
  score?: number | null
  inspectedAt?: string | null
  verifiedAt?: string | null
  createdAt: string
}

type AdminInspectionFilter = 'ALL' | Report['status']

export default function AdminInspectionsPage() {
  const [activeFilter, setActiveFilter] = useState<AdminInspectionFilter>('ALL')
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['admin-inspections'],
    queryFn: () => get<Report[]>('/admin/inspections?limit=100'),
  })

  const reports = (data?.data || []) as Report[]
  const filteredReports = useMemo(() => {
    if (activeFilter === 'ALL') return reports
    return reports.filter((report) => report.status === activeFilter)
  }, [activeFilter, reports])

  const summary = {
    total: reports.length,
    requested: reports.filter((report) => report.status === 'REQUESTED').length,
    verified: reports.filter((report) => report.status === 'VERIFIED').length,
    rejected: reports.filter((report) => report.status === 'REJECTED').length,
  }

  function setRowLoading(id: string, action: string | null) {
    setActionLoading((current) => ({ ...current, [id]: action }))
  }

  async function runAction(report: Report, action: 'VERIFY' | 'REJECT' | 'COMPLETE' | 'SCHEDULE' | 'REQUEST') {
    setRowLoading(report.id, action)
    try {
      await patch(`/companies/${report.companyId}/inspections`, {
        id: report.id,
        action,
        adminReviewNotes: reviewNotes[report.id] ?? report.adminReviewNotes ?? '',
      })
      const actionLabel =
        action === 'VERIFY' ? 'verified' :
        action === 'REJECT' ? 'rejected' :
        action === 'COMPLETE' ? 'marked completed' :
        action === 'SCHEDULE' ? 'scheduled' :
        'moved to requested'
      toast.success(`Inspection ${actionLabel}`)
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to update inspection report'
      toast.error(message)
    } finally {
      setRowLoading(report.id, null)
    }
  }

  async function removeReport(report: Report) {
    if (!window.confirm('Delete this inspection report?')) return

    setDeletingId(report.id)
    try {
      await del(`/companies/${report.companyId}/inspections`, { id: report.id })
      toast.success('Inspection deleted')
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

  async function saveReviewNotes(report: Report) {
    setRowLoading(report.id, 'NOTES')
    try {
      await patch(`/companies/${report.companyId}/inspections`, {
        id: report.id,
        action: 'UPDATE',
        adminReviewNotes: reviewNotes[report.id] ?? '',
      })
      toast.success('Review notes saved')
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to save review notes'
      toast.error(message)
    } finally {
      setRowLoading(report.id, null)
    }
  }

  async function openPrivateReport(report: Report) {
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
              Compliance desk
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Inspection reports</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
              Review third-party factory inspections submitted by suppliers, verify credible evidence, reject weak submissions, and keep buyer-facing trust signals accurate.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'REQUESTED', 'SCHEDULED', 'COMPLETED', 'VERIFIED', 'REJECTED'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter as AdminInspectionFilter)}
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
          { label: 'Total reports', value: summary.total, icon: ShieldCheck },
          { label: 'Requested', value: summary.requested, icon: AlertTriangle },
          { label: 'Verified', value: summary.verified, icon: CheckCircle2 },
          { label: 'Rejected', value: summary.rejected, icon: XCircle },
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

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Inspection review queue</h2>
          <p className="mt-1 text-sm text-[#68726b]">{filteredReports.length} inspection reports in this view</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : filteredReports.length === 0 ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No inspection reports found yet.</div>
        ) : (
          <div className="divide-y divide-[#eef1eb]">
            {filteredReports.map((report) => {
              const rowLoading = actionLoading[report.id]
              return (
                <div key={report.id} className="px-6 py-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-[#1f2937]">{report.providerName}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getInspectionStatusTone(report.status)}`}>
                          {humanizeStatus(report.status)}
                        </span>
                        {typeof report.score === 'number' ? (
                          <span className="rounded-full bg-[#f3f5ef] px-2.5 py-1 text-xs font-semibold text-[#3e5840]">
                            Score {report.score}/100
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#68726b]">
                        <span>Company: <Link href={`/companies/${report.company.slug}`} className="font-medium text-[#2b5f77] hover:underline">{report.company.name}</Link></span>
                        <span>Report #: {report.reportNumber}</span>
                        <span>Inspector: {report.inspectorName || 'Not specified'}</span>
                        <span>Submitted: {new Date(report.createdAt).toLocaleDateString()}</span>
                        <span>Inspected: {report.inspectedAt ? new Date(report.inspectedAt).toLocaleDateString() : 'Not set'}</span>
                      </div>

                      {report.summary ? <p className="mt-3 text-sm leading-7 text-[#5f6862]">{report.summary}</p> : null}
                      {report.findings ? (
                        <div className="mt-4 rounded-2xl border border-[#e7eae3] bg-[#fafbf8] p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">Findings</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#5f6862]">{report.findings}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="w-full max-w-sm space-y-3 xl:w-80">
                      {report.reportUrl ? (
                        <a href={report.reportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-[#d9ddd4] bg-white px-4 py-2 text-sm font-medium text-[#58635d]">
                          <ExternalLink className="h-4 w-4" />
                          Open report URL
                        </a>
                      ) : null}
                      {report.reportStorageKey ? (
                        <button type="button" onClick={() => void openPrivateReport(report)} className="inline-flex items-center gap-2 rounded-lg border border-[#d9ddd4] bg-white px-4 py-2 text-sm font-medium text-[#58635d]">
                          <ExternalLink className="h-4 w-4" />
                          Open private attachment
                        </button>
                      ) : null}
                      {report.reportFilename ? (
                        <p className="text-xs text-[#738076]">{report.reportFilename}</p>
                      ) : null}

                      <div className="rounded-2xl border border-[#e7eae3] bg-[#fafbf8] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#748078]">Kaniz Global Trade review notes</p>
                        <textarea
                          value={reviewNotes[report.id] ?? report.adminReviewNotes ?? ''}
                          onChange={(event) => setReviewNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                          rows={4}
                          className="mt-2 w-full rounded-xl border border-[#d9ddd4] bg-white px-3 py-2 text-sm text-[#1f2937] outline-none focus:border-[#9daf98] focus:ring-2 focus:ring-[#eef2e7]"
                          placeholder="Capture moderation notes, verification rationale, or missing evidence details."
                        />
                        <button
                          type="button"
                          onClick={() => void saveReviewNotes(report)}
                          disabled={rowLoading !== null}
                          className="mt-2 rounded-lg border border-[#d9ddd4] px-3 py-2 text-sm font-semibold text-[#58635d] disabled:opacity-60"
                        >
                          {rowLoading === 'NOTES' ? 'Saving notes...' : 'Save notes'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" disabled={rowLoading !== null} onClick={() => void runAction(report, 'VERIFY')} className="rounded-lg bg-[#243127] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                          {rowLoading === 'VERIFY' ? 'Verifying...' : 'Verify'}
                        </button>
                        <button type="button" disabled={rowLoading !== null} onClick={() => void runAction(report, 'REJECT')} className="rounded-lg border border-[#f1c7c7] px-3 py-2 text-sm font-semibold text-[#b64242] disabled:opacity-60">
                          {rowLoading === 'REJECT' ? 'Rejecting...' : 'Reject'}
                        </button>
                        <button type="button" disabled={rowLoading !== null} onClick={() => void runAction(report, 'COMPLETE')} className="rounded-lg border border-[#d9ddd4] px-3 py-2 text-sm font-semibold text-[#58635d] disabled:opacity-60">
                          {rowLoading === 'COMPLETE' ? 'Saving...' : 'Mark completed'}
                        </button>
                        <button type="button" disabled={rowLoading !== null} onClick={() => void runAction(report, 'SCHEDULE')} className="rounded-lg border border-[#d9ddd4] px-3 py-2 text-sm font-semibold text-[#58635d] disabled:opacity-60">
                          {rowLoading === 'SCHEDULE' ? 'Saving...' : 'Schedule'}
                        </button>
                      </div>

                      <button type="button" onClick={() => void removeReport(report)} disabled={deletingId === report.id} className="rounded-lg border border-[#f1c7c7] px-3 py-2 text-sm font-semibold text-[#b64242] disabled:opacity-60">
                        {deletingId === report.id ? 'Deleting...' : 'Delete report'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function humanizeStatus(value: string) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function getInspectionStatusTone(status: Report['status']) {
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
