'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useIsAuthenticated, useIsSupplier, useIsAdmin, useCurrentUser, useAuthStore } from '@/store/auth'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { LanguageSwitcher } from '@/components/language-switcher'
import { CurrencySelector } from '@/components/currency/currency-selector'
import {
  LayoutDashboard, Building2, Package, MessageSquare, FileText,
  Quote, Users, CreditCard, BarChart3, Bell, Settings,
  LogOut, Globe2, Shield, ChevronRight, ShoppingBag, Truck, PackageCheck, Clapperboard, ClipboardCheck, Megaphone, Landmark, BadgeDollarSign, FolderTree,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/company',      icon: Building2,       label: 'Company Profile' },
  { href: '/dashboard/categories',   icon: FolderTree,      label: 'Categories' },
  { href: '/dashboard/products',     icon: Package,         label: 'Products' },
  { href: '/dashboard/inquiries',    icon: MessageSquare,   label: 'Inquiries' },
  { href: '/dashboard/rfq-requests', icon: FileText,        label: 'RFQ Requests' },
  { href: '/dashboard/rfqs',         icon: FileText,        label: 'RFQs' },
  { href: '/dashboard/quotations',   icon: Quote,           label: 'Quotations' },
  { href: '/dashboard/trade-orders', icon: Shield,          label: 'Trade Assurance' },
  { href: '/dashboard/revenue',      icon: BadgeDollarSign, label: 'Commission' },
  { href: '/dashboard/sample-orders',icon: PackageCheck,    label: 'Sample Orders' },
  { href: '/dashboard/shipments',    icon: Truck,           label: 'Shipments' },
  { href: '/dashboard/logistics',    icon: Truck,           label: 'Logistics' },
  { href: '/dashboard/insurance',    icon: Shield,          label: 'Insurance' },
  { href: '/dashboard/ads',          icon: Megaphone,       label: 'Advertising' },
  { href: '/dashboard/financing',    icon: Landmark,        label: 'Financing' },
  { href: '/dashboard/virtual-tours',icon: Clapperboard,    label: 'Virtual Tours' },
  { href: '/dashboard/inspections',  icon: ClipboardCheck,  label: 'Inspections' },
  { href: '/dashboard/chat',         icon: MessageSquare,   label: 'Live Chat' },
  { href: '/dashboard/staff',        icon: Users,           label: 'Staff' },
  { href: '/dashboard/subscription', icon: Shield,          label: 'Subscription' },
  { href: '/dashboard/payments',     icon: CreditCard,      label: 'Payments' },
  { href: '/dashboard/analytics',    icon: BarChart3,       label: 'Analytics' },
  { href: '/dashboard/notifications',icon: Bell,            label: 'Notifications' },
  { href: '/dashboard/settings',     icon: Settings,        label: 'Settings' },
]

export default function SupplierDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname()
  const router      = useRouter()
  const isAuth      = useIsAuthenticated()
  const isSupplier  = useIsSupplier()
  const isAdmin     = useIsAdmin()
  const user        = useCurrentUser()
  const { clearAuth, refreshToken } = useAuthStore()
  const { data: rfqMenuData } = useQuery({
    queryKey: ['supplier-rfq-menu-count'],
    queryFn: () => get<Array<{ quotations?: Array<{ id: string }> }>>('/rfqs?limit=100'),
    enabled: isAuth && (isSupplier || isAdmin),
    staleTime: 60 * 1000,
  })

  const rfqRequestCount = (rfqMenuData?.data || []).filter((item) => !item.quotations?.length).length

  useEffect(() => {
    if (!isAuth) router.push('/auth/login?redirect=/dashboard')
    else if (!isSupplier && !isAdmin) router.push('/buyer')
  }, [isAuth, isSupplier, isAdmin, router])

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
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-100">
          <Globe2 className="w-6 h-6 text-blue-700" />
          <div>
            <p className="text-sm font-bold text-gray-900">Kaniz Global Trade</p>
            <p className="text-xs text-gray-400">Supplier Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="min-w-0 flex-1">{label}</span>
                {href === '/dashboard/rfq-requests' && rfqRequestCount > 0 ? (
                  <span className={`inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {rfqRequestCount > 99 ? '99+' : rfqRequestCount}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 w-full text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {pathname.split('/').filter(Boolean).map((seg, i, arr) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
                <span className={i === arr.length - 1 ? 'text-gray-900 font-semibold capitalize' : 'capitalize'}>
                  {seg.replace(/-/g, ' ')}
                </span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher compact />
            <CurrencySelector compact />
            <Link href="/" className="text-xs text-gray-500 hover:text-blue-700 flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" /> View Marketplace
            </Link>
            <Link href="/dashboard/notifications" className="relative p-2 text-gray-500 hover:text-blue-700">
              <Bell className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
