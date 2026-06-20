'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  FolderTree,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Shapes,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api, { del, get, post, put } from '@/lib/utils/api-client'

interface SubcategoryRow {
  id: string
  name: string
  slug: string
  isActive: boolean
  source: 'ADMIN' | 'SUPPLIER'
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdById?: string | null
  approvedAt?: string | null
  createdBy?: { id: string; firstName: string; lastName: string; email: string } | null
}

interface CategoryRow {
  id: string
  name: string
  slug: string
  icon?: string | null
  image?: string | null
  isActive: boolean
  sortOrder: number
  description?: string | null
  source: 'ADMIN' | 'SUPPLIER'
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdById?: string | null
  approvedAt?: string | null
  rejectedReason?: string | null
  createdBy?: { id: string; firstName: string; lastName: string; email: string } | null
  approvedBy?: { id: string; firstName: string; lastName: string; email: string } | null
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
  isActive: boolean
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectedReason: string
}

type SubcategoryFormState = {
  name: string
  slug: string
  description: string
  isActive: boolean
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectedReason: string
}

type ModalState =
  | { type: 'category-create' }
  | { type: 'category-edit'; categoryId: string }
  | { type: 'subcategory-create'; categoryId: string; categoryName: string }
  | { type: 'subcategory-edit'; categoryId: string; categoryName: string; subId: string }
  | null

type DeleteConfirmState =
  | { categoryId: string; name: string; type: 'category' }
  | { categoryId: string; subId: string; name: string; type: 'subcategory' }
  | null

const emptyCategoryForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  icon: '',
  image: '',
  sortOrder: 0,
  isActive: true,
  approvalStatus: 'APPROVED',
  rejectedReason: '',
}

const emptySubcategoryForm: SubcategoryFormState = {
  name: '',
  slug: '',
  description: '',
  isActive: true,
  approvalStatus: 'APPROVED',
  rejectedReason: '',
}

