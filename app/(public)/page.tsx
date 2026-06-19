import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { MarketplaceDiscovery } from '@/components/public/home/marketplace-discovery'
import {
  Search, Shield, Globe, TrendingUp, Star, ArrowRight,
  Package, Users, FileText, MessageSquare, CheckCircle, Zap,
} from 'lucide-react'

async function getHomeData() {
  const [featuredProducts, verifiedCompanies, sponsoredCampaigns, stats] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'APPROVED', isFeatured: true, deletedAt: null },
      take: 8,
      orderBy: { totalViews: 'desc' },
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
    Promise.all([
      prisma.company.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.product.count({ where: { status: 'APPROVED', deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.rFQ.count({ where: { status: 'OPEN' } }),
    ]),
  ])

  return { featuredProducts, verifiedCompanies, sponsoredCampaigns, stats }
}

export default async function HomePage() {
  const { featuredProducts, verifiedCompanies, sponsoredCampaigns, stats } = await getHomeData()
  const [companyCount, productCount, userCount, rfqCount] = stats

  return (
    <>
      <MarketplaceDiscovery />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#fff5ec_0%,#fffaf6_42%,#ffffff_100%)] text-slate-900">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(249,115,22,0.14) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.18),transparent_30%)]" />
        <div className="relative w-full px-4 py-20 text-center md:px-6 lg:px-8 lg:py-24 2xl:px-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_16px_35px_-26px_rgba(249,115,22,0.45)] backdrop-blur">
            <Globe className="h-4 w-4 text-orange-500" /> Trusted by {companyCount.toLocaleString()}+ companies worldwide
          </div>
          <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-[-0.05em] text-slate-950 md:text-6xl">
            Global B2B Trade
            <br />
            <span className="text-orange-500">Made Simple</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
            Connect with verified suppliers, post RFQs, compare quotations, and close deals - all in one powerful platform.
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/register?role=BUYER"
              className="rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 px-8 py-3.5 font-semibold text-white shadow-[0_18px_34px_-18px_rgba(249,115,22,0.75)] transition hover:scale-[1.01]"
            >
              Start Buying Free
            </Link>
            <Link
              href="/auth/register?role=SUPPLIER_OWNER"
              className="rounded-2xl border border-orange-200 bg-white/85 px-8 py-3.5 font-semibold text-slate-800 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.18)] transition hover:border-orange-300 hover:bg-white"
            >
              List Your Company
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100 bg-white">
        <div className="w-full px-4 py-10 md:px-6 lg:px-8 2xl:px-10">
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[
              { label: 'Verified Suppliers', value: companyCount.toLocaleString() + '+', icon: Users },
              { label: 'Products Listed', value: productCount.toLocaleString() + '+', icon: Package },
              { label: 'Registered Members', value: userCount.toLocaleString() + '+', icon: Globe },
              { label: 'Open RFQs', value: rfqCount.toLocaleString() + '+', icon: FileText },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="py-4">
                <Icon className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                <p className="mt-1 text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title="Featured Products" subtitle="Top-quality products from verified global suppliers" href="/products?isFeatured=true" />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group overflow-hidden rounded-xl border border-gray-100 transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                  {product.images[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  {product.company.verificationStatus === 'ADMIN_VERIFIED' && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-xs text-white">
                      <CheckCircle className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="mb-1 text-xs text-blue-600">{product.category.name}</p>
                  <h3 className="truncate text-sm font-semibold text-gray-900">{product.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">{product.company.name}</p>
                  <p className="mt-2 text-xs text-gray-400">{product.totalViews.toLocaleString()} views</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title="Sponsored Placements" subtitle="Paid supplier campaigns across search and homepage inventory" href="/products" />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {sponsoredCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={campaign.product ? `/products/${campaign.product.slug}` : `/companies/${campaign.company.slug}`}
                className="overflow-hidden rounded-xl border border-amber-200 bg-white transition-shadow hover:shadow-lg"
              >
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-amber-50">
                  {campaign.product?.images[0] ? (
                    <img src={campaign.product.images[0].url} alt={campaign.title} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-12 w-12 text-amber-400" />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Sponsored</p>
                  <h3 className="mt-1 text-sm font-semibold text-gray-900">{campaign.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">{campaign.company.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <SectionHeader title="Verified Suppliers" subtitle="Trade with confidence - every supplier is verified by our team" href="/companies?verified=true" />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {verifiedCompanies.map((company) => (
              <Link
                key={company.id}
                href={`/companies/${company.slug}`}
                className="group rounded-xl border border-gray-100 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
                    {company.logo ? (
                      <img src={company.logo} alt={company.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-blue-700">{company.name[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{company.name}</h3>
                    <p className="text-xs text-gray-500">{company.country?.name}</p>
                  </div>
                  {company.verificationStatus === 'ADMIN_VERIFIED' && (
                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                  )}
                </div>
                <p className="mb-3 line-clamp-2 text-xs text-gray-600">{company.mainProducts}</p>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{company._count.products} products</span>
                  <span>{company.totalInquiries} inquiries</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-2 text-gray-500">Start trading globally in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { step: '01', icon: Search, title: 'Find Suppliers', desc: 'Search millions of verified products and suppliers from 200+ countries. Use filters to narrow your results.' },
              { step: '02', icon: FileText, title: 'Request & Compare', desc: 'Send RFQs to multiple suppliers, compare quotations side-by-side, and chat in real-time.' },
              { step: '03', icon: Shield, title: 'Trade Safely', desc: 'All suppliers are verified. Secure payments, escrow services, and trade assurance protect every deal.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="relative inline-flex">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                    <Icon className="h-7 w-7 text-blue-700" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                    {step}
                  </span>
                </div>
                <h3 className="mb-2 mt-4 text-lg font-bold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-blue-700 to-indigo-700 py-16 text-white">
        <div className="w-full px-4 text-center md:px-6 lg:px-8 2xl:px-10">
          <Zap className="mx-auto mb-4 h-12 w-12 text-blue-200" />
          <h2 className="mb-4 text-3xl font-bold">Can&apos;t Find What You Need?</h2>
          <p className="mb-8 text-lg text-blue-100">
            Post a free RFQ and let verified suppliers come to you with their best offers.
          </p>
          <Link
            href="/rfqs/create"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-blue-700 transition-colors hover:bg-blue-50"
          >
            Post a Free RFQ <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="w-full px-4 md:px-6 lg:px-8 2xl:px-10">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Why Kaniz Global Trade?</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Shield, title: 'Verified Suppliers', desc: 'Every supplier undergoes a rigorous verification process including document checks and factory audits.' },
              { icon: MessageSquare, title: 'Real-Time Chat', desc: 'Communicate directly with suppliers via our built-in chat system. No email delays.' },
              { icon: Globe, title: '200+ Countries', desc: 'Source from manufacturers and traders across every continent on the globe.' },
              { icon: FileText, title: 'Smart RFQ System', desc: 'Post one RFQ and receive multiple competitive quotations from relevant suppliers automatically.' },
              { icon: Search, title: 'AI Product Matching', desc: 'Detect keywords like organic, certified, or destination-fit and rank the strongest suppliers first.' },
              { icon: TrendingUp, title: 'Trade Analytics', desc: 'Track inquiries, views, and market trends with our advanced analytics dashboard.' },
              { icon: Star, title: 'Buyer Protection', desc: 'Trade assurance, escrow payments, and verified reviews protect every transaction.' },
              { icon: Shield, title: 'Commission-Based Trade Revenue', desc: 'Platform commission is linked to successful protected trades, creating a scalable revenue layer.' },
              { icon: Globe, title: 'Integrated Logistics', desc: 'Quote and manage freight bookings with leading logistics partners from one operational center.' },
              { icon: CheckCircle, title: 'Insurance Services', desc: 'Attach cargo and trade insurance coverage directly to high-value orders for stronger buyer confidence.' },
              { icon: Zap, title: 'Supplier Financing', desc: 'Suppliers can apply for working capital support when large orders stretch production capacity.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-gray-100 bg-white p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <Icon className="h-5 w-5 text-blue-700" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
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
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>
      <Link href={href} className="flex flex-shrink-0 items-center gap-1 text-sm text-blue-700 hover:underline">
        View all <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
