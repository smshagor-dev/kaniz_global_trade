import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { CatalogCard } from '@/components/public/home/catalog-card'

interface Props {
  params: Promise<{ slug: string; subcategorySlug: string }>
}

export default async function SubcategoryPage({ params }: Props) {
  const { slug, subcategorySlug } = await params

  const category = await prisma.category.findFirst({ where: { slug, approvalStatus: 'APPROVED' } })
  if (!category) notFound()

  const subcategory = await prisma.subCategory.findFirst({
    where: {
      slug: subcategorySlug,
      categoryId: category.id,
      isActive: true,
      approvalStatus: 'APPROVED',
    },
  })
  if (!subcategory) notFound()

  const products = await prisma.product.findMany({
    where: {
      categoryId: category.id,
      subcategoryId: subcategory.id,
      status: 'APPROVED',
      deletedAt: null,
    },
    take: 16,
    orderBy: [{ isFeatured: 'desc' }, { totalViews: 'desc' }, { createdAt: 'desc' }],
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      company: {
        select: {
          name: true,
          slug: true,
          verificationStatus: true,
          country: { select: { name: true, code: true } },
        },
      },
      category: { select: { name: true, slug: true } },
      subcategory: { select: { name: true, slug: true } },
      currency: { select: { symbol: true, code: true } },
    },
  })

  return (
    <div className="w-full px-4 py-8 md:px-6 lg:px-8 2xl:px-10">
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-500">
          <Link href={`/categories/${category.slug}`} className="hover:text-blue-700">{category.name}</Link>
          <span> / </span>
          <span className="text-gray-900">{subcategory.name}</span>
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-gray-950">{subcategory.name}</h1>
        {subcategory.description && <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">{subcategory.description}</p>}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <CatalogCard key={product.id} product={product} />
        ))}
      </div>

      {!products.length && (
        <div className="mt-6 rounded-[28px] border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No products found in this sub-category yet.
        </div>
      )}
    </div>
  )
}
