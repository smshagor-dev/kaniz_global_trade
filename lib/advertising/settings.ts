import { getSettingsMap } from '@/lib/settings/system'

export const ADVERTISING_SETTING_KEYS = [
  'ADS_ENABLED',
  'ADS_AUTO_APPROVE',
  'ADS_REQUIRE_PRODUCT_LINK',
  'ADS_DEFAULT_BUDGET',
  'ADS_DEFAULT_BID',
  'ADS_MIN_BUDGET',
  'ADS_MAX_BUDGET',
  'ADS_MIN_BID',
  'ADS_MAX_BID',
  'ADS_DEFAULT_DURATION_DAYS',
  'ADS_ALLOWED_PLACEMENTS',
  'ADS_SEARCH_TOP_ENABLED',
  'ADS_HOMEPAGE_HERO_ENABLED',
  'ADS_HOMEPAGE_FEATURED_ENABLED',
  'ADS_CATEGORY_SPOTLIGHT_ENABLED',
] as const

export const AD_PLACEMENTS = ['SEARCH_TOP', 'HOMEPAGE_HERO', 'HOMEPAGE_FEATURED', 'CATEGORY_SPOTLIGHT'] as const

export type AdPlacement = typeof AD_PLACEMENTS[number]

const PLACEMENT_FLAG_MAP: Record<AdPlacement, keyof AdvertisingSettings> = {
  SEARCH_TOP: 'searchTopEnabled',
  HOMEPAGE_HERO: 'homepageHeroEnabled',
  HOMEPAGE_FEATURED: 'homepageFeaturedEnabled',
  CATEGORY_SPOTLIGHT: 'categorySpotlightEnabled',
}

export type AdvertisingSettings = {
  enabled: boolean
  autoApprove: boolean
  requireProductLink: boolean
  defaultBudget: number
  defaultBid: number
  minBudget: number
  maxBudget: number
  minBid: number
  maxBid: number
  defaultDurationDays: number
  allowedPlacements: AdPlacement[]
  searchTopEnabled: boolean
  homepageHeroEnabled: boolean
  homepageFeaturedEnabled: boolean
  categorySpotlightEnabled: boolean
}

function toBoolean(value: string | undefined, fallback = false) {
  if (value == null || value === '') return fallback
  return value === 'true'
}

function toNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function getAdvertisingSettings(): Promise<AdvertisingSettings> {
  const settings = await getSettingsMap([...ADVERTISING_SETTING_KEYS])

  const configuredPlacements = (settings.ADS_ALLOWED_PLACEMENTS || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is AdPlacement => AD_PLACEMENTS.includes(item as AdPlacement))

  const placementFlags: AdvertisingSettings = {
    enabled: toBoolean(settings.ADS_ENABLED, true),
    autoApprove: toBoolean(settings.ADS_AUTO_APPROVE, false),
    requireProductLink: toBoolean(settings.ADS_REQUIRE_PRODUCT_LINK, false),
    defaultBudget: toNumber(settings.ADS_DEFAULT_BUDGET, 500),
    defaultBid: toNumber(settings.ADS_DEFAULT_BID, 25),
    minBudget: toNumber(settings.ADS_MIN_BUDGET, 100),
    maxBudget: toNumber(settings.ADS_MAX_BUDGET, 50000),
    minBid: toNumber(settings.ADS_MIN_BID, 5),
    maxBid: toNumber(settings.ADS_MAX_BID, 5000),
    defaultDurationDays: toNumber(settings.ADS_DEFAULT_DURATION_DAYS, 7),
    allowedPlacements: [],
    searchTopEnabled: toBoolean(settings.ADS_SEARCH_TOP_ENABLED, true),
    homepageHeroEnabled: toBoolean(settings.ADS_HOMEPAGE_HERO_ENABLED, true),
    homepageFeaturedEnabled: toBoolean(settings.ADS_HOMEPAGE_FEATURED_ENABLED, true),
    categorySpotlightEnabled: toBoolean(settings.ADS_CATEGORY_SPOTLIGHT_ENABLED, true),
  }

  const enabledPlacements = AD_PLACEMENTS.filter((placement) => placementFlags[PLACEMENT_FLAG_MAP[placement]])
  const allowedPlacements = configuredPlacements.length
    ? configuredPlacements.filter((placement) => enabledPlacements.includes(placement))
    : enabledPlacements

  return {
    ...placementFlags,
    allowedPlacements,
  }
}
