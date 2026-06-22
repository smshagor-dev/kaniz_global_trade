'use client'

import { ChangeEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clapperboard, Loader2, Pencil, Star, Trash2, Upload } from 'lucide-react'
import api, { del, get, patch, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { VideoPlayer } from '@/components/media/video-player'

interface Company {
  id: string
  name: string
}

interface Tour {
  id: string
  title: string
  description?: string | null
  videoUrl: string
  thumbnailUrl?: string | null
  durationSec?: number | null
  language: string
  isFeatured: boolean
  createdAt?: string
}

type TourForm = {
  title: string
  description: string
  videoUrl: string
  thumbnailUrl: string
  durationSec: string
  language: string
  isFeatured: boolean
}

const emptyForm = (): TourForm => ({
  title: '',
  description: '',
  videoUrl: '',
  thumbnailUrl: '',
  durationSec: '',
  language: 'en',
  isFeatured: false,
})

const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
const labelCls = 'text-sm font-medium text-gray-700'

function formatDuration(value?: number | null) {
  if (!value || value <= 0) return 'Duration not set'
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  if (!minutes) return `${seconds}s`
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function normalizeForm(form: TourForm) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    videoUrl: form.videoUrl.trim(),
    thumbnailUrl: form.thumbnailUrl.trim() || undefined,
    durationSec: form.durationSec.trim() ? Number(form.durationSec) : undefined,
    language: form.language.trim().toLowerCase() || 'en',
    isFeatured: form.isFeatured,
  }
}

async function readVideoDuration(file: File) {
  return new Promise<number | undefined>((resolve) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)

    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const seconds = Number.isFinite(video.duration) ? Math.round(video.duration) : undefined
      URL.revokeObjectURL(objectUrl)
      resolve(seconds && seconds > 0 ? seconds : undefined)
    }
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(undefined)
    }
    video.src = objectUrl
  })
}

