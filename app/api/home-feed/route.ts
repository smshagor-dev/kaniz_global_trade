import { successResponse, handleApiError } from '@/lib/utils/api'
import { getMarketplaceFeedPage, normalizeMarketplaceQuery } from '@/lib/home-marketplace-feed'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = normalizeMarketplaceQuery({
      categoryId: searchParams.get('categoryId'),
      page: searchParams.get('page'),
      q: searchParams.get('q'),
      sort: searchParams.get('sort'),
    })

    const feed = await getMarketplaceFeedPage(query)

    return successResponse(feed, 'Homepage marketplace feed fetched', {
      page: feed.page,
      limit: feed.limit,
      total: feed.total,
      totalPages: feed.totalPages,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
