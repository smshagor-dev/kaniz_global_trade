'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { get, post, del } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'

interface Company {
  id: string
  name: string
}

interface Tour {
  id: string
  title: string
  description?: string
  videoUrl: string
  language: string
  isFeatured: boolean
}

export default function VirtualToursPage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    language: 'en',
    isFeatured: false,
  })

  const { data: companyData } = useQuery({
    queryKey: ['my-company'],
    queryFn: () => get<Company>('/me/company'),
  })
  const company = companyData?.data as Company | undefined

  const { data: toursData, refetch } = useQuery({
    queryKey: ['company-virtual-tours', company?.id],
    queryFn: () => get<Tour[]>(`/companies/${company?.id}/virtual-tours`),
    enabled: !!company?.id,
  })

  async function submit() {
    if (!company?.id) return
    await post(`/companies/${company.id}/virtual-tours`, form)
    toast.success('Virtual tour added')
    setForm({ title: '', description: '', videoUrl: '', thumbnailUrl: '', language: 'en', isFeatured: false })
    refetch()
  }

  async function removeTour(id: string) {
    if (!company?.id) return
    await del(`/companies/${company.id}/virtual-tours?tourId=${id}`)
    toast.success('Virtual tour deleted')
    refetch()
  }

  const tours = (toursData?.data || []) as Tour[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Virtual Factory Tours</h1>
        <p className="text-sm text-gray-500 mt-1">Upload factory walk-through videos to build supplier trust before the first order.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-5 grid md:grid-cols-2 gap-4">
        <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Tour title" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.videoUrl} onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))} placeholder="Video URL" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.thumbnailUrl} onChange={(e) => setForm((prev) => ({ ...prev, thumbnailUrl: e.target.value }))} placeholder="Thumbnail URL" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={form.language} onChange={(e) => setForm((prev) => ({ ...prev, language: e.target.value }))} placeholder="Language code" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="What buyers will see in this tour" className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm min-h-28" />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((prev) => ({ ...prev, isFeatured: e.target.checked }))} />
          Featured tour
        </label>
        <div className="md:col-span-2">
          <button onClick={submit} className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm">Save Tour</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {tours.map((tour) => (
          <div key={tour.id} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4">
              <video src={tour.videoUrl} controls className="w-full h-full object-cover" />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">{tour.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{tour.description}</p>
              </div>
              <button onClick={() => removeTour(tour.id)} className="text-xs text-red-600 border border-red-200 rounded-lg px-2 py-1">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
