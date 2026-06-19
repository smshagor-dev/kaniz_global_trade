import { MetadataRoute } from 'next'
import prisma from '@/lib/db/prisma'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://kanizglobaltrade.com'
  const now  = new Date()

  const [products, companies, categories, posts] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'APPROVED', deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    }),
    prisma.company.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 2000,
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: { slug: true, updatedAt: true },
    }),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,                  lastModified: now,  changeFrequency: 'daily',   priority: 1 },
    { url: `${BASE}/products`,    lastModified: now,  changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE}/companies`,   lastModified: now,  changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/rfqs`,        lastModified: now,  changeFrequency: 'hourly',  priority: 0.8 },
    { url: `${BASE}/pricing`,     lastModified: now,  changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/blogs`,       lastModified: now,  changeFrequency: 'daily',   priority: 0.7 },
    { url: `${BASE}/about`,       lastModified: now,  changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contact`,     lastModified: now,  changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/terms`,       lastModified: now,  changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/privacy`,     lastModified: now,  changeFrequency: 'yearly',  priority: 0.3 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url:              `${BASE}/products?categoryId=${c.slug}`,
    lastModified:     c.updatedAt,
    changeFrequency:  'daily',
    priority:         0.8,
  }))

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url:             `${BASE}/products/${p.slug}`,
    lastModified:    p.updatedAt,
    changeFrequency: 'weekly',
    priority:        0.7,
  }))

  const companyRoutes: MetadataRoute.Sitemap = companies.map((c) => ({
    url:             `${BASE}/companies/${c.slug}`,
    lastModified:    c.updatedAt,
    changeFrequency: 'weekly',
    priority:        0.7,
  }))

  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url:             `${BASE}/blogs/${p.slug}`,
    lastModified:    p.updatedAt,
    changeFrequency: 'monthly',
    priority:        0.5,
  }))

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...companyRoutes, ...blogRoutes]
}
