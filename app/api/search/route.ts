import { NextRequest } from 'next/server'
import { successResponse, handleApiError } from '@/lib/utils/api'
import { searchProducts, searchCompanies, meili, INDEXES } from '@/lib/search'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q       = searchParams.get('q') || ''
    const index   = searchParams.get('index') || 'products'
    const page    = parseInt(searchParams.get('page') || '1')
    const limit   = parseInt(searchParams.get('limit') || '20')

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
      results = await searchCompanies({ q, filter, sort, page, hitsPerPage: limit })
    } else if (index === 'products') {
      results = await searchProducts({ q, filter, sort, page, hitsPerPage: limit })
    } else if (index === 'categories') {
      results = await meili.index(INDEXES.CATEGORIES).search(q, { page, hitsPerPage: limit })
    } else if (index === 'hs_codes') {
      results = await meili.index(INDEXES.HS_CODES).search(q, { page, hitsPerPage: limit, limit: 10 })
    } else {
      // Global multi-index search
      const [productResults, companyResults] = await Promise.all([
        searchProducts({ q, page: 1, hitsPerPage: 5 }),
        searchCompanies({ q, page: 1, hitsPerPage: 5 }),
      ])
      results = {
        products:  productResults.hits,
        companies: companyResults.hits,
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
    })
  } catch (error) {
    return handleApiError(error)
  }
}
