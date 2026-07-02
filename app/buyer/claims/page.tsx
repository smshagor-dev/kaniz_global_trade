'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileWarning, Loader2, ShieldAlert } from 'lucide-react'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { uploadAsset } from '@/lib/utils/upload'

interface Policy {
  id: string
  providerName: string
  policyType: string
  status?: string
  statusLabel?: string
  sourceLabel?: string
}

interface Claim {
  id: string
  title: string
  claimAmount: number
  currencyCode: string
  status: string
  statusLabel: string
  resolutionNotes?: string | null
  evidenceUrlsList?: string[]
  policy: { providerName: string; policyType: string; status: string }
}

export default function BuyerClaimsPage() {
  const [form, setForm] = useState({
    policyId: '',
    title: '',
    description: '',
    claimAmount: 1000,
    currencyCode: 'USD',
    evidenceUrls: [] as string[],
  })
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const { data: policiesData } = useQuery({
    queryKey: ['buyer-claim-policies'],
    queryFn: () => get<{ items: Policy[] }>('/insurance-policies'),
  })
  const { data: claimsData, refetch, isLoading } = useQuery({
    queryKey: ['buyer-insurance-claims'],
    queryFn: () => get<Claim[]>('/insurance-claims'),
  })

  async function submit() {
    try {
      await post('/insurance-claims', form)
      toast.success('Claim submitted')
      setForm({ policyId: '', title: '', description: '', claimAmount: 1000, currencyCode: 'USD', evidenceUrls: [] })
      await refetch()
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to submit claim'
      toast.error(message)
    }
  }

  const policies = (policiesData?.data?.items || []) as Policy[]
  const claims = (claimsData?.data || []) as Claim[]
  const claimablePolicies = policies.filter((policy) => ['ACTIVE', 'CLAIM_OPEN'].includes(policy.status || ''))

  async function handleEvidenceUpload(fileList: FileList | null) {
    if (!fileList?.length) return

    setUploadingEvidence(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(fileList)) {
        const uploaded = await uploadAsset(file, 'insurance_claim_evidence')
        uploadedUrls.push(uploaded.url)
      }
      setForm((current) => ({ ...current, evidenceUrls: [...current.evidenceUrls, ...uploadedUrls] }))
      toast.success('Evidence uploaded')
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to upload claim evidence'
      toast.error(message)
    } finally {
      setUploadingEvidence(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d9ddd4] bg-white px-6 py-7 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-[#1f2937]">Insurance claims</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
          Open claims only against active coverage and track the full review status from buyer side.
        </p>
      </section>

      <section className="rounded-[28px] border border-[#d9ddd4] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1f2937]">Submit claim</h2>
        <p className="mt-1 text-sm text-[#68726b]">{claimablePolicies.length} claimable policies available</p>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Field label="Policy">
            <select value={form.policyId} onChange={(event) => setForm((current) => ({ ...current, policyId: event.target.value }))} className="w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937]">
              <option value="">Select policy</option>
              {claimablePolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>{policy.sourceLabel || policy.providerName} | {policy.policyType}</option>
              ))}
            </select>
          </Field>
          <Field label="Claim title">
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937]" />
          </Field>
          <Field label="Claim amount">
            <input type="number" value={form.claimAmount} onChange={(event) => setForm((current) => ({ ...current, claimAmount: Number(event.target.value) }))} className="w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937]" />
          </Field>
          <Field label="Currency">
            <input value={form.currencyCode} onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} className="w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937]" />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="w-full rounded-2xl border border-[#d9ddd4] bg-white px-3 py-2.5 text-sm text-[#1f2937]" />
          </Field>
          <Field label="Evidence files" className="md:col-span-2">
            <div className="rounded-2xl border border-dashed border-[#d9ddd4] bg-[#fafbf8] p-4">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#d9ddd4] bg-white px-4 py-2.5 text-sm font-semibold text-[#3e5840]">
                {uploadingEvidence ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                {uploadingEvidence ? 'Uploading evidence...' : 'Upload evidence'}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void handleEvidenceUpload(event.target.files)
                    event.target.value = ''
                  }}
                  disabled={uploadingEvidence}
                />
              </label>
              {form.evidenceUrls.length ? (
                <div className="mt-3 grid gap-2">
                  {form.evidenceUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-[#d9ddd4] bg-white px-3 py-2 text-sm text-[#1f2937]">
                      <span className="truncate">{url.split('/').pop() || 'Uploaded evidence'}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault()
                          setForm((current) => ({ ...current, evidenceUrls: current.evidenceUrls.filter((item) => item !== url) }))
                        }}
                        className="text-xs font-semibold text-[#b64242]"
                      >
                        Remove
                      </button>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#68726b]">Upload claim evidence here instead of sharing external document links.</p>
              )}
            </div>
          </Field>
          <div className="md:col-span-2">
            <button onClick={submit} className="rounded-2xl bg-[#243127] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d271f]">
              Submit claim
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#d9ddd4] bg-white shadow-sm">
        <div className="border-b border-[#e7eae3] px-6 py-5">
          <h2 className="text-lg font-semibold text-[#1f2937]">Claim activity</h2>
          <p className="mt-1 text-sm text-[#68726b]">Live review state for each submitted claim</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : !claims.length ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No insurance claims yet.</div>
        ) : (
          <div className="divide-y divide-[#eef1eb]">
            {claims.map((claim) => (
              <article key={claim.id} className="px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-[#1f2937]">{claim.title}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getClaimStatusTone(claim.status)}`}>
                        {claim.statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#49544e]">{claim.policy.providerName} · {claim.policy.policyType.replaceAll('_', ' ')}</p>
                    {claim.resolutionNotes ? <p className="mt-2 text-sm text-[#68726b]">{claim.resolutionNotes}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#738076]">
                      <span>{claim.evidenceUrlsList?.length || 0} evidence files</span>
                      <span>Policy status: {claim.policy.status.replaceAll('_', ' ')}</span>
                    </div>
                    {claim.evidenceUrlsList?.length ? (
                      <div className="mt-3 grid gap-2">
                        {claim.evidenceUrlsList.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#3e5840] hover:text-[#243127]">
                            Open {url.split('/').pop() || 'evidence'}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-sm text-[#5f6862] lg:text-right">
                    <p className="font-semibold text-[#1f2937]">{claim.currencyCode} {claim.claimAmount.toLocaleString()}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`space-y-2 text-sm text-[#49544e] ${className || ''}`}>
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}

function getClaimStatusTone(status: string) {
  switch (status) {
    case 'OPEN': return 'bg-[#fff4de] text-[#a66a00]'
    case 'UNDER_REVIEW': return 'bg-[#e7f1ff] text-[#265ea8]'
    case 'APPROVED': return 'bg-[#ede9fe] text-[#6b46c1]'
    case 'SETTLED': return 'bg-[#e7f6ec] text-[#216c43]'
    case 'REJECTED': return 'bg-[#fdecec] text-[#b64242]'
    default: return 'bg-[#eef1eb] text-[#5f6862]'
  }
}
