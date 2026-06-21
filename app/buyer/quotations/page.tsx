'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { get } from '@/lib/utils/api-client'
import { CurrencyAmount } from '@/components/currency/currency-amount'
import { getQuotationStatusMeta } from '@/lib/trade/status'

interface BuyerQuotation {
  id: string
  status: string
  totalPrice: number
  currencyCode: string
  createdAt: string
  deliveryTime?: string | null
  rfq?: { id: string; productName: string; quantity: string } | null
  company: {
    id: string
    name: string
    slug: string
    companyUsers: Array<{
      user: {
        firstName: string
        lastName: string
      }
    }>
  }
}

export default function BuyerQuotationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['buyer-quotations'],
    queryFn: () => get<BuyerQuotation[]>('/quotations?limit=100'),
  })

  const quotations = data?.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Received quotations</h1>
        <p className="mt-1 text-sm text-gray-500">Review every supplier offer submitted against your RFQs.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : quotations.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-sm text-gray-500">
          No quotations have been received yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">RFQ</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Quoted price</th>
                  <th className="px-4 py-3">Delivery time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotations.map((quotation) => {
                  const supplier = quotation.company.companyUsers[0]?.user
                  const statusMeta = getQuotationStatusMeta(quotation.status)
                  return (
                    <tr key={quotation.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">{quotation.rfq?.productName || 'Custom quotation'}</p>
                        <p className="mt-1 text-xs text-gray-500">RFQ ID: {quotation.rfq?.id || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{quotation.company.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {supplier ? `${supplier.firstName} ${supplier.lastName}` : 'Primary contact unavailable'}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-semibold text-gray-900">
                        <CurrencyAmount amount={quotation.totalPrice} currencyCode={quotation.currencyCode} showCode />
                      </td>
                      <td className="px-4 py-4 text-gray-600">{quotation.deliveryTime || 'Not specified'}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                          {statusMeta.shortLabel}
                        </span>
                        <p className="mt-2 max-w-[220px] text-xs text-gray-500">{statusMeta.description}</p>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{new Date(quotation.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        <Link href={quotation.rfq?.id ? `/buyer/rfqs/${quotation.rfq.id}` : `/buyer/quotations/${quotation.id}`} className="font-semibold text-blue-700 hover:text-blue-800">
                          {quotation.rfq?.id ? 'View RFQ detail' : 'View quotation'}
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
