'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { useIsAuthenticated, useIsAdmin, useCurrentUser, useAuthStore } from '@/store/auth'
import { post } from '@/lib/utils/api-client'
import { NotificationDropdown } from '@/components/notifications/notification-dropdown'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Building2, Package, Globe, Shield,
  Flag, LogOut, Globe2, ChevronRight, ChevronDown, CheckSquare, ClipboardCheck, BadgeCheck, Settings, KeyRound, Bell,
} from 'lucide-react'

type NavItem = {
  href?: string
  icon: ComponentType<{ className?: string }>
  label: string
  children?: Array<{ href: string; label: string }>
}

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/notifications', icon: Bell, label: 'Notifications' },
    ],
  },
  {
    label: 'Access',
    items: [
      { href: '/admin/buyer-verifications', icon: Shield,      label: 'Buyer Verification' },
      { href: '/admin/company-verification-documents', icon: ClipboardCheck, label: 'Company Verification Docs' },
      { href: '/admin/kyc',                 icon: BadgeCheck,  label: 'KYC Reviews' },
      { href: '/admin/fraud-alerts',        icon: Flag,        label: 'Fraud Alerts' },
      { href: '/admin/roles',               icon: KeyRound,    label: 'Roles & Permissions' },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { href: '/admin/categories',   icon: Globe,           label: 'Categories' },
      { href: '/admin/catalogs',     icon: Package,         label: 'Catalogs' },
      { href: '/admin/companies',    icon: Building2,       label: 'Companies' },
      { href: '/admin/inspections',  icon: ClipboardCheck,  label: 'Inspection Reports' },
      { href: '/admin/products',     icon: Package,         label: 'Product Approval' },
      { href: '/admin/ad-campaigns', icon: Package,         label: 'Advertising' },
    ],
  },
  {
    label: 'Trade & Revenue',
    items: [
      { href: '/admin/trade-orders',   icon: Shield,        label: 'Trade Orders' },
      { href: '/admin/commissions',    icon: Shield,        label: 'Commissions' },
      { href: '/admin/payments',       icon: Shield,        label: 'Payments' },
      { href: '/admin/sample-orders',  icon: Package,       label: 'Sample Orders' },
      { href: '/admin/shipments',      icon: Globe,         label: 'Shipments' },
      { href: '/admin/logistics-bookings', icon: Globe,     label: 'Logistics' },
      { href: '/admin/insurance-policies', icon: Shield,    label: 'Insurance' },
      { href: '/admin/insurance-claims',   icon: Shield,    label: 'Claims' },
      { href: '/admin/financing-requests', icon: Building2, label: 'Financing' },
      { href: '/admin/trade-disputes', icon: CheckSquare,   label: 'Trade Disputes' },
    ],
  },
  {
    label: 'System',
    items: [
      {
        icon: Settings,
        label: 'Settings',
        children: [
          { href: '/admin/settings/ai', label: 'AI Search' },
          { href: '/admin/settings/home', label: 'Home Page' },
          { href: '/admin/settings/payment', label: 'Payment' },
          { href: '/admin/settings/currency', label: 'Currency' },
          { href: '/admin/settings/language', label: 'Language' },
          { href: '/admin/settings/shipping', label: 'Shipping' },
          { href: '/admin/settings/partners', label: 'Partners' },
          { href: '/admin/settings/social', label: 'Social Login' },
          { href: '/admin/settings/email', label: 'Email' },
          { href: '/admin/settings/storage', label: 'Storage' },
          { href: '/admin/settings/media', label: 'Media & FFmpeg' },
        ],
      },
    ],
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const isAuth   = useIsAuthenticated()
  const isAdmin  = useIsAdmin()
  const user     = useCurrentUser()
  const { clearAuth, refreshToken } = useAuthStore()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Settings: pathname.startsWith('/admin/settings'),
  })

  useEffect(() => {
    if (!isAuth)  router.push('/auth/login?redirect=/admin')
    else if (!isAdmin) router.push('/')
  }, [isAuth, isAdmin, router])

  async function handleLogout() {
    try { await post('/auth/logout', { refreshToken }) } catch { /* ignore */ }
    clearAuth()
    router.push('/')
    toast.success('Logged out')
  }

  if (!isAuth || !isAdmin) return null

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col flex-shrink-0 overflow-hidden">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-700">
          <Globe2 className="w-6 h-6 text-blue-400" />
          <div>
            <p className="text-sm font-bold text-white">Kaniz Global Trade</p>
            <p className="text-xs text-gray-500">Kaniz Global Trade Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-1">{group.label}</p>
              {group.items.map((item: NavItem) => {
                const Icon = item.icon
                if (item.children?.length) {
                  const isOpen = openMenus[item.label] ?? pathname.startsWith('/admin/settings')
                  const childActive = item.children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`))
                  return (
                    <div key={item.label} className="mb-1">
                      <button
                        onClick={() => setOpenMenus((prev) => ({ ...prev, [item.label]: !isOpen }))}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          childActive ? 'bg-blue-700 text-white font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="mt-1 ml-4 border-l border-gray-800 pl-3 space-y-1">
                          {item.children.map((child) => {
                            const childIsActive = pathname === child.href || pathname.startsWith(`${child.href}/`)
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                  childIsActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                              >
                                {child.label}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href!}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-700 text-white font-medium'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.roles?.join(', ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 w-full text-sm text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
            <NotificationDropdown audience="admin" inboxHref="/admin/notifications" />
            <Link href="/" className="text-xs text-gray-500 hover:text-blue-700">
            View Site →
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
