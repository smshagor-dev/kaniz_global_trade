export const PACKAGE_ACCESS_STATUSES = ['ACTIVE', 'TRIAL'] as const

export type PackageAccessStatus = (typeof PACKAGE_ACCESS_STATUSES)[number]

export function hasPackageAccess(subscription?: {
  status?: string | null
  currentPeriodEnd?: Date | string | null
} | null) {
  if (!subscription?.status || !PACKAGE_ACCESS_STATUSES.includes(subscription.status as PackageAccessStatus)) {
    return false
  }

  if (!subscription.currentPeriodEnd) return true
  return new Date(subscription.currentPeriodEnd) >= new Date()
}

export function getPlanPrice(
  plan: { monthlyPrice: number | string | { toString(): string }; yearlyPrice: number | string | { toString(): string } },
  billingCycle: 'MONTHLY' | 'YEARLY'
) {
  return Number(billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice)
}

export function isFreePlan(
  plan: { monthlyPrice: number | string | { toString(): string }; yearlyPrice: number | string | { toString(): string } },
  billingCycle: 'MONTHLY' | 'YEARLY'
) {
  return getPlanPrice(plan, billingCycle) <= 0
}
