'use client'

import { Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { post } from '@/lib/utils/api-client'
import { useAuthStore } from '@/store/auth'
import { getDefaultRouteForRoles } from '@/lib/auth/redirect'
import { Globe2, Eye, EyeOff, Building2, ShoppingBag } from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'
import toast from 'react-hot-toast'

const schema = z.object({
  firstName: z.string().min(2, 'Min 2 characters'),
  lastName:  z.string().min(2, 'Min 2 characters'),
  email:     z.string().email('Invalid email'),
  password:  z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase and number'),
  confirmPassword: z.string(),
  companyName: z.string().optional(),
  role:      z.enum(['BUYER', 'SUPPLIER_OWNER']),
  terms:     z.boolean().refine((v) => v, 'You must accept the terms'),
}).superRefine((d, ctx) => {
  if (d.password !== d.confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Passwords don't match", path: ['confirmPassword'] })
  }
  if (d.role === 'SUPPLIER_OWNER' && (!d.companyName || d.companyName.trim().length < 2)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Company name is required for suppliers', path: ['companyName'] })
  }
})

type FormData = z.infer<typeof schema>

function RegisterPageContent() {
  const router      = useRouter()
  const params      = useSearchParams()
  const [showPass, setShowPass] = useState(false)
  const { user: currentUser, setAuth } = useAuthStore()
  const defaultRole = (params.get('role') as 'BUYER' | 'SUPPLIER_OWNER') || 'BUYER'
  const selectedPackage = params.get('plan')

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole, terms: false, companyName: '' },
  })

  const role = watch('role')

  useEffect(() => {
    if (!currentUser) return
    router.replace(getDefaultRouteForRoles(currentUser.roles))
  }, [currentUser, router])

  async function onSubmit(data: FormData) {
    try {
      const response = await post<{
        accessToken: string
        refreshToken: string
        redirectTo: string
        user: { id: string; email: string; firstName: string; lastName: string; avatar?: string | null; roles: string[]; emailVerified?: string | null; status: string }
      }>('/auth/register', {
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        password:  data.password,
        companyName: data.role === 'SUPPLIER_OWNER' ? data.companyName : undefined,
        packageSlug: data.role === 'SUPPLIER_OWNER' ? selectedPackage || undefined : undefined,
        role:      data.role,
      })
      setAuth(response.data!.user, response.data!.accessToken, response.data!.refreshToken)
      toast.success(data.role === 'SUPPLIER_OWNER' ? 'Supplier account created. Finish your package setup next.' : 'Account created! Please verify your email.')
      router.push(response.data!.redirectTo)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed'
      toast.error(msg)
    }
  }

  if (currentUser) {
    return <div className="min-h-screen bg-slate-100" />
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
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,_#f97316_0%,_#fb923c_42%,_#ef4444_100%)] p-8 text-center">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 14px)' }} />
          <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl mb-2">
            <Globe2 className="w-7 h-7" /> Kaniz Global Trade
          </Link>
          <p className="relative z-10 text-base font-semibold text-white drop-shadow-sm">Create your textile sourcing and export account</p>
        </div>

        <div className="p-8">
          {role === 'SUPPLIER_OWNER' && selectedPackage ? (
            <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Selected package</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedPackage.replace(/-/g, ' ')}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                We will take you to package checkout right after supplier registration.
              </p>
            </div>
          ) : null}

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { value: 'BUYER',          icon: ShoppingBag, label: 'I\'m a Buyer',   desc: 'Find products & suppliers' },
              { value: 'SUPPLIER_OWNER', icon: Building2,   label: 'I\'m a Supplier', desc: 'List products & sell' },
            ].map(({ value, icon: Icon, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('role', value as 'BUYER' | 'SUPPLIER_OWNER')}
                className={`border-2 rounded-xl p-3 text-center transition-colors ${
                  role === value
                    ? 'border-orange-500 bg-orange-50 shadow-[0_18px_36px_-28px_rgba(249,115,22,0.45)]'
                    : 'border-slate-300 bg-white/88 hover:border-orange-200 hover:bg-white'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-1 ${role === value ? 'text-orange-600' : 'text-slate-500'}`} />
                <p className={`text-sm font-semibold ${role === value ? 'text-orange-600' : 'text-slate-800'}`}>{label}</p>
                <p className={`text-xs font-medium ${role === value ? 'text-slate-600' : 'text-slate-600'}`}>{desc}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {role === 'SUPPLIER_OWNER' ? (
              <div>
                <input {...register('companyName')} className={inp} placeholder="Company Name" />
                {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input {...register('firstName')} className={inp} placeholder="First Name" />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <input {...register('lastName')} className={inp} placeholder="Last Name" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <input {...register('email')} type="email" className={inp} placeholder="Email address" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className={`${inp} pr-11`}
                  placeholder="Password (min 8 chars)"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <input {...register('confirmPassword')} type="password" className={inp} placeholder="Confirm password" />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" {...register('terms')} className="mt-0.5 rounded text-blue-600" />
              <span className="text-xs font-medium text-slate-800">
                I agree to the{' '}
                <Link href="/terms" className="text-orange-600 hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-orange-600 hover:underline">Privacy Policy</Link>
              </span>
            </label>
            {errors.terms && <p className="text-red-500 text-xs">{errors.terms.message}</p>}

            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText="Creating Account..."
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl py-3.5 text-sm font-semibold hover:opacity-95 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              Create Account
            </LoadingButton>
          </form>

          <p className="text-center text-sm font-medium text-slate-700 mt-5">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-orange-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900" />}>
      <RegisterPageContent />
    </Suspense>
  )
}

const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent'
