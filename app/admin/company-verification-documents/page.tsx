'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle2, ExternalLink, FileText, Loader2, Plus, Save, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import { del, get, patch, post } from '@/lib/utils/api-client'
import { LoadingButton } from '@/components/ui/loading-button'

type InputType = 'TEXT' | 'FILE' | 'BOTH'
type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

type Requirement = {
  id: string
  title: string
  description?: string | null
  inputType: InputType
  isRequired: boolean
  isActive: boolean
  sortOrder: number
  _count?: { submissions: number }
}

type Submission = {
  id: string
  companyId: string
  textValue?: string | null
  fileStorageKey?: string | null
  fileName?: string | null
  fileMimeType?: string | null
  status: SubmissionStatus
  adminNotes?: string | null
  submittedAt?: string | null
  reviewedAt?: string | null
  company: { id: string; name: string; slug: string; verificationStatus: string; isVerified: boolean }
  requirement: Requirement
}

const emptyRequirement = {
  id: '',
  title: '',
  description: '',
  inputType: 'FILE' as InputType,
  isRequired: true,
  isActive: true,
  sortOrder: 0,
}

const fieldClass = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100'

export default function AdminCompanyVerificationDocumentsPage() {
  const [form, setForm] = useState(emptyRequirement)
  const [savingRequirement, setSavingRequirement] = useState(false)
  const [deletingRequirementId, setDeletingRequirementId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'ALL' | SubmissionStatus>('ALL')
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const requirementsQuery = useQuery({
    queryKey: ['admin-company-verification-requirements'],
    queryFn: () => get<Requirement[]>('/admin/company-verification-requirements'),
  })

  const submissionsQuery = useQuery({
    queryKey: ['admin-company-verification-submissions'],
    queryFn: () => get<Submission[]>('/admin/company-verification-submissions?limit=100'),
  })

  const requirements = requirementsQuery.data?.data || []
  const submissions = submissionsQuery.data?.data || []

  const filteredSubmissions = useMemo(() => {
    if (activeFilter === 'ALL') return submissions
    return submissions.filter((submission) => submission.status === activeFilter)
  }, [activeFilter, submissions])

  const summary = {
    total: submissions.length,
    submitted: submissions.filter((item) => item.status === 'SUBMITTED').length,
    approved: submissions.filter((item) => item.status === 'APPROVED').length,
    rejected: submissions.filter((item) => item.status === 'REJECTED').length,
  }

  async function saveRequirement() {
    if (!form.title.trim()) {
      toast.error('Requirement title is required')
      return
    }

    setSavingRequirement(true)
    try {
      if (form.id) {
        await patch('/admin/company-verification-requirements', form)
        toast.success('Requirement updated')
      } else {
        await post('/admin/company-verification-requirements', form)
        toast.success('Requirement created')
      }
      setForm(emptyRequirement)
      await requirementsQuery.refetch()
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to save requirement'
      toast.error(message)
    } finally {
      setSavingRequirement(false)
    }
  }

  async function deleteRequirement(requirement: Requirement) {
    if (!window.confirm(`Delete "${requirement.title}"? Supplier answers for this requirement will also be removed.`)) return

    setDeletingRequirementId(requirement.id)
    try {
      await del('/admin/company-verification-requirements', { id: requirement.id })
      toast.success('Requirement deleted')
      await Promise.all([requirementsQuery.refetch(), submissionsQuery.refetch()])
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to delete requirement'
      toast.error(message)
    } finally {
      setDeletingRequirementId(null)
    }
  }

  async function reviewSubmission(submission: Submission, status: Exclude<SubmissionStatus, 'DRAFT'>) {
    setReviewingId(submission.id)
    try {
      await patch('/admin/company-verification-submissions', {
        id: submission.id,
        status,
        adminNotes: reviewNotes[submission.id] ?? submission.adminNotes ?? '',
      })
      toast.success(status === 'APPROVED' ? 'Submission approved' : status === 'REJECTED' ? 'Submission rejected' : 'Submission moved back to review')
      await submissionsQuery.refetch()
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to review submission'
      toast.error(message)
    } finally {
      setReviewingId(null)
    }
  }

  async function openPrivateFile(submission: Submission) {
    try {
      const response = await get<{ url: string }>(`/company-verification/submissions/${submission.id}/file-url`)
      if (!response.data?.url) throw new Error('Signed URL not available')
      window.open(response.data.url, '_blank', 'noopener,noreferrer')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to open private document'
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Supplier verification
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950">Company verification documents</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              Configure exactly what suppliers must submit, then review uploaded private documents and written answers from one queue.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setForm(emptyRequirement)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" />
            New requirement
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">{form.id ? 'Edit requirement' : 'Create requirement'}</h2>
          <div className="mt-4 space-y-3">
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className={fieldClass} placeholder="Document title, e.g. Trade license" />
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} className={fieldClass} placeholder="Instructions suppliers will see" />
            <div className="grid gap-3 md:grid-cols-3">
              <select value={form.inputType} onChange={(event) => setForm((current) => ({ ...current, inputType: event.target.value as InputType }))} className={fieldClass}>
                <option value="TEXT">Text only</option>
                <option value="FILE">File upload</option>
                <option value="BOTH">Text + upload</option>
              </select>
              <input type="number" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} className={fieldClass} placeholder="Sort order" />
              <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                Active
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
              </label>
            </div>
            <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              Required for verification
              <input type="checkbox" checked={form.isRequired} onChange={(event) => setForm((current) => ({ ...current, isRequired: event.target.checked }))} />
            </label>
            <LoadingButton
              type="button"
              onClick={saveRequirement}
              loading={savingRequirement}
              loadingText="Saving..."
              icon={<Save className="h-4 w-4" />}
              className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              {form.id ? 'Update requirement' : 'Create requirement'}
            </LoadingButton>
          </div>
        </div>

        <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Configured requirements</h2>
          {requirementsQuery.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div>
          ) : requirements.length ? (
            <div className="mt-4 space-y-3">
              {requirements.map((requirement) => (
                <div key={requirement.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-950">{requirement.title}</h3>
                      <p className="mt-1 text-xs text-gray-500">{requirement.inputType.replace(/_/g, ' ')} | {requirement.isRequired ? 'Required' : 'Optional'} | {requirement.isActive ? 'Active' : 'Inactive'}</p>
                      {requirement.description ? <p className="mt-2 text-sm text-gray-600">{requirement.description}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setForm({ id: requirement.id, title: requirement.title, description: requirement.description || '', inputType: requirement.inputType, isRequired: requirement.isRequired, isActive: requirement.isActive, sortOrder: requirement.sortOrder })} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700">
                        Edit
                      </button>
                      <button type="button" onClick={() => void deleteRequirement(requirement)} disabled={deletingRequirementId === requirement.id} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-60">
                        {deletingRequirementId === requirement.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">{requirement._count?.submissions || 0} supplier submissions</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No requirements configured yet.
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Total" value={summary.total} />
        <Metric label="Submitted" value={summary.submitted} />
        <Metric label="Approved" value={summary.approved} />
        <Metric label="Rejected" value={summary.rejected} />
      </div>

      <section className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-950">Submission review queue</h2>
            <p className="mt-1 text-sm text-gray-500">{filteredSubmissions.length} submissions in this view</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter ? 'bg-gray-950 text-white' : 'border border-gray-200 text-gray-600 hover:border-blue-200 hover:text-blue-700'
                }`}
              >
                {filter === 'ALL' ? 'All' : filter.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {submissionsQuery.isLoading ? (
          <div className="flex justify-center py-14"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : filteredSubmissions.length ? (
          <div className="divide-y divide-gray-100">
            {filteredSubmissions.map((submission) => {
              const rowLoading = reviewingId === submission.id
              return (
                <div key={submission.id} className="px-6 py-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-950">{submission.requirement.title}</h3>
                        <SubmissionBadge status={submission.status} />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Company: <Link href={`/companies/${submission.company.slug}`} target="_blank" className="font-semibold text-blue-700 hover:underline">{submission.company.name}</Link>
                        {' '}| Verification: {submission.company.verificationStatus.replace(/_/g, ' ')}
                      </p>
                      {submission.textValue ? (
                        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Supplier text</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{submission.textValue}</p>
                        </div>
                      ) : null}
                      {submission.fileStorageKey ? (
                        <button type="button" onClick={() => void openPrivateFile(submission)} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:text-blue-700">
                          <ExternalLink className="h-4 w-4" />
                          Open private document
                          {submission.fileName ? <span className="text-gray-400">({submission.fileName})</span> : null}
                        </button>
                      ) : null}
                    </div>

                    <div className="w-full max-w-sm space-y-3 xl:w-80">
                      <textarea
                        value={reviewNotes[submission.id] ?? submission.adminNotes ?? ''}
                        onChange={(event) => setReviewNotes((current) => ({ ...current, [submission.id]: event.target.value }))}
                        rows={4}
                        className={fieldClass}
                        placeholder="Kaniz Global Trade notes shown to supplier when needed"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" disabled={rowLoading} onClick={() => void reviewSubmission(submission, 'APPROVED')} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                          Approve
                        </button>
                        <button type="button" disabled={rowLoading} onClick={() => void reviewSubmission(submission, 'REJECTED')} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-60">
                          Reject
                        </button>
                      </div>
                      <button type="button" disabled={rowLoading} onClick={() => void reviewSubmission(submission, 'SUBMITTED')} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60">
                        Keep under review
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-6 py-12 text-sm text-gray-500">No verification submissions found.</div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[22px] border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-950">{value.toLocaleString()}</p>
    </div>
  )
}

function SubmissionBadge({ status }: { status: SubmissionStatus }) {
  const styles = {
    DRAFT: 'bg-gray-100 text-gray-600',
    SUBMITTED: 'bg-blue-50 text-blue-700',
    APPROVED: 'bg-emerald-50 text-emerald-700',
    REJECTED: 'bg-red-50 text-red-700',
  }
  const Icon = status === 'APPROVED' ? CheckCircle2 : status === 'REJECTED' ? XCircle : FileText

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      <Icon className="h-3.5 w-3.5" />
      {status.toLowerCase()}
    </span>
  )
}
