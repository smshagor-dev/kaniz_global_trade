import { getSettingsMap } from '@/lib/settings/system'

const logisticsProviders = {
  DHL: 'https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=',
  FEDEX: 'https://www.fedex.com/fedextrack/?trknbr=',
  UPS: 'https://www.ups.com/track?tracknum=',
  MAERSK: 'https://www.maersk.com/tracking/',
} as const

export async function getProviderConfig(provider: string) {
  const normalized = provider.trim().toUpperCase() as keyof typeof logisticsProviders
  const settings = await getSettingsMap([
    'DHL_TRACKING_API_KEY',
    'FEDEX_API_KEY',
    'FEDEX_API_SECRET',
    'UPS_CLIENT_ID',
    'UPS_CLIENT_SECRET',
    'MAERSK_API_KEY',
  ])
  const hasCredentials =
    normalized === 'DHL' ? Boolean(settings.DHL_TRACKING_API_KEY) :
    normalized === 'FEDEX' ? Boolean(settings.FEDEX_API_KEY && settings.FEDEX_API_SECRET) :
    normalized === 'UPS' ? Boolean(settings.UPS_CLIENT_ID && settings.UPS_CLIENT_SECRET) :
    normalized === 'MAERSK' ? Boolean(settings.MAERSK_API_KEY) :
    false

  return logisticsProviders[normalized]
    ? { trackingUrl: logisticsProviders[normalized], hasCredentials }
    : null
}

export async function listAvailableLogisticsProviders() {
  const names = Object.keys(logisticsProviders)
  const [configs, settings] = await Promise.all([
    Promise.all(names.map((name) => getProviderConfig(name))),
    getSettingsMap(['ACTIVE_SHIPPING_CARRIERS']),
  ])
  const activeNames = new Set(
    (settings.ACTIVE_SHIPPING_CARRIERS || '')
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
  )

  return names
    .filter((name) => activeNames.size === 0 || activeNames.has(name))
    .map((name) => ({
    name,
    hasCredentials: configs[names.indexOf(name)]?.hasCredentials || false,
  }))
}
