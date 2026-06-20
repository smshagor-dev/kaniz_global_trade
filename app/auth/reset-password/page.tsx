'use client'

import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { post } from '@/lib/utils/api-client'
import { Globe2, Lock } from 'lucide-react'
import { LoadingButton } from '@/components/ui/loading-button'

export default function ResetPasswordPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      toast.error('Missing reset token')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await post('/auth/reset-password', { token, password })
      toast.success('Password reset successful')
      router.push('/auth/login')
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to reset password'
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
          <p className="mt-2 text-sm text-cyan-100">Set a new password for your account</p>
        </div>

        <div className="p-8">
          <h1 className="text-2xl font-bold text-slate-950">Reset password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use at least 8 characters including uppercase, lowercase, and a number.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">New password</span>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pl-11 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm password</span>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pl-11 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </label>

            <LoadingButton
              type="submit"
              loading={loading}
              loadingText="Updating password..."
              className="w-full rounded-xl bg-blue-700 py-3.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Update password
            </LoadingButton>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/auth/login" className="font-semibold text-blue-700 hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
