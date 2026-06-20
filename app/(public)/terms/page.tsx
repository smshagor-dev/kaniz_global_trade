import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Marketplace terms of service for Kaniz Global Trade.',
}

export default function TermsPage() {
  return (
    <div className="w-full px-4 py-12 md:px-6 lg:px-8 2xl:px-10">
      <h1 className="text-4xl font-black tracking-[-0.05em] text-slate-950">Terms of Service</h1>
      <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
        <section><h2 className="text-lg font-bold text-slate-950">Marketplace access</h2><p className="mt-2">By using Kaniz Global Trade, you agree to provide accurate information, comply with applicable trade laws, and use the platform only for legitimate business activity.</p></section>
        <section><h2 className="text-lg font-bold text-slate-950">Supplier and buyer responsibilities</h2><p className="mt-2">Suppliers are responsible for listing accuracy and delivery commitments. Buyers are responsible for truthful RFQs, payment obligations, and lawful sourcing behavior.</p></section>
        <section><h2 className="text-lg font-bold text-slate-950">Platform enforcement</h2><p className="mt-2">We may suspend content, restrict accounts, or remove listings that violate marketplace standards, security requirements, or legal obligations.</p></section>
      </div>
    </div>
  )
}
