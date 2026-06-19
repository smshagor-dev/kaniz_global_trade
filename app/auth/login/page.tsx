'use client'

import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { post } from '@/lib/utils/api-client'
import { useAuthStore } from '@/store/auth'
import { Globe2, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const schema = z.object({
  email:          z.string().email('Invalid email'),
  password:       z.string().min(1, 'Password required'),
  twoFactorCode:  z.string().optional(),
})
type FormData = z.infer<typeof schema>

function LoginPageContent() {
  const router      = useRouter()
  const params      = useSearchParams()
  const { setAuth } = useAuthStore()
  const [showPass, setShowPass]   = useState(false)
  const [needs2FA, setNeeds2FA]   = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
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

      const redirect = params.get('redirect')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 p-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl mb-2">
            <Globe2 className="w-7 h-7" /> Kaniz Global Trade
          </Link>
          <p className="text-blue-200 text-sm">Sign in to your account</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                {...register('email')}
                type="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="you@company.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-blue-700 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent pr-11"
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

            {needs2FA && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Two-Factor Code</label>
                <input
                  {...register('twoFactorCode')}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-center text-lg tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-700 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-blue-700 font-semibold hover:underline">
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
