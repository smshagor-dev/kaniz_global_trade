'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, useState } from 'react'
import { LanguageProvider } from '@/lib/i18n'
import { CurrencyProvider } from '@/lib/currency/client'
import { GlobalLoadingIndicator } from '@/components/global-loading-indicator'
import { AppBootLoader } from '@/components/app-boot-loader'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <CurrencyProvider>
          <AppBootLoader />
          <Suspense fallback={null}>
            <GlobalLoadingIndicator />
          </Suspense>
          {children}
        </CurrencyProvider>
      </LanguageProvider>
    </QueryClientProvider>
  )
}