export default function VirtualToursPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<TourForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ['my-company'],
    queryFn: () => get<Company>('/me/company'),
  })
  const company = companyData?.data as Company | undefined

  const {
    data: toursData,
    isLoading: toursLoading,
    isFetching: toursFetching,
  } = useQuery({
    queryKey: ['company-virtual-tours', company?.id],
    queryFn: () => get<Tour[]>(`/companies/${company?.id}/virtual-tours`),
    enabled: !!company?.id,
  })

  const tours = useMemo(() => ((toursData?.data || []) as Tour[]), [toursData?.data])
  const featuredCount = tours.filter((tour) => tour.isFeatured).length
  const isEditing = Boolean(editingId)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No supplier company found')

      const payload = normalizeForm(form)
      if (payload.title.length < 3) throw new Error('Tour title must be at least 3 characters')
      if (!payload.videoUrl) throw new Error('Upload a video or provide a direct video URL')
      if (payload.durationSec !== undefined && (!Number.isInteger(payload.durationSec) || payload.durationSec <= 0)) {
        throw new Error('Duration must be a positive number of seconds')
      }

      if (editingId) {
        return patch(`/companies/${company.id}/virtual-tours`, { tourId: editingId, ...payload })
      }

      return post(`/companies/${company.id}/virtual-tours`, payload)
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Virtual tour updated' : 'Virtual tour published')
      setForm(emptyForm())
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['company-virtual-tours', company?.id] })
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unable to save virtual tour'
      toast.error(message)
    },
  })

  async function uploadAsset(file: File, type: 'product_image' | 'product_video') {
    const body = new FormData()
    body.append('file', file)
    body.append('type', type)

    const { data: result } = await api.post('/upload', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return result.data as { url: string; thumbnailUrl?: string | null }
  }

  async function handleVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingVideo(true)
    try {
      const [uploaded, durationSec] = await Promise.all([
        uploadAsset(file, 'product_video'),
        readVideoDuration(file),
      ])

      setForm((current) => ({
        ...current,
        title: current.title || file.name.replace(/\.[^.]+$/, ''),
        videoUrl: uploaded.url,
        thumbnailUrl: current.thumbnailUrl || uploaded.thumbnailUrl || '',
        durationSec: durationSec ? String(durationSec) : current.durationSec,
      }))
      toast.success('Video uploaded')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Video upload failed'
      toast.error(message)
    } finally {
      setUploadingVideo(false)
      event.target.value = ''
    }
  }

  async function handleThumbnailUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingThumbnail(true)
    try {
      const uploaded = await uploadAsset(file, 'product_image')
      setForm((current) => ({ ...current, thumbnailUrl: uploaded.url }))
      toast.success('Thumbnail uploaded')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Thumbnail upload failed'
      toast.error(message)
    } finally {
      setUploadingThumbnail(false)
      event.target.value = ''
    }
  }

  function startEditing(tour: Tour) {
    setEditingId(tour.id)
    setForm({
      title: tour.title,
      description: tour.description || '',
      videoUrl: tour.videoUrl,
      thumbnailUrl: tour.thumbnailUrl || '',
      durationSec: tour.durationSec ? String(tour.durationSec) : '',
      language: tour.language || 'en',
      isFeatured: tour.isFeatured,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetEditor() {
    setEditingId(null)
    setForm(emptyForm())
  }

  async function removeTour(tourId: string) {
    if (!company?.id) return
    if (!window.confirm('Delete this virtual tour? This action cannot be undone.')) return

    setDeletingId(tourId)
    try {
      await del(`/companies/${company.id}/virtual-tours?tourId=${tourId}`)
      toast.success('Virtual tour deleted')
      if (editingId === tourId) resetEditor()
      queryClient.invalidateQueries({ queryKey: ['company-virtual-tours', company.id] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  if (companyLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!company?.id) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Create or connect a supplier company first to manage virtual factory tours.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Virtual Factory Tours</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Publish walk-through videos that help buyers inspect your production environment before the first deal.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {tours.length}/12 tours published
          <div className="text-xs text-blue-700">
            {featuredCount ? `${featuredCount} featured tour active` : 'No featured tour selected yet'}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit virtual tour' : 'Create a new virtual tour'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Upload MP4/WebM video files or paste a direct hosted video URL.
              </p>
            </div>
            {isEditing ? (
              <button
                type="button"
                onClick={resetEditor}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className={labelCls}>Tour title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Main factory walkthrough"
                className={inputCls}
                maxLength={160}
              />
            </label>

            <label className="space-y-2">
              <span className={labelCls}>Direct video URL</span>
              <input
                value={form.videoUrl}
                onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
                placeholder="https://cdn.example.com/factory-tour.mp4"
                className={inputCls}
              />
            </label>

            <div className="space-y-2">
              <span className={labelCls}>Upload video</span>
              <label className="flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700">
                {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingVideo ? 'Uploading video...' : 'Choose video file'}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  className="hidden"
                  onChange={handleVideoUpload}
                  disabled={uploadingVideo}
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className={labelCls}>Thumbnail URL</span>
              <input
                value={form.thumbnailUrl}
                onChange={(event) => setForm((current) => ({ ...current, thumbnailUrl: event.target.value }))}
                placeholder="https://cdn.example.com/factory-tour-cover.jpg"
                className={inputCls}
              />
            </label>

            <div className="space-y-2">
              <span className={labelCls}>Upload thumbnail</span>
              <label className="flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700">
                {uploadingThumbnail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingThumbnail ? 'Uploading image...' : 'Choose image file'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailUpload}
                  disabled={uploadingThumbnail}
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className={labelCls}>Language</span>
              <input
                value={form.language}
                onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
                placeholder="en"
                className={inputCls}
                maxLength={10}
              />
            </label>

            <label className="space-y-2">
              <span className={labelCls}>Duration in seconds</span>
              <input
                type="number"
                min="1"
                max="14400"
                value={form.durationSec}
                onChange={(event) => setForm((current) => ({ ...current, durationSec: event.target.value }))}
                placeholder="240"
                className={inputCls}
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className={labelCls}>Buyer-facing description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Mention production lines, certifications, safety standards, or quality checkpoints shown in the tour."
                className={`${inputCls} min-h-32 resize-y`}
                maxLength={2000}
              />
            </label>

            <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Mark as featured so this tour appears first on your public supplier profile.
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || uploadingVideo || uploadingThumbnail}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clapperboard className="h-4 w-4" />}
              {isEditing ? 'Save changes' : 'Publish virtual tour'}
            </button>
            <button
              type="button"
              onClick={resetEditor}
              disabled={saveMutation.isPending}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset form
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-slate-950 p-5 text-white shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-semibold">Live preview</h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            {form.videoUrl ? (
              <VideoPlayer
                url={form.videoUrl}
                title={form.title || 'Virtual tour preview'}
                poster={form.thumbnailUrl}
                className="aspect-video w-full overflow-hidden bg-black"
              />
            ) : form.thumbnailUrl ? (
              <img src={form.thumbnailUrl} alt="Virtual tour preview" className="aspect-video w-full object-cover" />
            ) : (
              <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-slate-300">
                Upload a video or provide a direct media URL to preview your buyer-facing virtual tour.
              </div>
            )}
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">{form.language || 'en'}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
                {formatDuration(form.durationSec ? Number(form.durationSec) : undefined)}
              </span>
              {form.isFeatured ? (
                <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-200">Featured on public profile</span>
              ) : null}
            </div>
            <div>
              <p className="text-base font-semibold text-white">{form.title || 'Tour title preview'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {form.description || 'Your description will help buyers understand what this factory tour proves about your production setup.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Published tours</h2>
            <p className="mt-1 text-sm text-gray-500">
              Keep your best walkthrough featured and remove outdated media before buyers see it.
            </p>
          </div>
          {toursFetching ? <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> : null}
        </div>

        {toursLoading ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : tours.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
            No virtual tours published yet. Add your first production walkthrough to strengthen buyer trust.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {tours.map((tour) => (
              <div key={tour.id} className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50">
                <div className="aspect-video bg-black">
                  <VideoPlayer
                    url={tour.videoUrl}
                    title={tour.title}
                    poster={tour.thumbnailUrl}
                    className="h-full w-full overflow-hidden bg-black"
                  />
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {tour.isFeatured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">
                        <Star className="h-3.5 w-3.5" /> Featured
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white px-2.5 py-1 text-gray-600">{tour.language}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-gray-600">{formatDuration(tour.durationSec)}</span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{tour.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {tour.description || 'No buyer-facing description added yet.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => startEditing(tour)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeTour(tour.id)}
                      disabled={deletingId === tour.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === tour.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </button>
                    <a
                      href={tour.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900"
                    >
                      Open video URL
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
