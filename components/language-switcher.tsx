'use client'

import { Languages } from 'lucide-react'
import { SUPPORTED_LANGUAGES, useLanguage } from '@/lib/i18n'

const labels: Record<string, string> = {
  en: 'English',
  zh: '中文',
  ar: 'العربية',
  es: 'Español',
  nl: 'Nederlands',
  pt: 'Português',
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage()

  return (
    <label className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-600`}>
      <Languages className="w-4 h-4" />
      {!compact && <span>{t('language')}</span>}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as (typeof SUPPORTED_LANGUAGES)[number])}
        className="border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
      >
        {SUPPORTED_LANGUAGES.map((item) => (
          <option key={item} value={item}>
            {labels[item]}
          </option>
        ))}
      </select>
    </label>
  )
}
