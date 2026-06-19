import prisma from '@/lib/db/prisma'

const CERTIFICATION_KEYWORDS = [
  'organic',
  'gots',
  'oekotex',
  'oeko-tex',
  'iso',
  'ce',
  'fda',
  'halal',
  'kosher',
  'fair trade',
  'bci',
  'recycled',
]

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')
}

function tokenize(text: string) {
  return normalize(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
}

function countOverlap(source: string[], target: string[]) {
  const targetSet = new Set(target)
  return source.reduce((score, token) => score + (targetSet.has(token) ? 1 : 0), 0)
}

function extractSignals(text: string) {
  const normalized = normalize(text)
  return CERTIFICATION_KEYWORDS.filter((keyword) => normalized.includes(keyword))
}

export async function getSmartMatchesForRFQ(rfqId: string, limit = 12) {
  const rfq = await prisma.rFQ.findUnique({
    where: { id: rfqId },
    include: {
      category: { select: { id: true, name: true } },
      destinationCountry: { select: { id: true, name: true } },
    },
  })

  if (!rfq) return null

  const rfqText = [rfq.productName, rfq.description, rfq.category?.name].filter(Boolean).join(' ')
  const rfqTokens = tokenize(rfqText)
  const rfqSignals = extractSignals(rfqText)

  const companies = await prisma.company.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      products: {
        some: {
          status: 'APPROVED',
          deletedAt: null,
        },
      },
    },
    take: 80,
    include: {
      country: { select: { name: true, flag: true } },
      certificates: { select: { name: true, issuedBy: true } },
      markets: { include: { country: { select: { id: true, name: true } } }, take: 10 },
      products: {
        where: { status: 'APPROVED', deletedAt: null },
        take: 10,
        include: {
          category: { select: { id: true, name: true } },
          certificates: { select: { name: true } },
        },
      },
    },
  })

  const scored = companies
    .map((company) => {
      const companyCertText = company.certificates.map((cert) => `${cert.name} ${cert.issuedBy || ''}`).join(' ')
      const destinationMatch = rfq.destinationCountryId
        ? company.markets.some((market) => market.countryId === rfq.destinationCountryId)
        : false

      const productScores = company.products.map((product) => {
        const productText = [
          product.name,
          product.shortDescription,
          product.description,
          product.category.name,
          product.certificates.map((cert) => cert.name).join(' '),
        ]
          .filter(Boolean)
          .join(' ')

        const productTokens = tokenize(productText)
        const keywordOverlap = countOverlap(rfqTokens, productTokens)
        const signalMatches = rfqSignals.filter((signal) => normalize(productText).includes(signal))
        const categoryMatch = rfq.categoryId && product.categoryId === rfq.categoryId ? 18 : 0

        const score =
          keywordOverlap * 7 +
          signalMatches.length * 14 +
          categoryMatch +
          (product.isFeatured ? 4 : 0) +
          Math.min(product.totalViews / 100, 8)

        return {
          product,
          score,
          signalMatches,
          keywordOverlap,
        }
      })

      const bestProduct = productScores.sort((a, b) => b.score - a.score)[0]
      const companySignals = rfqSignals.filter((signal) => normalize(companyCertText).includes(signal))
      const score =
        (bestProduct?.score || 0) +
        companySignals.length * 10 +
        (company.isVerified ? 10 : 0) +
        (company.isPremium ? 6 : 0) +
        (destinationMatch ? 8 : 0)

      if (!bestProduct || score <= 0) return null

      return {
        companyId: company.id,
        companyName: company.name,
        companySlug: company.slug,
        companyLogo: company.logo,
        country: company.country,
        isVerified: company.isVerified,
        verificationStatus: company.verificationStatus,
        score: Math.round(score),
        reasons: [
          rfq.category?.name && bestProduct.product.category.name === rfq.category.name
            ? `Strong category fit in ${rfq.category.name}`
            : null,
          bestProduct.signalMatches.length
            ? `Product mentions ${bestProduct.signalMatches.join(', ')}`
            : null,
          companySignals.length
            ? `Supplier certificates include ${companySignals.join(', ')}`
            : null,
          destinationMatch ? 'Supplier already exports to destination market' : null,
          company.isVerified ? 'Supplier is verified on the platform' : null,
        ].filter(Boolean),
        product: {
          id: bestProduct.product.id,
          name: bestProduct.product.name,
          slug: bestProduct.product.slug,
          category: bestProduct.product.category.name,
          shortDescription: bestProduct.product.shortDescription,
          moq: bestProduct.product.moq,
          moqUnit: bestProduct.product.moqUnit,
          leadTime: bestProduct.product.leadTime,
        },
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return {
    rfq: {
      id: rfq.id,
      productName: rfq.productName,
      categoryName: rfq.category?.name || null,
      destinationCountry: rfq.destinationCountry?.name || null,
      signals: rfqSignals,
    },
    matches: scored,
  }
}
