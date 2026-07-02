function normalizeBaseUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('NEXT_PUBLIC_APP_URL is required for hosted payment redirects and callbacks')
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('NEXT_PUBLIC_APP_URL must be a valid absolute URL')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('NEXT_PUBLIC_APP_URL must start with http:// or https://')
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  parsed.search = ''
  parsed.hash = ''
  return parsed
}

export function resolveAppUrl() {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || '').toString().replace(/\/$/, '')
}

export function buildAppUrl(pathname: string, searchParams?: Record<string, string | undefined>) {
  const url = new URL(pathname, `${resolveAppUrl()}/`)

  for (const [key, value] of Object.entries(searchParams || {})) {
    if (value) {
      url.searchParams.set(key, value)
    }
  }

  return url.toString()
}
