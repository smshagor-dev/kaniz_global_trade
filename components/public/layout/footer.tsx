import Link from 'next/link'
import { Globe2, Mail, Phone, MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-white font-bold text-xl mb-4">
              <Globe2 className="w-7 h-7 text-blue-400" />
              Kaniz Global Trade
            </div>
            <p className="text-sm leading-relaxed text-gray-400 mb-5">
              Connecting verified global suppliers and international buyers. Your trusted B2B export &amp; import marketplace for seamless international trade.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Mail   className="w-4 h-4 text-blue-400" /><span>support@kanizglobaltrade.com</span></div>
              <div className="flex items-center gap-2"><Phone  className="w-4 h-4 text-blue-400" /><span>+1 (555) 000-0000</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-400" /><span>Global Operations</span></div>
            </div>
          </div>

          {/* Trade */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Trade</h3>
            <ul className="space-y-2 text-sm">
              {[
                ['/products',        'Browse Products'],
                ['/companies',       'Find Suppliers'],
                ['/rfqs',            'Post RFQ'],
                ['/rfqs',            'Browse RFQs'],
                ['/companies?type=MANUFACTURER', 'Manufacturers'],
                ['/companies?verified=true',     'Verified Suppliers'],
              ].map(([href, label]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-white hover:underline transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Services</h3>
            <ul className="space-y-2 text-sm">
              {[
                ['/auth/register?role=SUPPLIER_OWNER', 'Sell on KGT'],
                ['/pricing',    'Membership Plans'],
                ['/verification', 'Verification'],
                ['/blogs',      'Trade News'],
                ['/contact',    'Customer Support'],
              ].map(([href, label]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-white hover:underline transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Company</h3>
            <ul className="space-y-2 text-sm">
              {[
                ['/about',   'About Us'],
                ['/contact', 'Contact'],
                ['/blogs',   'Blog'],
                ['/sitemap', 'Sitemap'],
                ['/terms',   'Terms of Service'],
                ['/privacy', 'Privacy Policy'],
              ].map(([href, label]) => (
                <li key={label}>
                  <Link href={href} className="hover:text-white hover:underline transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Kaniz Global Trade. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms"   className="hover:text-gray-300">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-300">Privacy</Link>
            <Link href="/contact" className="hover:text-gray-300">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
