import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Calendar, FileText, MapPin, Package, Quote, type LucideIcon } from 'lucide-react'
import prisma from '@/lib/db/prisma'
import { buildPublicActiveRFQWhere } from '@/lib/rfqs/visibility'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { RFQQuotationPanel } from '@/components/public/rfq-quotation-panel'
import { TrustBadge } from '@/components/public/trust-badge'

export const metadata: Metadata = {
  title: 'RFQ Detail',
  description: 'Review RFQ requirements and submit your supplier quotation.',
}

export default async function PublicRFQDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const rfq = await prisma.rFQ.findFirst({
    where: {
      id,
      ...buildPublicActiveRFQWhere(),
    },
    select: {
      id: true,
      buyerId: true,
      productName: true,
      quantity: true,
      unit: true,
      budget: true,
      requiredDate: true,
      description: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      quotationCount: true,
      buyer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fraudPublicFlag: true,
        },
      },
      category: { select: { id: true, name: true } },
      destinationCountry: { select: { id: true, name: true, flag: true } },
      currency: { select: { code: true, symbol: true } },
      _count: { select: { quotations: true } },
    },
  })

  if (!rfq) {
    notFound()
  }

  return (
    <div className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)]">
      <div className="w-full px-4 py-10 md:px-6 lg:px-8 2xl:px-10">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Active RFQ</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950">{rfq.productName}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Review the buyer&apos;s sourcing request, then submit your quotation if your company can fulfill it.
            </p>
          </div>
          <Link href="/rfqs" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            Back to RFQ board
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                {rfq.category ? (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {rfq.category.name}
                  </span>
                ) : null}
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  rfq.status === 'RECEIVING_QUOTATIONS' ? 'bg-violet-50 text-violet-700' : 'bg-green-50 text-green-700'
                }`}>
                  {rfq.status === 'RECEIVING_QUOTATIONS' ? 'Receiving Quotations' : 'Open'}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {rfq._count.quotations} quotations
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <InfoCard icon={Package} label="Quantity" value={`${rfq.quantity}${rfq.unit ? ` ${rfq.unit}` : ''}`} />
                <InfoCard
                  icon={MapPin}
                  label="Delivery location"
                  value={rfq.destinationCountry ? `${rfq.destinationCountry.flag ? `${rfq.destinationCountry.flag} ` : ''}${rfq.destinationCountry.name}` : 'Not specified'}
                />
                <InfoCard
                  icon={Calendar}
                  label="Deadline"
                  value={rfq.requiredDate ? new Date(rfq.requiredDate).toLocaleDateString() : 'Open'}
                />
                <InfoCard
                  icon={Quote}
                  label="Budget"
                  value={rfq.budget ? undefined : 'Not specified'}
                  content={rfq.budget ? <CurrencyAmount amount={rfq.budget} currencyCode={rfq.currency?.code} showCode /> : null}
                />
                <InfoCard
                  icon={FileText}
                  label="Posted"
                  value={new Date(rfq.createdAt).toLocaleDateString()}
                />
                <InfoCard
                  icon={Calendar}
                  label="Public visibility"
                  value={rfq.expiresAt ? `Until ${new Date(rfq.expiresAt).toLocaleDateString()}` : 'Active'}
                />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Requirements</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {rfq.description || 'The buyer has not added extra requirement notes for this RFQ yet.'}
              </p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">Buyer information</h2>
              <div className="mt-3">
                <TrustBadge flag={rfq.buyer.fraudPublicFlag} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Buyer contact: {rfq.buyer.firstName} {rfq.buyer.lastName ? `${rfq.buyer.lastName[0]}.` : ''}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Sensitive buyer-only details stay private until the buyer reviews supplier quotations.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <RFQQuotationPanel
              rfq={{
                id: rfq.id,
                buyerId: rfq.buyerId,
                productName: rfq.productName,
                quantity: rfq.quantity,
                unit: rfq.unit,
                status: rfq.status,
                currency: rfq.currency,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
  content,
}: {
  icon: LucideIcon
  label: string
  value?: string
  content?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon className="h-4 w-4 text-blue-600" />
        {label}
      </div>
      <div className="mt-2 text-sm text-slate-600">{content || value}</div>
    </div>
  )
}
