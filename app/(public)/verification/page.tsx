import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verification Program',
  description: 'Understand supplier verification and marketplace trust on Kaniz Global Trade.',
}

export default function VerificationPage() {
  return (
    <div className="w-full px-4 py-12 md:px-6 lg:px-8 2xl:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Verification</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950">How supplier verification works</h1>
      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
        Verified suppliers help buyers source with greater confidence. Our verification process combines company information checks, business profile review, and marketplace activity monitoring.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {[
          ['Identity review', 'Business information, ownership details, and account authenticity are reviewed.'],
          ['Documentation checks', 'Company documents and supporting trade credentials can be validated before approval.'],
          ['Marketplace trust', 'Approval status, inquiries, response behavior, and product activity contribute to supplier credibility.'],
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
