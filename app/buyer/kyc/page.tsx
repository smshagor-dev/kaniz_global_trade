'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

export default function BuyerKycPage() {
  const { data, refetch } = useQuery({
    queryKey: ['buyer-kyc'],
    queryFn: () => get<Record<string, unknown> | null>('/kyc'),
  })

  const current = (data?.data || null) as Record<string, unknown> | null
  const [form, setForm] = useState({
    legalName: String(current?.legalName || ''),
    passportNumber: String(current?.passportNumber || ''),
    nationalIdNumber: String(current?.nationalIdNumber || ''),
    businessLicenseNumber: String(current?.businessLicenseNumber || ''),
    bankAccountName: String(current?.bankAccountName || ''),
    bankAccountNumber: String(current?.bankAccountNumber || ''),
    bankName: String(current?.bankName || ''),
    notes: String(current?.notes || ''),
  })

  async function submit(submit: boolean) {
    await post('/kyc', { ...form, documentUrls: [], submit })
    toast.success(submit ? 'KYC submitted' : 'KYC draft saved')
    refetch()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KYC Compliance</h1>
        <p className="text-sm text-gray-500 mt-1">Submit identity, business, and banking details for higher trade limits and stronger trust signals.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="mb-4 text-sm text-gray-600">Current status: <span className="font-semibold text-gray-900">{String(current?.status || 'DRAFT')}</span></div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ['legalName', 'Legal name'],
            ['passportNumber', 'Passport number'],
            ['nationalIdNumber', 'National ID number'],
            ['businessLicenseNumber', 'Business license number'],
            ['bankAccountName', 'Bank account name'],
            ['bankAccountNumber', 'Bank account number'],
            ['bankName', 'Bank name'],
          ].map(([key, label]) => (
            <input
              key={key}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={label}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          ))}
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Compliance notes"
            className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-28"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => submit(false)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm">Save Draft</button>
          <button onClick={() => submit(true)} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm">Submit KYC</button>
        </div>
      </div>
    </div>
  )
}
