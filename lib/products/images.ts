type ProductImageInput = {
  url: string
  isPrimary?: boolean
  alt?: string | null
}

type NormalizedProductImage = {
  url: string
  isPrimary: boolean
  alt: string | null
}

export function normalizeProductImages(images: ProductImageInput[]): NormalizedProductImage[] {
  const deduped: Array<{ url: string; isPrimary: boolean; alt: string | null }> = []
  const seenUrls = new Set<string>()

  for (const image of images) {
    const url = image.url.trim()
    if (!url || seenUrls.has(url)) continue

    seenUrls.add(url)
    deduped.push({
      url,
      isPrimary: Boolean(image.isPrimary),
      alt: image.alt?.trim() || null,
    })
  }

  const primaryIndex = deduped.findIndex((image) => image.isPrimary)

  return deduped.map((image, index) => ({
    ...image,
    isPrimary: primaryIndex >= 0 ? index === primaryIndex : index === 0,
  }))
}
