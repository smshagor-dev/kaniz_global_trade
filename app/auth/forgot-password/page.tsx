'use client'

import Link from 'next/link'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { post } from '@/lib/utils/api-client'
import { Globe2, Mail } from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    try {
      const response = await post('/auth/forgot-password', { email })
      toast.success(response.message || 'Reset link sent if the email exists')
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to send reset link'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat p-4" style={{ backgroundImage: "url('/auth-b2b-bg.svg')" }}>
      <div className="absolute inset-0 bg-slate-950/35" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white/95 shadow-2xl backdrop-blur">
        <div className="bg-[linear-gradient(135deg,_#0f766e_0%,_#155e75_45%,_#1d4ed8_100%)] p-8 text-center text-white">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold">
            <Globe2 className="h-7 w-7" /> Kaniz Global Trade
          </Link>
          <p className="mt-2 text-sm text-cyan-100">Reset access to your B2B workspace</p>
        </div>

        <div className="p-8">
          <h1 className="text-2xl font-bold text-slate-950">Forgot your password?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter your account email and we&apos;ll send you a secure reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</span>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pl-11 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </label>

            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Sending link..."
              className="w-full rounded-xl bg-blue-700 py-3.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Send reset link
            </LoadingButton>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Remember your password? <Link href="/auth/login" className="font-semibold text-blue-700 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
