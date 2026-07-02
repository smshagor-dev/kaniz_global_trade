'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useIsAuthenticated, useIsSupplier, useCurrentUser, useAuthStore } from '@/store/auth'
import { get, post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { LanguageSwitcher } from '@/components/language-switcher'
import { CurrencySelector } from '@/components/currency/currency-selector'
import { NotificationDropdown } from '@/components/notifications/notification-dropdown'
import {
  LayoutDashboard, Building2, Package, MessageSquare, FileText,
  Quote, Users, CreditCard, BarChart3, Bell, Settings,
  LogOut, Globe2, Shield, ShieldCheck, ChevronRight, ChevronDown, ShoppingBag, Truck, PackageCheck, Clapperboard, ClipboardCheck, Megaphone, Landmark, BadgeDollarSign, FolderTree,
} from 'lucide-react'
import { getSupplierDashboardSectionForPath } from '@/lib/supplier-dashboard-access'
import { TrustBadge } from '@/components/public/trust-badge'

const navItems = [
  { key: 'overview', href: '/dashboard/overview', icon: LayoutDashboard, label: 'Overview' },
  { key: 'company', href: '/dashboard/company', icon: Building2, label: 'Company Profile' },
  { key: 'b2b-company', href: '/dashboard/b2b/company', icon: BadgeDollarSign, label: 'Supplier Company' },
  { key: 'categories', href: '/dashboard/categories', icon: FolderTree, label: 'Categories' },
  { key: 'products', href: '/dashboard/products', icon: Package, label: 'Products' },
  { key: 'inquiries', href: '/dashboard/inquiries', icon: MessageSquare, label: 'Inquiries' },
  { key: 'rfq-requests', href: '/dashboard/rfq-requests', icon: FileText, label: 'RFQ Requests' },
  { key: 'rfqs', href: '/dashboard/rfqs', icon: FileText, label: 'RFQs' },
  { key: 'quotations', href: '/dashboard/quotations', icon: Quote, label: 'Quotations' },
  { key: 'trade-orders', href: '/dashboard/trade-orders', icon: Shield, label: 'Trade Assurance' },
  { key: 'revenue', href: '/dashboard/revenue', icon: BadgeDollarSign, label: 'Commission' },
  { key: 'sample-orders', href: '/dashboard/sample-orders', icon: PackageCheck, label: 'Sample Orders' },
  { key: 'shipments', href: '/dashboard/shipments', icon: Truck, label: 'Shipments' },
  { key: 'logistics', href: '/dashboard/logistics', icon: Truck, label: 'Logistics' },
  { key: 'insurance', href: '/dashboard/insurance', icon: Shield, label: 'Insurance' },
  { key: 'ads', href: '/dashboard/ads', icon: Megaphone, label: 'Advertising' },
  { key: 'financing', href: '/dashboard/financing', icon: Landmark, label: 'Financing' },
  { key: 'virtual-tours', href: '/dashboard/virtual-tours', icon: Clapperboard, label: 'Virtual Tours' },
  { key: 'inspections', href: '/dashboard/inspections', icon: ClipboardCheck, label: 'Inspections' },
  { key: 'chat', href: '/dashboard/chat', icon: MessageSquare, label: 'Live Chat' },
  { key: 'staff', href: '/dashboard/staff', icon: Users, label: 'Staff' },
  { key: 'subscription', href: '/dashboard/packages', icon: Shield, label: 'Packages' },
  { key: 'payments', href: '/dashboard/payments', icon: CreditCard, label: 'Payments' },
  { key: 'analytics', href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { key: 'notifications', href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
  { key: 'settings', href: '/dashboard/settings', icon: Settings, label: 'Settings', children: [
    { href: '/dashboard/settings', label: 'Role Permissions' },
  ] },
]

export default function SupplierDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname()
  const router      = useRouter()
  const queryClient = useQueryClient()
  const isAuth      = useIsAuthenticated()
  const isSupplier  = useIsSupplier()
  const user        = useCurrentUser()
  const { clearAuth, refreshToken } = useAuthStore()
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    settings: pathname.startsWith('/dashboard/settings'),
  })
  const { data: accessData, isLoading: loadingAccess } = useQuery({
    queryKey: ['supplier-dashboard-access'],
    queryFn: () => get<{ isOwner: boolean; dashboardAccess: string[]; defaultHref: string; packageRequired: boolean }>('/company-staff/access'),
    enabled: isAuth && isSupplier,
    staleTime: 60 * 1000,
  })
  const { data: rfqMenuData } = useQuery({
    queryKey: ['supplier-rfq-menu-count'],
    queryFn: () => get<Array<{ quotations?: Array<{ id: string }> }>>('/rfqs?limit=100'),
    enabled: isAuth && isSupplier && !!accessData?.data?.dashboardAccess.includes('rfq-requests'),
    staleTime: 60 * 1000,
  })
  const { data: fraudStatusData } = useQuery({
    queryKey: ['me-fraud-status', 'supplier'],
    queryFn: () => get<{
      user?: { fraudPublicFlag?: 'VERIFIED' | 'UNDER_REVIEW' | 'LIMITED_ACCESS' | 'HIGH_RISK' | 'BLOCKED' | null }
      company?: { fraudPublicFlag?: 'VERIFIED' | 'UNDER_REVIEW' | 'LIMITED_ACCESS' | 'HIGH_RISK' | 'BLOCKED' | null; name?: string | null }
    }>('/me/fraud-status'),
    enabled: isAuth && isSupplier,
    staleTime: 60 * 1000,
  })

  const dashboardAccess = accessData?.data?.dashboardAccess || []
  const currentSection = getSupplierDashboardSectionForPath(pathname)
  const visibleNavItems = navItems.filter((item) => dashboardAccess.includes(item.key))
  const rfqRequestCount = (rfqMenuData?.data || []).filter((item) => !item.quotations?.length).length

  useEffect(() => {
    if (!isAuth) router.push('/auth/login?redirect=/dashboard')
    else if (!isSupplier) router.push('/buyer')
  }, [isAuth, isSupplier, router])

  useEffect(() => {
    if (!isAuth || !isSupplier || loadingAccess || !accessData?.data) return

    if (!dashboardAccess.length) {
      router.replace('/buyer')
      return
    }

    if (accessData.data.packageRequired && pathname !== '/dashboard/packages') {
      router.replace('/dashboard/packages?required=1')
      return
    }

    if (!currentSection) {
      router.replace(accessData.data.defaultHref)
      return
    }

    if (!dashboardAccess.includes(currentSection.key)) {
      router.replace(accessData.data.defaultHref)
    }
  }, [accessData, currentSection, dashboardAccess, isAuth, isSupplier, loadingAccess, router])

  async function handleLogout() {
    try { await post('/auth/logout', { refreshToken }) } catch { /* ignore */ }
    queryClient.clear()
    clearAuth()
    router.replace('/auth/login')
    toast.success('Logged out')
  }

  if (!isAuth || (isSupplier && loadingAccess)) return null

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
          {visibleNavItems.map(({ key, href, icon: Icon, label, children }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`)
            if (children?.length) {
              const isOpen = openMenus[key] ?? isActive
              const childActive = children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`))
              return (
                <div key={key} className="mb-0.5">
                  <button
                    type="button"
                    onClick={() => setOpenMenus((current) => ({ ...current, [key]: !isOpen }))}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      childActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="min-w-0 flex-1 text-left">{label}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen ? (
                    <div className="ml-5 mt-1 border-l border-gray-100 pl-3">
                      {children.map((child) => {
                        const childIsActive = pathname === child.href || pathname.startsWith(`${child.href}/`)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                              childIsActive
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            }

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
              <div className="mt-1 flex flex-wrap gap-1.5">
                <TrustBadge flag={fraudStatusData?.data?.user?.fraudPublicFlag || null} />
                <TrustBadge flag={fraudStatusData?.data?.company?.fraudPublicFlag || null} />
              </div>
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
            {dashboardAccess.includes('notifications') ? (
              <NotificationDropdown audience="supplier" inboxHref="/dashboard/notifications" />
            ) : null}
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
