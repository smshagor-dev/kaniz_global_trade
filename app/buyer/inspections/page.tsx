'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { get } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { CheckCircle2, ClipboardCheck, Loader2, ShieldCheck, Truck } from 'lucide-react'

interface BuyerInspectionResponse {
  stats: {
    supplierCompanies: number
    totalReports: number
    verifiedReports: number
    completedReports: number
  }
  companies: Array<{
    companyId: string
    company?: {
      id: string
      name: string
      slug: string
      country?: { name: string; flag: string | null } | null
    } | null
    orderContext: {
      tradeOrders: number
      sampleOrders: number
      lastOrderAt: string | null
    }
    reports: Array<{
      id: string
      companyId: string
      providerName: string
      reportNumber: string
      score?: number | null
      summary?: string | null
      status: 'COMPLETED' | 'VERIFIED'
      reportUrl?: string | null
      reportStorageKey?: string | null
      reportFilename?: string | null
      inspectedAt?: string | null
      verifiedAt?: string | null
    }>
  }>
}

export default function BuyerInspectionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['buyer-inspections'],
    queryFn: () => get<BuyerInspectionResponse>('/buyer/inspections'),
  })

  const payload = data?.data as BuyerInspectionResponse | undefined
  const stats = payload?.stats || {
    supplierCompanies: 0,
    totalReports: 0,
    verifiedReports: 0,
    completedReports: 0,
  }
  const companies = payload?.companies || []

  async function openPrivateReport(companyId: string, reportId: string) {
    try {
      const response = await get<{ url: string }>(`/companies/${companyId}/inspections/${reportId}/report-url`)
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
              Buyer trust desk
            </span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#1f2937]">Supplier inspections</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#616b64]">
              Review verified and completed factory inspections from suppliers you already trade with, so purchase decisions stay grounded in real compliance evidence instead of claims alone.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Supplier companies', value: stats.supplierCompanies, icon: Truck },
          { label: 'Visible reports', value: stats.totalReports, icon: ClipboardCheck },
          { label: 'Verified reports', value: stats.verifiedReports, icon: ShieldCheck },
          { label: 'Completed reports', value: stats.completedReports, icon: CheckCircle2 },
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
          <h2 className="text-lg font-semibold text-[#1f2937]">Inspection visibility by supplier</h2>
          <p className="mt-1 text-sm text-[#68726b]">{companies.length} supplier companies linked to your orders</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#4f5d49]" /></div>
        ) : companies.length === 0 ? (
          <div className="px-6 py-12 text-sm text-[#68726b]">No supplier inspection reports are available for your current trade or sample orders yet.</div>
        ) : (
          <div className="divide-y divide-[#eef1eb]">
            {companies.map((entry) => (
              <div key={entry.companyId} className="px-6 py-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-[#1f2937]">{entry.company?.name || 'Supplier company'}</h2>
                      {entry.company?.country?.name ? (
                        <span className="rounded-full bg-[#f3f5ef] px-2.5 py-1 text-xs font-semibold text-[#3e5840]">
                          {entry.company.country.flag || ''} {entry.company.country.name}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-[#68726b]">
                      Trade orders: {entry.orderContext.tradeOrders} | Sample orders: {entry.orderContext.sampleOrders}
                      {entry.orderContext.lastOrderAt ? ` | Last order ${new Date(entry.orderContext.lastOrderAt).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  {entry.company?.slug ? (
                    <Link href={`/companies/${entry.company.slug}`} className="inline-flex items-center rounded-lg border border-[#d9ddd4] px-4 py-2 text-sm font-medium text-[#58635d]">
                      Open supplier profile
                    </Link>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {entry.reports.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#d9ddd4] bg-[#fafbf8] px-4 py-5 text-sm text-[#68726b]">
                      No completed or verified inspection reports shared with buyers yet.
                    </div>
                  ) : (
                    entry.reports.map((report) => (
                      <div key={report.id} className="rounded-2xl border border-[#e7eae3] bg-[#fafbf8] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[#1f2937]">{report.providerName}</p>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${report.status === 'VERIFIED' ? 'bg-[#eef7ee] text-[#2f6b39]' : 'bg-[#eef2e7] text-[#3e5840]'}`}>
                            {report.status === 'VERIFIED' ? 'Verified' : 'Completed'}
                          </span>
                          {typeof report.score === 'number' ? (
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#3e5840]">
                              Score {report.score}/100
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-[#738076]">Report #{report.reportNumber}</p>
                        {report.summary ? <p className="mt-3 text-sm leading-7 text-[#5f6862]">{report.summary}</p> : null}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#738076]">
                          <span>Inspected: {report.inspectedAt ? new Date(report.inspectedAt).toLocaleDateString() : 'Not set'}</span>
                          {report.verifiedAt ? <span>Verified: {new Date(report.verifiedAt).toLocaleDateString()}</span> : null}
                        </div>
                        {report.reportUrl ? (
                          <a href={report.reportUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-[#3e5840] hover:text-[#243127]">
                            Open report URL
                          </a>
                        ) : null}
                        {report.reportStorageKey ? (
                          <button type="button" onClick={() => void openPrivateReport(entry.companyId, report.id)} className="mt-3 inline-flex text-sm font-semibold text-[#2b5f77] hover:text-[#20485a]">
                            Open private attachment
                          </button>
                        ) : null}
                        {report.reportFilename ? <p className="mt-1 text-xs text-[#738076]">{report.reportFilename}</p> : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
