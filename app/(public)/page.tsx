import { Suspense } from 'react'
import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import {
  Search, Shield, Globe, TrendingUp, Star, ArrowRight,
  Package, Users, FileText, MessageSquare, CheckCircle, Zap,
} from 'lucide-react'

async function getHomeData() {
  const [categories, featuredProducts, verifiedCompanies, sponsoredCampaigns, stats] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ sortOrder: 'asc' }],
      take: 12,
      select: {
        id: true, name: true, slug: true, icon: true, image: true,
        _count: { select: { products: { where: { status: 'APPROVED' } } } },
      },
    }),
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
        id: true, name: true, slug: true, logo: true, businessType: true,
        verificationStatus: true, mainProducts: true, totalInquiries: true,
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
  return { categories, featuredProducts, verifiedCompanies, sponsoredCampaigns, stats }
}

export default async function HomePage() {
  const { categories, featuredProducts, verifiedCompanies, sponsoredCampaigns, stats } = await getHomeData()
  const [companyCount, productCount, userCount, rfqCount] = stats

  return (
    <>
      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-700/50 border border-blue-500/50 rounded-full px-4 py-1.5 text-sm mb-6">
            <Globe className="w-4 h-4" /> Trusted by {companyCount.toLocaleString()}+ companies worldwide
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
            Global B2B Trade<br/>
            <span className="text-blue-300">Made Simple</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-10">
            Connect with verified suppliers, post RFQs, compare quotations, and close deals — all in one powerful platform.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex bg-white rounded-xl overflow-hidden shadow-2xl">
              <select className="bg-gray-50 border-r border-gray-200 text-gray-700 text-sm px-3 py-3 outline-none">
                <option>Products</option>
                <option>Suppliers</option>
              </select>
              <input
                type="text"
                placeholder="Search for products, suppliers, categories..."
                className="flex-1 px-4 py-3 text-gray-900 text-sm outline-none"
              />
              <Link
                href="/products"
                className="bg-blue-700 text-white px-6 py-3 font-semibold flex items-center gap-2 hover:bg-blue-600 transition-colors"
              >
                <Search className="w-4 h-4" /> Search
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-3 text-sm text-blue-200">
              {['Textiles', 'Electronics', 'Machinery', 'Chemicals', 'Food & Beverage'].map((t) => (
                <Link key={t} href={`/products?q=${t}`} className="hover:text-white hover:underline">
                  {t}
                </Link>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register?role=BUYER" className="bg-white text-blue-900 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
              Start Buying Free
            </Link>
            <Link href="/auth/register?role=SUPPLIER_OWNER" className="border border-white/50 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors">
              List Your Company
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { label: 'Verified Suppliers',   value: companyCount.toLocaleString() + '+', icon: Users },
              { label: 'Products Listed',       value: productCount.toLocaleString() + '+', icon: Package },
              { label: 'Registered Members',    value: userCount.toLocaleString() + '+',   icon: Globe },
              { label: 'Open RFQs',             value: rfqCount.toLocaleString() + '+',    icon: FileText },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="py-4">
                <Icon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ─────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader title="Browse by Category" subtitle="Explore products across all major trade categories" href="/products" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?categoryId=${cat.id}`}
                className="bg-white border border-gray-100 rounded-xl p-4 text-center hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-100 transition-colors">
                  <span className="text-2xl">{cat.icon || '📦'}</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">{cat.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{cat._count.products} products</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ──────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader title="Featured Products" subtitle="Top-quality products from verified global suppliers" href="/products?isFeatured=true" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {featuredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  {product.images[0] ? (
                    <img
                      src={product.images[0].url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  {product.company.verificationStatus === 'ADMIN_VERIFIED' && (
                    <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-blue-600 mb-1">{product.category.name}</p>
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{product.company.name}</p>
                  <p className="text-xs text-gray-400 mt-2">{product.totalViews.toLocaleString()} views</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader title="Sponsored Placements" subtitle="Paid supplier campaigns across search and homepage inventory" href="/products" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {sponsoredCampaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={campaign.product ? `/products/${campaign.product.slug}` : `/companies/${campaign.company.slug}`}
                className="bg-white border border-amber-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-[4/3] bg-amber-50 flex items-center justify-center overflow-hidden">
                  {campaign.product?.images[0] ? (
                    <img src={campaign.product.images[0].url} alt={campaign.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-amber-400" />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Sponsored</p>
                  <h3 className="font-semibold text-gray-900 text-sm mt-1">{campaign.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{campaign.company.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── VERIFIED SUPPLIERS ─────────────────────────────────── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader title="Verified Suppliers" subtitle="Trade with confidence — every supplier is verified by our team" href="/companies?verified=true" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {verifiedCompanies.map((company) => (
              <Link
                key={company.id}
                href={`/companies/${company.slug}`}
                className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center overflow-hidden">
                    {company.logo
                      ? <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
                      : <span className="text-lg font-bold text-blue-700">{company.name[0]}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{company.name}</h3>
                    <p className="text-xs text-gray-500">{company.country?.name}</p>
                  </div>
                  {company.verificationStatus === 'ADMIN_VERIFIED' && (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mb-3">{company.mainProducts}</p>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{company._count.products} products</span>
                  <span>{company.totalInquiries} inquiries</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="text-gray-500 mt-2">Start trading globally in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Search,  title: 'Find Suppliers',    desc: 'Search millions of verified products and suppliers from 200+ countries. Use filters to narrow your results.' },
              { step: '02', icon: FileText, title: 'Request & Compare', desc: 'Send RFQs to multiple suppliers, compare quotations side-by-side, and chat in real-time.' },
              { step: '03', icon: Shield,  title: 'Trade Safely',       desc: 'All suppliers are verified. Secure payments, escrow services, and trade assurance protect every deal.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="relative inline-flex">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                    <Icon className="w-7 h-7 text-blue-700" />
                  </div>
                  <span className="absolute -top-1 -right-1 bg-blue-700 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{step}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RFQ CTA ────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4 text-blue-200" />
          <h2 className="text-3xl font-bold mb-4">Can&apos;t Find What You Need?</h2>
          <p className="text-blue-100 mb-8 text-lg">
            Post a free RFQ and let verified suppliers come to you with their best offers.
          </p>
          <Link
            href="/rfqs/create"
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Post a Free RFQ <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── WHY CHOOSE US ──────────────────────────────────────── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Why Kaniz Global Trade?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield,       title: 'Verified Suppliers',     desc: 'Every supplier undergoes a rigorous verification process including document checks and factory audits.' },
              { icon: MessageSquare, title: 'Real-Time Chat',        desc: 'Communicate directly with suppliers via our built-in chat system. No email delays.' },
              { icon: Globe,        title: '200+ Countries',          desc: 'Source from manufacturers and traders across every continent on the globe.' },
              { icon: FileText,     title: 'Smart RFQ System',        desc: 'Post one RFQ and receive multiple competitive quotations from relevant suppliers automatically.' },
              { icon: Search,       title: 'AI Product Matching',     desc: 'Detect keywords like organic, certified, or destination-fit and rank the strongest suppliers first.' },
              { icon: TrendingUp,   title: 'Trade Analytics',         desc: 'Track inquiries, views, and market trends with our advanced analytics dashboard.' },
              { icon: Star,         title: 'Buyer Protection',        desc: 'Trade assurance, escrow payments, and verified reviews protect every transaction.' },
              { icon: Shield,       title: 'Commission-Based Trade Revenue', desc: 'Platform commission is linked to successful protected trades, creating a scalable revenue layer.' },
              { icon: Globe,        title: 'Integrated Logistics',    desc: 'Quote and manage freight bookings with leading logistics partners from one operational center.' },
              { icon: CheckCircle,  title: 'Insurance Services',      desc: 'Attach cargo and trade insurance coverage directly to high-value orders for stronger buyer confidence.' },
              { icon: Zap,          title: 'Supplier Financing',      desc: 'Suppliers can apply for working capital support when large orders stretch production capacity.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-700" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function SectionHeader({
  title, subtitle, href,
}: { title: string; subtitle: string; href: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
      </div>
      <Link href={href} className="text-sm text-blue-700 hover:underline flex items-center gap-1 flex-shrink-0">
        View all <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
