'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Bell,
  ChevronDown,
  Globe2,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Search,
  User,
  X,
} from 'lucide-react'
import { COUNTRIES, type CountryOption } from '@/lib/constants/countries'
import { VisualSearchModal } from '@/components/public/home/visual-search-modal'
import { SUPPORTED_LANGUAGES, useLanguage } from '@/lib/i18n'
import { get, patch, post } from '@/lib/utils/api-client'
import { useAuthStore, useIsAdmin, useIsAuthenticated, useIsBuyer, useIsSupplier } from '@/store/auth'

const MARKETPLACE_LINKS = [
  { href: '/products', label: 'All categories', icon: Menu },
  { href: '/companies?verified=true', label: 'Verified manufacturers' },
  { href: '/pricing', label: 'Trade Assurance' },
]

const UTILITY_LINKS = [
  { href: '/companies', label: 'Buyer Central' },
  { href: '/pricing', label: 'Trade Services' },
]

type NavbarCategory = {
  id: string
  name: string
  slug: string
  description?: string | null
  image?: string | null
  icon?: string | null
  _count?: { products: number }
  subcategories: Array<{
    id: string
    name: string
    slug: string
    description?: string | null
    _count?: { products: number }
  }>
}

const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'BDT', 'AED', 'CNY', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'SEK', 'NOK', 'DKK',
  'NZD', 'SGD', 'HKD', 'MYR', 'THB', 'IDR', 'PHP', 'KRW', 'PKR', 'LKR', 'SAR', 'QAR', 'KWD', 'OMR',
  'BHD', 'TRY', 'RUB', 'UAH', 'PLN', 'CZK', 'HUF', 'RON', 'ZAR', 'EGP', 'NGN', 'KES', 'MAD', 'BRL',
  'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'VND', 'TWD',
] as const

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  ar: 'Arabic',
  es: 'Spanish',
  nl: 'Dutch',
  pt: 'Portuguese',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  tr: 'Turkish',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  hi: 'Hindi',
  bn: 'Bengali',
  ur: 'Urdu',
  id: 'Indonesian',
  vi: 'Vietnamese',
  th: 'Thai',
  pl: 'Polish',
  fa: 'Persian',
  ms: 'Malay',
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mobileQuery, setMobileQuery] = useState('')
  const [stickySearchQuery, setStickySearchQuery] = useState('')
  const [showStickySearch, setShowStickySearch] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categories, setCategories] = useState<NavbarCategory[]>([])
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [mobileCategoryId, setMobileCategoryId] = useState<string | null>(null)
  const [deliveryCountryCode, setDeliveryCountryCode] = useState<CountryOption['code']>('BD')
  const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('USD')
  const [notifications, setNotifications] = useState<Array<{
    id: string
    title: string
    message: string
    isRead: boolean
    createdAt: string
  }>>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const isAuth = useIsAuthenticated()
  const isAdmin = useIsAdmin()
  const isSupplier = useIsSupplier()
  const isBuyer = useIsBuyer()
  const { user, clearAuth, refreshToken } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const { t, language, setLanguage } = useLanguage()

  const dashboardPath = isAdmin ? '/admin' : isSupplier ? '/dashboard' : '/buyer'
  const selectedCountry = COUNTRIES.find((country) => country.code === deliveryCountryCode) || COUNTRIES.find((country) => country.code === 'BD') || COUNTRIES[0]

  const searchPlaceholder = useMemo(() => {
    if (pathname.startsWith('/companies')) return 'Search manufacturers, countries, or product lines...'
    if (pathname.startsWith('/rfqs')) return 'Search RFQs, sourcing requests, or categories...'
    return 'Search products, categories, catalogs, or suppliers...'
  }, [pathname])

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('kgt-delivery-country') : null
    if (saved && COUNTRIES.some((country) => country.code === saved)) {
      setDeliveryCountryCode(saved as CountryOption['code'])
    }

    const savedCurrency = typeof window !== 'undefined' ? window.localStorage.getItem('kgt-currency') : null
    if (savedCurrency && CURRENCIES.includes(savedCurrency as (typeof CURRENCIES)[number])) {
      setCurrency(savedCurrency as (typeof CURRENCIES)[number])
    }
  }, [])

  useEffect(() => {
    if (!isAuth || !notificationsOpen) return

    let active = true
    setNotificationsLoading(true)

    get<{ notifications: Array<{ id: string; title: string; message: string; isRead: boolean; createdAt: string }>; unreadCount: number }>('/notifications', { limit: 8 })
      .then((response) => {
        if (!active) return
        setNotifications(response.data?.notifications || [])
        setUnreadCount(response.data?.unreadCount || 0)
      })
      .catch(() => {
        if (!active) return
        toast.error('Failed to load notifications')
      })
      .finally(() => {
        if (active) setNotificationsLoading(false)
      })

    return () => {
      active = false
    }
  }, [isAuth, notificationsOpen])

  useEffect(() => {
    function updateStickySearchVisibility() {
      const discovery = document.getElementById('marketplace-discovery')
      if (!discovery) {
        setShowStickySearch(false)
        return
      }

      const rect = discovery.getBoundingClientRect()
      setShowStickySearch(rect.bottom < 110)
    }

    updateStickySearchVisibility()
    window.addEventListener('scroll', updateStickySearchVisibility, { passive: true })
    window.addEventListener('resize', updateStickySearchVisibility)

    return () => {
      window.removeEventListener('scroll', updateStickySearchVisibility)
      window.removeEventListener('resize', updateStickySearchVisibility)
    }
  }, [pathname])

  useEffect(() => {
    if ((!categoriesOpen && !mobileOpen) || categories.length) return

    let active = true
    setCategoriesLoading(true)

    get<NavbarCategory[]>('/categories', { withSubs: true, parentOnly: true })
      .then((response) => {
        if (!active) return
        const nextCategories = response.data || []
        setCategories(nextCategories)
        if (nextCategories.length) {
          setActiveCategoryId(nextCategories[0].id)
        }
      })
      .catch(() => {
        if (!active) return
        toast.error('Failed to load categories')
      })
      .finally(() => {
        if (active) setCategoriesLoading(false)
      })

    return () => {
      active = false
    }
  }, [categoriesOpen, mobileOpen, categories.length])

  function updateDeliveryCountry(code: CountryOption['code']) {
    setDeliveryCountryCode(code)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('kgt-delivery-country', code)
    }
  }

  function updateCurrency(nextCurrency: (typeof CURRENCIES)[number]) {
    setCurrency(nextCurrency)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('kgt-currency', nextCurrency)
    }
  }

  async function handleLogout() {
    try {
      await post('/auth/logout', { refreshToken })
    } catch {
      // ignore logout API failures
    }
    clearAuth()
    router.push('/')
    toast.success('Logged out')
  }

  async function handleMarkAllRead() {
    try {
      await patch('/notifications')
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
      setUnreadCount(0)
      toast.success('Notifications marked as read')
    } catch {
      toast.error('Failed to update notifications')
    }
  }

  function submitSearch(query: string) {
    const normalized = query.trim()
    router.push(normalized ? `/products?q=${encodeURIComponent(normalized)}` : '/products')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-orange-100 bg-[radial-gradient(circle_at_top,#fff6ef_0%,#fffaf7_45%,#ffffff_100%)] shadow-sm backdrop-blur">
      <div className="w-full px-4 md:px-6 xl:px-8 2xl:px-10">
        <div className="hidden xl:flex items-center gap-6 border-b border-orange-100/90 py-4">
          <BrandLogo />

          {showStickySearch ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                submitSearch(stickySearchQuery)
              }}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-orange-200 bg-white/95 px-3 py-2 shadow-[0_18px_40px_-32px_rgba(249,115,22,0.55)]"
            >
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={stickySearchQuery}
                onChange={(event) => setStickySearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <VisualSearchModal
                iconOnly
                label="Image Search"
                inlinePanel
                panelClassName="absolute right-0 top-full z-[80] mt-3 w-[min(960px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.32)]"
                buttonClassName="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-5 text-sm font-semibold text-white transition hover:scale-[1.01]"
              >
                Search
              </button>
            </form>
          ) : null}

          <div className="ml-auto flex items-center gap-6 text-sm text-slate-600">
            <DeliverTo selectedCountry={selectedCountry} onChange={updateDeliveryCountry} />

            <LocaleSelector
              language={language}
              setLanguage={setLanguage}
              currency={currency}
              setCurrency={updateCurrency}
            />

            <HeaderAuth
              isAuth={isAuth}
              user={user}
              profileOpen={profileOpen}
              setProfileOpen={setProfileOpen}
              notificationsOpen={notificationsOpen}
              setNotificationsOpen={setNotificationsOpen}
              notifications={notifications}
              unreadCount={unreadCount}
              notificationsLoading={notificationsLoading}
              onMarkAllRead={handleMarkAllRead}
              dashboardPath={dashboardPath}
              isBuyer={isBuyer}
              handleLogout={handleLogout}
              t={t}
            />
          </div>
        </div>

        <div className="hidden xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start xl:gap-10 xl:py-5">
          <div className="flex items-center gap-8 text-[15px] font-medium text-slate-700">
            {MARKETPLACE_LINKS.map(({ href, label, icon: Icon }) =>
              label === 'All categories' ? (
                <AllCategoriesMenu
                  key={label}
                  href={href}
                  icon={Icon}
                  categoriesOpen={categoriesOpen}
                  setCategoriesOpen={setCategoriesOpen}
                  categoriesLoading={categoriesLoading}
                  categories={categories}
                  activeCategoryId={activeCategoryId}
                  setActiveCategoryId={setActiveCategoryId}
                />
              ) : (
                <Link key={label} href={href} className="inline-flex items-center gap-2 whitespace-nowrap transition hover:text-orange-600">
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  <span>{label}</span>
                </Link>
              )
            )}
            {UTILITY_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="whitespace-nowrap transition hover:text-orange-600">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden lg:block xl:hidden py-4">
          <div className="flex items-center gap-4">
            <BrandLogo compact />
            {showStickySearch ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  submitSearch(stickySearchQuery)
                }}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-orange-200 bg-white/95 px-3 py-2 shadow-[0_18px_40px_-32px_rgba(249,115,22,0.55)]"
              >
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={stickySearchQuery}
                  onChange={(event) => setStickySearchQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <VisualSearchModal
                  iconOnly
                  label="Image Search"
                  inlinePanel
                  panelClassName="absolute right-0 top-full z-[80] mt-3 w-[min(960px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.32)]"
                  buttonClassName="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                />
              </form>
            ) : null}
            <div className="ml-auto flex items-center gap-3">
              <DeliverTo compact selectedCountry={selectedCountry} onChange={updateDeliveryCountry} />
              <LocaleSelector
                compact
                language={language}
                setLanguage={setLanguage}
                currency={currency}
                setCurrency={updateCurrency}
              />
              <HeaderAuth
                isAuth={isAuth}
                user={user}
                profileOpen={profileOpen}
                setProfileOpen={setProfileOpen}
                notificationsOpen={notificationsOpen}
                setNotificationsOpen={setNotificationsOpen}
                notifications={notifications}
                unreadCount={unreadCount}
                notificationsLoading={notificationsLoading}
                onMarkAllRead={handleMarkAllRead}
                dashboardPath={dashboardPath}
                isBuyer={isBuyer}
                handleLogout={handleLogout}
                t={t}
                compact
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-orange-100/80 pt-4 text-sm font-medium text-slate-700">
            {MARKETPLACE_LINKS.map(({ href, label, icon: Icon }) =>
              label === 'All categories' ? (
                <AllCategoriesMenu
                  key={label}
                  href={href}
                  icon={Icon}
                  categoriesOpen={categoriesOpen}
                  setCategoriesOpen={setCategoriesOpen}
                  categoriesLoading={categoriesLoading}
                  categories={categories}
                  activeCategoryId={activeCategoryId}
                  setActiveCategoryId={setActiveCategoryId}
                  compact
                />
              ) : (
                <Link key={label} href={href} className="inline-flex items-center gap-2 whitespace-nowrap transition hover:text-orange-600">
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  <span>{label}</span>
                </Link>
              )
            )}
            {UTILITY_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="whitespace-nowrap transition hover:text-orange-600">
                {link.label}
              </Link>
            ))}
          </div>

        </div>

        <div className="flex items-center justify-between py-4 lg:hidden">
          <BrandLogo mobile />

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex">
              <DeliverTo compact selectedCountry={selectedCountry} onChange={updateDeliveryCountry} />
            </div>
            <button className="rounded-xl p-2 text-slate-700" onClick={() => setMobileOpen((value) => !value)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-orange-100 bg-white px-4 py-4 shadow-inner xl:hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/50 px-4 py-3">
              <DeliverTo compact selectedCountry={selectedCountry} onChange={updateDeliveryCountry} mobile />
              <LocaleSelector
                mobile
                language={language}
                setLanguage={setLanguage}
                currency={currency}
                setCurrency={updateCurrency}
              />
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                submitSearch(mobileQuery)
                setMobileOpen(false)
              }}
              className="space-y-3 rounded-3xl border border-orange-200 bg-orange-50/40 p-3"
            >
              <input
                type="text"
                value={mobileQuery}
                onChange={(event) => setMobileQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-2xl border border-white bg-white px-4 py-3 text-sm outline-none"
              />
              <div className="flex items-center gap-2">
                <VisualSearchModal
                  label="Image Search"
                  buttonClassName="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                />
                <button type="submit" className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-sm font-semibold text-white">
                  Search
                </button>
              </div>
            </form>

            <div className="grid gap-2 text-sm text-slate-700">
              {MARKETPLACE_LINKS.map((link) => (
                <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-2 hover:bg-orange-50">
                  {link.label}
                </Link>
              ))}
              {UTILITY_LINKS.map((link) => (
                <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-2 hover:bg-orange-50">
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="rounded-[28px] border border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,250,246,0.96)_0%,rgba(255,255,255,0.98)_100%)] p-3 shadow-[0_24px_60px_-42px_rgba(249,115,22,0.45)]">
              <div className="mb-3 px-1">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Categories</p>
                <p className="mt-1 text-xs text-slate-500">Browse parent categories and sub-categories</p>
              </div>
              <div className="space-y-2">
                {categoriesLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl px-3 py-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading categories...
                  </div>
                ) : categories.length ? (
                  categories.map((category) => {
                    const expanded = mobileCategoryId === category.id
                    return (
                      <div
                        key={category.id}
                        className={`overflow-hidden rounded-[24px] border bg-white/95 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.45)] transition ${
                          expanded ? 'border-orange-200' : 'border-white/80'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setMobileCategoryId((current) => (current === category.id ? null : category.id))}
                          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{category.name}</p>
                            <p className="text-xs text-slate-400">
                              {category._count?.products || 0} products • {category.subcategories.length} sub-categories
                            </p>
                          </div>
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                            expanded ? 'border-orange-200 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-400'
                          }`}>
                            <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {expanded ? (
                          <div className="border-t border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,249,244,0.92)_0%,rgba(255,255,255,0.98)_100%)] px-3 py-3">
                            <Link
                              href={`/categories/${category.slug}`}
                              onClick={() => setMobileOpen(false)}
                              className="mb-3 flex items-center justify-between rounded-2xl border border-orange-100 bg-white px-3 py-3 text-sm font-semibold text-orange-700 shadow-[0_14px_32px_-28px_rgba(249,115,22,0.5)]"
                            >
                              <span>View all {category.name}</span>
                              <span className="text-xs uppercase tracking-[0.16em] text-orange-400">Open</span>
                            </Link>
                            <div className="grid gap-2">
                              {category.subcategories.map((subcategory) => (
                                <Link
                                  key={subcategory.id}
                                  href={`/categories/${category.slug}/${subcategory.slug}`}
                                  onClick={() => setMobileOpen(false)}
                                  className="flex items-center justify-between rounded-2xl border border-transparent bg-white/80 px-3 py-3 text-sm text-slate-700 transition hover:border-orange-100 hover:bg-orange-50/70"
                                >
                                  <span className="font-medium">{subcategory.name}</span>
                                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600">
                                    {subcategory._count?.products || 0}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-2xl px-3 py-3 text-sm text-slate-500">No categories available.</div>
                )}
              </div>
            </div>

            {isAuth ? (
              <div className="flex gap-2">
                <Link href={dashboardPath} onClick={() => setMobileOpen(false)} className="flex-1 rounded-full bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white">
                  {t('dashboard')}
                </Link>
                <button onClick={handleLogout} className="rounded-full border border-red-200 px-4 py-3 text-sm font-semibold text-red-600">
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/auth/login" onClick={() => setMobileOpen(false)} className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700">
                  Sign in
                </Link>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)} className="flex-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-center text-sm font-semibold text-white">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}

function BrandLogo({ compact = false, mobile = false }: { compact?: boolean; mobile?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <div className={`flex items-center justify-center rounded-[20px] bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-200/80 ${mobile ? 'h-11 w-11 rounded-2xl' : compact ? 'h-12 w-12' : 'h-14 w-14'}`}>
        <Globe2 className={mobile ? 'h-5 w-5' : compact ? 'h-6 w-6' : 'h-7 w-7'} />
      </div>
      <div className="min-w-0">
        {mobile ? (
          <>
            <p className="text-lg font-black tracking-[-0.04em] text-orange-600">Kaniz Global Trade</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Marketplace</p>
          </>
        ) : compact ? (
          <>
            <p className="text-[24px] font-black leading-none tracking-[-0.05em] text-orange-600">Kaniz Global Trade</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">Marketplace</p>
          </>
        ) : (
          <>
            <p className="text-[30px] font-black leading-none tracking-[-0.05em] text-orange-600">Kaniz Global Trade</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Marketplace</p>
          </>
        )}
      </div>
    </Link>
  )
}

function AllCategoriesMenu({
  href,
  icon: Icon,
  categoriesOpen,
  setCategoriesOpen,
  categoriesLoading,
  categories,
  activeCategoryId,
  setActiveCategoryId,
  compact = false,
}: {
  href: string
  icon?: typeof Menu
  categoriesOpen: boolean
  setCategoriesOpen: React.Dispatch<React.SetStateAction<boolean>>
  categoriesLoading: boolean
  categories: NavbarCategory[]
  activeCategoryId: string | null
  setActiveCategoryId: React.Dispatch<React.SetStateAction<string | null>>
  compact?: boolean
}) {
  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) ||
    categories[0] ||
    null

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        setCategoriesOpen(true)
        if (!activeCategoryId && categories[0]) setActiveCategoryId(categories[0].id)
      }}
      onMouseLeave={() => setCategoriesOpen(false)}
    >
      <Link
        href={href}
        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 transition ${
          categoriesOpen ? 'bg-white text-orange-600 shadow-[0_16px_36px_-28px_rgba(249,115,22,0.55)]' : 'hover:text-orange-600'
        }`}
      >
        {Icon ? <Icon className="h-4 w-4" /> : null}
        <span>All categories</span>
      </Link>

      {categoriesOpen ? (
        <div className={`absolute left-0 top-full z-[70] mt-3 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_90px_-44px_rgba(15,23,42,0.3)] transition-all duration-200 ${compact ? 'w-[880px]' : 'w-[1040px]'} max-w-[calc(100vw-3rem)]`}>
          <div className="grid min-h-[430px] grid-cols-[300px_minmax(0,1fr)]">
            <div className="border-r border-slate-200 bg-slate-50/75 p-4">
              <div className="mb-4 border-b border-slate-200 px-2 pb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Marketplace menu</p>
                <h3 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-slate-950">Categories for you</h3>
              </div>

              <div className="max-h-[352px] space-y-1.5 overflow-y-auto pr-1">
                {categoriesLoading ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-3 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading categories...
                  </div>
                ) : categories.length ? (
                  categories.map((category) => {
                    const isActive = activeCategory?.id === category.id
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onMouseEnter={() => setActiveCategoryId(category.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-[18px] border-l-4 px-4 py-3 text-left transition ${
                          isActive
                            ? 'border-l-slate-900 bg-white text-slate-950 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.3)]'
                            : 'border-l-transparent border-y-transparent border-r-transparent bg-transparent text-slate-700 hover:bg-white hover:text-slate-950'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-semibold">{category.name}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {category._count?.products || 0} products • {category.subcategories.length} sub-categories
                          </p>
                        </div>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                          isActive ? 'bg-slate-100 text-slate-700' : 'text-slate-300'
                        }`}>
                          <ChevronDown className="h-4 w-4 -rotate-90" />
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-500">No categories available.</div>
                )}
              </div>
            </div>

            <div className="bg-white p-6">
              {activeCategory ? (
                <div className="h-full">
                  <div className="mb-5 flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Categories for you</p>
                      <h3 className="mt-2 text-[32px] font-black tracking-[-0.05em] text-slate-950">{activeCategory.name}</h3>
                    </div>
                    <Link href={`/categories/${activeCategory.slug}`} className="text-sm font-semibold text-slate-700 hover:text-orange-600">
                      Browse featured selections
                    </Link>
                  </div>

                  {activeCategory.subcategories.length ? (
                    <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-3 xl:grid-cols-4">
                      {activeCategory.subcategories.map((subcategory) => (
                        <Link
                          key={subcategory.id}
                          href={`/categories/${activeCategory.slug}/${subcategory.slug}`}
                          className="group flex flex-col items-center text-center"
                        >
                          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_78%)] shadow-[0_16px_32px_-24px_rgba(15,23,42,0.25)] transition group-hover:-translate-y-0.5 group-hover:border-orange-200 group-hover:shadow-[0_20px_40px_-24px_rgba(249,115,22,0.3)] md:h-28 md:w-28">
                            {activeCategory.image ? (
                              <img src={activeCategory.image} alt={subcategory.name} className="h-full w-full object-cover" />
                            ) : (
                              <Globe2 className="h-8 w-8 text-slate-400 transition group-hover:text-orange-500" />
                            )}
                          </div>
                          <p className="mt-3 line-clamp-2 text-[15px] font-semibold text-slate-900 transition group-hover:text-orange-600">
                            {subcategory.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">{subcategory._count?.products || 0} products</p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-[280px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                      No sub-categories available under this category yet.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Hover a category to explore sub-categories.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DeliverTo({
  compact = false,
  mobile = false,
  selectedCountry,
  onChange,
}: {
  compact?: boolean
  mobile?: boolean
  selectedCountry: CountryOption
  onChange: (code: CountryOption['code']) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return COUNTRIES
    return COUNTRIES.filter((country) =>
      country.name.toLowerCase().includes(query) || country.code.toLowerCase().includes(query)
    )
  }, [search])

  return (
    <div className={`relative ${mobile ? 'w-full' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-3 rounded-full border border-orange-100 bg-white shadow-sm transition hover:border-orange-200 ${compact ? 'px-3 py-2' : 'px-4 py-2'} ${mobile ? 'w-full justify-between' : ''}`}
      >
        <div className="flex items-center gap-3">
          <MapPin className="h-4 w-4 text-orange-500" />
          <div className="flex items-center gap-2 leading-none">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Deliver to</span>
            <CountryFlag code={selectedCountry.code} />
            <span className={`font-semibold text-slate-800 ${compact ? 'text-sm' : ''}`}>{selectedCountry.code}</span>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className={`absolute z-50 mt-2 rounded-2xl border border-orange-100 bg-white p-2 shadow-xl ${mobile ? 'left-0 right-0' : 'right-0 min-w-[280px]'} max-h-[360px] overflow-hidden`}>
          <div className="p-1">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search country..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
            />
          </div>
          <div className="mt-1 max-h-[290px] overflow-y-auto">
            {filteredCountries.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => {
                onChange(country.code)
                setOpen(false)
                setSearch('')
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-orange-50 ${selectedCountry.code === country.code ? 'bg-orange-50 text-orange-700' : 'text-slate-700'}`}
            >
              <CountryFlag code={country.code} />
              <span className="font-semibold">{country.code}</span>
              <span className="truncate text-slate-500">{country.name}</span>
            </button>
            ))}
            {!filteredCountries.length ? (
              <div className="px-3 py-4 text-sm text-slate-500">No country found.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function CountryFlag({ code }: { code: CountryOption['code'] }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={`${code} flag`}
      className="h-3.5 w-5 rounded-[2px] object-cover shadow-sm"
      loading="lazy"
    />
  )
}

function LocaleSelector({
  compact = false,
  mobile = false,
  language,
  setLanguage,
  currency,
  setCurrency,
}: {
  compact?: boolean
  mobile?: boolean
  language: (typeof SUPPORTED_LANGUAGES)[number]
  setLanguage: (language: (typeof SUPPORTED_LANGUAGES)[number]) => void
  currency: (typeof CURRENCIES)[number]
  setCurrency: (currency: (typeof CURRENCIES)[number]) => void
}) {
  const [open, setOpen] = useState(false)
  const [languageSearch, setLanguageSearch] = useState('')
  const [currencySearch, setCurrencySearch] = useState('')

  const filteredLanguages = useMemo(() => {
    const query = languageSearch.trim().toLowerCase()
    if (!query) return SUPPORTED_LANGUAGES
    return SUPPORTED_LANGUAGES.filter((item) =>
      (LANGUAGE_LABELS[item] || item).toLowerCase().includes(query) || item.toLowerCase().includes(query)
    )
  }, [languageSearch])

  const filteredCurrencies = useMemo(() => {
    const query = currencySearch.trim().toLowerCase()
    if (!query) return CURRENCIES
    return CURRENCIES.filter((item) => item.toLowerCase().includes(query))
  }, [currencySearch])

  return (
    <div className={`relative ${mobile ? 'w-auto min-w-[180px]' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-2 rounded-full border border-orange-100 bg-white text-slate-600 shadow-sm transition hover:border-orange-200 ${mobile ? 'px-3 py-2' : compact ? 'px-3 py-2' : 'px-4 py-2'}`}
      >
        <Globe2 className="h-4 w-4 flex-shrink-0" />
        <span className={`${mobile || compact ? 'text-sm' : 'text-sm font-medium'}`}>{LANGUAGE_LABELS[language] || language.toUpperCase()}</span>
        <span className="text-slate-300">|</span>
        <span className={`${mobile || compact ? 'text-sm' : 'text-sm font-medium'}`}>{currency}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className={`absolute z-50 mt-2 rounded-2xl border border-orange-100 bg-white p-3 shadow-xl ${mobile ? 'right-0 w-[320px] max-w-[calc(100vw-2rem)]' : 'right-0 w-[360px]'}`}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Language</p>
              <input
                type="text"
                value={languageSearch}
                onChange={(event) => setLanguageSearch(event.target.value)}
                placeholder="Search language..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 p-1">
                {filteredLanguages.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLanguage(item)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-orange-50 ${language === item ? 'bg-orange-50 text-orange-700' : 'text-slate-700'}`}
                  >
                    <span>{LANGUAGE_LABELS[item] || item.toUpperCase()}</span>
                    <span className="text-xs text-slate-400">{item.toUpperCase()}</span>
                  </button>
                ))}
                {!filteredLanguages.length ? <div className="px-3 py-4 text-sm text-slate-500">No language found.</div> : null}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Currency</p>
              <input
                type="text"
                value={currencySearch}
                onChange={(event) => setCurrencySearch(event.target.value)}
                placeholder="Search currency..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 p-1">
                {filteredCurrencies.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrency(item)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-orange-50 ${currency === item ? 'bg-orange-50 text-orange-700' : 'text-slate-700'}`}
                  >
                    <span>{item}</span>
                    <span className="text-xs text-slate-400">Currency</span>
                  </button>
                ))}
                {!filteredCurrencies.length ? <div className="px-3 py-4 text-sm text-slate-500">No currency found.</div> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function HeaderAuth({
  isAuth,
  user,
  profileOpen,
  setProfileOpen,
  notificationsOpen,
  setNotificationsOpen,
  notifications,
  unreadCount,
  notificationsLoading,
  onMarkAllRead,
  dashboardPath,
  isBuyer,
  handleLogout,
  t,
  compact = false,
}: {
  isAuth: boolean
  user: { firstName: string; lastName: string; email: string } | null
  profileOpen: boolean
  setProfileOpen: React.Dispatch<React.SetStateAction<boolean>>
  notificationsOpen: boolean
  setNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>
  notifications: Array<{ id: string; title: string; message: string; isRead: boolean; createdAt: string }>
  unreadCount: number
  notificationsLoading: boolean
  onMarkAllRead: () => Promise<void>
  dashboardPath: string
  isBuyer: boolean
  handleLogout: () => Promise<void>
  t: (key: string) => string
  compact?: boolean
}) {
  const notificationRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!notificationsOpen) return

    function handleOutsideClick(event: MouseEvent) {
      if (!notificationRef.current) return
      if (!notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setNotificationsOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [notificationsOpen, setNotificationsOpen])

  if (!isAuth) {
    return (
      <>
        <Link href="/auth/login" className="whitespace-nowrap text-sm font-medium text-slate-700 transition hover:text-orange-600">
          Sign in
        </Link>
        <Link
          href="/auth/register"
          className={`whitespace-nowrap rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-sm font-semibold text-white shadow-lg shadow-orange-200 ${compact ? 'px-4 py-2.5' : 'px-5 py-2.5'}`}
        >
          Sign up
        </Link>
      </>
    )
  }

  return (
    <>
      {!compact ? (
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((value) => !value)}
            className="relative rounded-full p-2 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          {notificationsOpen ? (
            <div className="fixed right-6 top-24 z-[80] w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-orange-100 bg-white p-2 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  <p className="text-xs text-slate-500">{unreadCount} unread</p>
                </div>
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notificationsLoading ? (
                  <div className="px-3 py-6 text-sm text-slate-500">Loading notifications...</div>
                ) : notifications.length ? (
                  notifications.map((item) => (
                    <Link
                      key={item.id}
                      href="/notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className={`block rounded-xl px-3 py-3 transition hover:bg-orange-50 ${item.isRead ? 'text-slate-600' : 'bg-orange-50/60 text-slate-900'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.message}</p>
                        </div>
                        {!item.isRead ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" /> : null}
                      </div>
                      <p className="mt-2 text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                    </Link>
                  ))
                ) : (
                  <div className="px-3 py-6 text-sm text-slate-500">No notifications yet.</div>
                )}
              </div>

              <div className="border-t border-slate-100 px-3 py-2">
                <Link href="/notifications" onClick={() => setNotificationsOpen(false)} className="text-sm font-semibold text-orange-600 hover:text-orange-700">
                  View all notifications
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <button
          onClick={() => setProfileOpen((value) => !value)}
          className={`flex items-center rounded-full border border-orange-100 bg-white shadow-sm transition hover:border-orange-200 ${compact ? 'gap-2 px-2.5 py-2' : 'gap-3 px-3 py-2'}`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white">
            {user?.firstName[0]}{user?.lastName[0]}
          </div>
          <span className={`truncate text-sm font-semibold text-slate-800 ${compact ? 'hidden 2xl:inline max-w-20' : 'max-w-24'}`}>{user?.firstName}</span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {profileOpen ? (
          <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-orange-100 bg-white p-2 shadow-xl">
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
            <Link
              href={dashboardPath}
              onClick={() => setProfileOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
            >
              <LayoutDashboard className="h-4 w-4" /> {t('dashboard')}
            </Link>
            <Link
              href={isBuyer ? '/buyer/profile' : '/dashboard/profile'}
              onClick={() => setProfileOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
            >
              <User className="h-4 w-4" /> Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        ) : null}
      </div>
    </>
  )
}
