import { NextRequest } from 'next/server'
import { successResponse } from '@/lib/utils/api'
import { COUNTRIES } from '@/lib/constants/countries'

const COUNTRY_CODES = new Set<string>(COUNTRIES.map((country) => country.code))
const GEO_HEADERS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'cloudfront-viewer-country',
  'x-country-code',
] as const

function normalizeCountryCode(value?: string | null) {
  const code = value?.trim().toUpperCase()
  if (!code || !COUNTRY_CODES.has(code)) return null
  return code
}

function detectCountryFromHeaders(req: NextRequest) {
  for (const headerName of GEO_HEADERS) {
    const value = normalizeCountryCode(req.headers.get(headerName))
    if (value) {
      return { countryCode: value, source: headerName }
    }
  }

  return { countryCode: null, source: 'fallback' }
}

export async function GET(req: NextRequest) {
  const { countryCode, source } = detectCountryFromHeaders(req)

  return successResponse(
    {
      countryCode: countryCode || 'BD',
      source,
      detected: !!countryCode,
    },
    'Location context fetched'
  )
}
