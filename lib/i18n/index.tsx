'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const SUPPORTED_LANGUAGES = ['en', 'zh', 'ar', 'es', 'nl', 'pt'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

const dictionaries: Record<Language, Record<string, string>> = {
  en: {
    products: 'Products',
    suppliers: 'Suppliers',
    rfq: 'RFQ',
    compare: 'Compare',
    aiMatching: 'AI Matching',
    virtualTours: 'Virtual Tours',
    signIn: 'Sign In',
    register: 'Register Free',
    dashboard: 'Dashboard',
    sampleOrders: 'Sample Orders',
    shipments: 'Shipments',
    tradeAssurance: 'Trade Assurance',
    browseProducts: 'Browse Products',
    language: 'Language',
  },
  zh: {
    products: '产品',
    suppliers: '供应商',
    rfq: '询价',
    compare: '比较',
    aiMatching: '智能匹配',
    virtualTours: '工厂视频',
    signIn: '登录',
    register: '免费注册',
    dashboard: '控制台',
    sampleOrders: '样品订单',
    shipments: '物流',
    tradeAssurance: '交易保障',
    browseProducts: '浏览产品',
    language: '语言',
  },
  ar: {
    products: 'المنتجات',
    suppliers: 'الموردون',
    rfq: 'طلب عرض سعر',
    compare: 'مقارنة',
    aiMatching: 'مطابقة ذكية',
    virtualTours: 'جولات المصنع',
    signIn: 'تسجيل الدخول',
    register: 'سجل مجانا',
    dashboard: 'لوحة التحكم',
    sampleOrders: 'طلبات العينات',
    shipments: 'الشحنات',
    tradeAssurance: 'ضمان التجارة',
    browseProducts: 'تصفح المنتجات',
    language: 'اللغة',
  },
  es: {
    products: 'Productos',
    suppliers: 'Proveedores',
    rfq: 'RFQ',
    compare: 'Comparar',
    aiMatching: 'Coincidencia IA',
    virtualTours: 'Tours Virtuales',
    signIn: 'Iniciar sesión',
    register: 'Registro gratis',
    dashboard: 'Panel',
    sampleOrders: 'Pedidos de muestra',
    shipments: 'Envíos',
    tradeAssurance: 'Garantía comercial',
    browseProducts: 'Explorar productos',
    language: 'Idioma',
  },
  nl: {
    products: 'Producten',
    suppliers: 'Leveranciers',
    rfq: 'RFQ',
    compare: 'Vergelijken',
    aiMatching: 'AI-matching',
    virtualTours: 'Virtuele Tours',
    signIn: 'Inloggen',
    register: 'Gratis registreren',
    dashboard: 'Dashboard',
    sampleOrders: 'Sample orders',
    shipments: 'Zendingen',
    tradeAssurance: 'Handelszekerheid',
    browseProducts: 'Producten bekijken',
    language: 'Taal',
  },
  pt: {
    products: 'Produtos',
    suppliers: 'Fornecedores',
    rfq: 'RFQ',
    compare: 'Comparar',
    aiMatching: 'Correspondência IA',
    virtualTours: 'Tours Virtuais',
    signIn: 'Entrar',
    register: 'Registrar grátis',
    dashboard: 'Painel',
    sampleOrders: 'Pedidos de amostra',
    shipments: 'Envios',
    tradeAssurance: 'Garantia comercial',
    browseProducts: 'Ver produtos',
    language: 'Idioma',
  },
}

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('kgt-language') : null
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      setLanguageState(stored as Language)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('kgt-language', language)
      document.documentElement.lang = language
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    }
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      t: (key: string) => dictionaries[language][key] || dictionaries.en[key] || key,
    }),
    [language]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
