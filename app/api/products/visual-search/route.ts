import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { ALLOWED_IMAGE_TYPES, uploadImage, UPLOAD_FOLDERS } from '@/lib/storage'

function normalizeTerms(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 2)
}

function uniqueTerms(...groups: string[]) {
  return Array.from(new Set(groups.flatMap((value) => normalizeTerms(value))))
}

function scoreProduct(product: {
  name: string
  shortDescription: string | null
  category?: { name: string; slug?: string | null } | null
  subcategory?: { name: string; slug?: string | null } | null
  company: { name: string; verificationStatus?: string | null }
  isFeatured?: boolean
  totalViews?: number
}, terms: string[]) {
  const haystacks = [
    product.name.toLowerCase(),
    product.shortDescription?.toLowerCase() || '',
    product.category?.name.toLowerCase() || '',
    product.category?.slug?.toLowerCase() || '',
    product.subcategory?.name.toLowerCase() || '',
    product.subcategory?.slug?.toLowerCase() || '',
    product.company.name.toLowerCase(),
  ]

  let score = 0

  for (const term of terms) {
    if (product.name.toLowerCase().includes(term)) score += 7
    if (product.shortDescription?.toLowerCase().includes(term)) score += 4
    if (product.category?.name.toLowerCase().includes(term)) score += 5
    if (product.subcategory?.name.toLowerCase().includes(term)) score += 5
    if (product.company.name.toLowerCase().includes(term)) score += 3
    if (haystacks.some((value) => value.includes(term))) score += 1
  }

  if (product.isFeatured) score += 2
  if (['ADMIN_VERIFIED', 'PREMIUM_VERIFIED'].includes(product.company.verificationStatus || '')) score += 2
  score += Math.min(3, Math.floor((product.totalViews || 0) / 250))

  return score
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const hint = String(formData.get('hint') || '')

    if (!file) {
      throw new ApiError(400, 'No image provided')
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new ApiError(400, 'Unsupported image type')
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new ApiError(400, 'Image too large. Max 10 MB.')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploaded = await uploadImage(buffer, `${UPLOAD_FOLDERS.PRODUCT_IMAGES}/visual-search`, file.name, {
      width: 1400,
      height: 1400,
      quality: 82,
    })

    const terms = uniqueTerms(file.name, hint)
    const fallbackTerms = terms.length ? terms : normalizeTerms('featured marketplace products')

    const candidates = await prisma.product.findMany({
      where: terms.length
        ? {
            status: 'APPROVED',
            deletedAt: null,
            OR: terms.flatMap((term) => [
              { name: { contains: term } },
              { shortDescription: { contains: term } },
              { description: { contains: term } },
              { category: { name: { contains: term } } },
              { category: { slug: { contains: term } } },
              { subcategory: { name: { contains: term } } },
              { subcategory: { slug: { contains: term } } },
              { company: { name: { contains: term } } },
            ]),
          }
        : {
            status: 'APPROVED',
            deletedAt: null,
          },
      take: terms.length ? 24 : 12,
      orderBy: [{ isFeatured: 'desc' }, { totalViews: 'desc' }],
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        company: {
          select: {
            name: true,
            slug: true,
            verificationStatus: true,
            country: { select: { name: true } },
          },
        },
        category: { select: { name: true, slug: true } },
        subcategory: { select: { name: true, slug: true } },
        currency: { select: { symbol: true, code: true } },
      },
    })

    const relatedProducts = candidates
      .map((product) => ({
        ...product,
        visualScore: scoreProduct(product, fallbackTerms),
      }))
      .sort((a, b) => b.visualScore - a.visualScore || (b.totalViews - a.totalViews))
      .slice(0, 8)

    return successResponse({
      image: uploaded,
      extractedTags: fallbackTerms,
      searchQuery: fallbackTerms.join(' '),
      matches: relatedProducts,
      note: 'Visual matching is powered by stored image upload, extracted terms, optional hints, and marketplace metadata scoring.',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
