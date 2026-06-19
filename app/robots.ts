import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://kanizglobaltrade.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard/',
          '/buyer/',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
