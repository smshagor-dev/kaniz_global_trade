import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { FileText, Plus, MapPin, Calendar, Package, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Request for Quotation (RFQ) Board',
  description: 'Browse open RFQs or post your own request to receive competitive quotations from global suppliers.',
}

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function RFQsPage({ searchParams }: Props) {
  const raw = await searchParams
  const categoryId = typeof raw.categoryId === 'string' ? raw.categoryId : undefined
  const pageValue = typeof raw.page === 'string' ? raw.page : '1'
  const page  = parseInt(pageValue || '1')
  const limit = 20
  const skip  = (page - 1) * limit

  const where: Record<string, unknown> = {
    status: 'OPEN',
    isPublic: true,
    deletedAt: null,
    expiresAt: { gt: new Date() },
  }
  if (categoryId) where.categoryId = categoryId

  const [rfqs, total, categories] = await Promise.all([
    prisma.rFQ.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { firstName: true, lastName: true } },
        category: { select: { name: true } },
        destinationCountry: { select: { name: true, flag: true } },
        currency: { select: { code: true, symbol: true } },
        _count: { select: { quotations: true } },
      },
    }),
    prisma.rFQ.count({ where }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
      take: 20,
    }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFQ Board</h1>
          <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} open requests for quotation</p>
        </div>
        <Link
          href="/rfqs/create"
          className="flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Post RFQ Free
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-52 flex-shrink-0">
          <div className="bg-white border border-gray-100 rounded-xl p-5 sticky top-20">
            <h3 className="font-bold text-gray-900 mb-3 text-sm">Filter by Category</h3>
            <Link
              href="/rfqs"
              className={`block text-sm px-2 py-1.5 rounded-lg mb-0.5 ${!categoryId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              All Categories
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/rfqs?categoryId=${c.id}`}
                className={`block text-sm px-2 py-1.5 rounded-lg mb-0.5 ${categoryId === c.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </aside>

        {/* RFQ list */}
        <main className="flex-1 space-y-4">
          {rfqs.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No RFQs found</h3>
            </div>
          ) : rfqs.map((rfq) => (
            <div key={rfq.id} className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {rfq.category && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{rfq.category.name}</span>
                    )}
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">Open</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{rfq.productName}</h3>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Qty: {rfq.quantity} {rfq.unit}</span>
                    {rfq.destinationCountry && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {rfq.destinationCountry.flag} {rfq.destinationCountry.name}
                      </span>
                    )}
                    {rfq.budget && (
                      <span>Budget: {rfq.currency?.symbol}{Number(rfq.budget).toLocaleString()} {rfq.currency?.code}</span>
                    )}
                    {rfq.requiredDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        By {new Date(rfq.requiredDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {rfq.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{rfq.description}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-900">{rfq._count.quotations}</p>
                  <p className="text-xs text-gray-400">quotes</p>
                  <Link
                    href={`/rfqs/${rfq.id}`}
                    className="mt-2 flex items-center gap-1 text-xs text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
                  >
                    Quote <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                <span>Posted by {rfq.buyer.firstName} {rfq.buyer.lastName[0]}.</span>
                <span>{new Date(rfq.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/rfqs?${new URLSearchParams({ ...(categoryId ? { categoryId } : {}), page: String(p) }).toString()}`}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm ${page === p ? 'bg-blue-700 text-white' : 'border border-gray-200 hover:border-blue-300'}`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
