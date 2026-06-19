export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
}

export async function uniqueSlug(
  baseValue: string,
  exists: (slug: string) => Promise<boolean>
) {
  const base = slugify(baseValue) || 'item'
  let slug = base
  let counter = 1

  while (await exists(slug)) {
    slug = `${base}-${counter}`
    counter += 1
  }

  return slug
}
