'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import axios from 'axios'
import { get, post, put } from '@/lib/utils/api-client'
import { LoadingButton } from '@/components/ui/loading-button'

interface CatalogFormProps {
  mode: 'create' | 'edit'
  catalogId?: string
}

interface CategoryOption {
  id: string
  name: string
  subcategories?: Array<{ id: string; name: string }>
}

interface CompanyOption {
  id: string
  name: string
}

interface ExistingCatalog {
  id: string
  companyId: string
  categoryId: string
  subcategoryId?: string | null
  name: string
  shortDescription?: string | null
  description?: string | null
  sku?: string | null
  moq?: number | null
  moqUnit?: string | null
  priceMin?: number | null
  priceMax?: number | null
  priceNegotiable: boolean
  productionCapacity?: string | null
  leadTime?: string | null
  packagingDetails?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  status: string
  isFeatured: boolean
  isVerified: boolean
  images: Array<{ url: string; isPrimary: boolean; alt?: string | null }>
  specifications: Array<{ key: string; value: string; unit?: string | null }>
}

const defaultForm = {
  companyId: '',
  categoryId: '',
  subcategoryId: '',
  name: '',
  shortDescription: '',
  description: '',
  sku: '',
  moq: '',
  moqUnit: '',
  priceMin: '',
  priceMax: '',
  priceNegotiable: true,
  productionCapacity: '',
  leadTime: '',
  packagingDetails: '',
  seoTitle: '',
  seoDescription: '',
  status: 'APPROVED',
  isFeatured: false,
  isVerified: false,
}

