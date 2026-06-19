'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuthStore, useIsAuthenticated, useIsAdmin, useIsSupplier, useIsBuyer } from '@/store/auth'
import { post } from '@/lib/utils/api-client'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useLanguage } from '@/lib/i18n'
import {
  Globe2, Menu, X, ChevronDown, Bell, User, LogOut,
  LayoutDashboard, Package, MessageSquare, Search, FileText,
} from 'lucide-react'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const isAuth     = useIsAuthenticated()
  const isAdmin    = useIsAdmin()
  const isSupplier = useIsSupplier()
  const isBuyer    = useIsBuyer()
  const { user, clearAuth, refreshToken } = useAuthStore()
  const router = useRouter()
  const { t } = useLanguage()

  const dashboardPath = isAdmin ? '/admin' : isSupplier ? '/dashboard' : '/buyer'

  async function handleLogout() {
    try {
      await post('/auth/logout', { refreshToken })
    } catch { /* ignore */ }
    clearAuth()
    router.push('/')
    toast.success('Logged out')
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      {/* Top bar */}
      <div className="bg-blue-700 text-white text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span>🌐 Global B2B Marketplace — Connecting Buyers & Suppliers Worldwide</span>
          <div className="hidden md:flex gap-4">
            <Link href="/contact" className="hover:underline">Help</Link>
            <Link href="/blogs"   className="hover:underline">Trade News</Link>
            <LanguageSwitcher compact />
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-700">
          <Globe2 className="w-7 h-7" />
          <span className="hidden sm:block">Kaniz Global Trade</span>
          <span className="sm:hidden">KGT</span>
        </Link>

        {/* Search bar (desktop) */}
        <div className="hidden lg:flex flex-1 max-w-xl mx-6">
          <div className="flex w-full rounded-lg border border-gray-200 overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-400">
            <input
              type="text"
              placeholder="Search products, suppliers..."
              className="flex-1 px-4 py-2 text-sm outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = (e.target as HTMLInputElement).value
                  router.push(`/products?q=${encodeURIComponent(q)}`)
                }
              }}
            />
            <button className="bg-blue-700 text-white px-4 hover:bg-blue-800 transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/products">{t('products')}</NavLink>
          <NavLink href="/companies">{t('suppliers')}</NavLink>
          <NavLink href="/rfqs">{t('rfq')}</NavLink>
          <NavLink href="/compare">{t('compare')}</NavLink>

          {isAuth ? (
            <>
              <Link
                href="/notifications"
                className="relative p-2 text-gray-600 hover:text-blue-700"
              >
                <Bell className="w-5 h-5" />
              </Link>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 ml-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
                    {user?.firstName[0]}{user?.lastName[0]}
                  </div>
                  <span className="hidden lg:block">{user?.firstName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                    <div className="px-4 py-2.5 border-b border-gray-50">
                      <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      href={dashboardPath}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setProfileOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" /> {t('dashboard')}
                    </Link>
                    <Link
                      href="/buyer/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {t('signIn')}
              </Link>
              <Link
                href="/auth/register"
                className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
              >
                {t('register')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <input type="text" placeholder="Search..." className="flex-1 px-3 py-2 text-sm outline-none" />
            <button className="bg-blue-700 text-white px-3">
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div className="pt-1"><LanguageSwitcher /></div>
          <Link href="/products"  className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{t('products')}</Link>
          <Link href="/companies" className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{t('suppliers')}</Link>
          <Link href="/rfqs"      className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{t('rfq')}</Link>
          <Link href="/compare"   className="block py-2 text-sm" onClick={() => setMobileOpen(false)}>{t('compare')}</Link>
          {isAuth ? (
            <>
              <Link href={dashboardPath} className="block py-2 text-sm font-semibold text-blue-700" onClick={() => setMobileOpen(false)}>{t('dashboard')}</Link>
              <button onClick={handleLogout} className="block py-2 text-sm text-red-600 w-full text-left">Logout</button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link href="/auth/login"    className="flex-1 text-center py-2 border border-blue-700 text-blue-700 rounded-lg text-sm">{t('signIn')}</Link>
              <Link href="/auth/register" className="flex-1 text-center py-2 bg-blue-700 text-white rounded-lg text-sm">{t('register')}</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="px-3 py-2 text-sm text-gray-700 hover:text-blue-700 rounded-lg hover:bg-gray-50 transition-colors">
      {children}
    </Link>
  )
}
