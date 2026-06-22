'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, FolderTree, ImagePlus, Loader2, Pencil, Plus, Tag, Trash2, Upload, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { get, post, put } from '@/lib/utils/api-client'

interface SubcategoryRow {
  id: string
  name: string
  slug: string
  isActive: boolean
  source: 'ADMIN' | 'SUPPLIER'
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdById?: string | null
}

interface CategoryRow {
  id: string
  name: string
  slug: string
  description?: string | null
  icon?: string | null
  image?: string | null
  isActive: boolean
  sortOrder: number
  source: 'ADMIN' | 'SUPPLIER'
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdById?: string | null
  rejectedReason?: string | null
  subcategories: SubcategoryRow[]
  _count: { products: number }
}

type CategoryFormState = {
  name: string
  slug: string
  description: string
  icon: string
  image: string
  sortOrder: number
}

type SubcategoryFormState = {
  name: string
  slug: string
  description: string
}

type ModalState =
  | { type: 'category-create' }
  | { type: 'category-edit'; categoryId: string }
  | { type: 'subcategory-create'; categoryId: string; categoryName: string }
  | { type: 'subcategory-edit'; categoryId: string; categoryName: string; subId: string }
  | null

const emptyCategoryForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  icon: '',
  image: '',
  sortOrder: 0,
}

const emptySubcategoryForm: SubcategoryFormState = {
  name: '',
  slug: '',
  description: '',
}

