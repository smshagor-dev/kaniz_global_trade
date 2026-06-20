import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Kaniz Global Trade marketplace users.',
}

export default function PrivacyPage() {
  return (
    <div className="w-full px-4 py-12 md:px-6 lg:px-8 2xl:px-10">
      <h1 className="text-4xl font-black tracking-[-0.05em] text-slate-950">Privacy Policy</h1>
      <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
        <section><h2 className="text-lg font-bold text-slate-950">Information we collect</h2><p className="mt-2">We collect account details, company profile data, product submissions, RFQs, inquiries, billing records, and operational logs needed to run the marketplace.</p></section>
        <section><h2 className="text-lg font-bold text-slate-950">How we use information</h2><p className="mt-2">We use data to provide marketplace services, verify accounts, process payments, deliver product discovery features, and improve platform trust and security.</p></section>
        <section><h2 className="text-lg font-bold text-slate-950">Data sharing</h2><p className="mt-2">We may display approved business information publicly inside listings and share necessary operational data with payment, security, and service providers.</p></section>
      </div>
    </div>
  )
}
