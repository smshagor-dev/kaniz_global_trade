'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Ban, CheckCircle2, FileWarning, Loader2, ShieldAlert, ShieldCheck, Siren, Waypoints } from 'lucide-react'
import { FraudEntityType, FraudReviewDecision } from '@prisma/client'
import toast from 'react-hot-toast'
import { get, patch } from '@/lib/utils/api-client'

type RiskBucket = {
  fraudRiskLevel: string
  _count: { _all: number }
}

type FraudCenterPayload = {
  overview: {
    totalUsers: number
    totalCompanies: number
    openAlerts: number
    userRiskStats: RiskBucket[]
    companyRiskStats: RiskBucket[]
  }
  recentAlerts: Array<{
    id: string
    reason: string
    description?: string | null
    status: string
    signalScore: number
    createdAt: string
    reportedBy: { firstName: string; lastName: string; email: string }
    targetUser?: { id: string; firstName: string; lastName: string; email: string; fraudRiskLevel: string } | null
    targetCompany?: { id: string; name: string; fraudRiskLevel: string; fraudPublicFlag?: string | null } | null
  }>
  recentHistory: Array<{
    id: string
    title: string
    sourceModule: string
    eventType: string
    ruleScore: number
    aiScore?: number | null
    resultingScore: number
    resultingLevel: string
    summary?: string | null
    createdAt: string
    user?: { firstName: string; lastName: string; email: string } | null
    company?: { name: string } | null
  }>
  deviceLogs: Array<{
    id: string
    ipAddress: string
    userAgent?: string | null
    loginCount: number
    isFlagged: boolean
    lastRiskLevel?: string | null
    lastSeenAt: string
    user: { firstName: string; lastName: string; email: string; fraudRiskLevel: string }
  }>
}

function countRisk(rows: RiskBucket[], level: string) {
  return rows.find((row) => row.fraudRiskLevel === level)?._count._all || 0
}

