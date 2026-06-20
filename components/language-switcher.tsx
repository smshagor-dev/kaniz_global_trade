'use client'

import { Languages } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t, availableLanguages } = useLanguage()

  return (
    <label className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-600`}>
      <Languages className="w-4 h-4" />
      {!compact && <span>{t('language')}</span>}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
      >
        {availableLanguages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.nativeName || item.name || item.code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  )
}
