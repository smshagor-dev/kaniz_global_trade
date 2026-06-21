'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Camera, CheckCircle2, Loader2, MapPin, Package, Search, X } from 'lucide-react'
import { CurrencyRange } from '@/components/currency/currency-range'

type VisualMatch = {
  id: string
  slug: string
  name: string
  moq?: number | string | null
  moqUnit?: string | null
  priceMin?: number | string | null
  priceMax?: number | string | null
  images?: Array<{ url: string; altText?: string | null }>
  company: {
    name: string
    slug: string
    verificationStatus?: string | null
    country?: { name: string | null } | null
  }
  category?: { name: string; slug?: string | null } | null
  currency?: { symbol?: string | null; code?: string | null } | null
}

type VisualSearchResponse = {
  image: { url: string; key: string; filename: string }
  extractedTags: string[]
  searchQuery: string
  matches: VisualMatch[]
  note: string
}

interface VisualSearchModalProps {
  buttonClassName?: string
  iconOnly?: boolean
  label?: string
  inlinePanel?: boolean
  panelClassName?: string
}

function formatNumber(value?: number | string | null) {
  if (value == null || value === '') return null
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return String(value)
  return numeric.toLocaleString()
}

export function VisualSearchModal({
  buttonClassName,
  iconOnly = false,
  label = 'AI Visual Search',
  inlinePanel = false,
  panelClassName,
}: VisualSearchModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<VisualSearchResponse | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (!open || !inlinePanel) return

    function handleOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [inlinePanel, open])

  function resetState() {
    setFile(null)
    setResult(null)
    setSubmitting(false)
  }

  function closeModal() {
    setOpen(false)
    resetState()
  }

  async function runVisualSearch(nextFile: File) {
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', nextFile)

      const response = await fetch('/api/products/visual-search', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Visual search failed')
      }

      const data = payload.data as VisualSearchResponse
      setResult(data)

      if (inlinePanel) {
        closeModal()
        router.push(data.searchQuery ? `/products?q=${encodeURIComponent(data.searchQuery)}` : '/products')
        return
      }

      toast.success('Visual search completed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Visual search failed'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] || null
    if (!nextFile) return

    if (!nextFile.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }

    if (nextFile.size > 10 * 1024 * 1024) {
      toast.error('Image size must be 10 MB or less')
      return
    }

    setFile(nextFile)
    setResult(null)
    void runVisualSearch(nextFile)
  }

  const panelContent = (
    <div className="max-h-[80vh] overflow-y-auto bg-[radial-gradient(circle_at_top,#fff6ef_0%,#fffaf7_45%,#fffdfb_100%)]">
      <div className="border-b border-orange-100/80 px-4 py-4 text-center sm:px-6">
        <h2 className="text-[17px] font-black tracking-[-0.04em] text-slate-800 sm:text-[19px]">
          {inlinePanel ? 'Find product inspiration with Image Search' : 'AI Visual Search'}
        </h2>
      </div>

      <div className="p-4 sm:p-5 lg:p-6">
        <div className="space-y-4">
          <label className="block rounded-[10px] border-2 border-dashed border-orange-200 bg-white/85 px-4 py-6 text-center shadow-[0_18px_35px_-28px_rgba(249,115,22,0.35)] transition hover:border-orange-300 hover:bg-white sm:px-6 sm:py-7">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {previewUrl ? (
              <div className="space-y-3">
                <div className="relative mx-auto aspect-square w-full max-w-[160px] overflow-hidden rounded-2xl bg-orange-50 sm:max-w-[190px]">
                  <Image src={previewUrl} alt="Selected visual search preview" fill className="object-cover" unoptimized />
                </div>
                <p className="text-sm font-semibold text-gray-900">{file?.name}</p>
                <p className="text-xs text-slate-500">{submitting ? 'Searching automatically...' : 'Click to replace image'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center text-slate-700 sm:h-14 sm:w-14">
                  <Camera className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.7} />
                </div>
                <div className="space-y-1 text-slate-700">
                  <p className="text-sm sm:text-[15px]">
                    Paste an image you copied with <span className="rounded border border-slate-400 px-1 py-0.5 text-xs font-semibold">Ctrl</span>{' '}
                    <span className="rounded border border-slate-400 px-1 py-0.5 text-xs font-semibold">V</span>
                  </p>
                  <p className="text-sm sm:text-[15px]">Drag and drop an image here or upload a file</p>
                </div>
                <span className="inline-flex rounded-full bg-orange-500 px-6 py-2.5 text-base font-bold text-white shadow-[0_16px_28px_-18px_rgba(249,115,22,0.95)] sm:px-8 sm:py-3 sm:text-lg">
                  Upload
                </span>
              </div>
            )}
          </label>

          {submitting ? (
            <div className="inline-flex min-h-[58px] w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_28px_-18px_rgba(249,115,22,0.8)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing image...
            </div>
          ) : null}
        </div>
      </div>

      {!inlinePanel ? (
        <>
          <div className="border-t border-slate-100 bg-[radial-gradient(circle_at_top,#fff7f0_0%,#fffaf6_45%,#ffffff_100%)] px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-base font-black tracking-[-0.04em] text-slate-900 sm:text-[18px]">Kaniz Lens</p>
                <p className="text-sm text-slate-600">
                  Screenshot an image to search for similar products with flexible marketplace matching.
                </p>
              </div>
              <button
                type="button"
                className="text-left text-sm font-bold text-slate-800 underline underline-offset-2 lg:text-right"
              >
                Learn more
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 lg:p-6">
            {result ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 rounded-[24px] border border-gray-200 bg-slate-50 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Search insights</p>
                    <p className="mt-2 text-sm text-gray-600">{result.note}</p>
                    {result.extractedTags.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.extractedTags.map((tag) => (
                          <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Link
                    href={result.searchQuery ? `/products?q=${encodeURIComponent(result.searchQuery)}` : '/products'}
                    className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    View full results
                  </Link>
                </div>

                {result.matches.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {result.matches.map((match) => {
                      const image = match.images?.[0]?.url
                      const verified = ['ADMIN_VERIFIED', 'PREMIUM_VERIFIED', 'DOCUMENT_VERIFIED'].includes(match.company.verificationStatus || '')
                      return (
                        <Link
                          key={match.id}
                          href={`/products/${match.slug}`}
                          className="group overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                        >
                          <div className="grid sm:grid-cols-[160px_minmax(0,1fr)]">
                            <div className="relative min-h-[160px] bg-gray-100">
                              {image ? (
                                <Image
                                  src={image}
                                  alt={match.images?.[0]?.altText || match.name}
                                  fill
                                  className="object-cover"
                                  sizes="160px"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-gray-300">
                                  <Package className="h-10 w-10" />
                                </div>
                              )}
                            </div>
                            <div className="space-y-3 p-4">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                                  {match.category?.name || 'Marketplace product'}
                                </p>
                                <h3 className="mt-1 text-base font-bold text-gray-950 transition group-hover:text-blue-700">
                                  {match.name}
                                </h3>
                              </div>
                              <div>
                                <p className="text-lg font-black text-gray-950">
                                  <CurrencyRange minAmount={match.priceMin} maxAmount={match.priceMax} currencyCode={match.currency?.code} />
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatNumber(match.moq) ? `MOQ: ${formatNumber(match.moq)} ${match.moqUnit || 'units'}` : 'MOQ on request'}
                                </p>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p className="font-semibold text-gray-900">{match.company.name}</p>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span>{match.company.country?.name || 'Global supplier'}</span>
                                </div>
                                {verified ? (
                                  <div className="flex items-center gap-2 text-emerald-700">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span className="font-medium">Verified supplier</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-gray-200 bg-white p-10 text-center">
                    <p className="text-lg font-bold text-gray-900">No close matches found</p>
                    <p className="mt-2 text-sm text-gray-500">
                      Try a clearer product image or add a short hint to improve the search.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center rounded-[20px] border border-dashed border-gray-200 bg-slate-50 p-6 sm:p-8 text-center">
                <div className="max-w-md">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-black tracking-[-0.03em] text-gray-950 sm:text-xl">Upload an image to start</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Google AI will analyze the image, extract marketplace search terms, and show matching products from your marketplace.
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={buttonClassName || 'inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-blue-300 hover:text-blue-700'}
        aria-label={label}
      >
        <Camera className="h-4 w-4" />
        {!iconOnly ? <span>{label}</span> : null}
      </button>

      {open ? (
        inlinePanel ? (
          <div className={panelClassName || 'absolute left-0 top-full z-[80] mt-3 w-[min(960px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.3)]'}>
            <div className="flex items-center justify-end px-4 pt-4 lg:hidden">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {panelContent}
          </div>
        ) : (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4">
            <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 z-10 rounded-full border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900"
            >
              <X className="h-4 w-4" />
            </button>
            {panelContent}
          </div>
        </div>
        )
      ) : null}
    </div>
  )
}
