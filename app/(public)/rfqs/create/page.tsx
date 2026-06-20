import type { Metadata } from 'next'
import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { RFQCreateForm } from '@/components/public/rfq-create-form'

export const metadata: Metadata = {
  title: 'Post RFQ',
  description: 'Create a new request for quotation and receive offers from verified suppliers.',
}

export default async function CreateRFQPage() {
  const [categories, countries, currencies] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null, approvalStatus: 'APPROVED' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
      take: 50,
    }),
    prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
      take: 250,
    }),
    prisma.currency.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      select: { id: true, name: true, code: true, symbol: true },
    }),
  ])

  return (
    <div className="bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_100%)]">
      <div className="w-full px-4 py-10 md:px-6 lg:px-8 2xl:px-10">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Buyer Central</p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950">Tell suppliers what you need</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Post a request for quotation, describe your product requirements, and collect competitive supplier offers from the marketplace.
            </p>
          </div>
          <Link href="/rfqs" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
            Back to RFQ board
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <RFQCreateForm categories={categories} countries={countries} currencies={currencies} />

          <div className="space-y-4">
            {[
              'Describe product quality, material, or customization clearly.',
              'Add quantity and destination country for better quotations.',
              'Keep your RFQ public to reach more matching suppliers.',
              'Use your dashboard to compare quotations after submission.',
            ].map((tip, index) => (
              <div key={tip} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Tip {index + 1}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
