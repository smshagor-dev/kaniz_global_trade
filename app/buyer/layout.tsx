'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useIsAuthenticated, useIsBuyer, useIsAdmin, useCurrentUser, useAuthStore } from '@/store/auth'
import { post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { LanguageSwitcher } from '@/components/language-switcher'
import {
  LayoutDashboard, MessageSquare, FileText, Quote,
  Heart, Star, Bell, Settings, LogOut, Globe2,
  ChevronRight, Search, ShoppingCart, ShieldCheck, Truck, PackageCheck, Sparkles, BadgeCheck, Shield,
} from 'lucide-react'

const navItems = [
  { href: '/buyer',              icon: LayoutDashboard, label: 'Overview' },
  { href: '/buyer/verification', icon: ShieldCheck,     label: 'Buyer Verification' },
  { href: '/buyer/kyc',          icon: BadgeCheck,      label: 'KYC Compliance' },
  { href: '/buyer/ai-matches',   icon: Sparkles,        label: 'AI Matches' },
  { href: '/buyer/trade-orders', icon: ShoppingCart,    label: 'Trade Assurance' },
  { href: '/buyer/sample-orders',icon: PackageCheck,    label: 'Sample Orders' },
  { href: '/buyer/rfqs',         icon: FileText,        label: 'My RFQs' },
  { href: '/buyer/inquiries',    icon: MessageSquare,   label: 'Inquiries' },
  { href: '/buyer/quotations',   icon: Quote,           label: 'Quotations' },
  { href: '/buyer/chat',         icon: MessageSquare,   label: 'Live Chat' },
  { href: '/buyer/shipments',    icon: Truck,           label: 'Shipments' },
  { href: '/buyer/logistics',    icon: Truck,           label: 'Logistics' },
  { href: '/buyer/insurance',    icon: Shield,          label: 'Insurance' },
  { href: '/buyer/claims',       icon: Shield,          label: 'Claims' },
  { href: '/buyer/saved',        icon: Heart,           label: 'Saved Items' },
  { href: '/buyer/reviews',      icon: Star,            label: 'My Reviews' },
  { href: '/buyer/notifications',icon: Bell,            label: 'Notifications' },
  { href: '/buyer/settings',     icon: Settings,        label: 'Settings' },
]

export default function BuyerDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const isAuth    = useIsAuthenticated()
  const isBuyer   = useIsBuyer()
  const isAdmin   = useIsAdmin()
  const user      = useCurrentUser()
  const { clearAuth, refreshToken } = useAuthStore()

  useEffect(() => {
    if (!isAuth) router.push('/auth/login?redirect=/buyer')
    else if (!isBuyer && !isAdmin) router.push('/dashboard')
  }, [isAuth, isBuyer, isAdmin, router])

  async function handleLogout() {
    try { await post('/auth/logout', { refreshToken }) } catch { /* ignore */ }
    clearAuth()
    router.push('/')
    toast.success('Logged out')
  }

  if (!isAuth) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-100">
          <Globe2 className="w-6 h-6 text-blue-700" />
          <div>
            <p className="text-sm font-bold text-gray-900">Kaniz Global Trade</p>
            <p className="text-xs text-gray-400">Buyer Portal</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === '/buyer' ? pathname === href : pathname.startsWith(href)
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" /> {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">Buyer</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 w-full text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {pathname.split('/').filter(Boolean).map((seg, i, arr) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
                <span className={i === arr.length - 1 ? 'text-gray-900 font-semibold capitalize' : 'capitalize'}>{seg.replace(/-/g, ' ')}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <Link href="/products" className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline">
              <Search className="w-4 h-4" /> Browse Products
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
