'use client'

import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { post } from '@/lib/utils/api-client'
import { Globe2, Eye, EyeOff, Building2, ShoppingBag } from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'
import toast from 'react-hot-toast'

const schema = z.object({
  firstName: z.string().min(2, 'Min 2 characters'),
  lastName:  z.string().min(2, 'Min 2 characters'),
  email:     z.string().email('Invalid email'),
  password:  z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase and number'),
  confirmPassword: z.string(),
  role:      z.enum(['BUYER', 'SUPPLIER_OWNER']),
  terms:     z.boolean().refine((v) => v, 'You must accept the terms'),
}).refine((d) => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] })

type FormData = z.infer<typeof schema>

function RegisterPageContent() {
  const router      = useRouter()
  const params      = useSearchParams()
  const [showPass, setShowPass] = useState(false)
  const defaultRole = (params.get('role') as 'BUYER' | 'SUPPLIER_OWNER') || 'BUYER'

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole, terms: false },
  })

  const role = watch('role')

  async function onSubmit(data: FormData) {
    try {
      await post('/auth/register', {
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        password:  data.password,
        role:      data.role,
      })
      toast.success('Account created! Please check your email to verify your account.')
      router.push('/auth/login')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed'
      toast.error(msg)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/auth-b2b-bg.svg')" }}>
      <div className="pointer-events-none absolute inset-0 bg-slate-950/35" />
      <div className="bg-white/95 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden backdrop-blur">
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,_#1d4ed8_0%,_#0f766e_50%,_#166534_100%)] p-8 text-center">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0 2px, transparent 2px 14px)' }} />
          <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl mb-2">
            <Globe2 className="w-7 h-7" /> Kaniz Global Trade
          </Link>
          <p className="relative z-10 text-emerald-50 text-sm">Create your textile sourcing and export account</p>
        </div>

        <div className="p-8">
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
                className={`border-2 rounded-xl p-3 text-center transition-colors ${role === value ? 'border-blue-700 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-1 ${role === value ? 'text-blue-700' : 'text-gray-400'}`} />
                <p className={`text-sm font-semibold ${role === value ? 'text-blue-700' : 'text-gray-700'}`}>{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <span className="text-xs text-gray-600">
                I agree to the{' '}
                <Link href="/terms" className="text-blue-700 hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-blue-700 hover:underline">Privacy Policy</Link>
              </span>
            </label>
            {errors.terms && <p className="text-red-500 text-xs">{errors.terms.message}</p>}

            <LoadingButton
              type="submit"
              loading={isSubmitting}
              loadingText="Creating Account..."
              className="w-full bg-blue-700 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              Create Account
            </LoadingButton>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-blue-700 font-semibold hover:underline">Sign in</Link>
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

const inp = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent'
