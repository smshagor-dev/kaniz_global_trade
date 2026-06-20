import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HTML Sitemap',
  description: 'Browse major sections of Kaniz Global Trade.',
}

const groups: Array<{ title: string; links: string[] }> = [
  { title: 'Marketplace', links: ['/products', '/companies', '/rfqs', '/compare'] },
  { title: 'Company', links: ['/about', '/contact', '/verification', '/pricing'] },
  { title: 'Support', links: ['/privacy', '/terms', '/blogs', '/sitemap'] },
]

export default function SitemapPage() {
  return (
    <div className="w-full px-4 py-12 md:px-6 lg:px-8 2xl:px-10">
      <h1 className="text-4xl font-black tracking-[-0.05em] text-slate-950">HTML Sitemap</h1>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {groups.map(({ title, links }) => (
          <div key={title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            <div className="mt-4 space-y-2">
              {links.map((href) => (
                <Link key={href} href={href} className="block text-sm font-medium text-orange-600 hover:text-orange-700">
                  {href}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