export default function AdminFraudAlertsPage() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['admin-fraud-center'],
    queryFn: () => get<FraudCenterPayload>('/admin/fraud-center'),
  })

  const reviewMutation = useMutation({
    mutationFn: (body: {
      entityType: FraudEntityType
      userId?: string
      companyId?: string
      alertId?: string
      historyId?: string
      decision: FraudReviewDecision
      note?: string
      requestedDocuments?: string[]
    }) => patch('/admin/fraud-center', body),
    onSuccess: () => {
      toast.success('Fraud review updated')
      qc.invalidateQueries({ queryKey: ['admin-fraud-center'] })
    },
    onError: (error: Error) => toast.error(error.message || 'Fraud review update failed'),
  })

  const payload = query.data?.data

  const stats = useMemo(() => {
    const userRows = payload?.overview.userRiskStats || []
    const companyRows = payload?.overview.companyRiskStats || []
    return {
      highUsers: countRisk(userRows, 'HIGH'),
      criticalUsers: countRisk(userRows, 'CRITICAL'),
      blockedUsers: countRisk(userRows, 'BLOCKED'),
      highCompanies: countRisk(companyRows, 'HIGH'),
      criticalCompanies: countRisk(companyRows, 'CRITICAL'),
      blockedCompanies: countRisk(companyRows, 'BLOCKED'),
    }
  }, [payload])

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-red-950 to-slate-900 px-6 py-7 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-200">Fraud monitoring</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black tracking-[-0.04em]">Fraud Center</h1>
              <p className="mt-3 text-sm leading-6 text-red-100/85">
                Unified supplier and buyer fraud monitoring with rule signals, AI review, admin actions, device logs, document risk tracking, and public trust status control.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-red-50">
              {payload ? `${payload.overview.openAlerts} open alerts` : 'Loading live fraud telemetry'}
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Siren className="h-5 w-5" />} label="Open alerts" value={payload?.overview.openAlerts || 0} tone="red" />
          <StatCard icon={<ShieldAlert className="h-5 w-5" />} label="High-risk users" value={stats.highUsers + stats.criticalUsers} tone="amber" />
          <StatCard icon={<Ban className="h-5 w-5" />} label="Blocked accounts" value={stats.blockedUsers + stats.blockedCompanies} tone="slate" />
          <StatCard icon={<Waypoints className="h-5 w-5" />} label="Monitored companies" value={payload?.overview.totalCompanies || 0} tone="blue" />
        </div>
      </section>

      {query.isLoading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : !payload ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-500">No fraud dashboard data found.</div>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Panel title="Risk distribution" subtitle="Buyer and supplier profiles currently under active monitoring.">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Users high', value: stats.highUsers, tone: 'amber' },
                  { label: 'Users critical', value: stats.criticalUsers, tone: 'red' },
                  { label: 'Companies high', value: stats.highCompanies, tone: 'amber' },
                  { label: 'Companies critical', value: stats.criticalCompanies, tone: 'red' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                    <p className={`mt-2 text-3xl font-black tracking-[-0.04em] ${item.tone === 'red' ? 'text-red-700' : 'text-amber-700'}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Device watchlist" subtitle="Recent IP and device activity linked to risky marketplace access.">
              <div className="space-y-3">
                {!payload.deviceLogs.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No device telemetry found.</div>
                ) : payload.deviceLogs.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{item.user.firstName} {item.user.lastName}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.user.email}</p>
                        <p className="mt-2 text-xs text-slate-500">{item.ipAddress} • {item.loginCount} logins</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.isFlagged ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                        {item.lastRiskLevel || 'SAFE'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Panel title="Recent fraud alerts" subtitle="Reports, evidence, and watchlist escalation from buyer and supplier activity.">
              {!payload.recentAlerts.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">No fraud alerts found.</div>
              ) : (
                <div className="space-y-4">
                  {payload.recentAlerts.map((alert) => (
                    <div key={alert.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-bold text-slate-950">{alert.reason}</h2>
                            <StatusChip status={alert.status} />
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{alert.description || 'No extra report description provided.'}</p>
                          <div className="mt-3 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                            <p>Reporter: {alert.reportedBy.firstName} {alert.reportedBy.lastName}</p>
                            <p>Signal score: {alert.signalScore}</p>
                            <p>Target user: {alert.targetUser ? `${alert.targetUser.firstName} ${alert.targetUser.lastName}` : 'Not linked'}</p>
                            <p>Target company: {alert.targetCompany?.name || 'Not linked'}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <ActionButton label="Approve" icon={<CheckCircle2 className="h-3.5 w-3.5" />} tone="emerald" onClick={() => reviewMutation.mutate({
                            entityType: alert.targetCompany ? FraudEntityType.COMPANY : FraudEntityType.USER,
                            userId: alert.targetUser?.id,
                            companyId: alert.targetCompany?.id,
                            alertId: alert.id,
                            decision: FraudReviewDecision.CLEAR_RESTRICTIONS,
                            note: 'Cleared after admin review.',
                          })} />
                          <ActionButton label="Restrict" icon={<AlertTriangle className="h-3.5 w-3.5" />} tone="amber" onClick={() => reviewMutation.mutate({
                            entityType: alert.targetCompany ? FraudEntityType.COMPANY : FraudEntityType.USER,
                            userId: alert.targetUser?.id,
                            companyId: alert.targetCompany?.id,
                            alertId: alert.id,
                            decision: FraudReviewDecision.RESTRICT,
                            note: 'Restricted from admin fraud center.',
                          })} />
                          <ActionButton label="Block" icon={<Ban className="h-3.5 w-3.5" />} tone="red" onClick={() => reviewMutation.mutate({
                            entityType: alert.targetCompany ? FraudEntityType.COMPANY : FraudEntityType.USER,
                            userId: alert.targetUser?.id,
                            companyId: alert.targetCompany?.id,
                            alertId: alert.id,
                            decision: FraudReviewDecision.BLOCK,
                            note: 'Blocked from admin fraud center.',
                          })} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="AI + rule history" subtitle="Combined fraud scoring history and resulting public trust state.">
              <div className="space-y-3">
                {!payload.recentHistory.length ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">No fraud history found.</div>
                ) : payload.recentHistory.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{row.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.sourceModule} • {row.eventType}</p>
                        <p className="mt-2 text-sm text-slate-600">{row.summary || `${row.user ? `${row.user.firstName} ${row.user.lastName}` : row.company?.name || 'Entity'} scored ${row.resultingScore}.`}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${riskTone(row.resultingLevel)}`}>
                        {row.resultingLevel}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Rule {row.ruleScore}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">AI {row.aiScore ?? 'N/A'}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Final {row.resultingScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </>
      )}
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'red' | 'amber' | 'slate' | 'blue' }) {
  const toneClass =
    tone === 'red'
      ? 'bg-red-50 text-red-700'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'blue'
          ? 'bg-blue-50 text-blue-700'
          : 'bg-slate-100 text-slate-700'

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>{icon}</div>
      <p className="mt-4 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950">{value}</p>
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${riskTone(status)}`}>{status.replace(/_/g, ' ')}</span>
}

function riskTone(level: string) {
  if (['BLOCKED', 'CRITICAL', 'OPEN'].includes(level)) return 'bg-red-50 text-red-700'
  if (['HIGH', 'WATCHLIST', 'INVESTIGATING'].includes(level)) return 'bg-amber-50 text-amber-700'
  if (['MEDIUM'].includes(level)) return 'bg-blue-50 text-blue-700'
  return 'bg-emerald-50 text-emerald-700'
}

function ActionButton({
  label,
  icon,
  tone,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  tone: 'emerald' | 'amber' | 'red'
  onClick: () => void
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
        : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'

  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold ${toneClass}`}>
      {icon}
      {label}
    </button>
  )
}
