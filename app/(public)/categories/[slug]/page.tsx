import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { CatalogCard } from '@/components/public/home/catalog-card'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      subcategories: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!category || !category.isActive) notFound()

  const products = await prisma.product.findMany({
    where: {
      categoryId: category.id,
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
      category: { select: { name: true } },
      subcategory: { select: { name: true, slug: true } },
      currency: { select: { symbol: true, code: true } },
    },
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">Category</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] text-gray-950">{category.name}</h1>
        {category.description && <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">{category.description}</p>}
        {category.subcategories.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {category.subcategories.map((subcategory) => (
              <Link
                key={subcategory.id}
                href={`/categories/${category.slug}/${subcategory.slug}`}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-blue-200 hover:text-blue-700"
              >
                {subcategory.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <CatalogCard key={product.id} product={product} />
        ))}
      </div>

      {!products.length && (
        <div className="mt-6 rounded-[28px] border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No products found in this category yet.
        </div>
      )}
    </div>
  )
}
