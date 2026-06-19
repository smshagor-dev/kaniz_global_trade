'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

export default function BuyerVerificationPage() {
  const { data, refetch } = useQuery({
    queryKey: ['buyer-verification'],
    queryFn: () => get<Record<string, unknown> | null>('/buyer-verification'),
  })

  const [form, setForm] = useState({
    companyName: '',
    registrationNo: '',
    businessLicenseNo: '',
    taxId: '',
    website: '',
    companyAddress: '',
    contactRole: '',
    notes: '',
  })

  useEffect(() => {
    const value = data?.data
    if (!value) return
    setForm({
      companyName: String(value.companyName || ''),
      registrationNo: String(value.registrationNo || ''),
      businessLicenseNo: String(value.businessLicenseNo || ''),
      taxId: String(value.taxId || ''),
      website: String(value.website || ''),
      companyAddress: String(value.companyAddress || ''),
      contactRole: String(value.contactRole || ''),
      notes: String(value.notes || ''),
    })
  }, [data])

  async function save(submit: boolean) {
    await post('/buyer-verification', { ...form, documentUrls: [], submit })
    toast.success(submit ? 'Verification submitted' : 'Verification draft saved')
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buyer Verification</h1>
          <p className="text-sm text-gray-500 mt-1">Submit your business identity so suppliers can trust your company.</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
          {String(data?.data?.status || 'NOT_STARTED')}
        </span>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 grid md:grid-cols-2 gap-4">
        {[
          ['companyName', 'Company Name'],
          ['registrationNo', 'Registration No'],
          ['businessLicenseNo', 'Business License No'],
          ['taxId', 'Tax / VAT ID'],
          ['website', 'Website'],
          ['contactRole', 'Your Role'],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        ))}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
          <textarea
            value={form.companyAddress}
            onChange={(e) => setForm((prev) => ({ ...prev, companyAddress: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-24"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-24"
          />
        </div>

        <div className="md:col-span-2 flex gap-3">
          <button onClick={() => save(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium">Save Draft</button>
          <button onClick={() => save(true)} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium">Submit Verification</button>
        </div>
      </div>
    </div>
  )
}
