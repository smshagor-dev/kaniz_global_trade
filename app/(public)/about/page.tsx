import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Kaniz Global Trade',
  description: 'Learn about Kaniz Global Trade, our marketplace mission, and how we support global B2B sourcing.',
}

export default function AboutPage() {
  return (
    <div className="w-full px-4 py-12 md:px-6 lg:px-8 2xl:px-10">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">About us</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950">Built for global B2B trade</h1>
        <p className="mt-4 text-base leading-8 text-slate-600">
          Kaniz Global Trade helps buyers discover products, connect with verified suppliers, submit RFQs, compare offers, and manage trade workflows from one marketplace platform.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {[
          ['Marketplace mission', 'Make supplier discovery, inquiry management, and protected B2B trade faster and more transparent.'],
          ['Who we serve', 'Importers, wholesalers, brands, distributors, sourcing teams, and export-ready manufacturers.'],
          ['What we provide', 'Product catalogs, RFQ workflows, verification, payment support, trade services, and supplier visibility tools.'],
        ].map(([title, text]) => (
          <div key={title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
