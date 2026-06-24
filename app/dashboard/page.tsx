'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { get } from '@/lib/utils/api-client'
import { useIsAuthenticated, useIsSupplier } from '@/store/auth'

export default function DashboardRootPage() {
  const router = useRouter()
  const isAuth = useIsAuthenticated()
  const isSupplier = useIsSupplier()
  const { data, isLoading } = useQuery({
    queryKey: ['supplier-dashboard-root-access'],
    queryFn: () => get<{ defaultHref: string }>('/company-staff/access'),
    enabled: isAuth && isSupplier,
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    if (!isAuth || !isSupplier || isLoading || !data?.data?.defaultHref) return
    router.replace(data.data.defaultHref)
  }, [data, isAuth, isLoading, isSupplier, router])

  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
}
