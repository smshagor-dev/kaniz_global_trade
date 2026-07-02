import { AlertTriangle, Ban, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { type FraudPublicFlag } from '@prisma/client'
import { formatPublicTrustLabel } from '@/lib/fraud/shared'

export function TrustBadge({ flag }: { flag?: FraudPublicFlag | null }) {
  if (!flag) return null

  const label = formatPublicTrustLabel(flag)
  if (!label) return null

  const tone =
    flag === 'VERIFIED'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : flag === 'UNDER_REVIEW'
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : flag === 'LIMITED_ACCESS'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : flag === 'HIGH_RISK'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-slate-300 bg-slate-100 text-slate-700'

  const Icon =
    flag === 'VERIFIED'
      ? CheckCircle2
      : flag === 'UNDER_REVIEW'
        ? ShieldCheck
        : flag === 'LIMITED_ACCESS'
          ? AlertTriangle
          : flag === 'HIGH_RISK'
            ? ShieldAlert
            : Ban

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}
