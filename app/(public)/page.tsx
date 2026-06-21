import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { MarketplaceDiscovery } from '@/components/public/home/marketplace-discovery'
import { HomeMarketplaceFeed } from '@/components/public/home/home-marketplace-feed'
import { getMarketplaceFeedPage, normalizeMarketplaceQuery } from '@/lib/home-marketplace-feed'
import { getSettingsMap } from '@/lib/settings/system'
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

type HomeSettings = {
  discoveryEnabled: boolean
  statsBarEnabled: boolean
  frequentSearchesEnabled: boolean
  recommendedProductsEnabled: boolean
  recentProductsEnabled: boolean
  hotCampaignsEnabled: boolean
  verifiedSuppliersEnabled: boolean
  topSuppliersEnabled: boolean
  newArrivalsEnabled: boolean
  marketplaceFeedEnabled: boolean
  categoryLimit: number
  featuredProductLimit: number
  companyLimit: number
  campaignLimit: number
  recentProductLimit: number
  finalCtaTitle: string
  finalCtaText: string
  finalCtaButtonLabel: string
  finalCtaButtonLink: string
  discoveryTitle: string
  discoveryHelpText: string
  discoveryTrendingKeywords: string[]
  discoverySuggestionPool: string[]
  discoveryRecentFallback: string[]
  discoveryPopularTags: string[]
  frequentSearchItems: string[]
  frequentSearchTitle: string
  frequentSearchSubtitle: string
  recommendedTitle: string
  recommendedSubtitle: string
  recentTitle: string
  recentSubtitle: string
  campaignTitle: string
  campaignSubtitle: string
  verifiedSuppliersTitle: string
  verifiedSuppliersSubtitle: string
  topSuppliersTitle: string
  topSuppliersSubtitle: string
  newArrivalsTitle: string
  newArrivalsSubtitle: string
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

function boolValue(value: string | undefined, fallback = true) {
  if (value == null || value === '') return fallback
  return value === 'true'
}

function numberValue(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function listValue(value: string | undefined, fallback: string[]) {
  if (!value) return fallback
  const parsed = value.split(',').map((item) => item.trim()).filter(Boolean)
  return parsed.length ? parsed : fallback
}

async function getHomeSettings(): Promise<HomeSettings> {
  const settings = await getSettingsMap([
    'HOME_DISCOVERY_ENABLED',
    'HOME_STATS_BAR_ENABLED',
    'HOME_FREQUENT_SEARCHES_ENABLED',
    'HOME_RECOMMENDED_PRODUCTS_ENABLED',
    'HOME_RECENT_PRODUCTS_ENABLED',
    'HOME_HOT_CAMPAIGNS_ENABLED',
    'HOME_VERIFIED_SUPPLIERS_ENABLED',
    'HOME_TOP_SUPPLIERS_ENABLED',
    'HOME_NEW_ARRIVALS_ENABLED',
    'HOME_MARKETPLACE_FEED_ENABLED',
    'HOME_CATEGORY_LIMIT',
    'HOME_FEATURED_PRODUCT_LIMIT',
    'HOME_COMPANY_LIMIT',
    'HOME_CAMPAIGN_LIMIT',
    'HOME_RECENT_PRODUCT_LIMIT',
    'HOME_FINAL_CTA_TITLE',
    'HOME_FINAL_CTA_TEXT',
    'HOME_FINAL_CTA_BUTTON_LABEL',
    'HOME_FINAL_CTA_BUTTON_LINK',
    'HOME_DISCOVERY_TITLE',
    'HOME_DISCOVERY_HELP_TEXT',
    'HOME_DISCOVERY_TRENDING_KEYWORDS',
    'HOME_DISCOVERY_SUGGESTION_POOL',
    'HOME_DISCOVERY_RECENT_FALLBACK',
    'HOME_DISCOVERY_POPULAR_TAGS',
    'HOME_FREQUENT_SEARCH_ITEMS',
    'HOME_FREQUENT_SEARCH_TITLE',
    'HOME_FREQUENT_SEARCH_SUBTITLE',
    'HOME_RECOMMENDED_TITLE',
    'HOME_RECOMMENDED_SUBTITLE',
    'HOME_RECENT_TITLE',
    'HOME_RECENT_SUBTITLE',
    'HOME_CAMPAIGN_TITLE',
    'HOME_CAMPAIGN_SUBTITLE',
    'HOME_VERIFIED_SUPPLIERS_TITLE',
    'HOME_VERIFIED_SUPPLIERS_SUBTITLE',
    'HOME_TOP_SUPPLIERS_TITLE',
    'HOME_TOP_SUPPLIERS_SUBTITLE',
    'HOME_NEW_ARRIVALS_TITLE',
    'HOME_NEW_ARRIVALS_SUBTITLE',
  ])

  return {
    discoveryEnabled: boolValue(settings.HOME_DISCOVERY_ENABLED, true),
    statsBarEnabled: boolValue(settings.HOME_STATS_BAR_ENABLED, true),
    frequentSearchesEnabled: boolValue(settings.HOME_FREQUENT_SEARCHES_ENABLED, true),
    recommendedProductsEnabled: boolValue(settings.HOME_RECOMMENDED_PRODUCTS_ENABLED, true),
    recentProductsEnabled: boolValue(settings.HOME_RECENT_PRODUCTS_ENABLED, true),
    hotCampaignsEnabled: boolValue(settings.HOME_HOT_CAMPAIGNS_ENABLED, true),
    verifiedSuppliersEnabled: boolValue(settings.HOME_VERIFIED_SUPPLIERS_ENABLED, true),
    topSuppliersEnabled: boolValue(settings.HOME_TOP_SUPPLIERS_ENABLED, true),
    newArrivalsEnabled: boolValue(settings.HOME_NEW_ARRIVALS_ENABLED, true),
    marketplaceFeedEnabled: boolValue(settings.HOME_MARKETPLACE_FEED_ENABLED, true),
    categoryLimit: Math.max(1, numberValue(settings.HOME_CATEGORY_LIMIT, 8)),
    featuredProductLimit: Math.max(1, numberValue(settings.HOME_FEATURED_PRODUCT_LIMIT, 8)),
    companyLimit: Math.max(1, numberValue(settings.HOME_COMPANY_LIMIT, 8)),
    campaignLimit: Math.max(1, numberValue(settings.HOME_CAMPAIGN_LIMIT, 4)),
    recentProductLimit: Math.max(1, numberValue(settings.HOME_RECENT_PRODUCT_LIMIT, 8)),
    finalCtaTitle: settings.HOME_FINAL_CTA_TITLE || "Can't Find What You Need?",
    finalCtaText: settings.HOME_FINAL_CTA_TEXT || 'Post a free RFQ and let verified suppliers come to you with their best offers.',
    finalCtaButtonLabel: settings.HOME_FINAL_CTA_BUTTON_LABEL || 'Post a Free RFQ',
    finalCtaButtonLink: settings.HOME_FINAL_CTA_BUTTON_LINK || '/rfqs/create',
    discoveryTitle: settings.HOME_DISCOVERY_TITLE || 'AI Mode',
    discoveryHelpText: settings.HOME_DISCOVERY_HELP_TEXT || 'Find products, suppliers, and RFQs using smart search or image search.',
    discoveryTrendingKeywords: listValue(settings.HOME_DISCOVERY_TRENDING_KEYWORDS, ['solar street light', 'cotton t-shirt', 'smart watch', 'industrial machinery', 'home textiles', 'packaging box']),
    discoverySuggestionPool: listValue(settings.HOME_DISCOVERY_SUGGESTION_POOL, ['Smart watch suppliers', 'Cotton t-shirt wholesale', 'Solar light manufacturer', 'Packaging box export', 'Leather shoes supplier', 'Agricultural machinery', 'Construction materials', 'Mobile accessories']),
    discoveryRecentFallback: listValue(settings.HOME_DISCOVERY_RECENT_FALLBACK, ['wireless earbuds', 'industrial pumps', 'cotton socks']),
    discoveryPopularTags: listValue(settings.HOME_DISCOVERY_POPULAR_TAGS, ['solar street light', 'cotton t-shirt', 'smart watch', 'industrial machinery', 'home textiles']),
    frequentSearchItems: listValue(settings.HOME_FREQUENT_SEARCH_ITEMS, ['Cotton T-shirts', 'Industrial Machinery', 'Leather Shoes', 'Solar Lights', 'Packaging Boxes', 'Smart Watches', 'Mobile Accessories', 'Home Textiles']),
    frequentSearchTitle: settings.HOME_FREQUENT_SEARCH_TITLE || 'Frequently Searched',
    frequentSearchSubtitle: settings.HOME_FREQUENT_SEARCH_SUBTITLE || 'Popular sourcing shortcuts buyers use to jump directly into high-demand categories.',
    recommendedTitle: settings.HOME_RECOMMENDED_TITLE || 'Recommended Products',
    recommendedSubtitle: settings.HOME_RECOMMENDED_SUBTITLE || 'Top-performing listings from verified marketplace suppliers.',
    recentTitle: settings.HOME_RECENT_TITLE || 'Recently Added',
    recentSubtitle: settings.HOME_RECENT_SUBTITLE || 'Freshly approved products added by active marketplace suppliers.',
    campaignTitle: settings.HOME_CAMPAIGN_TITLE || 'Hot Campaigns',
    campaignSubtitle: settings.HOME_CAMPAIGN_SUBTITLE || 'Sponsored placements and high-visibility product promotions.',
    verifiedSuppliersTitle: settings.HOME_VERIFIED_SUPPLIERS_TITLE || 'Verified Suppliers',
    verifiedSuppliersSubtitle: settings.HOME_VERIFIED_SUPPLIERS_SUBTITLE || 'Trade with confidence through verified companies and active catalogs.',
    topSuppliersTitle: settings.HOME_TOP_SUPPLIERS_TITLE || 'Top Ranking Suppliers',
    topSuppliersSubtitle: settings.HOME_TOP_SUPPLIERS_SUBTITLE || 'High-visibility verified suppliers with strong catalog depth and buyer activity.',
    newArrivalsTitle: settings.HOME_NEW_ARRIVALS_TITLE || 'New Arrival Products',
    newArrivalsSubtitle: settings.HOME_NEW_ARRIVALS_SUBTITLE || 'Fresh marketplace listings recently approved and ready for sourcing.',
  }
}

async function getHomeData(settings: HomeSettings) {
  const [categories, featuredProducts, verifiedCompanies, sponsoredCampaigns, recentProducts, stats] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null, approvalStatus: 'APPROVED' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: settings.categoryLimit,
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
      take: settings.featuredProductLimit,
      orderBy: [{ totalViews: 'desc' }, { createdAt: 'desc' }],
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        company: { select: { name: true, slug: true, verificationStatus: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.company.findMany({
      where: { status: 'ACTIVE', isVerified: true, deletedAt: null },
      take: settings.companyLimit,
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
      take: settings.campaignLimit,
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
      take: settings.recentProductLimit,
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
  const homeSettings = await getHomeSettings()
  const feedQuery = normalizeMarketplaceQuery({
    categoryId: pickParam(rawSearchParams.feedCategory),
    page: pickParam(rawSearchParams.feedPage),
    q: pickParam(rawSearchParams.feedQuery),
    sort: pickParam(rawSearchParams.feedSort),
  })

  const initialFeedPromise = getMarketplaceFeedPage(feedQuery)
  const { categories, featuredProducts, verifiedCompanies, sponsoredCampaigns, recentProducts, stats } = await getHomeData(homeSettings)
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
    ...homeSettings.frequentSearchItems.map((label) => ({
      label,
      href: `/products?q=${encodeURIComponent(label)}`,
    })),
  ]

  const dynamicProductTags = Array.from(
    new Set(
      [...featuredProducts, ...recentProducts]
        .flatMap((product) => (product.tags || '').split(','))
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 8)

  const homePopularTags = Array.from(new Set([
    ...homeSettings.discoveryPopularTags,
    ...dynamicProductTags,
  ])).slice(0, 8)

  return (
    <>
      {homeSettings.discoveryEnabled ? (
        <MarketplaceDiscovery
          title={homeSettings.discoveryTitle}
          helpText={homeSettings.discoveryHelpText}
          trendingKeywords={homeSettings.discoveryTrendingKeywords}
          suggestionPool={homeSettings.discoverySuggestionPool}
          recentSearchFallback={homeSettings.discoveryRecentFallback}
          popularTags={homePopularTags}
        />
      ) : null}

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

      {homeSettings.statsBarEnabled ? (
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
      ) : null}

      {homeSettings.frequentSearchesEnabled ? (
      <section className="bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_100%)] py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title={homeSettings.frequentSearchTitle} subtitle={homeSettings.frequentSearchSubtitle} href="/products" />
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
      ) : null}

      {homeSettings.recommendedProductsEnabled ? (
      <section className="bg-white py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title={homeSettings.recommendedTitle} subtitle={homeSettings.recommendedSubtitle} href="/products?isFeatured=true" />
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
      ) : null}

      {homeSettings.recentProductsEnabled ? (
      <section className="bg-slate-50 py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title={homeSettings.recentTitle} subtitle={homeSettings.recentSubtitle} href="/products?sort=newest" />
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
      ) : null}

      {homeSettings.hotCampaignsEnabled ? (
      <section className="bg-slate-50 py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title={homeSettings.campaignTitle} subtitle={homeSettings.campaignSubtitle} href="/products" />
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
      ) : null}

      {homeSettings.verifiedSuppliersEnabled ? (
      <section className="bg-white py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title={homeSettings.verifiedSuppliersTitle} subtitle={homeSettings.verifiedSuppliersSubtitle} href="/companies?verified=true" />
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
      ) : null}

      {homeSettings.topSuppliersEnabled ? (
      <section className="bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_100%)] py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title={homeSettings.topSuppliersTitle} subtitle={homeSettings.topSuppliersSubtitle} href="/companies?verified=true" />
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
      ) : null}

      {homeSettings.newArrivalsEnabled ? (
      <section className="bg-white py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title={homeSettings.newArrivalsTitle} subtitle={homeSettings.newArrivalsSubtitle} href="/products?sort=newest" />
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
      ) : null}

      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-16 text-white">
        <div className="w-full px-4 text-center md:px-6 lg:px-8 2xl:px-10">
          <Zap className="mx-auto mb-4 h-12 w-12 text-orange-300" />
          <h2 className="mb-4 text-3xl font-bold">{homeSettings.finalCtaTitle}</h2>
          <p className="mb-8 text-lg text-slate-300">
            {homeSettings.finalCtaText}
          </p>
          <Link
            href={homeSettings.finalCtaButtonLink}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-slate-900 transition-colors hover:bg-orange-50"
          >
            {homeSettings.finalCtaButtonLabel} <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {homeSettings.marketplaceFeedEnabled ? <HomeMarketplaceFeed
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
      : null}
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
