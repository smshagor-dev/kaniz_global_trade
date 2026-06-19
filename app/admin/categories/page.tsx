'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { del, get, post, put } from '@/lib/utils/api-client'

interface CategoryRow {
  id: string
  name: string
  slug: string
  icon?: string | null
  image?: string | null
  isActive: boolean
  sortOrder: number
  description?: string | null
  subcategories: Array<{ id: string; name: string; slug: string; isActive: boolean }>
  _count: { products: number }
}

export default function AdminCategoriesPage() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<{ type: 'category' | 'subcategory'; categoryId?: string; subId?: string } | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '', icon: '', image: '', sortOrder: 0, isActive: true, parentId: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => get<CategoryRow[]>('/admin/categories'),
  })
  const categories = (data?.data || []) as CategoryRow[]

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description || undefined,
        icon: form.icon || undefined,
        image: form.image || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
        parentId: form.parentId || undefined,
      }

      if (!editing) return post('/categories', payload)
      if (editing.type === 'category') return put(`/categories/${editing.categoryId}`, payload)
      return put(`/categories/${editing.categoryId}/subcategories/${editing.subId}`, payload)
    },
    onSuccess: () => {
      toast.success('Saved')
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      closeEditor()
    },
    onError: (error: Error) => toast.error(error.message || 'Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ categoryId, subId }: { categoryId: string; subId?: string }) => subId
      ? del(`/categories/${categoryId}/subcategories/${subId}`)
      : del(`/categories/${categoryId}`),
    onSuccess: () => {
      toast.success('Deleted')
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
    },
    onError: (error: Error) => toast.error(error.message || 'Delete failed'),
  })

  function closeEditor() {
    setEditing(null)
    setForm({ name: '', slug: '', description: '', icon: '', image: '', sortOrder: 0, isActive: true, parentId: '' })
  }

  function openCreateCategory() {
    closeEditor()
  }

  function openCreateSubcategory(categoryId: string) {
    setEditing({ type: 'subcategory', categoryId })
    setForm({ name: '', slug: '', description: '', icon: '', image: '', sortOrder: 0, isActive: true, parentId: categoryId })
  }

  function openEditCategory(category: CategoryRow) {
    setEditing({ type: 'category', categoryId: category.id })
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      image: category.image || '',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      parentId: '',
    })
  }

  function openEditSubcategory(categoryId: string, subcategory: CategoryRow['subcategories'][number]) {
    setEditing({ type: 'subcategory', categoryId, subId: subcategory.id })
    setForm({
      name: subcategory.name,
      slug: subcategory.slug,
      description: '',
      icon: '',
      image: '',
      sortOrder: 0,
      isActive: subcategory.isActive,
      parentId: categoryId,
    })
  }

  const isCreatingCategory = !editing

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">Manage marketplace categories and sub-categories from admin.</p>
        </div>
        <button onClick={openCreateCategory} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          <Plus className="h-4 w-4" />
          New category
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="text-lg font-bold text-gray-900">{isCreatingCategory ? 'Create Category' : editing?.type === 'subcategory' ? 'Manage Sub-category' : 'Edit Category'}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Slug">
            <input value={form.slug} onChange={(e) => setForm((current) => ({ ...current, slug: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Icon">
            <input value={form.icon} onChange={(e) => setForm((current) => ({ ...current, icon: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Image URL">
            <input value={form.image} onChange={(e) => setForm((current) => ({ ...current, image: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Sort Order">
            <input type="number" value={form.sortOrder} onChange={(e) => setForm((current) => ({ ...current, sortOrder: Number(e.target.value) }))} className={inputCls} />
          </Field>
          <Field label="Status">
            <select value={form.isActive ? 'active' : 'inactive'} onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.value === 'active' }))} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Description" className="md:col-span-2">
            <textarea value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} rows={3} className={inputCls} />
          </Field>
        </div>
        <div className="mt-4 flex gap-3">
          {!isCreatingCategory && (
            <button onClick={closeEditor} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          )}
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {mutation.isPending ? 'Saving...' : isCreatingCategory ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id} className="rounded-2xl border border-gray-100 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{category.name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${category.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {category._count.products} products
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{category.slug}</p>
                    {category.description && <p className="mt-3 text-sm leading-6 text-gray-600">{category.description}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openCreateSubcategory(category.id)} className="rounded-xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Add sub-category</button>
                    <button onClick={() => openEditCategory(category)} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><Pencil className="mr-1 inline h-4 w-4" />Edit</button>
                    <button onClick={() => deleteMutation.mutate({ categoryId: category.id })} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 className="mr-1 inline h-4 w-4" />Delete</button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {category.subcategories.map((subcategory) => (
                    <div key={subcategory.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
                      <span>{subcategory.name}</span>
                      <button onClick={() => openEditSubcategory(category.id, subcategory)} className="text-gray-500 hover:text-blue-700"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteMutation.mutate({ categoryId: category.id, subId: subcategory.id })} className="text-gray-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  {!category.subcategories.length && <p className="text-sm text-gray-400">No sub-categories yet.</p>}
                </div>
              </div>
            ))}
          </div>
        )}
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
