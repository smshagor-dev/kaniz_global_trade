import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Reach Kaniz Global Trade support, marketplace operations, and business inquiries.',
}

export default function ContactPage() {
  return (
    <div className="w-full px-4 py-12 md:px-6 lg:px-8 2xl:px-10">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Contact</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950">Talk to our marketplace team</h1>
      <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
        For buyer support, supplier onboarding, partnership questions, or account issues, contact us through the details below.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {[
          ['Customer support', 'support@kanizglobaltrade.com', 'Mon-Sat, 24/7 online response'],
          ['Business inquiries', 'sales@kanizglobaltrade.com', 'Supplier plans, partnerships, and marketplace growth'],
          ['Operations desk', '+1 (555) 000-0000', 'Global sourcing and account escalation support'],
        ].map(([title, value, text]) => (
          <div key={title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            <p className="mt-3 text-sm font-semibold text-orange-600">{value}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
