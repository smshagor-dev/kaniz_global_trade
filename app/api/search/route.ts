import { NextRequest } from 'next/server'
import { successResponse, handleApiError } from '@/lib/utils/api'
import { searchProducts, searchCompanies, meili, INDEXES } from '@/lib/search'
import { expandMarketplaceSearchQuery } from '@/lib/ai/google-marketplace-search'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q       = searchParams.get('q') || ''
    const index   = searchParams.get('index') || 'products'
    const mode    = searchParams.get('mode') || 'ai'
    const page    = parseInt(searchParams.get('page') || '1')
    const limit   = parseInt(searchParams.get('limit') || '20')
    const expansion = q
      ? await expandMarketplaceSearchQuery(
          q,
          index === 'companies' ? 'companies' : index === 'global' ? 'global' : 'products'
        )
      : null
    const effectiveQuery = mode === 'ai' && expansion?.normalizedQuery ? expansion.normalizedQuery : q

    // Build filter string from query params
    const filters: string[] = []
    const categoryId   = searchParams.get('categoryId')
    const countryId    = searchParams.get('countryId')
    const isFeatured   = searchParams.get('isFeatured')
    const businessType = searchParams.get('businessType')
    const verified     = searchParams.get('verified')
    const minPrice     = searchParams.get('minPrice')
    const maxPrice     = searchParams.get('maxPrice')

    if (categoryId)   filters.push(`categoryId = "${categoryId}"`)
    if (countryId)    filters.push(`countryId = "${countryId}"`)
    if (isFeatured === 'true') filters.push(`isFeatured = true`)
    if (businessType) filters.push(`businessType = "${businessType}"`)
    if (verified === 'true') filters.push(`verificationStatus = "ADMIN_VERIFIED" OR verificationStatus = "PREMIUM_VERIFIED"`)
    if (minPrice)     filters.push(`priceMin >= ${minPrice}`)
    if (maxPrice)     filters.push(`priceMax <= ${maxPrice}`)

    const filter = filters.join(' AND ') || undefined

    const sortParam = searchParams.get('sort')
    const sort = sortParam ? [sortParam] : undefined

    let results
    if (index === 'companies') {
      results = await searchCompanies({ q: effectiveQuery, filter, sort, page, hitsPerPage: limit })
    } else if (index === 'products') {
      results = await searchProducts({ q: effectiveQuery, filter, sort, page, hitsPerPage: limit })
    } else if (index === 'categories') {
      results = await meili.index(INDEXES.CATEGORIES).search(effectiveQuery, { page, hitsPerPage: limit })
    } else if (index === 'hs_codes') {
      results = await meili.index(INDEXES.HS_CODES).search(effectiveQuery, { page, hitsPerPage: limit, limit: 10 })
    } else {
      // Global multi-index search
      const [productResults, companyResults] = await Promise.all([
        searchProducts({ q: effectiveQuery, page: 1, hitsPerPage: 5 }),
        searchCompanies({ q: effectiveQuery, page: 1, hitsPerPage: 5 }),
      ])
      results = {
        products:  productResults.hits,
        companies: companyResults.hits,
        ai: expansion,
      }
      return successResponse(results)
    }

    return successResponse({
      hits:             results.hits,
      totalHits:        results.totalHits,
      page:             results.page,
      hitsPerPage:      results.hitsPerPage,
      totalPages:       results.totalPages,
      processingTimeMs: results.processingTimeMs,
      ai: expansion,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
