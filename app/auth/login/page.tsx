'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { post } from '@/lib/utils/api-client'
import { useAuthStore } from '@/store/auth'
import { Globe2, Eye, EyeOff } from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'
import toast from 'react-hot-toast'

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@kanizglobaltrade.com', password: 'Admin@123456' },
  { role: 'Supplier', email: 'supplier@kanizglobaltrade.com', password: 'Supplier@123456' },
  { role: 'Buyer', email: 'buyer@kanizglobaltrade.com', password: 'Buyer@123456' },
] as const

const schema = z.object({
  email:          z.string().email('Invalid email'),
  password:       z.string().min(1, 'Password required'),
  twoFactorCode:  z.string().optional(),
  rememberMe:     z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

interface SocialProvidersResponse {
  google: { enabled: boolean }
  facebook: { enabled: boolean }
}

function LoginPageContent() {
  const router      = useRouter()
  const params      = useSearchParams()
  const { setAuth, rememberMe: savedRememberMe, setRememberMe } = useAuthStore()
  const [showPass, setShowPass]   = useState(false)
  const [needs2FA, setNeeds2FA]   = useState(false)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      rememberMe: savedRememberMe,
    },
  })
  const { data: socialProviders } = useQuery({
    queryKey: ['social-providers'],
    queryFn: async () => {
      const response = await fetch('/api/auth/social-providers', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to load social providers')
      return response.json() as Promise<{ data?: SocialProvidersResponse }>
    },
  })

  const redirect = params.get('redirect')
  const socialUrl = useMemo(
    () => ({
      google: `/api/auth/oauth/google${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`,
      facebook: `/api/auth/oauth/facebook${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`,
    }),
    [redirect]
  )

  useEffect(() => {
    const socialError = params.get('error')
    if (socialError) {
      toast.error(socialError)
    }
  }, [params])

  async function onSubmit(data: FormData) {
    try {
      setRememberMe(data.rememberMe)
      const resp = await post<{
        accessToken?: string; refreshToken?: string
        requiresTwoFactor?: boolean
        user?: { id: string; email: string; firstName: string; lastName: string; avatar?: string; roles: string[]; emailVerified?: string; status: string }
      }>('/auth/login', data)

      if (resp.data?.requiresTwoFactor) {
        setNeeds2FA(true)
        return
      }

      const { accessToken, refreshToken, user } = resp.data!
      setAuth(user!, accessToken!, refreshToken!)

      toast.success(`Welcome back, ${user!.firstName}!`)

      if (redirect) { router.push(redirect); return }

      const roles = user!.roles
      if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN') || roles.includes('MODERATOR')) router.push('/admin')
      else if (roles.includes('SUPPLIER_OWNER') || roles.includes('SUPPLIER_STAFF')) router.push('/dashboard')
      else router.push('/buyer')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed'
      toast.error(msg)
    }
  }

  function fillDemoAccount(account: (typeof DEMO_ACCOUNTS)[number]) {
    setValue('email', account.email, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    setValue('password', account.password, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    setNeeds2FA(false)
    toast.success(`${account.role} demo credentials inserted`)
  }

  return (
    <div className="relative overflow-hidden bg-slate-100 flex items-center justify-center p-4 py-8 md:py-10">
      <div
        className="pointer-events-none absolute inset-0 scale-[1.02] bg-cover bg-center bg-no-repeat blur-[2px]"
        style={{ backgroundImage: "url('/auth-b2b-bg.svg')" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,240,0.72)_0%,rgba(255,244,235,0.66)_42%,rgba(248,250,252,0.74)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.16),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.46)_0%,rgba(15,23,42,0.3)_100%)]" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white/97 shadow-[0_32px_90px_-42px_rgba(15,23,42,0.45)] backdrop-blur-md">
        {/* Header */}
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,_#f97316_0%,_#fb923c_42%,_#ef4444_100%)] p-8 text-center">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 14px)' }} />
          <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl mb-2">
            <Globe2 className="w-7 h-7" /> Kaniz Global Trade
          </Link>
          <p className="relative z-10 text-base font-semibold text-white drop-shadow-sm">Sign in to your textile and trade workspace</p>
        </div>

        <div className="p-8">
          <div className="mb-5 rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">Demo Login</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Select a role and the form will auto-fill the demo email and password.
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600">
                Demo
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => fillDemoAccount(account)}
                  className="rounded-xl border border-orange-200 bg-white px-3 py-3 text-left transition hover:border-orange-300 hover:bg-orange-100/50"
                >
                  <p className="text-sm font-semibold text-slate-900">{account.role}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{account.email}</p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {(socialProviders?.data?.google?.enabled || socialProviders?.data?.facebook?.enabled) ? (
              <div className="space-y-3">
                {socialProviders?.data?.google?.enabled ? (
                  <a
                    href={socialUrl.google}
                    className="flex w-full items-center justify-center rounded-xl border border-orange-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-orange-50"
                  >
                    Continue with Google
                  </a>
                ) : null}
                {socialProviders?.data?.facebook?.enabled ? (
                  <a
                    href={socialUrl.facebook}
                    className="flex w-full items-center justify-center rounded-xl border border-[#1877F2] bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#166fe5]"
                  >
                    Continue with Facebook
                  </a>
                ) : null}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-gray-400">
                    <span className="bg-white px-3">Or</span>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">Email Address</label>
              <input
                {...register('email')}
                type="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                placeholder="you@company.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-bold text-slate-900">Password</label>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent pr-11"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span>Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-sm font-semibold text-orange-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            {needs2FA && (
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Two-Factor Code</label>
                <input
                  {...register('twoFactorCode')}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent text-center text-lg tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            )}

            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText="Signing In..."
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl py-3.5 text-sm font-semibold hover:opacity-95 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              Sign In
            </LoadingButton>
          </form>

          <p className="text-center text-sm font-medium text-slate-700 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-orange-600 font-semibold hover:underline">
              Register free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900" />}>
      <LoginPageContent />
    </Suspense>
  )
}
