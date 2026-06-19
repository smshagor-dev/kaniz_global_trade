'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { get, post } from '@/lib/utils/api-client'
import { useRouter } from 'next/navigation'
import { Package, Upload, Plus, Trash2, Loader2, ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import api from '@/lib/utils/api-client'
import { LoadingButton } from '@/components/ui/loading-button'

const schema = z.object({
  name:             z.string().min(3, 'Name must be at least 3 characters').max(500),
  categoryId:       z.string().min(1, 'Category is required'),
  subcategoryId:    z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  description:      z.string().optional(),
  sku:              z.string().optional(),
  moq:              z.string().optional(),
  moqUnit:          z.string().optional(),
  priceMin:         z.string().optional(),
  priceMax:         z.string().optional(),
  priceNegotiable:  z.boolean().default(true),
  productionCapacity: z.string().optional(),
  leadTime:         z.string().optional(),
  packagingDetails: z.string().optional(),
  seoTitle:         z.string().optional(),
  seoDescription:   z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function NewProductPage() {
  const router = useRouter()
  const [images, setImages]   = useState<{ url: string; isPrimary: boolean }[]>([])
  const [uploading, setUploading] = useState(false)
  const [specs, setSpecs]     = useState<{ key: string; value: string; unit: string }[]>([])
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'trade' | 'seo'>('basic')

  const { data: companyData } = useQuery({
    queryKey: ['my-company'],
    queryFn:  () => get<{ id: string }[]>('/companies?myCompany=true'),
  })
  const companyId = (companyData?.data as unknown as { id: string }[])?.[0]?.id

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => get<{ id: string; name: string }[]>('/categories?parentOnly=true'),
  })
  const categories = (categoriesData?.data as unknown as { id: string; name: string }[]) || []

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priceNegotiable: true },
  })

  const selectedCategoryId = watch('categoryId')

  const { data: subCatData } = useQuery({
    queryKey: ['subcategories', selectedCategoryId],
    queryFn:  () => get<{ id: string; name: string }[]>(`/categories/${selectedCategoryId}/subcategories`),
    enabled:  !!selectedCategoryId,
  })
  const subCategories = (subCatData?.data as unknown as { id: string; name: string }[]) || []

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('type', 'product_image')
        const { data: result } = await api.post('/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setImages((prev) => [
          ...prev,
          { url: result.data.url, isPrimary: prev.length === 0 },
        ])
      }
      toast.success('Images uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(data: FormData) {
    if (!companyId) { toast.error('No company found'); return }
    try {
      const resp = await post<{ id: string; slug: string }>('/products', {
        ...data,
        companyId,
        moq:      data.moq      ? parseFloat(data.moq)      : undefined,
        priceMin: data.priceMin ? parseFloat(data.priceMin) : undefined,
        priceMax: data.priceMax ? parseFloat(data.priceMax) : undefined,
      })
      const productId = (resp.data as { id: string })?.id

      // Save images
      if (images.length && productId) {
        await post(`/products/${productId}/images`, { images })
      }
      // Save specs
      if (specs.length && productId) {
        await post(`/products/${productId}/specifications`, { specifications: specs })
      }

      toast.success('Product submitted for approval!')
      router.push('/dashboard/products')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create product'
      toast.error(msg)
    }
  }

  const tabs = [
    { id: 'basic',   label: 'Basic Info' },
    { id: 'pricing', label: 'Pricing & MOQ' },
    { id: 'trade',   label: 'Trade Details' },
    { id: 'seo',     label: 'SEO' },
  ] as const

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/products" className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-sm text-gray-500 mt-0.5">Product will be reviewed before publishing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Image upload */}
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <h3 className="font-bold text-gray-900 mb-4">Product Images</h3>
          <div className="grid grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-gray-200 group">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                {img.isPrimary && (
                  <span className="absolute top-1 left-1 bg-blue-700 text-white text-xs px-1.5 py-0.5 rounded">Primary</span>
                )}
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              {uploading ? <Loader2 className="w-6 h-6 text-blue-400 animate-spin" /> : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-400">Upload</span>
                </>
              )}
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-2">First image will be the primary image. Max 10MB per image.</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Basic Info */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <FormField label="Product Name *" error={errors.name?.message}>
                  <input {...register('name')} className={inputCls} placeholder="e.g. Premium Cotton T-Shirt" />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Category *" error={errors.categoryId?.message}>
                    <select {...register('categoryId')} className={inputCls}>
                      <option value="">Select category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Sub-Category">
                    <select {...register('subcategoryId')} className={inputCls} disabled={!selectedCategoryId}>
                      <option value="">Select sub-category</option>
                      {subCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </FormField>
                </div>

                <FormField label="Short Description" error={errors.shortDescription?.message}>
                  <textarea {...register('shortDescription')} rows={2} className={inputCls} placeholder="Brief product summary (max 500 chars)" />
                </FormField>

                <FormField label="Full Description">
                  <textarea {...register('description')} rows={5} className={inputCls} placeholder="Detailed product description, features, applications..." />
                </FormField>

                <FormField label="SKU / Product Code">
                  <input {...register('sku')} className={inputCls} placeholder="e.g. SKU-12345" />
                </FormField>

                {/* Specifications */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-700">Specifications</label>
                    <button
                      type="button"
                      onClick={() => setSpecs((p) => [...p, { key: '', value: '', unit: '' }])}
                      className="flex items-center gap-1 text-xs text-blue-700 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Spec
                    </button>
                  </div>
                  {specs.map((spec, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        value={spec.key}
                        onChange={(e) => setSpecs((p) => p.map((s, j) => j === i ? { ...s, key: e.target.value } : s))}
                        placeholder="Property"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <input
                        value={spec.value}
                        onChange={(e) => setSpecs((p) => p.map((s, j) => j === i ? { ...s, value: e.target.value } : s))}
                        placeholder="Value"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <input
                        value={spec.unit}
                        onChange={(e) => setSpecs((p) => p.map((s, j) => j === i ? { ...s, unit: e.target.value } : s))}
                        placeholder="Unit"
                        className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button type="button" onClick={() => setSpecs((p) => p.filter((_, j) => j !== i))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing */}
            {activeTab === 'pricing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Min Price (USD)">
                    <input {...register('priceMin')} type="number" step="0.01" className={inputCls} placeholder="e.g. 5.00" />
                  </FormField>
                  <FormField label="Max Price (USD)">
                    <input {...register('priceMax')} type="number" step="0.01" className={inputCls} placeholder="e.g. 15.00" />
                  </FormField>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" {...register('priceNegotiable')} className="rounded text-blue-600" />
                  Price is negotiable
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Minimum Order Quantity">
                    <input {...register('moq')} type="number" className={inputCls} placeholder="e.g. 100" />
                  </FormField>
                  <FormField label="MOQ Unit">
                    <input {...register('moqUnit')} className={inputCls} placeholder="e.g. Pieces, Kg, Sets" />
                  </FormField>
                </div>
              </div>
            )}

            {/* Trade Details */}
            {activeTab === 'trade' && (
              <div className="space-y-4">
                <FormField label="Production Capacity">
                  <input {...register('productionCapacity')} className={inputCls} placeholder="e.g. 10,000 pcs/month" />
                </FormField>
                <FormField label="Lead Time">
                  <input {...register('leadTime')} className={inputCls} placeholder="e.g. 15-20 days" />
                </FormField>
                <FormField label="Packaging Details">
                  <textarea {...register('packagingDetails')} rows={3} className={inputCls} placeholder="Describe packaging, carton size, weight..." />
                </FormField>
              </div>
            )}

            {/* SEO */}
            {activeTab === 'seo' && (
              <div className="space-y-4">
                <FormField label="SEO Title">
                  <input {...register('seoTitle')} className={inputCls} placeholder="Custom page title (leave blank to use product name)" />
                </FormField>
                <FormField label="Meta Description">
                  <textarea {...register('seoDescription')} rows={3} className={inputCls} placeholder="Brief description for search engines (max 160 chars)" />
                </FormField>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/dashboard/products" className="flex-1 text-center border border-gray-200 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingText="Submitting..."
            icon={<Save className="w-4 h-4" />}
            className="flex-1 bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            Submit for Approval
          </LoadingButton>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent'

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
