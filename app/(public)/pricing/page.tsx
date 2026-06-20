import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { CheckCircle, X, Zap, Shield, Star, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Membership Plans & Pricing',
  description: 'Choose the right plan for your business. Free to Enterprise plans for global suppliers.',
}

export default async function PricingPage() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  })

  const features = [
    { label: 'Products Listed',       key: 'maxProducts',        format: (v: number) => v >= 999999 ? 'Unlimited' : v.toString() },
    { label: 'Staff Members',         key: 'maxStaff',           format: (v: number) => v.toString() },
    { label: 'Images per Product',    key: 'maxImages',          format: (v: number) => v.toString() },
    { label: 'Verification Badge',    key: 'verificationBadge',  format: (v: boolean) => v },
    { label: 'Analytics Dashboard',   key: 'analytics',          format: (v: boolean) => v },
    { label: 'Featured Products',     key: 'featuredProducts',   format: (v: boolean) => v },
    { label: 'Featured Company',      key: 'featuredCompany',    format: (v: boolean) => v },
    { label: 'Priority Ranking',      key: 'priorityRanking',    format: (v: boolean) => v },
    { label: 'API Access',            key: 'apiAccess',          format: (v: boolean) => v },
    { label: 'Dedicated Support',     key: 'dedicatedSupport',   format: (v: boolean) => v },
  ]

  const planHighlights: Record<string, { color: string; badge?: string; icon: React.ElementType }> = {
    free:       { color: 'gray',   icon: Shield },
    standard:   { color: 'blue',   badge: 'Popular', icon: Zap },
    premium:    { color: 'purple', badge: 'Best Value', icon: Star },
    enterprise: { color: 'orange', icon: ArrowRight },
  }

  return (
    <div className="w-full px-4 py-16 md:px-6 lg:px-8 2xl:px-10">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Choose the plan that fits your business. All plans include our core marketplace features. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {plans.map((plan) => {
          const highlight = planHighlights[plan.slug] || { color: 'blue', icon: Zap }
          const Icon = highlight.icon
          const isPopular = highlight.badge === 'Popular'
          const isBest = highlight.badge === 'Best Value'

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col ${
                isPopular ? 'border-blue-500 shadow-xl shadow-blue-100' :
                isBest    ? 'border-purple-500 shadow-xl shadow-purple-100' :
                'border-gray-100'
              }`}
            >
              {highlight.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full ${
                  isPopular ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                }`}>
                  {highlight.badge}
                </div>
              )}

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-${highlight.color}-50`}>
                <Icon className={`w-5 h-5 text-${highlight.color}-600`} />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

              <div className="mb-5">
                {Number(plan.monthlyPrice) === 0 ? (
                  <p className="text-3xl font-extrabold text-gray-900">Free</p>
                ) : (
                  <>
                    <p className="text-3xl font-extrabold text-gray-900">
                      ${Number(plan.monthlyPrice).toFixed(0)}
                      <span className="text-base font-normal text-gray-500">/mo</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      or ${Number(plan.yearlyPrice).toFixed(0)}/yr (save {Math.round((1 - Number(plan.yearlyPrice) / (Number(plan.monthlyPrice) * 12)) * 100)}%)
                    </p>
                  </>
                )}
                {plan.trialDays > 0 && (
                  <p className="text-xs text-green-600 font-medium mt-1">{plan.trialDays}-day free trial</p>
                )}
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{Number(plan.maxProducts) >= 999999 ? 'Unlimited' : plan.maxProducts} products</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Up to {plan.maxStaff} staff members</span>
                </li>
                {plan.verificationBadge && (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Verification badge</span>
                  </li>
                )}
                {plan.analytics && (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Analytics dashboard</span>
                  </li>
                )}
                {plan.featuredProducts && (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Featured products</span>
                  </li>
                )}
                {plan.priorityRanking && (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Priority search ranking</span>
                  </li>
                )}
                {plan.apiAccess && (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>API access</span>
                  </li>
                )}
                {plan.dedicatedSupport && (
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Dedicated support</span>
                  </li>
                )}
              </ul>

              <Link
                href={`/auth/register?role=SUPPLIER_OWNER&plan=${plan.slug}`}
                className={`w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isPopular ? 'bg-blue-700 text-white hover:bg-blue-800' :
                  isBest    ? 'bg-purple-700 text-white hover:bg-purple-800' :
                  Number(plan.monthlyPrice) === 0 ? 'border border-gray-200 text-gray-700 hover:bg-gray-50' :
                  'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {Number(plan.monthlyPrice) === 0 ? 'Get Started Free' : plan.slug === 'enterprise' ? 'Contact Sales' : `Start ${plan.trialDays > 0 ? 'Free Trial' : 'Now'}`}
              </Link>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            { q: 'Can I switch plans anytime?', a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.' },
            { q: 'What payment methods do you accept?', a: 'We accept credit/debit cards via Stripe, SSLCommerz and aamarPay for Bangladesh, PayPal, and manual bank transfers.' },
            { q: 'Is there a free trial?', a: 'Standard, Premium and Enterprise plans include free trials (7, 14, and 30 days respectively).' },
            { q: 'What happens to my products if I downgrade?', a: 'Products over your new plan limit will be hidden but not deleted. Upgrade to restore visibility.' },
            { q: 'Do you offer refunds?', a: 'We offer a 7-day money-back guarantee on all paid plans. Contact support within 7 days of purchase.' },
          ].map((item) => (
            <div key={item.q} className="bg-white border border-gray-100 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-2">{item.q}</h3>
              <p className="text-sm text-gray-600">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