export default function SupplierCategoriesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<ModalState>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm)
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryFormState>(emptySubcategoryForm)
  const [uploadingImage, setUploadingImage] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['supplier-categories'],
    queryFn: () => get<CategoryRow[]>('/categories?withSubs=true&parentOnly=true&scope=dashboard'),
  })

  const categories = (data?.data || []) as CategoryRow[]

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!modal) throw new Error('No modal action selected')

      if (modal.type === 'category-create') {
        return post('/categories', {
          name: categoryForm.name,
          slug: categoryForm.slug || undefined,
          description: categoryForm.description || undefined,
          icon: categoryForm.icon || undefined,
          image: categoryForm.image || undefined,
          sortOrder: Number(categoryForm.sortOrder) || 0,
        })
      }

      if (modal.type === 'category-edit') {
        return put(`/categories/${modal.categoryId}`, {
          name: categoryForm.name,
          slug: categoryForm.slug || undefined,
          description: categoryForm.description || null,
          icon: categoryForm.icon || null,
          image: categoryForm.image || null,
          sortOrder: Number(categoryForm.sortOrder) || 0,
          isActive: true,
        })
      }

      if (modal.type === 'subcategory-create') {
        return post('/categories', {
          name: subcategoryForm.name,
          slug: subcategoryForm.slug || undefined,
          description: subcategoryForm.description || undefined,
          parentId: modal.categoryId,
        })
      }

      return put(`/categories/${modal.categoryId}/subcategories/${modal.subId}`, {
        name: subcategoryForm.name,
        slug: subcategoryForm.slug || undefined,
        description: subcategoryForm.description || null,
        isActive: true,
      })
    },
    onSuccess: () => {
      toast.success('Saved and submitted for Kaniz Global Trade approval')
      qc.invalidateQueries({ queryKey: ['supplier-categories'] })
      closeModal()
    },
    onError: (error: Error) => toast.error(error.message || 'Save failed'),
  })

  function closeModal() {
    setModal(null)
    setCategoryForm(emptyCategoryForm)
    setSubcategoryForm(emptySubcategoryForm)
  }

  function openCategoryCreate() {
    setCategoryForm(emptyCategoryForm)
    setModal({ type: 'category-create' })
  }

  function openCategoryEdit(category: CategoryRow) {
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      image: category.image || '',
      sortOrder: category.sortOrder,
    })
    setModal({ type: 'category-edit', categoryId: category.id })
  }

  function openSubcategoryCreate(category: CategoryRow) {
    setSubcategoryForm(emptySubcategoryForm)
    setModal({ type: 'subcategory-create', categoryId: category.id, categoryName: category.name })
  }

  function openSubcategoryEdit(category: CategoryRow, subcategory: SubcategoryRow) {
    setSubcategoryForm({
      name: subcategory.name,
      slug: subcategory.slug,
      description: '',
    })
    setModal({
      type: 'subcategory-edit',
      categoryId: category.id,
      categoryName: category.name,
      subId: subcategory.id,
    })
  }

  async function handleCategoryImageUpload(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'category_image')

      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setCategoryForm((current) => ({ ...current, image: response.data.data.url }))
      toast.success('Category image uploaded')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Category image upload failed'
      toast.error(message)
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Supplier taxonomy</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Categories</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Create and edit your own categories or sub-categories. Kaniz Global Trade taxonomy is visible here but locked from supplier editing.
          </p>
        </div>
        <button onClick={openCategoryCreate} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
          <Plus className="h-4 w-4" />
          Request new category
        </button>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => {
              const editableCategory = category.source === 'SUPPLIER'
              return (
                <div key={category.id} className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50/70">
                  <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {category.image ? (
                          <div className="h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                            <img src={category.image} alt={category.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                            <FolderTree className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-950">{category.name}</h2>
                            <StatusBadge status={category.approvalStatus} />
                            <SourceBadge source={category.source} />
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{category.slug}</p>
                        </div>
                      </div>
                      {category.rejectedReason ? (
                        <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                          Rejection note: {category.rejectedReason}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openSubcategoryCreate(category)}
                        disabled={!editableCategory}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add sub-category
                      </button>
                      <button
                        onClick={() => openCategoryEdit(category)}
                        disabled={!editableCategory}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Tag className="h-4 w-4 text-slate-400" />
                      Sub-category list
                    </div>
                    {category.subcategories.length ? (
                      <div className="grid gap-3">
                        {category.subcategories.map((subcategory) => {
                          const editableSubcategory = subcategory.source === 'SUPPLIER'
                          return (
                            <div key={subcategory.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-900">{subcategory.name}</span>
                                  <StatusBadge status={subcategory.approvalStatus} />
                                  <SourceBadge source={subcategory.source} />
                                </div>
                                <p className="mt-1 text-sm text-slate-500">{subcategory.slug}</p>
                              </div>
                              <button
                                onClick={() => openSubcategoryEdit(category, subcategory)}
                                disabled={!editableSubcategory}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Pencil className="h-4 w-4" />
                                Edit
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
                        No sub-categories under this category yet.
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ModalShell
        open={modal !== null}
        title={
          modal?.type === 'category-create'
            ? 'Request New Category'
            : modal?.type === 'category-edit'
              ? 'Edit Your Category'
              : modal?.type === 'subcategory-create'
                ? `Request Sub-category for ${modal.categoryName}`
                : modal?.type === 'subcategory-edit'
                  ? `Edit Your Sub-category in ${modal.categoryName}`
                  : ''
        }
        onClose={closeModal}
      >
        {modal?.type === 'category-create' || modal?.type === 'category-edit' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Category name">
              <input value={categoryForm.name} onChange={(e) => setCategoryForm((current) => ({ ...current, name: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Slug">
              <input value={categoryForm.slug} onChange={(e) => setCategoryForm((current) => ({ ...current, slug: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Icon">
              <input value={categoryForm.icon} onChange={(e) => setCategoryForm((current) => ({ ...current, icon: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Category image">
              <div className="space-y-3">
                <label className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-blue-300 hover:bg-blue-50">
                  {uploadingImage ? <Loader2 className="h-6 w-6 animate-spin text-blue-600" /> : <Upload className="h-6 w-6 text-blue-600" />}
                  <span className="mt-3 text-sm font-semibold text-slate-800">Upload category image</span>
                  <span className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, GIF. Max 10MB.</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCategoryImageUpload(e.target.files)} disabled={uploadingImage} />
                </label>

                {categoryForm.image ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="aspect-[16/10] overflow-hidden bg-slate-100">
                      <img src={categoryForm.image} alt={categoryForm.name || 'Category image preview'} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex items-center justify-between gap-3 p-3">
                      <p className="truncate text-xs text-slate-500">{categoryForm.image}</p>
                      <button
                        type="button"
                        onClick={() => setCategoryForm((current) => ({ ...current, image: '' }))}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    <ImagePlus className="h-4 w-4 text-slate-400" />
                    No image selected yet.
                  </div>
                )}
              </div>
            </Field>
            <Field label="Sort order">
              <input type="number" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm((current) => ({ ...current, sortOrder: Number(e.target.value) }))} className={inputCls} />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <textarea rows={4} value={categoryForm.description} onChange={(e) => setCategoryForm((current) => ({ ...current, description: e.target.value }))} className={inputCls} />
            </Field>
          </div>
        ) : modal ? (
          <div className="grid gap-4">
            <Field label="Sub-category name">
              <input value={subcategoryForm.name} onChange={(e) => setSubcategoryForm((current) => ({ ...current, name: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Slug">
              <input value={subcategoryForm.slug} onChange={(e) => setSubcategoryForm((current) => ({ ...current, slug: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Description">
              <textarea rows={4} value={subcategoryForm.description} onChange={(e) => setSubcategoryForm((current) => ({ ...current, description: e.target.value }))} className={inputCls} />
            </Field>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </ModalShell>
    </div>
  )
}

function ModalShell({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-950">{title}</h2>
          <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: 'PENDING' | 'APPROVED' | 'REJECTED' }) {
  if (status === 'APPROVED') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Approved</span>
  }
  if (status === 'REJECTED') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"><XCircle className="h-3.5 w-3.5" />Rejected</span>
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"><Clock3 className="h-3.5 w-3.5" />Pending approval</span>
}

function SourceBadge({ source }: { source: 'ADMIN' | 'SUPPLIER' }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${source === 'ADMIN' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'}`}>{source === 'ADMIN' ? 'Kaniz Global Trade' : 'Supplier'}</span>
}

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100'
