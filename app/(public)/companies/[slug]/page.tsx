import { notFound } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/lib/db/prisma'
import { CheckCircle, MapPin, Globe, Phone, Mail, Star, Package, Users, ArrowRight, Clapperboard } from 'lucide-react'
import { InquiryForm } from '@/components/public/products/inquiry-form'
import type { Metadata } from 'next'
import { UserHistoryTracker } from '@/components/history/user-history-tracker'
import { VideoPlayer } from '@/components/media/video-player'

interface Props { params: Promise<{ slug: string }> }

function formatTourDuration(value?: number | null) {
  if (!value || value <= 0) return null
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  if (!minutes) return `${seconds}s`
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const c = await prisma.company.findUnique({ where: { slug }, select: { name: true, description: true } })
  if (!c) return { title: 'Company Not Found' }
  return { title: c.name, description: c.description?.substring(0, 160) || '' }
}

export default async function CompanyDetailPage({ params }: Props) {
  const { slug } = await params
  const company = await prisma.company.findFirst({
    where: { slug, status: 'ACTIVE', deletedAt: null },
    include: {
      country: true,
      city: true,
      profile: true,
      gallery: { orderBy: { sortOrder: 'asc' }, take: 12 },
      certificates: true,
      socialLinks: true,
      virtualTours: { orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }], take: 4 },
      inspectionReports: { where: { status: { in: ['COMPLETED', 'VERIFIED'] } }, orderBy: { inspectedAt: 'desc' }, take: 4 },
      creditProfile: true,
      markets: { include: { country: { select: { name: true, flag: true } } }, take: 10 },
      verification: true,
      subscription: { include: { plan: true } },
      _count: { select: { products: { where: { status: 'APPROVED' } }, reviews: true } },
    },
  })

  if (!company) notFound()

  const featuredProducts = await prisma.product.findMany({
    where: { companyId: company.id, status: 'APPROVED', deletedAt: null },
    take: 8,
    orderBy: [{ isFeatured: 'desc' }, { totalViews: 'desc' }],
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      category: { select: { name: true } },
    },
  })

  const reviews = await prisma.review.findMany({
    where: { companyId: company.id, isPublished: true },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
  })

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10
    : 0

  // Track view
  prisma.company.update({ where: { id: company.id }, data: { totalViews: { increment: 1 } } }).catch(() => {})

  return (
    <div className="w-full px-4 py-8 md:px-6 lg:px-8 2xl:px-10">
      <UserHistoryTracker
        payload={{
          type: 'VIEW',
          entityType: 'COMPANY',
          entityId: company.id,
          companyId: company.id,
          title: company.name,
          slug: company.slug,
          metadata: {
            businessType: company.businessType,
            countryCode: company.country?.code || null,
          },
        }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-700">Home</Link>
        <span>/</span>
        <Link href="/companies" className="hover:text-blue-700">Suppliers</Link>
        <span>/</span>
        <span className="text-gray-900">{company.name}</span>
      </nav>

      {/* Company header */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-6">
        {company.banner && (
          <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-700 overflow-hidden">
            <img src={company.banner} alt="Company banner" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg bg-blue-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {company.logo
                ? <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
                : <span className="text-3xl font-bold text-blue-700">{company.name[0]}</span>
              }
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                {company.isVerified && (
                  <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle className="w-3 h-3" /> {company.verificationStatus.replace(/_/g, ' ')}
                  </span>
                )}
                {company.isPremium && (
                  <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">Premium</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                {company.country && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{company.country.flag} {company.country.name}</span>}
                <span>{company.businessType.replace(/_/g, ' ')}</span>
                {company.yearEstablished && <span>Est. {company.yearEstablished}</span>}
              </div>
              {company.mainProducts && <p className="text-sm text-gray-600 mb-3"><strong>Main Products:</strong> {company.mainProducts}</p>}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="text-center"><p className="font-bold text-gray-900">{company._count.products}</p><p className="text-xs text-gray-500">Products</p></div>
                <div className="text-center"><p className="font-bold text-gray-900">{company.totalInquiries}</p><p className="text-xs text-gray-500">Inquiries</p></div>
                <div className="text-center"><p className="font-bold text-gray-900">{company._count.reviews}</p><p className="text-xs text-gray-500">Reviews</p></div>
                {avgRating > 0 && <div className="text-center"><p className="font-bold text-gray-900">⭐ {avgRating}</p><p className="text-xs text-gray-500">Avg Rating</p></div>}
              </div>
            </div>
            {company.creditProfile && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-center">
                <p className="text-lg font-bold text-blue-900">{company.creditProfile.score}</p>
                <p className="text-xs text-blue-700">Credit Score</p>
              </div>
            )}
            <div className="flex gap-2 flex-shrink-0">
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-300 text-gray-600">
                  <Globe className="w-3.5 h-3.5" /> Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          {company.description && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h2 className="font-bold text-gray-900 mb-3">About the Company</h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{company.description}</p>
            </div>
          )}

          {company.virtualTours.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clapperboard className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-900">Virtual Factory Tours</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {company.virtualTours.map((tour) => (
                  <div key={tour.id} className="space-y-3 rounded-2xl border border-gray-100 p-3">
                    <VideoPlayer
                      url={tour.videoUrl}
                      title={tour.title}
                      poster={tour.thumbnailUrl}
                      className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100"
                      videoClassName="h-full w-full bg-gray-100 object-cover"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <p className="font-medium text-gray-900">{tour.title}</p>
                        {tour.isFeatured && (
                          <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                            Featured
                          </span>
                        )}
                        <span className="text-[11px] bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
                          {tour.language.toUpperCase()}
                        </span>
                        {formatTourDuration(tour.durationSec) && (
                          <span className="text-[11px] bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
                            {formatTourDuration(tour.durationSec)}
                          </span>
                        )}
                      </div>
                      {tour.description && <p className="text-sm text-gray-600 mt-1">{tour.description}</p>}
                      <a
                        href={tour.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex mt-3 text-sm text-blue-700 hover:underline"
                      >
                        Open video in new tab
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {company.inspectionReports.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-bold text-gray-900">Third-Party Inspection Reports</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {company.inspectionReports.length} trust record{company.inspectionReports.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-3">
                {company.inspectionReports.map((report) => (
                  <div key={report.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{report.providerName} #{report.reportNumber}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          <span className={`rounded-full px-2 py-0.5 font-medium ${report.status === 'VERIFIED' ? 'border border-green-200 bg-green-50 text-green-700' : 'border border-blue-200 bg-blue-50 text-blue-700'}`}>
                            {report.status}
                          </span>
                          {report.inspectedAt ? (
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-medium text-gray-600">
                              Inspected {new Date(report.inspectedAt).toLocaleDateString()}
                            </span>
                          ) : null}
                          {report.verifiedAt ? (
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-medium text-gray-600">
                              Verified {new Date(report.verifiedAt).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                        {report.summary && <p className="text-sm text-gray-600 mt-1">{report.summary}</p>}
                        {report.reportUrl ? (
                          <a href={report.reportUrl} target="_blank" rel="noopener noreferrer" className="inline-flex mt-3 text-sm text-blue-700 hover:underline">
                            Open inspection report
                          </a>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{report.score ?? '-'} / 100</p>
                        <p className="text-xs text-gray-400">{report.inspectorName || 'Third-party auditor'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {featuredProducts.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Products</h2>
                <Link href={`/products?companyId=${company.id}`} className="text-sm text-blue-700 hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {featuredProducts.map((p) => (
                  <Link key={p.id} href={`/products/${p.slug}`} className="group">
                    <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-2">
                      {p.images[0]
                        ? <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-gray-200" /></div>
                      }
                    </div>
                    <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-blue-700">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-bold text-gray-900">Reviews</h2>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold">{avgRating}</span>
                  <span className="text-gray-400">({reviews.length})</span>
                </div>
              </div>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-50 pb-4 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        {review.user.firstName[0]}
                      </div>
                      <span className="text-sm font-medium">{review.user.firstName} {review.user.lastName}</span>
                      <div className="flex ml-auto">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    {review.content && <p className="text-sm text-gray-600 ml-9">{review.content}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Contact */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="font-bold text-gray-900 mb-4">Contact Supplier</h3>
            {company.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Phone className="w-4 h-4 text-gray-400" /> {company.phone}
              </div>
            )}
            {company.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <Mail className="w-4 h-4 text-gray-400" /> {company.email}
              </div>
            )}
            <div className="border-t border-gray-50 pt-3">
              <InquiryForm companyId={company.id} productName={`Product from ${company.name}`} />
            </div>
          </div>

          {/* Company info */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="font-bold text-gray-900 mb-3">Company Info</h3>
            <dl className="space-y-2 text-sm">
              {[
                ['Business Type', company.businessType.replace(/_/g, ' ')],
                ['Location',      `${company.country?.name}`],
                ['Year Founded',  company.yearEstablished],
                ['Employees',     company.employees],
                ['Annual Revenue', company.annualRevenue],
                ['Export Share',  company.exportPercentage ? `${company.exportPercentage}%` : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} className="flex items-start justify-between gap-2">
                  <dt className="text-gray-500 flex-shrink-0">{label}</dt>
                  <dd className="font-medium text-gray-900 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Certificates */}
          {company.certificates.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-3">Certifications</h3>
              <div className="space-y-2">
                {company.certificates.map((cert) => (
                  <div key={cert.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{cert.name}</span>
                    {cert.issuedBy && <span className="text-xs text-gray-400">by {cert.issuedBy}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Markets */}
          {company.markets.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-3">Export Markets</h3>
              <div className="flex flex-wrap gap-1.5">
                {company.markets.map((m) => (
                  <span key={m.id} className="flex items-center gap-1 text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded-lg border border-gray-100">
                    {m.country.flag} {m.country.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
