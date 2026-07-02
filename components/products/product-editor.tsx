'use client'

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { AlertTriangle, ArrowLeft, Check, ExternalLink, FileText, Link2, Loader2, Package, Plus, RefreshCw, Save, Trash2, Upload, Video } from 'lucide-react'
import api, { get, post, put } from '@/lib/utils/api-client'
import { LoadingButton } from '@/components/ui/loading-button'
import { CKEditorField } from '@/components/ui/ckeditor-field'
import { VideoPlayer } from '@/components/media/video-player'
import { getVideoThumbnailUrl, isYouTubeUrl } from '@/lib/media/video'

const productSchema = z.object({
  companyId: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().optional(),
  name: z.string().min(3, 'Name must be at least 3 characters').max(500),
  tags: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  moq: z.string().optional(),
  moqUnit: z.string().optional(),
  priceMin: z.string().optional(),
  priceMax: z.string().optional(),
  priceNegotiable: z.boolean().default(true),
  productionCapacity: z.string().optional(),
  leadTime: z.string().optional(),
  packagingDetails: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  seoImageUrl: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'SUSPENDED']).optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

type ProductEditorProps = {
  mode: 'create' | 'edit'
  portal: 'dashboard' | 'admin'
  productId?: string
}

type CategoryOption = { id: string; name: string }
type CompanyOption = { id: string; name: string }
type SupplierCompany = { id: string; name: string } | null
type B2BCompanyStatus = {
  hasCompany: boolean
  isApprovedSupplier: boolean
}
type UploadAssetResult = { url: string; thumbnailUrl?: string | null }
type ProductDetails = {
  id: string
  name: string
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  companyId: string
  categoryId: string
  subcategoryId?: string | null
  tags?: string | null
  shortDescription?: string | null
  description?: string | null
  sku?: string | null
  barcode?: string | null
  thumbnailUrl?: string | null
  moq?: number | null
  moqUnit?: string | null
  priceMin?: number | null
  priceMax?: number | null
  priceNegotiable?: boolean | null
  productionCapacity?: string | null
  leadTime?: string | null
  packagingDetails?: string | null
  isFeatured?: boolean | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoKeywords?: string | null
  seoImageUrl?: string | null
  images: Array<{ url: string; isPrimary: boolean; alt?: string | null }>
  videos: Array<{ url: string; title?: string | null; thumbnailUrl?: string | null }>
  documents: Array<{ name: string; url: string; type?: string | null }>
  specifications: Array<{ key: string; value: string; unit?: string | null }>
  priceTiers: Array<{ minQty: number; maxQty?: number | null; priceMin: number; priceMax?: number | null }>
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent'
const DEFAULT_MOQ_UNITS = ['Pieces', 'Kg', 'Gram', 'Ton', 'Sets', 'Boxes', 'Cartons', 'Pairs', 'Meters', 'Liters'] as const

function slugToken(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12) || 'PRODUCT'
}

function generateSkuValue(name: string) {
  return `SKU-${slugToken(name)}-${Date.now().toString().slice(-6)}`
}

function generateBarcodeValue() {
  const seed = `${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`
  return seed.slice(0, 13)
}

