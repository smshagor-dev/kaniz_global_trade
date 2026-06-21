'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Eye, EyeOff, X } from 'lucide-react'
import { post } from '@/lib/utils/api-client'
import { useAuthStore } from '@/store/auth'
import { LoadingButton } from '@/components/ui/loading-button'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
  twoFactorCode: z.string().optional(),
  rememberMe: z.boolean().default(true),
})

type FormData = z.infer<typeof schema>

type SocialProvidersResponse = {
  google: { enabled: boolean }
  facebook: { enabled: boolean }
}

type LoginModalProps = {
  open: boolean
  onClose: () => void
  redirectPath?: string
}

export function LoginModal({ open, onClose, redirectPath }: LoginModalProps) {
  const router = useRouter()
  const { setAuth, rememberMe: savedRememberMe, setRememberMe } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [needs2FA, setNeeds2FA] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
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
    enabled: open,
  })

  const socialUrl = useMemo(() => ({
    google: `/api/auth/oauth/google${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`,
    facebook: `/api/auth/oauth/facebook${redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`,
  }), [redirectPath])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose, open])

  useEffect(() => {
    if (!open) {
      setNeeds2FA(false)
      setShowPass(false)
      reset({ email: '', password: '', twoFactorCode: '', rememberMe: savedRememberMe })
    }
  }, [open, reset, savedRememberMe])

  async function onSubmit(data: FormData) {
    try {
      setRememberMe(data.rememberMe)
      const response = await post<{
        accessToken?: string
        refreshToken?: string
        requiresTwoFactor?: boolean
        user?: { id: string; email: string; firstName: string; lastName: string; avatar?: string | null; roles: string[]; emailVerified?: string | null; status: string }
      }>('/auth/login', data)

      if (response.data?.requiresTwoFactor) {
        setNeeds2FA(true)
        toast.success('Enter your 2FA code to continue')
        return
      }

      const { accessToken, refreshToken, user } = response.data || {}
      if (!accessToken || !refreshToken || !user) {
        toast.error('Login failed')
        return
      }

      setAuth(user, accessToken, refreshToken)
      toast.success(`Welcome back, ${user.firstName}!`)
      onClose()
      router.refresh()
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed'
      toast.error(message)
    }
  }

  if (!open) return null
  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,rgba(255,247,237,0.98)_0%,rgba(255,255,255,0.98)_45%,rgba(239,246,255,0.98)_100%)] shadow-[0_40px_120px_-48px_rgba(15,23,42,0.65)]">
        <div className="relative flex flex-col items-center p-6 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            data-skip-loading="true"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-orange-200 hover:text-orange-600"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="w-full text-center">
            <h3 className="text-3xl font-black tracking-[-0.04em] text-slate-950">Welcome back</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to continue.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 w-full max-w-sm space-y-4">
              {(socialProviders?.data?.google?.enabled || socialProviders?.data?.facebook?.enabled) ? (
                <div className="space-y-3">
                  {socialProviders?.data?.google?.enabled ? (
                    <a
                      href={socialUrl.google}
                      className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Continue with Google
                    </a>
                  ) : null}
                  {socialProviders?.data?.facebook?.enabled ? (
                    <a
                      href={socialUrl.facebook}
                      className="flex w-full items-center justify-center rounded-2xl border border-[#1877F2] bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#166fe5]"
                    >
                      Continue with Facebook
                    </a>
                  ) : null}
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                      <span className="bg-white px-3">Or</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email Address</label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-300"
                  placeholder="you@company.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPass ? 'text' : 'password'}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-11 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-300"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    {...register('rememberMe')}
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span>Remember me</span>
                </label>
                <Link href="/auth/forgot-password" onClick={onClose} className="text-sm font-medium text-orange-600 hover:text-orange-700">
                  Forgot password?
                </Link>
              </div>

              {needs2FA ? (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Two-Factor Code</label>
                  <input
                    {...register('twoFactorCode')}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-lg tracking-widest outline-none transition focus:border-transparent focus:ring-2 focus:ring-orange-300"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
              ) : null}

              <LoadingButton
                type="submit"
                loading={isSubmitting}
                loadingText="Signing In..."
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-blue-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:opacity-95 disabled:opacity-60"
              >
                Sign In
              </LoadingButton>
          </form>

          <p className="mt-6 w-full text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" onClick={onClose} className="font-semibold text-orange-600 hover:text-orange-700">
              Register free
            </Link>
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