export function CatalogForm({ mode, catalogId }: CatalogFormProps) {
  const router = useRouter()
  const [form, setForm] = useState(defaultForm)
  const [images, setImages] = useState<Array<{ url: string; isPrimary: boolean; alt?: string }>>([])
  const [specifications, setSpecifications] = useState<Array<{ key: string; value: string; unit?: string }>>([])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-form-categories'],
    queryFn: () => get<CategoryOption[]>('/admin/categories'),
  })
  const categories = (categoriesData?.data || []) as CategoryOption[]

  const { data: companiesData } = useQuery({
    queryKey: ['admin-form-companies'],
    queryFn: () => get<CompanyOption[]>('/companies?limit=100'),
  })
  const companies = ((companiesData?.data as unknown as CompanyOption[]) || [])

  const { data: catalogData, isLoading } = useQuery({
    queryKey: ['admin-catalog-detail', catalogId],
    queryFn: () => get<ExistingCatalog>(`/admin/catalogs/${catalogId}`),
    enabled: mode === 'edit' && !!catalogId,
  })

  useEffect(() => {
    if (mode !== 'edit' || !catalogData?.data) return
    const catalog = catalogData.data as ExistingCatalog
    setForm({
      companyId: catalog.companyId,
      categoryId: catalog.categoryId,
      subcategoryId: catalog.subcategoryId || '',
      name: catalog.name,
      shortDescription: catalog.shortDescription || '',
      description: catalog.description || '',
      sku: catalog.sku || '',
      moq: catalog.moq != null ? String(catalog.moq) : '',
      moqUnit: catalog.moqUnit || '',
      priceMin: catalog.priceMin != null ? String(catalog.priceMin) : '',
      priceMax: catalog.priceMax != null ? String(catalog.priceMax) : '',
      priceNegotiable: catalog.priceNegotiable,
      productionCapacity: catalog.productionCapacity || '',
      leadTime: catalog.leadTime || '',
      packagingDetails: catalog.packagingDetails || '',
      seoTitle: catalog.seoTitle || '',
      seoDescription: catalog.seoDescription || '',
      status: catalog.status,
      isFeatured: catalog.isFeatured,
      isVerified: catalog.isVerified,
    })
    setImages(catalog.images.map((image) => ({ url: image.url, isPrimary: image.isPrimary, alt: image.alt || '' })))
    setSpecifications(catalog.specifications.map((specification) => ({ key: specification.key, value: specification.value, unit: specification.unit || '' })))
  }, [catalogData, mode])

  const currentCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId),
    [categories, form.categoryId]
  )
  const subcategories = currentCategory?.subcategories || []

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const body = new FormData()
        body.append('file', file)
        body.append('type', 'product_image')
        const response = await axios.post('/api/upload', body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setImages((current) => [
          ...current,
          {
            url: response.data.data.url,
            isPrimary: current.length === 0,
          },
        ])
      }
      toast.success('Catalog images uploaded')
    } catch {
      toast.error('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    if (!form.companyId || !form.categoryId || !form.name.trim()) {
      toast.error('Company, category, and title are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        subcategoryId: form.subcategoryId || undefined,
        moq: form.moq ? Number(form.moq) : undefined,
        priceMin: form.priceMin ? Number(form.priceMin) : undefined,
        priceMax: form.priceMax ? Number(form.priceMax) : undefined,
        images,
        specifications: specifications.filter((item) => item.key && item.value),
      }

      if (mode === 'create') {
        await post('/admin/catalogs', payload)
        toast.success('Catalog created')
      } else {
        await put(`/admin/catalogs/${catalogId}`, payload)
        toast.success('Catalog updated')
      }

      router.push('/admin/catalogs')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Catalog save failed'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (mode === 'edit' && isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/catalogs" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{mode === 'create' ? 'Create Catalog' : 'Edit Catalog'}</h1>
          <p className="mt-1 text-sm text-gray-500">Kaniz Global Trade marketplace catalog management.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Supplier / Company">
            <select value={form.companyId} onChange={(e) => setForm((current) => ({ ...current, companyId: e.target.value }))} className={inputCls}>
              <option value="">Select company</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} className={inputCls}>
              {['APPROVED', 'PENDING', 'DRAFT', 'SUSPENDED', 'REJECTED'].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select value={form.categoryId} onChange={(e) => setForm((current) => ({ ...current, categoryId: e.target.value, subcategoryId: '' }))} className={inputCls}>
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </Field>
          <Field label="Sub-category">
            <select value={form.subcategoryId} onChange={(e) => setForm((current) => ({ ...current, subcategoryId: e.target.value }))} className={inputCls}>
              <option value="">Select sub-category</option>
              {subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
            </select>
          </Field>
          <Field label="Catalog title" className="md:col-span-2">
            <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Short description" className="md:col-span-2">
            <textarea value={form.shortDescription} onChange={(e) => setForm((current) => ({ ...current, shortDescription: e.target.value }))} rows={3} className={inputCls} />
          </Field>
          <Field label="Full description" className="md:col-span-2">
            <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows={6} className={inputCls} />
          </Field>
          <Field label="SKU">
            <input value={form.sku} onChange={(e) => setForm((current) => ({ ...current, sku: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="MOQ">
            <input value={form.moq} onChange={(e) => setForm((current) => ({ ...current, moq: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="MOQ Unit">
            <input value={form.moqUnit} onChange={(e) => setForm((current) => ({ ...current, moqUnit: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Production capacity">
            <input value={form.productionCapacity} onChange={(e) => setForm((current) => ({ ...current, productionCapacity: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Price min">
            <input value={form.priceMin} onChange={(e) => setForm((current) => ({ ...current, priceMin: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Price max">
            <input value={form.priceMax} onChange={(e) => setForm((current) => ({ ...current, priceMax: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Lead time">
            <input value={form.leadTime} onChange={(e) => setForm((current) => ({ ...current, leadTime: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Packaging details" className="md:col-span-2">
            <textarea value={form.packagingDetails} onChange={(e) => setForm((current) => ({ ...current, packagingDetails: e.target.value }))} rows={3} className={inputCls} />
          </Field>
          <Field label="SEO Title">
            <input value={form.seoTitle} onChange={(e) => setForm((current) => ({ ...current, seoTitle: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="SEO Description">
            <textarea value={form.seoDescription} onChange={(e) => setForm((current) => ({ ...current, seoDescription: e.target.value }))} rows={3} className={inputCls} />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.priceNegotiable} onChange={(e) => setForm((current) => ({ ...current, priceNegotiable: e.target.checked }))} />
            Price negotiable
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((current) => ({ ...current, isFeatured: e.target.checked }))} />
            Featured catalog
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isVerified} onChange={(e) => setForm((current) => ({ ...current, isVerified: e.target.checked }))} />
            Verification badge
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Catalog gallery</h2>
            <p className="text-sm text-gray-500">Thumbnail and gallery image management.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload images
            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {images.map((image, index) => (
            <div key={`${image.url}-${index}`} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <div className="aspect-square overflow-hidden">
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center justify-between p-2">
                <button type="button" onClick={() => setImages((current) => current.map((item, itemIndex) => ({ ...item, isPrimary: itemIndex === index })))} className={`text-xs font-medium ${image.isPrimary ? 'text-blue-700' : 'text-gray-500'}`}>
                  {image.isPrimary ? 'Primary' : 'Set primary'}
                </button>
                <button type="button" onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Specifications</h2>
            <p className="text-sm text-gray-500">Add catalog attributes shown on product details.</p>
          </div>
          <button type="button" onClick={() => setSpecifications((current) => [...current, { key: '', value: '', unit: '' }])} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700">
            Add specification
          </button>
        </div>
        <div className="space-y-3">
          {specifications.map((specification, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_140px_40px]">
              <input value={specification.key} onChange={(e) => setSpecifications((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, key: e.target.value } : item))} placeholder="Property" className={inputCls} />
              <input value={specification.value} onChange={(e) => setSpecifications((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: e.target.value } : item))} placeholder="Value" className={inputCls} />
              <input value={specification.unit || ''} onChange={(e) => setSpecifications((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, unit: e.target.value } : item))} placeholder="Unit" className={inputCls} />
              <button type="button" onClick={() => setSpecifications((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>
          ))}
          {!specifications.length && <p className="text-sm text-gray-500">No specifications added yet.</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/admin/catalogs" className="flex-1 rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Cancel
        </Link>
        <LoadingButton
          onClick={handleSubmit}
          loading={saving}
          loadingText="Saving..."
          icon={<Save className="h-4 w-4" />}
          className="flex-1 justify-center rounded-xl bg-blue-700 py-3 text-sm font-semibold text-white hover:bg-blue-800"
        >
          {mode === 'create' ? 'Create Catalog' : 'Update Catalog'}
        </LoadingButton>
      </div>
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100'
