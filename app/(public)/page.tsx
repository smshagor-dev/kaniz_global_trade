import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { MarketplaceDiscovery } from '@/components/public/home/marketplace-discovery'
import { HomeMarketplaceFeed } from '@/components/public/home/home-marketplace-feed'
import { getMarketplaceFeedPage, normalizeMarketplaceQuery } from '@/lib/home-marketplace-feed'
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Globe,
  Package,
  Search,
  Shield,
  Truck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type HomeCategory = {
  id: string
  name: string
  slug: string
  icon: string | null
  image: string | null
  _count: { products: number }
  subcategories: Array<{
    id: string
    name: string
    slug: string
  }>
}

function pickParam(value: string | string[] | undefined) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value[0] || ''
  return ''
}

async function getHomeData() {
  const [categories, featuredProducts, verifiedCompanies, sponsoredCampaigns, recentProducts, stats] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null, approvalStatus: 'APPROVED' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        image: true,
        _count: { select: { products: { where: { status: 'APPROVED', deletedAt: null } } } },
        subcategories: {
          where: { isActive: true, approvalStatus: 'APPROVED' },
          orderBy: [{ name: 'asc' }],
          take: 5,
          select: { id: true, name: true, slug: true },
        },
      },
    }) as Promise<HomeCategory[]>,
    prisma.product.findMany({
      where: {
        status: 'APPROVED',
        isFeatured: true,
        deletedAt: null,
        category: { approvalStatus: 'APPROVED', isActive: true },
        AND: [
          {
            OR: [
              { subcategoryId: null },
              { subcategory: { approvalStatus: 'APPROVED', isActive: true } },
            ],
          },
        ],
      },
      take: 8,
      orderBy: [{ totalViews: 'desc' }, { createdAt: 'desc' }],
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        company: { select: { name: true, slug: true, verificationStatus: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.company.findMany({
      where: { status: 'ACTIVE', isVerified: true, deletedAt: null },
      take: 8,
      orderBy: [{ isPremium: 'desc' }, { totalViews: 'desc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        businessType: true,
        verificationStatus: true,
        mainProducts: true,
        totalInquiries: true,
        country: { select: { name: true, flag: true } },
        _count: { select: { products: { where: { status: 'APPROVED' } } } },
      },
    }),
    prisma.adCampaign.findMany({
      where: {
        status: 'ACTIVE',
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() },
      },
      take: 4,
      orderBy: [{ bidAmount: 'desc' }],
      include: {
        company: { select: { name: true, slug: true } },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: {
        status: 'APPROVED',
        deletedAt: null,
        category: { approvalStatus: 'APPROVED', isActive: true },
        AND: [
          {
            OR: [
              { subcategoryId: null },
              { subcategory: { approvalStatus: 'APPROVED', isActive: true } },
            ],
          },
        ],
      },
      take: 8,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        company: { select: { name: true, slug: true, verificationStatus: true } },
        category: { select: { name: true } },
      },
    }),
    Promise.all([
      prisma.company.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.product.count({ where: { status: 'APPROVED', deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.rFQ.count({ where: { status: 'OPEN' } }),
    ]),
  ])

  return { categories, featuredProducts, verifiedCompanies, sponsoredCampaigns, recentProducts, stats }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const rawSearchParams = await searchParams
  const feedQuery = normalizeMarketplaceQuery({
    categoryId: pickParam(rawSearchParams.feedCategory),
    page: pickParam(rawSearchParams.feedPage),
    q: pickParam(rawSearchParams.feedQuery),
    sort: pickParam(rawSearchParams.feedSort),
  })

  const initialFeedPromise = getMarketplaceFeedPage(feedQuery)
  const { categories, featuredProducts, verifiedCompanies, sponsoredCampaigns, recentProducts, stats } = await getHomeData()
  const initialFeed = await initialFeedPromise
  const [companyCount, productCount, userCount, rfqCount] = stats

  const categoryShowcase = categories.slice(0, 4)
  const discoveryItems = categoryShowcase
    .flatMap((category) =>
      (category.subcategories.length
        ? category.subcategories.slice(0, 3).map((subcategory) => ({
            id: `${category.id}-${subcategory.id}`,
            name: subcategory.name,
            href: `/products?categoryId=${category.id}&subcategoryId=${subcategory.id}`,
            image: category.image,
            icon: category.icon,
          }))
        : [{
            id: category.id,
            name: category.name,
            href: `/products?categoryId=${category.id}`,
            image: category.image,
            icon: category.icon,
          }])
    )
    .slice(0, 10)

  const frequentSearches = [
    { label: 'Cotton T-shirts', href: '/products?q=Cotton%20T-shirts' },
    { label: 'Industrial Machinery', href: '/products?q=Industrial%20Machinery' },
    { label: 'Leather Shoes', href: '/products?q=Leather%20Shoes' },
    { label: 'Solar Lights', href: '/products?q=Solar%20Lights' },
    { label: 'Packaging Boxes', href: '/products?q=Packaging%20Boxes' },
    { label: 'Smart Watches', href: '/products?q=Smart%20Watches' },
    { label: 'Mobile Accessories', href: '/products?q=Mobile%20Accessories' },
    { label: 'Home Textiles', href: '/products?q=Home%20Textiles' },
  ]

  return (
    <>
      <MarketplaceDiscovery />

      <section className="bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_100%)] py-10">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
            <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.18)]">
              <div className="mb-4 border-b border-slate-200 pb-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Marketplace menu</p>
                <h2 className="mt-2 text-[30px] font-black tracking-[-0.05em] text-slate-950">Categories for you</h2>
              </div>
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <Link
                    key={category.id}
                    href={`/products?categoryId=${category.id}`}
                    className={`flex items-center justify-between rounded-[20px] border-l-4 px-4 py-3 text-sm font-semibold transition ${
                      index === 0
                        ? 'border-l-slate-900 bg-slate-50 text-slate-950'
                        : 'border-l-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate">{category.name}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400">{category._count.products} products</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                ))}
              </div>
            </aside>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)]">
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Featured selections</p>
                  <h2 className="mt-2 text-[32px] font-black tracking-[-0.05em] text-slate-950">Categories for you</h2>
                </div>
                <Link href="/products" className="text-sm font-semibold text-slate-700 hover:text-orange-600">
                  Browse featured selections
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 xl:grid-cols-5">
                {discoveryItems.map((item) => (
                  <Link key={item.id} href={item.href} className="group flex flex-col items-center text-center">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_78%)] shadow-[0_16px_32px_-24px_rgba(15,23,42,0.22)] transition group-hover:-translate-y-0.5 group-hover:border-orange-200 md:h-28 md:w-28">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-3xl text-orange-500">{item.icon || '•'}</span>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 text-[15px] font-semibold text-slate-900 transition group-hover:text-orange-600">{item.name}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: Shield,
                  title: 'Trade Assurance',
                  text: 'Protected sourcing with verified suppliers and order safeguards.',
                  href: '/pricing',
                },
                {
                  icon: FileText,
                  title: 'Post your RFQ',
                  text: 'Receive competitive quotes from relevant suppliers faster.',
                  href: '/rfqs/create',
                },
                {
                  icon: Users,
                  title: 'Verified suppliers',
                  text: `${companyCount.toLocaleString()}+ active companies ready for sourcing.`,
                  href: '/companies?verified=true',
                },
                {
                  icon: Wallet,
                  title: 'Business payments',
                  text: 'Flexible checkout and invoice-ready billing for marketplace buyers.',
                  href: '/dashboard/payments',
                },
              ].map(({ icon: Icon, title, text, href }) => (
                <Link
                  key={title}
                  href={href}
                  className="block rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-orange-200"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-orange-100 bg-white">
        <div className="w-full px-4 py-6 md:px-6 lg:px-8 2xl:px-10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Trade Assurance', value: 'Protected orders', icon: Shield },
              { label: 'Products Listed', value: productCount.toLocaleString() + '+', icon: Package },
              { label: 'Registered Members', value: userCount.toLocaleString() + '+', icon: Globe },
              { label: 'Open RFQs', value: rfqCount.toLocaleString() + '+', icon: FileText },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-[22px] border border-slate-200 bg-slate-50/60 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-950">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_100%)] py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title="Frequently Searched" subtitle="Popular sourcing shortcuts buyers use to jump directly into high-demand categories." href="/products" />
          <div className="mt-8 rounded-[30px] border border-orange-100/80 bg-white p-6 shadow-[0_24px_60px_-42px_rgba(249,115,22,0.2)]">
            <div className="flex flex-wrap gap-3">
              {frequentSearches.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title="Recommended Products" subtitle="Top-performing listings from verified marketplace suppliers." href="/products?isFeatured=true" />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white transition-shadow hover:shadow-[0_24px_60px_-38px_rgba(15,23,42,0.25)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {product.images[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-12 w-12 text-slate-300" />
                    </div>
                  )}
                  {product.company.verificationStatus === 'ADMIN_VERIFIED' && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                      <CheckCircle className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-500">{product.category.name}</p>
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</h3>
                  <p className="mt-2 text-xs text-slate-500">{product.company.name}</p>
                  <p className="mt-3 text-xs text-slate-400">{product.totalViews.toLocaleString()} views</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title="Recently Added" subtitle="Freshly approved products added by active marketplace suppliers." href="/products?sort=newest" />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recentProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white transition-shadow hover:shadow-[0_24px_60px_-38px_rgba(15,23,42,0.25)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {product.images[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-12 w-12 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-500">{product.category.name}</p>
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</h3>
                  <p className="mt-2 text-xs text-slate-500">{product.company.name}</p>
                  <p className="mt-3 text-xs text-slate-400">New arrival</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title="Hot Campaigns" subtitle="Sponsored placements and high-visibility product promotions." href="/products" />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sponsoredCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={campaign.product ? `/products/${campaign.product.slug}` : `/companies/${campaign.company.slug}`}
                className="overflow-hidden rounded-[24px] border border-amber-200 bg-white transition-shadow hover:shadow-[0_24px_60px_-38px_rgba(245,158,11,0.28)]"
              >
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-amber-50">
                  {campaign.product?.images[0] ? (
                    <img src={campaign.product.images[0].url} alt={campaign.title} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-12 w-12 text-amber-400" />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Sponsored</p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{campaign.title}</h3>
                  <p className="mt-2 text-xs text-slate-500">{campaign.company.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title="Verified Suppliers" subtitle="Trade with confidence through verified companies and active catalogs." href="/companies?verified=true" />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {verifiedCompanies.map((company) => (
              <Link
                key={company.id}
                href={`/companies/${company.slug}`}
                className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-orange-200"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                    {company.logo ? (
                      <img src={company.logo} alt={company.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-slate-700">{company.name[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-slate-900">{company.name}</h3>
                    <p className="text-xs text-slate-500">{company.country?.name}</p>
                  </div>
                  {company.verificationStatus === 'ADMIN_VERIFIED' && (
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                  )}
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-slate-600">{company.mainProducts}</p>
                <div className="mt-4 flex justify-between text-xs text-slate-400">
                  <span>{company._count.products} products</span>
                  <span>{company.totalInquiries} inquiries</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_100%)] py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title="Top Ranking Suppliers" subtitle="High-visibility verified suppliers with strong catalog depth and buyer activity." href="/companies?verified=true" />
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {verifiedCompanies.slice(0, 3).map((company, index) => (
              <Link
                key={company.id}
                href={`/companies/${company.slug}`}
                className="rounded-[28px] border border-orange-100/80 bg-white p-6 shadow-[0_22px_60px_-44px_rgba(249,115,22,0.22)] transition hover:-translate-y-0.5 hover:border-orange-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                      {company.logo ? (
                        <img src={company.logo} alt={company.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-slate-700">{company.name[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Top {index + 1}</p>
                      <h3 className="truncate text-lg font-bold text-slate-950">{company.name}</h3>
                      <p className="text-sm text-slate-500">{company.country?.name}</p>
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{company.mainProducts}</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-orange-50 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">Products</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{company._count.products}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-medium text-slate-500">Inquiries</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{company.totalInquiries}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title="New Arrival Products" subtitle="Fresh marketplace listings recently approved and ready for sourcing." href="/products?sort=newest" />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recentProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white transition-shadow hover:shadow-[0_24px_60px_-38px_rgba(15,23,42,0.25)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  {product.images[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-12 w-12 text-slate-300" />
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                    New
                  </span>
                </div>
                <div className="p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-500">{product.category.name}</p>
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{product.name}</h3>
                  <p className="mt-2 text-xs text-slate-500">{product.company.name}</p>
                  <p className="mt-3 text-xs text-slate-400">Recently added to marketplace</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-16 text-white">
        <div className="w-full px-4 text-center md:px-6 lg:px-8 2xl:px-10">
          <Zap className="mx-auto mb-4 h-12 w-12 text-orange-300" />
          <h2 className="mb-4 text-3xl font-bold">Can&apos;t Find What You Need?</h2>
          <p className="mb-8 text-lg text-slate-300">
            Post a free RFQ and let verified suppliers come to you with their best offers.
          </p>
          <Link
            href="/rfqs/create"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-slate-900 transition-colors hover:bg-orange-50"
          >
            Post a Free RFQ <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <HomeMarketplaceFeed
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          productCount: category._count.products,
        }))}
        initialFeed={initialFeed}
        initialQuery={{
          categoryId: feedQuery.categoryId,
          q: feedQuery.q,
          sort: feedQuery.sort,
        }}
      />
    </>
  )
}

function SectionHeader({
  title,
  subtitle,
  href,
}: {
  title: string
  subtitle: string
  href: string
}) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-3xl font-black tracking-[-0.04em] text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      <Link href={href} className="flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700">
        View all <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
