'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth'
import { getDefaultRouteForRoles } from '@/lib/auth/redirect'

export default function SocialAuthPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    const error = params.get('error')
    if (error) {
      toast.error(error)
      router.replace('/auth/login')
      return
    }

    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
    const payload = new URLSearchParams(hash)
    const accessToken = payload.get('accessToken')
    const refreshToken = payload.get('refreshToken')
    const userParam = payload.get('user')

    if (!accessToken || !refreshToken || !userParam) {
      toast.error('Social login payload missing')
      router.replace('/auth/login')
      return
    }

    const user = JSON.parse(decodeURIComponent(userParam)) as {
      id: string
      email: string
      firstName: string
      lastName: string
      avatar?: string | null
      roles: string[]
      emailVerified?: string | null
      status: string
    }

    setAuth(user, accessToken, refreshToken)
    toast.success(`Welcome, ${user.firstName}!`)

    const redirect = params.get('redirect')
    if (redirect) {
      router.replace(redirect)
      return
    }

    router.replace(getDefaultRouteForRoles(user.roles))
  }, [params, router, setAuth])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Completing sign in...</h1>
        <p className="mt-2 text-sm text-slate-500">We are securely connecting your social account.</p>
      </div>
    </div>
  )
}
