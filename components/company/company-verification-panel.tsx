'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api, { get, post } from '@/lib/utils/api-client'
import { BadgeCheck, CheckCircle2, ExternalLink, FileText, Loader2, ShieldCheck, UploadCloud, XCircle } from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'

type CompanySummary = {
  id: string
  name: string
  slug: string
  verificationStatus?: string | null
  isVerified?: boolean
}

type VerificationSubmission = {
  id: string
  textValue?: string | null
  fileUrl?: string | null
  fileStorageKey?: string | null
  fileName?: string | null
  fileMimeType?: string | null
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  adminNotes?: string | null
  submittedAt?: string | null
}

type VerificationRequirement = {
  id: string
  title: string
  description?: string | null
  inputType: 'TEXT' | 'FILE' | 'BOTH'
  isRequired: boolean
  submission?: VerificationSubmission | null
}

type VerificationResponse = {
  company: CompanySummary
  requirements: VerificationRequirement[]
}

type VerificationDraft = {
  textValue: string
  fileUrl: string
  fileStorageKey: string
  fileName: string
  fileMimeType: string
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-blue-400'
const emptyDraft: VerificationDraft = { textValue: '', fileUrl: '', fileStorageKey: '', fileName: '', fileMimeType: '' }

function isVerifiedStatus(status?: string | null, isVerified?: boolean) {
  return !!isVerified || ['DOCUMENT_VERIFIED', 'PREMIUM_VERIFIED', 'ADMIN_VERIFIED'].includes(status || '')
}

function isPendingStatus(status?: string | null) {
  return status === 'DOCUMENT_SUBMITTED' || status === 'EMAIL_VERIFIED'
}

function formatVerificationBadgeLabel(status: string) {
  if (status === 'ADMIN_VERIFIED') return 'Verified'
  if (status === 'DOCUMENT_VERIFIED') return 'Document Verified'
  if (status === 'PREMIUM_VERIFIED') return 'Premium Verified'

  return status.replace(/_/g, ' ')
}

export function CompanyVerificationPanel({
  compactHeader = false,
  centerVerified = false,
}: {
  compactHeader?: boolean
  centerVerified?: boolean
}) {
  const [drafts, setDrafts] = useState<Record<string, VerificationDraft>>({})
  const [uploadingRequirementId, setUploadingRequirementId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['supplier-company-verification-panel'],
    queryFn: () => get<VerificationResponse>('/company-verification'),
  })

  const company = data?.data?.company
  const requirements = useMemo(() => data?.data?.requirements || [], [data?.data?.requirements])
  const verificationStatus = company?.verificationStatus || 'UNVERIFIED'
  const verified = isVerifiedStatus(verificationStatus, company?.isVerified)
  const hasSubmittedDocuments = requirements.some((requirement) => !!requirement.submission && requirement.submission.status !== 'DRAFT')
  const rejected = requirements.some((requirement) => requirement.submission?.status === 'REJECTED') || verificationStatus === 'REJECTED'
  const pending = !verified && !rejected && (hasSubmittedDocuments || isPendingStatus(verificationStatus))
  const canSubmit = !verified && (!pending || rejected)
  const readOnly = verified || pending

  useEffect(() => {
    const nextDrafts: Record<string, VerificationDraft> = {}
    requirements.forEach((requirement) => {
      nextDrafts[requirement.id] = {
        textValue: requirement.submission?.textValue || '',
        fileUrl: requirement.submission?.fileUrl || '',
        fileStorageKey: requirement.submission?.fileStorageKey || '',
        fileName: requirement.submission?.fileName || '',
        fileMimeType: requirement.submission?.fileMimeType || '',
      }
    })
    setDrafts(nextDrafts)
  }, [requirements])

  function updateDraft(requirementId: string, value: Partial<VerificationDraft>) {
    setDrafts((current) => ({
      ...current,
      [requirementId]: { ...emptyDraft, ...current[requirementId], ...value },
    }))
  }

  async function uploadFile(requirementId: string, file: File) {
    const body = new FormData()
    body.append('file', file)
    body.append('type', 'company_doc')

    setUploadingRequirementId(requirementId)
    try {
      const { data: result } = await api.post('/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const uploaded = result.data as { url: string; key: string; filename: string; mimeType: string }
      updateDraft(requirementId, {
        fileUrl: uploaded.url,
        fileStorageKey: uploaded.key,
        fileName: uploaded.filename,
        fileMimeType: uploaded.mimeType,
      })
      toast.success('Verification document uploaded')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Document upload failed'
      toast.error(message)
    } finally {
      setUploadingRequirementId(null)
    }
  }

  async function openFile(submissionId?: string | null) {
    if (!submissionId) return
    try {
      const response = await get<{ url: string }>(`/company-verification/submissions/${submissionId}/file-url`)
      if (!response.data?.url) throw new Error('Signed URL not available')
      window.open(response.data.url, '_blank', 'noopener,noreferrer')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to open private document'
      toast.error(message)
    }
  }

  async function submitDocuments() {
    setSubmitting(true)
    try {
      await post('/company-verification', {
        submissions: requirements.map((requirement) => ({
          requirementId: requirement.id,
          ...drafts[requirement.id],
        })),
      })
      toast.success('Verification documents submitted')
      await refetch()
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unable to submit verification documents'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (verified && centerVerified) {
    return (
      <section
        id="company-verification"
        className="flex min-h-[70vh] items-center justify-center rounded-[28px] border border-emerald-100 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_42%),linear-gradient(135deg,_#f7fffb,_#ecfdf5_45%,_#f0fdf4)] p-6 shadow-sm"
      >
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-emerald-500/12 shadow-[0_0_0_14px_rgba(16,185,129,0.08)]">
            <ShieldCheck className="h-16 w-16 text-emerald-700" />
            <BadgeCheck className="absolute -right-1 top-4 h-9 w-9 rounded-full bg-white p-1 text-emerald-600 shadow-sm" />
          </div>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-emerald-700">Kaniz Global Trade Trust Signal</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
            {company?.name || 'Your Company'} is Verified
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Your company has earned the Kaniz Global Trade verified badge. Buyers can now see this trust mark across your supplier profile and marketplace presence.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-sm">
            <CheckCircle2 className="h-5 w-5" />
            Verified
            <BadgeCheck className="h-5 w-5" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="company-verification" className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          {!compactHeader ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Company Verification
            </span>
          ) : null}
          <h2 className={`${compactHeader ? '' : 'mt-3'} flex items-center gap-2 text-xl font-bold text-gray-900`}>
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            Company Verification Documents
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {verified
              ? 'Your company verification is approved. Buyers will see the verified trust signal.'
              : pending
                ? 'Your documents are submitted and waiting for Kaniz Global Trade verification.'
                : rejected
                  ? 'Kaniz Global Trade rejected one or more documents. Review notes, update the files or text, then submit again.'
                  : 'Submit the documents and written details requested by Kaniz Global Trade for company verification.'}
          </p>
        </div>
        <VerificationStatusBadge status={verificationStatus} verified={verified} pending={pending} rejected={rejected} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : requirements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
          Kaniz Global Trade has not configured company verification document requirements yet.
        </div>
      ) : (
        <div className="space-y-4">
          {requirements.map((requirement) => {
            const draft = drafts[requirement.id]
            const submission = requirement.submission
            const needsText = requirement.inputType === 'TEXT' || requirement.inputType === 'BOTH'
            const needsFile = requirement.inputType === 'FILE' || requirement.inputType === 'BOTH'

            return (
              <div key={requirement.id} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-950">
                      {requirement.title}
                      {requirement.isRequired ? <span className="text-red-500"> *</span> : null}
                    </h3>
                    {requirement.description ? <p className="mt-1 text-sm text-gray-500">{requirement.description}</p> : null}
                  </div>
                  {submission ? <SubmissionBadge status={submission.status} /> : <SubmissionBadge status="DRAFT" />}
                </div>

                {needsText ? (
                  <textarea
                    value={draft?.textValue || ''}
                    onChange={(event) => updateDraft(requirement.id, { textValue: event.target.value })}
                    rows={4}
                    readOnly={readOnly}
                    className={`${inputCls} mt-4 bg-white ${readOnly ? 'cursor-default text-gray-600' : ''}`}
                    placeholder={readOnly ? 'No text submitted' : 'Enter the requested verification details'}
                  />
                ) : null}

                {needsFile ? (
                  <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <FileText className="h-4 w-4 text-blue-700" />
                          {draft?.fileName || submission?.fileName || 'No document uploaded yet'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {readOnly ? 'Submitted document is locked while verification is pending or approved.' : 'PDF, Word, or Excel document up to 20 MB.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {submission?.fileStorageKey ? (
                          <button
                            type="button"
                            onClick={() => void openFile(submission.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:text-blue-700"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open document
                          </button>
                        ) : null}
                        {!readOnly ? (
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-800">
                            {uploadingRequirementId === requirement.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                            {uploadingRequirementId === requirement.id ? 'Uploading...' : 'Upload file'}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                              className="hidden"
                              disabled={uploadingRequirementId === requirement.id}
                              onChange={(event) => {
                                const file = event.target.files?.[0]
                                if (file) void uploadFile(requirement.id, file)
                                event.target.value = ''
                              }}
                            />
                          </label>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {submission?.adminNotes ? (
                  <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
                    <span className="font-semibold">Kaniz Global Trade notes:</span> {submission.adminNotes}
                  </div>
                ) : null}
              </div>
            )
          })}

          {canSubmit ? (
            <div className="flex justify-end">
              <LoadingButton
                type="button"
                onClick={submitDocuments}
                loading={submitting}
                loadingText="Submitting..."
                icon={<ShieldCheck className="h-4 w-4" />}
                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                {rejected ? 'Resubmit Verification Documents' : 'Submit Verification Documents'}
              </LoadingButton>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function VerificationStatusBadge({
  status,
  verified,
  pending,
  rejected,
}: {
  status: string
  verified: boolean
  pending: boolean
  rejected: boolean
}) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        Verified
        <BadgeCheck className="h-4 w-4" />
      </span>
    )
  }

  if (pending) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-700">
        <FileText className="h-4 w-4" />
        Verification pending
      </span>
    )
  }

  if (rejected) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-700">
        <XCircle className="h-4 w-4" />
        Rejected
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-600">
      <ShieldCheck className="h-4 w-4" />
      {formatVerificationBadgeLabel(status)}
      <BadgeCheck className="h-4 w-4" />
    </span>
  )
}

function SubmissionBadge({ status }: { status: VerificationSubmission['status'] }) {
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
      {status.toLowerCase().replace(/_/g, ' ')}
    </span>
  )
}
