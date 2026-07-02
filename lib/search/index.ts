import MeiliSearch from 'meilisearch'

export const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY,
})

export const INDEXES = {
  PRODUCTS: 'products',
  COMPANIES: 'companies',
  CATEGORIES: 'categories',
  HS_CODES: 'hs_codes',
  RFQS: 'rfqs',
} as const

export async function initSearchIndexes(): Promise<void> {
  // Products index
  const productsIndex = meili.index(INDEXES.PRODUCTS)
  await productsIndex.updateSettings({
    searchableAttributes: ['name', 'shortDescription', 'description', 'sku', 'companyName', 'categoryName'],
    filterableAttributes: ['categoryId', 'companyId', 'status', 'isFeatured', 'countryId', 'priceMin', 'priceMax', 'isVerified', 'moq'],
    sortableAttributes: ['totalViews', 'totalInquiries', 'createdAt', 'priceMin'],
    displayedAttributes: ['id', 'name', 'slug', 'shortDescription', 'primaryImage', 'priceMin', 'priceMax', 'moq', 'companyId', 'companyName', 'companySlug', 'categoryId', 'categoryName', 'countryId', 'countryName', 'isFeatured', 'isVerified', 'totalViews'],
  })

  // Companies index
  const companiesIndex = meili.index(INDEXES.COMPANIES)
  await companiesIndex.updateSettings({
    searchableAttributes: ['name', 'description', 'mainProducts', 'businessType'],
    filterableAttributes: ['countryId', 'businessType', 'verificationStatus', 'isPremium', 'isFeatured', 'status'],
    sortableAttributes: ['totalViews', 'totalInquiries', 'createdAt', 'yearEstablished'],
    displayedAttributes: ['id', 'name', 'slug', 'logo', 'businessType', 'countryId', 'countryName', 'verificationStatus', 'isPremium', 'isFeatured', 'totalViews', 'totalInquiries', 'mainProducts'],
  })

  // Categories index
  const categoriesIndex = meili.index(INDEXES.CATEGORIES)
  await categoriesIndex.updateSettings({
    searchableAttributes: ['name', 'description'],
    filterableAttributes: ['isActive', 'parentId'],
    sortableAttributes: ['sortOrder', 'name'],
  })

  // HS Codes index
  const hsIndex = meili.index(INDEXES.HS_CODES)
  await hsIndex.updateSettings({
    searchableAttributes: ['code', 'description', 'chapter'],
    filterableAttributes: ['isActive'],
  })

  const rfqIndex = meili.index(INDEXES.RFQS)
  await rfqIndex.updateSettings({
    searchableAttributes: ['productName', 'description', 'categoryName', 'destinationCountryName'],
    filterableAttributes: ['status', 'categoryId', 'destinationCountryId', 'currencyId', 'buyerId'],
    sortableAttributes: ['createdAt', 'quotationCount', 'expiresAt'],
    displayedAttributes: ['id', 'productName', 'quantity', 'unit', 'budget', 'status', 'categoryId', 'categoryName', 'destinationCountryId', 'destinationCountryName', 'currencyId', 'currencyCode', 'quotationCount', 'createdAt', 'expiresAt'],
  })

  console.log('✅ Meilisearch indexes initialized')
}

export async function indexProduct(product: Record<string, unknown>): Promise<void> {
  await meili.index(INDEXES.PRODUCTS).addDocuments([{ ...product, id: product.id }])
}

export async function removeProductFromIndex(productId: string): Promise<void> {
  await meili.index(INDEXES.PRODUCTS).deleteDocument(productId)
}

export async function indexCompany(company: Record<string, unknown>): Promise<void> {
  await meili.index(INDEXES.COMPANIES).addDocuments([{ ...company, id: company.id }])
}

export async function removeCompanyFromIndex(companyId: string): Promise<void> {
  await meili.index(INDEXES.COMPANIES).deleteDocument(companyId)
}

export async function indexRFQ(rfq: Record<string, unknown>): Promise<void> {
  await meili.index(INDEXES.RFQS).addDocuments([{ ...rfq, id: rfq.id }])
}

export async function removeRFQFromIndex(rfqId: string): Promise<void> {
  await meili.index(INDEXES.RFQS).deleteDocument(rfqId)
}

export interface SearchParams {
  q: string
  filter?: string
  sort?: string[]
  page?: number
  hitsPerPage?: number
}

export async function searchProducts(params: SearchParams) {
  return meili.index(INDEXES.PRODUCTS).search(params.q, {
    filter: params.filter,
    sort: params.sort,
    page: params.page || 1,
    hitsPerPage: params.hitsPerPage || 20,
  })
}

export async function searchCompanies(params: SearchParams) {
  return meili.index(INDEXES.COMPANIES).search(params.q, {
    filter: params.filter,
    sort: params.sort,
    page: params.page || 1,
    hitsPerPage: params.hitsPerPage || 20,
  })
}

export async function searchRFQs(params: SearchParams) {
  return meili.index(INDEXES.RFQS).search(params.q, {
    filter: params.filter,
    sort: params.sort,
    page: params.page || 1,
    hitsPerPage: params.hitsPerPage || 20,
  })
}