export default function AdminCategoriesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<ModalState>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm)
  const [subcategoryForm, setSubcategoryForm] = useState<SubcategoryFormState>(emptySubcategoryForm)
  const [uploadingImage, setUploadingImage] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => get<CategoryRow[]>('/admin/categories'),
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
          isActive: categoryForm.isActive,
          approvalStatus: categoryForm.approvalStatus,
          rejectedReason: categoryForm.approvalStatus === 'REJECTED' ? categoryForm.rejectedReason || null : null,
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
        isActive: subcategoryForm.isActive,
        approvalStatus: subcategoryForm.approvalStatus,
        rejectedReason: subcategoryForm.approvalStatus === 'REJECTED' ? subcategoryForm.rejectedReason || null : null,
      })
    },
    onSuccess: () => {
      toast.success('Saved successfully')
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      closeModal()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Save failed')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ categoryId, subId }: { categoryId: string; subId?: string }) =>
      subId ? del(`/categories/${categoryId}/subcategories/${subId}`) : del(`/categories/${categoryId}`),
    onSuccess: () => {
      toast.success('Deleted successfully')
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      setDeleteConfirm(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Delete failed')
    },
  })

  const reviewMutation = useMutation({
    mutationFn: ({
      categoryId,
      subId,
      approvalStatus,
    }: {
      categoryId: string
      subId?: string
      approvalStatus: 'APPROVED' | 'REJECTED'
    }) =>
      subId
        ? put(`/categories/${categoryId}/subcategories/${subId}`, {
            name: categories
              .find((category) => category.id === categoryId)
              ?.subcategories.find((subcategory) => subcategory.id === subId)?.name || '',
            slug: categories
              .find((category) => category.id === categoryId)
              ?.subcategories.find((subcategory) => subcategory.id === subId)?.slug || '',
            isActive: true,
            approvalStatus,
            rejectedReason: approvalStatus === 'REJECTED' ? 'Rejected by admin review' : null,
          })
        : put(`/categories/${categoryId}`, {
            name: categories.find((category) => category.id === categoryId)?.name || '',
            slug: categories.find((category) => category.id === categoryId)?.slug || '',
            description: categories.find((category) => category.id === categoryId)?.description || null,
            icon: categories.find((category) => category.id === categoryId)?.icon || null,
            image: categories.find((category) => category.id === categoryId)?.image || null,
            sortOrder: categories.find((category) => category.id === categoryId)?.sortOrder || 0,
            isActive: categories.find((category) => category.id === categoryId)?.isActive ?? true,
            approvalStatus,
            rejectedReason: approvalStatus === 'REJECTED' ? 'Rejected by admin review' : null,
          }),
    onSuccess: () => {
      toast.success('Approval status updated')
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
    },
    onError: (error: Error) => toast.error(error.message || 'Review update failed'),
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
      isActive: category.isActive,
      approvalStatus: category.approvalStatus,
      rejectedReason: category.rejectedReason || '',
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
      isActive: subcategory.isActive,
      approvalStatus: subcategory.approvalStatus,
      rejectedReason: '',
    })
    setModal({
      type: 'subcategory-edit',
      categoryId: category.id,
      categoryName: category.name,
      subId: subcategory.id,
    })
  }

  function openDeleteCategory(category: CategoryRow) {
    setDeleteConfirm({
      type: 'category',
      categoryId: category.id,
      name: category.name,
    })
  }

  function openDeleteSubcategory(category: CategoryRow, subcategory: SubcategoryRow) {
    setDeleteConfirm({
      type: 'subcategory',
      categoryId: category.id,
      subId: subcategory.id,
      name: subcategory.name,
    })
  }

  function confirmDelete() {
    if (!deleteConfirm) return
    deleteMutation.mutate({
      categoryId: deleteConfirm.categoryId,
      subId: deleteConfirm.type === 'subcategory' ? deleteConfirm.subId : undefined,
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
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Admin taxonomy</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">Categories</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            See only the category list here, with each sub-category grouped neatly underneath its parent.
          </p>
        </div>
        <button
          onClick={openCategoryCreate}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          <Plus className="h-4 w-4" />
          Add new category
        </button>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : !categories.length ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
            <Shapes className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">No categories yet</h2>
            <p className="mt-2 text-sm text-slate-500">Create the first category to start organizing the marketplace.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id} className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50/70">
                <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
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
                          <Badge active={category.isActive}>{category.isActive ? 'Active' : 'Inactive'}</Badge>
                          <Badge tone="blue">{category._count.products} products</Badge>
                          <Badge tone="slate">{category.subcategories.length} sub-categories</Badge>
                          <Badge tone={category.approvalStatus === 'APPROVED' ? 'green' : category.approvalStatus === 'REJECTED' ? 'red' : 'amber'}>
                            {category.approvalStatus}
                          </Badge>
                          <Badge tone={category.source === 'ADMIN' ? 'slate' : 'blue'}>{category.source}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{category.slug}</p>
                      </div>
                    </div>
                    {category.description ? (
                      <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{category.description}</p>
                    ) : null}
                    {category.createdBy ? (
                      <p className="mt-3 text-xs text-slate-400">
                        Created by {category.createdBy.firstName} {category.createdBy.lastName} ({category.createdBy.email})
                      </p>
                    ) : null}
                    {category.rejectedReason ? (
                      <p className="mt-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                        Rejection note: {category.rejectedReason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {category.source === 'SUPPLIER' && category.approvalStatus !== 'APPROVED' ? (
                      <>
                        <button
                          onClick={() => reviewMutation.mutate({ categoryId: category.id, approvalStatus: 'APPROVED' })}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reviewMutation.mutate({ categoryId: category.id, approvalStatus: 'REJECTED' })}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    <button
                      onClick={() => openSubcategoryCreate(category)}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <Plus className="h-4 w-4" />
                      Add sub-category
                    </button>
                    <button
                      onClick={() => openCategoryEdit(category)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteCategory(category)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
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
                      {category.subcategories.map((subcategory) => (
                        <div key={subcategory.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                              <h3 className="font-semibold text-slate-900">{subcategory.name}</h3>
                              <Badge active={subcategory.isActive}>{subcategory.isActive ? 'Active' : 'Inactive'}</Badge>
                              <Badge tone={subcategory.approvalStatus === 'APPROVED' ? 'green' : subcategory.approvalStatus === 'REJECTED' ? 'red' : 'amber'}>
                                {subcategory.approvalStatus}
                              </Badge>
                              <Badge tone={subcategory.source === 'ADMIN' ? 'slate' : 'blue'}>{subcategory.source}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{subcategory.slug}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {subcategory.source === 'SUPPLIER' && subcategory.approvalStatus !== 'APPROVED' ? (
                              <>
                                <button
                                  onClick={() => reviewMutation.mutate({ categoryId: category.id, subId: subcategory.id, approvalStatus: 'APPROVED' })}
                                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => reviewMutation.mutate({ categoryId: category.id, subId: subcategory.id, approvalStatus: 'REJECTED' })}
                                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            <button
                              onClick={() => openSubcategoryEdit(category, subcategory)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => openDeleteSubcategory(category, subcategory)}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
                      No sub-categories under this category yet.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalShell
        open={modal !== null}
        title={
          modal?.type === 'category-create'
            ? 'Add New Category'
            : modal?.type === 'category-edit'
              ? 'Edit Category'
              : modal?.type === 'subcategory-create'
                ? `Add Sub-category to ${modal.categoryName}`
                : modal?.type === 'subcategory-edit'
                  ? `Edit Sub-category in ${modal.categoryName}`
                  : ''
        }
        subtitle={
          modal?.type?.startsWith('category')
            ? 'Create or update top-level marketplace categories.'
            : modal
              ? 'Create or update a sub-category under the selected category.'
              : ''
        }
        onClose={closeModal}
      >
        {modal?.type === 'category-create' || modal?.type === 'category-edit' ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Category name">
                <input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((current) => ({ ...current, name: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Slug">
                <input
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm((current) => ({ ...current, slug: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Icon">
                <input
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm((current) => ({ ...current, icon: e.target.value }))}
                  className={inputCls}
                />
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
                <input
                  type="number"
                  value={categoryForm.sortOrder}
                  onChange={(e) => setCategoryForm((current) => ({ ...current, sortOrder: Number(e.target.value) }))}
                  className={inputCls}
                />
              </Field>
              {modal.type === 'category-edit' ? (
                <Field label="Status">
                  <select
                    value={categoryForm.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setCategoryForm((current) => ({ ...current, isActive: e.target.value === 'active' }))}
                    className={inputCls}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              ) : null}
              {modal.type === 'category-edit' ? (
                <Field label="Approval">
                  <select
                    value={categoryForm.approvalStatus}
                    onChange={(e) => setCategoryForm((current) => ({ ...current, approvalStatus: e.target.value as CategoryFormState['approvalStatus'] }))}
                    className={inputCls}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </Field>
              ) : null}
              <Field label="Description" className="md:col-span-2">
                <textarea
                  rows={4}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((current) => ({ ...current, description: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              {modal.type === 'category-edit' && categoryForm.approvalStatus === 'REJECTED' ? (
                <Field label="Rejection reason" className="md:col-span-2">
                  <textarea
                    rows={3}
                    value={categoryForm.rejectedReason}
                    onChange={(e) => setCategoryForm((current) => ({ ...current, rejectedReason: e.target.value }))}
                    className={inputCls}
                  />
                </Field>
              ) : null}
            </div>
          </>
        ) : modal ? (
          <div className="grid gap-4">
            <Field label="Sub-category name">
              <input
                value={subcategoryForm.name}
                onChange={(e) => setSubcategoryForm((current) => ({ ...current, name: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <Field label="Slug">
              <input
                value={subcategoryForm.slug}
                onChange={(e) => setSubcategoryForm((current) => ({ ...current, slug: e.target.value }))}
                className={inputCls}
              />
            </Field>
            {modal.type === 'subcategory-edit' ? (
              <Field label="Status">
                <select
                  value={subcategoryForm.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setSubcategoryForm((current) => ({ ...current, isActive: e.target.value === 'active' }))}
                  className={inputCls}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            ) : null}
            {modal.type === 'subcategory-edit' ? (
              <Field label="Approval">
                <select
                  value={subcategoryForm.approvalStatus}
                  onChange={(e) => setSubcategoryForm((current) => ({ ...current, approvalStatus: e.target.value as SubcategoryFormState['approvalStatus'] }))}
                  className={inputCls}
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </Field>
            ) : null}
            <Field label="Description">
              <textarea
                rows={4}
                value={subcategoryForm.description}
                onChange={(e) => setSubcategoryForm((current) => ({ ...current, description: e.target.value }))}
                className={inputCls}
              />
            </Field>
            {modal.type === 'subcategory-edit' && subcategoryForm.approvalStatus === 'REJECTED' ? (
              <Field label="Rejection reason">
                <textarea
                  rows={3}
                  value={subcategoryForm.rejectedReason}
                  onChange={(e) => setSubcategoryForm((current) => ({ ...current, rejectedReason: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={closeModal}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </ModalShell>

      <ModalShell
        open={deleteConfirm !== null}
        title={deleteConfirm?.type === 'subcategory' ? 'Delete Sub-category' : 'Delete Category'}
        subtitle="This action cannot be undone. If linked products exist, the API will prevent deletion."
        onClose={() => setDeleteConfirm(null)}
      >
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4">
          <p className="text-sm font-semibold text-slate-900">
            {deleteConfirm?.type === 'subcategory'
              ? `Are you sure you want to delete the sub-category "${deleteConfirm?.name}"?`
              : `Are you sure you want to delete the category "${deleteConfirm?.name}"?`}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Please confirm only if you are sure this taxonomy item is no longer needed.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={() => setDeleteConfirm(null)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Yes, delete'}
          </button>
        </div>
      </ModalShell>
    </div>
  )
}

function ModalShell({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
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

function Badge({
  children,
  active,
  tone = 'green',
}: {
  children: React.ReactNode
  active?: boolean
  tone?: 'green' | 'blue' | 'slate' | 'amber' | 'red'
}) {
  const toneClass =
    active === false
      ? 'bg-slate-100 text-slate-600'
      : tone === 'blue'
        ? 'bg-blue-50 text-blue-700'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-700'
          : tone === 'red'
            ? 'bg-red-50 text-red-700'
        : tone === 'slate'
          ? 'bg-slate-100 text-slate-700'
          : 'bg-emerald-50 text-emerald-700'

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>
}

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100'