export function ProductEditor({ mode, portal, productId }: ProductEditorProps) {
  const router = useRouter()
  const isAdminPortal = portal === 'admin'
  const listHref = isAdminPortal ? '/admin/products' : '/dashboard/products'
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'trade' | 'seo'>('basic')
  const [images, setImages] = useState<Array<{ url: string; isPrimary: boolean }>>([])
  const [videos, setVideos] = useState<Array<{ url: string; title: string; thumbnailUrl: string }>>([])
  const [documents, setDocuments] = useState<Array<{ name: string; url: string; type: string }>>([])
  const [specs, setSpecs] = useState<Array<{ key: string; value: string; unit: string }>>([])
  const [priceTiers, setPriceTiers] = useState<Array<{ minQty: string; maxQty: string; priceMin: string; priceMax: string }>>([
    { minQty: '', maxQty: '', priceMin: '', priceMax: '' },
  ])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideos, setUploadingVideos] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingVideoThumbs, setUploadingVideoThumbs] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [uploadingSeoImage, setUploadingSeoImage] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [customMoqUnit, setCustomMoqUnit] = useState('')
  const [moqUnitOptions, setMoqUnitOptions] = useState<string[]>([...DEFAULT_MOQ_UNITS])

  const { data: adminCompaniesData } = useQuery({
    queryKey: ['admin-companies-selector'],
    queryFn: () => get<CompanyOption[]>('/admin/companies?limit=100'),
    enabled: isAdminPortal,
  })

  const { data: supplierCompanyData } = useQuery({
    queryKey: ['my-company'],
    queryFn: () => get<SupplierCompany>('/companies?myCompany=true'),
    enabled: !isAdminPortal,
  })

  const companyOptions = useMemo(() => {
    if (!isAdminPortal) return []
    return ((adminCompaniesData?.data as unknown as CompanyOption[]) || []).map((company) => ({
      id: company.id,
      name: company.name,
    }))
  }, [adminCompaniesData?.data, isAdminPortal])

  const supplierCompany = !isAdminPortal
    ? ((supplierCompanyData?.data as unknown as SupplierCompany) || null)
    : null

  const { data: b2bStatusData } = useQuery({
    queryKey: ['supplier-b2b-company-status'],
    queryFn: () => get<B2BCompanyStatus>('/b2b/company/status'),
    enabled: !isAdminPortal && mode === 'create',
  })

  const supplierB2BStatus = (b2bStatusData?.data as B2BCompanyStatus | undefined) || undefined
  const wholesaleCreationBlocked = !isAdminPortal && mode === 'create' && !supplierB2BStatus?.isApprovedSupplier

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', portal],
    queryFn: () => get<CategoryOption[]>('/categories?parentOnly=true&scope=dashboard'),
  })
  const categories = (categoriesData?.data as unknown as CategoryOption[]) || []

  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product-editor', productId],
    queryFn: () => get<ProductDetails>(`/products/${productId}`),
    enabled: mode === 'edit' && !!productId,
  })

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      companyId: '',
      categoryId: '',
      subcategoryId: '',
      name: '',
      tags: '',
      shortDescription: '',
      description: '',
      sku: '',
      barcode: '',
      moq: '',
      moqUnit: '',
      priceMin: '',
      priceMax: '',
      priceNegotiable: true,
      productionCapacity: '',
      leadTime: '',
      packagingDetails: '',
      thumbnailUrl: '',
      isFeatured: false,
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      seoImageUrl: '',
      status: isAdminPortal ? 'APPROVED' : undefined,
    },
  })

  const selectedCategoryId = watch('categoryId')
  const watchedName = watch('name')
  const watchedDescription = watch('description') || ''
  const watchedSku = watch('sku') || ''
  const watchedBarcode = watch('barcode') || ''
  const watchedThumbnailUrl = watch('thumbnailUrl') || ''
  const watchedSeoImageUrl = watch('seoImageUrl') || ''
  const watchedMoqUnit = watch('moqUnit') || ''

  const { data: subcategoriesData } = useQuery({
    queryKey: ['subcategories', selectedCategoryId],
    queryFn: () => get<CategoryOption[]>(`/categories/${selectedCategoryId}/subcategories?scope=dashboard`),
    enabled: !!selectedCategoryId,
  })
  const subcategories = (subcategoriesData?.data as unknown as CategoryOption[]) || []

  useEffect(() => {
    if (!supplierCompany?.id || isAdminPortal || mode !== 'create') return
    setValue('companyId', supplierCompany.id)
  }, [supplierCompany?.id, isAdminPortal, mode, setValue])

  useEffect(() => {
    const product = productData?.data as ProductDetails | undefined
    if (!product) return

    reset({
      companyId: product.companyId,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId || '',
      name: product.name,
      tags: product.tags || '',
      shortDescription: product.shortDescription || '',
      description: product.description || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      moq: product.moq?.toString() || '',
      moqUnit: product.moqUnit || '',
      priceMin: product.priceMin?.toString() || '',
      priceMax: product.priceMax?.toString() || '',
      priceNegotiable: product.priceNegotiable ?? true,
      productionCapacity: product.productionCapacity || '',
      leadTime: product.leadTime || '',
      packagingDetails: product.packagingDetails || '',
      thumbnailUrl: product.thumbnailUrl || '',
      isFeatured: product.isFeatured ?? false,
      seoTitle: product.seoTitle || '',
      seoDescription: product.seoDescription || '',
      seoKeywords: product.seoKeywords || '',
      seoImageUrl: product.seoImageUrl || '',
      status: product.status === 'REJECTED' ? 'PENDING' : product.status,
    })

    setImages(product.images.map((image) => ({ url: image.url, isPrimary: image.isPrimary })))
    setVideos(
      product.videos.map((video) => ({
        url: video.url,
        title: video.title || '',
        thumbnailUrl: video.thumbnailUrl || '',
      }))
    )
    setDocuments(
      product.documents.map((document) => ({
        name: document.name,
        url: document.url,
        type: document.type || '',
      }))
    )
    setPriceTiers(
      product.priceTiers.length
        ? product.priceTiers.map((tier) => ({
            minQty: String(tier.minQty),
            maxQty: tier.maxQty != null ? String(tier.maxQty) : '',
            priceMin: String(tier.priceMin),
            priceMax: tier.priceMax != null ? String(tier.priceMax) : '',
          }))
        : [{
            minQty: product.moq?.toString() || '',
            maxQty: '',
            priceMin: product.priceMin?.toString() || '',
            priceMax: product.priceMax?.toString() || '',
          }]
    )
    setSpecs(
      product.specifications.map((specification) => ({
        key: specification.key,
        value: specification.value,
        unit: specification.unit || '',
      }))
    )
  }, [productData?.data, reset])

  useEffect(() => {
    if (!watchedMoqUnit.trim()) return

    setMoqUnitOptions((previous) => (
      previous.includes(watchedMoqUnit.trim())
        ? previous
        : [...previous, watchedMoqUnit.trim()]
    ))
  }, [watchedMoqUnit])

  useEffect(() => {
    if (mode !== 'create' || !watchedName.trim()) return
    if (!watchedSku.trim()) {
      setValue('sku', generateSkuValue(watchedName))
    }
    if (!watchedBarcode.trim()) {
      setValue('barcode', generateBarcodeValue())
    }
  }, [mode, setValue, watchedBarcode, watchedName, watchedSku])

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files?.length) return

    setUploadingImages(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'product_image')

        const { data: result } = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        setImages((previous) => [
          ...previous,
          { url: result.data.url, isPrimary: previous.length === 0 },
        ])
      }

      toast.success('Images uploaded')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingImages(false)
      event.target.value = ''
    }
  }

  async function uploadSingleFile(file: File, type: 'product_image' | 'product_video' | 'product_doc') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const { data: result } = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return result.data as UploadAssetResult
  }

  async function handleVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files?.length) return

    setUploadingVideos(true)
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadSingleFile(file, 'product_video')
        setVideos((previous) => [
          ...previous,
          {
            url: uploaded.url,
            title: file.name.replace(/\.[^.]+$/, ''),
            thumbnailUrl: uploaded.thumbnailUrl || '',
          },
        ])
      }

      toast.success('Videos uploaded')
    } catch {
      toast.error('Video upload failed')
    } finally {
      setUploadingVideos(false)
      event.target.value = ''
    }
  }

  async function handleThumbnailUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingThumbnail(true)
    try {
      const uploaded = await uploadSingleFile(file, 'product_image')
      setValue('thumbnailUrl', uploaded.url)
      toast.success('Thumbnail image uploaded')
    } catch {
      toast.error('Thumbnail upload failed')
    } finally {
      setUploadingThumbnail(false)
      event.target.value = ''
    }
  }

  async function handleVideoThumbnailUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files?.length || !videos.length) return

    setUploadingVideoThumbs(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(files)) {
        const uploaded = await uploadSingleFile(file, 'product_image')
        uploadedUrls.push(uploaded.url)
      }

      setVideos((previous) => {
        if (uploadedUrls.length === 1) {
          return previous.map((video) => ({ ...video, thumbnailUrl: uploadedUrls[0] }))
        }

        return previous.map((video, index) => ({
          ...video,
          thumbnailUrl: uploadedUrls[index] || video.thumbnailUrl,
        }))
      })

      toast.success('Video thumbnails uploaded')
    } catch {
      toast.error('Video thumbnail upload failed')
    } finally {
      setUploadingVideoThumbs(false)
      event.target.value = ''
    }
  }

  async function handlePdfUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files?.length) return

    setUploadingPdf(true)
    try {
      for (const file of Array.from(files)) {
        const uploaded = await uploadSingleFile(file, 'product_doc')
        setDocuments((current) => [
          ...current,
          { name: file.name, url: uploaded.url, type: 'PDF_CATALOG' },
        ])
      }
      toast.success('Catalog PDF uploaded')
    } catch {
      toast.error('PDF upload failed')
    } finally {
      setUploadingPdf(false)
      event.target.value = ''
    }
  }

  async function handleSeoImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingSeoImage(true)
    try {
      const uploaded = await uploadSingleFile(file, 'product_image')
      setValue('seoImageUrl', uploaded.url)
      toast.success('Meta image uploaded')
    } catch {
      toast.error('Meta image upload failed')
    } finally {
      setUploadingSeoImage(false)
      event.target.value = ''
    }
  }

  function handleAddYoutubeVideo() {
    const trimmed = youtubeUrl.trim()
    if (!trimmed) return

    if (!isYouTubeUrl(trimmed)) {
      toast.error('Enter a valid YouTube URL')
      return
    }

    setVideos((previous) => [
      ...previous,
      {
        url: trimmed,
        title: 'YouTube Video',
        thumbnailUrl: getVideoThumbnailUrl(trimmed) || '',
      },
    ])
    setYoutubeUrl('')
  }

  function handleAddMoqUnit() {
    const normalizedUnit = customMoqUnit.trim()
    if (!normalizedUnit) {
      toast.error('Enter a MOQ unit first')
      return
    }

    setMoqUnitOptions((previous) => (
      previous.includes(normalizedUnit)
        ? previous
        : [...previous, normalizedUnit]
    ))
    setValue('moqUnit', normalizedUnit, { shouldDirty: true })
    setCustomMoqUnit('')
  }

  async function onSubmit(values: ProductFormValues) {
    const companyId = isAdminPortal ? values.companyId : supplierCompany?.id || values.companyId

    if (!companyId) {
      toast.error(isAdminPortal ? 'Select a supplier company first' : 'No company found')
      return
    }

    if (wholesaleCreationBlocked) {
      toast.error('Your B2B supplier profile must be approved before creating wholesale products.')
      return
    }

    const normalizedPriceTiers = priceTiers
      .filter((tier) => tier.minQty && tier.priceMin)
      .map((tier) => ({
        minQty: parseFloat(tier.minQty),
        maxQty: tier.maxQty ? parseFloat(tier.maxQty) : undefined,
        priceMin: parseFloat(tier.priceMin),
        priceMax: tier.priceMax ? parseFloat(tier.priceMax) : undefined,
      }))

    const primaryTier = normalizedPriceTiers[0]

    const payload = {
      name: values.name,
      companyId,
      categoryId: values.categoryId,
      subcategoryId: values.subcategoryId || undefined,
      tags: values.tags || undefined,
      shortDescription: values.shortDescription || undefined,
      description: values.description || undefined,
      sku: values.sku || undefined,
      barcode: values.barcode || undefined,
      moq: primaryTier?.minQty ?? (values.moq ? parseFloat(values.moq) : undefined),
      moqUnit: values.moqUnit || undefined,
      priceMin: primaryTier?.priceMin ?? (values.priceMin ? parseFloat(values.priceMin) : undefined),
      priceMax: primaryTier?.priceMax ?? (values.priceMax ? parseFloat(values.priceMax) : undefined),
      priceNegotiable: values.priceNegotiable,
      productionCapacity: values.productionCapacity || undefined,
      leadTime: values.leadTime || undefined,
      packagingDetails: values.packagingDetails || undefined,
      thumbnailUrl: values.thumbnailUrl || undefined,
      isFeatured: values.isFeatured,
      seoTitle: values.seoTitle || undefined,
      seoDescription: values.seoDescription || undefined,
      seoKeywords: values.seoKeywords || undefined,
      seoImageUrl: values.seoImageUrl || undefined,
      ...(isAdminPortal ? { status: values.status || 'APPROVED' } : {}),
    }

    try {
      const response = mode === 'create'
        ? await post<{ id: string; slug: string }>('/products', payload)
        : await put<{ id: string; slug: string }>(`/products/${productId}`, payload)

      const savedProductId = (response.data as { id: string })?.id || productId

      if (savedProductId) {
        await post(`/products/${savedProductId}/images`, { images })
        await post(`/products/${savedProductId}/videos`, { videos })
        await post(`/products/${savedProductId}/documents`, { documents })
        await post(`/products/${savedProductId}/price-tiers`, { priceTiers: normalizedPriceTiers })
        await post(`/products/${savedProductId}/specifications`, { specifications: specs })
      }

      const successMessage = response.message || (
        mode === 'create'
          ? isAdminPortal
            ? 'Product created from Kaniz Global Trade'
            : 'Product created and published!'
          : isAdminPortal
            ? 'Product updated from Kaniz Global Trade'
            : 'Product updated and resubmitted for review'
      )

      toast.success(successMessage)
      router.push(listHref)
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (mode === 'create' ? 'Failed to create product' : 'Failed to update product')
      toast.error(message)
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'pricing', label: 'Pricing & MOQ' },
    { id: 'trade', label: 'Trade Details' },
    { id: 'seo', label: 'SEO' },
  ] as const

  const pageTitle = mode === 'create' ? 'Add New Product' : 'Edit Product'
  const pageSubtitle = isAdminPortal
    ? mode === 'create'
      ? 'Create and publish products directly from Kaniz Global Trade'
      : 'Update supplier product details from Kaniz Global Trade'
    : mode === 'create'
      ? 'Product will be published immediately unless the supplier account is under fraud review'
      : 'Changes will be reviewed before publishing'
  const advertisingHref = isAdminPortal
    ? '/admin/ad-campaigns'
    : `/dashboard/ads${productId ? `?productId=${encodeURIComponent(productId)}&title=${encodeURIComponent(watchedName || 'Product campaign')}&creativeUrl=${encodeURIComponent(watchedThumbnailUrl || images.find((image) => image.isPrimary)?.url || '')}` : ''}`

  if (mode === 'edit' && isLoadingProduct) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-none">
      <div className="mb-6 flex items-center gap-3">
        <Link href={listHref} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{pageSubtitle}</p>
        </div>
      </div>

      {wholesaleCreationBlocked ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Your B2B supplier profile must be approved before creating wholesale products.</p>
              <p className="mt-1 text-amber-800">
                Complete your B2B company profile and wait for supplier verification approval before publishing wholesale items.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-xl border border-gray-100 bg-white p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900">Product Media</h3>
              <p className="mt-1 text-sm text-gray-500">Upload gallery images, thumbnail, videos, YouTube links, and unlimited catalog or specification PDF files.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">Gallery Images</h4>
                <span className="text-xs text-gray-400">{images.length} image{images.length === 1 ? '' : 's'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((image, index) => (
                  <div key={`${image.url}-${index}`} className="group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-gray-50">
                    <div className="aspect-square overflow-hidden">
                      <img src={image.url} alt="" className="h-full w-full object-cover" />
                    </div>

                    <div className="absolute left-2 top-2 flex items-center gap-2">
                      {image.isPrimary && (
                        <span className="rounded bg-blue-700 px-1.5 py-0.5 text-xs text-white">Primary</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setImages((previous) => {
                          const next = previous.filter((_, imageIndex) => imageIndex !== index)
                          if (next.length && !next.some((item) => item.isPrimary)) {
                            next[0] = { ...next[0], isPrimary: true }
                          }
                          return next
                        })
                      }
                      className="absolute right-2 top-2 rounded-lg bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>

                    <div className="border-t border-gray-200 bg-white p-2">
                      <button
                        type="button"
                        onClick={() =>
                          setImages((previous) =>
                            previous.map((item, itemIndex) => ({
                              ...item,
                              isPrimary: itemIndex === index,
                            }))
                          )
                        }
                        className={`flex w-full items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                          image.isPrimary
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {image.isPrimary ? 'Primary Image' : 'Set as Primary'}
                      </button>
                    </div>
                  </div>
                ))}

                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 transition-colors hover:border-blue-400 hover:bg-blue-50">
                  {uploadingImages ? (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  ) : (
                    <>
                      <Upload className="mb-1 h-6 w-6 text-gray-400" />
                      <span className="text-xs text-gray-400">Upload Images</span>
                    </>
                  )}
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImages} />
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-400">These images are visible in product details page gallery. Minimum dimensions required: 900px width X 900px height.</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">Thumbnail Image</h4>
                  <p className="mt-1 text-xs text-gray-400">This image is visible in all product box. If not uploaded, the primary gallery image will be used.</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {watchedThumbnailUrl ? (
                    <img src={watchedThumbnailUrl} alt="Thumbnail preview" className="h-full w-full object-cover" />
                  ) : images[0]?.url ? (
                    <img src={images.find((image) => image.isPrimary)?.url || images[0].url} alt="Fallback thumbnail preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="px-3 text-center text-xs text-gray-400">No thumbnail uploaded</span>
                  )}
                </div>

                <div className="flex-1">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700">
                    {uploadingThumbnail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Browse
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} disabled={uploadingThumbnail} />
                  </label>
                  {watchedThumbnailUrl ? (
                    <button
                      type="button"
                      onClick={() => setValue('thumbnailUrl', '')}
                      className="ml-2 text-sm font-medium text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                  <p className="mt-3 text-xs text-gray-400">Minimum dimensions required: 195px width X 195px height. Keep some blank space around the main object for responsive cropping.</p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">Product Videos</h4>
                <span className="text-xs text-gray-400">{videos.length} video{videos.length === 1 ? '' : 's'}</span>
              </div>

              {videos.length === 0 ? (
                <div className="mb-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                  No videos uploaded yet. Add demos, factory views, or product closeups.
                </div>
              ) : null}

              <div className="space-y-3">
                {videos.map((video, index) => (
                  <div key={`${video.url}-${index}`} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-[220px_minmax(0,1fr)_auto] md:items-center">
                    <VideoPlayer
                      url={video.url}
                      title={video.title || 'Product video preview'}
                      poster={video.thumbnailUrl}
                      className="h-32 w-full overflow-hidden rounded-lg bg-slate-950"
                      iframeClassName="h-full w-full border-0"
                      videoClassName="h-full w-full bg-slate-950 object-cover"
                    />
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Video title</p>
                      <input
                        value={video.title}
                        onChange={(event) =>
                          setVideos((previous) =>
                            previous.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item)
                          )
                        }
                        className={inputCls}
                        placeholder="e.g. Product demo, Factory walkthrough"
                      />
                      <input
                        value={video.thumbnailUrl}
                        onChange={(event) =>
                          setVideos((previous) =>
                            previous.map((item, itemIndex) => itemIndex === index ? { ...item, thumbnailUrl: event.target.value } : item)
                          )
                        }
                        className={inputCls}
                        placeholder="Video thumbnail URL"
                      />
                      <p className="truncate text-xs text-gray-400">{video.url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVideos((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                      className="inline-flex items-center justify-center rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 transition-colors hover:border-blue-400 hover:bg-blue-50">
                  {uploadingVideos ? (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  ) : (
                    <>
                      <Video className="mb-1 h-6 w-6 text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">Upload Videos</span>
                      <span className="mt-1 text-xs text-gray-400">MP4, MOV, WebM supported. Max 100MB per video.</span>
                    </>
                  )}
                  <input type="file" multiple accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideos} />
                </label>
                <p className="text-xs text-gray-400">Try to upload videos under 30 seconds for better performance.</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-800">Video Thumbnails</h4>
                <p className="mt-1 text-xs text-gray-400">Add thumbnails in the same order as your videos. If you upload only one image, it will be used for all videos.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700">
                {uploadingVideoThumbs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Browse
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleVideoThumbnailUpload} disabled={uploadingVideoThumbs || videos.length === 0} />
              </label>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-800">Youtube video / shorts link</h4>
                <p className="mt-1 text-xs text-gray-400">Paste a normal YouTube watch, shorts, or youtu.be link. The player and thumbnail will be generated automatically.</p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  value={youtubeUrl}
                  onChange={(event) => setYoutubeUrl(event.target.value)}
                  className={inputCls}
                  placeholder="Youtube video / shorts url"
                />
                <button
                  type="button"
                  onClick={handleAddYoutubeVideo}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  <Link2 className="h-4 w-4" />
                  Add Link
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-800">Catalog / PDF Documents</h4>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700">
                {uploadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Add PDF
                <input type="file" multiple accept="application/pdf" className="hidden" onChange={handlePdfUpload} disabled={uploadingPdf} />
              </label>
              {documents.length ? (
                <div className="mt-3 space-y-2">
                  {documents.map((document, index) => (
                    <div key={`${document.url}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                      <a href={document.url} target="_blank" rel="noreferrer" className="truncate text-blue-700 hover:underline">
                        {document.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => setDocuments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        className="text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? 'border-b-2 border-blue-700 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'basic' && (
              <div className="space-y-4">
                {isAdminPortal && (
                  <FormField label="Supplier Company *" error={errors.companyId?.message}>
                    <select {...register('companyId', { required: isAdminPortal })} className={inputCls}>
                      <option value="">Select supplier company</option>
                      {companyOptions.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                )}

                {!isAdminPortal && supplierCompany?.name && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Product will be added under <span className="font-semibold">{supplierCompany.name}</span>.
                  </div>
                )}

                {isAdminPortal && (
                  <FormField label="Publication Status">
                    <select {...register('status')} className={inputCls}>
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING">Pending Review</option>
                      <option value="APPROVED">Approved / Live</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </FormField>
                )}

                <FormField label="Product Name *" error={errors.name?.message}>
                  <input {...register('name')} className={inputCls} placeholder="e.g. Premium Cotton T-Shirt" />
                </FormField>

                <FormField label="Tags">
                  <input
                    {...register('tags')}
                    className={inputCls}
                    placeholder="Keyword, Keyword"
                  />
                  <p className="mt-1 text-xs text-gray-400">This is used for search. Input those words by which customer can find this product.</p>
                </FormField>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="Category *" error={errors.categoryId?.message}>
                    <select {...register('categoryId')} className={inputCls}>
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Sub-Category">
                    <select {...register('subcategoryId')} className={inputCls} disabled={!selectedCategoryId}>
                      <option value="">Select sub-category</option>
                      {subcategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <FormField label="Short Description" error={errors.shortDescription?.message}>
                  <textarea {...register('shortDescription')} rows={2} className={inputCls} placeholder="Brief product summary (max 500 chars)" />
                </FormField>

                <FormField label="Full Description">
                  <div className="rounded-lg border border-gray-200 bg-white p-2">
                    <CKEditorField
                      value={watchedDescription}
                      onChange={(nextValue) => setValue('description', nextValue, { shouldDirty: true })}
                    />
                  </div>
                </FormField>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField label="SKU(auto generate)">
                    <div className="flex gap-2">
                      <input {...register('sku')} className={inputCls} placeholder="Auto generated SKU" />
                      <button
                        type="button"
                        onClick={() => setValue('sku', generateSkuValue(watchedName || 'Product'))}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </FormField>

                  <FormField label="Barcode(auto generate)">
                    <div className="flex gap-2">
                      <input {...register('barcode')} className={inputCls} placeholder="Auto generated barcode" />
                      <button
                        type="button"
                        onClick={() => setValue('barcode', generateBarcodeValue())}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
                    <input type="checkbox" {...register('isFeatured')} className="mt-0.5 rounded text-blue-600" />
                    <span>
                      <span className="block font-semibold text-gray-900">Featured</span>
                      <span className="mt-1 block text-xs text-gray-500">If you enable this, this product will be granted as a featured product.</span>
                    </span>
                  </label>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-semibold text-amber-950">Advertising</p>
                    {mode === 'create' ? (
                      <p className="mt-1 text-xs text-amber-800">
                        Save this product first, then create an advertising campaign from the Advertising module.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-800">
                        Product promotion is managed from the Advertising module, not by a product checkbox.
                      </p>
                    )}
                    <Link
                      href={advertisingHref}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {isAdminPortal ? 'Open Advertising' : 'Create / Manage Campaign'}
                    </Link>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">Specifications</label>
                    <button
                      type="button"
                      onClick={() => setSpecs((previous) => [...previous, { key: '', value: '', unit: '' }])}
                      className="flex items-center gap-1 text-xs text-blue-700 hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Spec
                    </button>
                  </div>

                  {specs.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                      No specifications yet. Add product details buyers should compare.
                    </div>
                  )}

                  {specs.map((specification, index) => (
                    <div key={index} className="mb-2 flex gap-2">
                      <input
                        value={specification.key}
                        onChange={(event) =>
                          setSpecs((previous) =>
                            previous.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item)
                          )
                        }
                        placeholder="Property"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <input
                        value={specification.value}
                        onChange={(event) =>
                          setSpecs((previous) =>
                            previous.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item)
                          )
                        }
                        placeholder="Value"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <input
                        value={specification.unit}
                        onChange={(event) =>
                          setSpecs((previous) =>
                            previous.map((item, itemIndex) => itemIndex === index ? { ...item, unit: event.target.value } : item)
                          )
                        }
                        placeholder="Unit"
                        className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => setSpecs((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="space-y-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" {...register('priceNegotiable')} className="rounded text-blue-600" />
                  Price is negotiable
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Price ranges by order quantity</h3>
                    <button
                      type="button"
                      onClick={() => setPriceTiers((previous) => [...previous, { minQty: '', maxQty: '', priceMin: '', priceMax: '' }])}
                      className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add New
                    </button>
                  </div>

                  {priceTiers.map((tier, index) => (
                    <div key={index} className="rounded-xl border border-gray-200 p-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField label="Min Price (USD)">
                          <input
                            value={tier.priceMin}
                            onChange={(event) => setPriceTiers((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, priceMin: event.target.value } : item))}
                            type="number"
                            step="0.01"
                            className={inputCls}
                            placeholder="e.g. 1.00"
                          />
                        </FormField>
                        <FormField label="Max Price (USD)">
                          <input
                            value={tier.priceMax}
                            onChange={(event) => setPriceTiers((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, priceMax: event.target.value } : item))}
                            type="number"
                            step="0.01"
                            className={inputCls}
                            placeholder="e.g. 4.00"
                          />
                        </FormField>
                        <FormField label="Minimum Order Quantity">
                          <input
                            value={tier.minQty}
                            onChange={(event) => setPriceTiers((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, minQty: event.target.value } : item))}
                            type="number"
                            className={inputCls}
                            placeholder="e.g. 2"
                          />
                        </FormField>
                        <FormField label="Maximum Order Quantity">
                          <input
                            value={tier.maxQty}
                            onChange={(event) => setPriceTiers((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, maxQty: event.target.value } : item))}
                            type="number"
                            className={inputCls}
                            placeholder="e.g. 4"
                          />
                        </FormField>
                      </div>

                      <div className="mt-4 flex justify-between gap-4">
                        <div className="flex-1">
                          <FormField label="MOQ Unit">
                            <div className="space-y-3">
                              <select {...register('moqUnit')} className={inputCls}>
                                <option value="">Select MOQ unit</option>
                                {moqUnitOptions.map((unit) => (
                                  <option key={unit} value={unit}>
                                    {unit}
                                  </option>
                                ))}
                              </select>
                              <div className="flex flex-col gap-2 md:flex-row">
                                <input
                                  value={customMoqUnit}
                                  onChange={(event) => setCustomMoqUnit(event.target.value)}
                                  className={inputCls}
                                  placeholder="Add new unit"
                                />
                                <button
                                  type="button"
                                  onClick={handleAddMoqUnit}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add New
                                </button>
                              </div>
                            </div>
                          </FormField>
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => setPriceTiers((previous) => previous.length === 1 ? [{ minQty: '', maxQty: '', priceMin: '', priceMax: '' }] : previous.filter((_, itemIndex) => itemIndex !== index))}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {activeTab === 'seo' && (
              <div className="space-y-4">
                <FormField label="SEO Title">
                  <input {...register('seoTitle')} className={inputCls} placeholder="Meta Title" />
                </FormField>
                <FormField label="Description">
                  <textarea {...register('seoDescription')} rows={3} className={inputCls} placeholder="Description" />
                </FormField>
                <FormField label="Keywords">
                  <input {...register('seoKeywords')} className={inputCls} placeholder="Keyword, Keyword" />
                  <p className="mt-1 text-xs text-gray-400">Separate with comma</p>
                </FormField>
                <FormField label="Meta Image">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700">
                      {uploadingSeoImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Browse
                      <input type="file" accept="image/*" className="hidden" onChange={handleSeoImageUpload} disabled={uploadingSeoImage} />
                    </label>
                    {watchedSeoImageUrl ? (
                      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <img src={watchedSeoImageUrl} alt="Meta image" className="h-12 w-12 rounded-lg object-cover" />
                        <button type="button" onClick={() => setValue('seoImageUrl', '')} className="text-sm text-red-500 hover:underline">
                          Remove
                        </button>
                      </div>
                    ) : null}
                  </div>
                </FormField>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Link href={listHref} className="flex-1 rounded-xl border border-gray-200 py-3 text-center text-sm font-medium transition-colors hover:bg-gray-50">
            Cancel
          </Link>
          <LoadingButton
            type="submit"
            loading={isSubmitting}
            loadingText={mode === 'create' ? 'Saving...' : 'Updating...'}
            icon={isLoadingProduct ? <Package className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
            disabled={isSubmitting || wholesaleCreationBlocked}
          >
            {mode === 'create' ? 'Save Product' : 'Update Product'}
          </LoadingButton>
        </div>
      </form>
    </div>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
