'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCurrentUser, useIsAdmin, useIsAuthenticated, useIsBuyer } from '@/store/auth'

export function RFQCreateAccessGate({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const isAuthenticated = useIsAuthenticated()
  const isBuyer = useIsBuyer()
  const isAdmin = useIsAdmin()
  const user = useCurrentUser()

  useEffect(() => {
    setHydrated(true)
  }, [])

  if (!hydrated) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Checking your account access...
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Sign in required</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Post RFQs from a buyer account</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          RFQ posting is available for logged-in buyers and admins. Sign in to continue, or create a buyer account first.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/auth/login?redirect=%2Frfqs%2Fcreate"
            className="inline-flex h-11 items-center justify-center rounded-full bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Login to continue
          </Link>
          <Link
            href="/auth/register?role=BUYER"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:border-slate-300"
          >
            Register as buyer
          </Link>
        </div>
      </div>
    )
  }

  if (!isBuyer && !isAdmin) {
    return (
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Access denied</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Your current account cannot post RFQs</h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          Signed in as {user?.firstName} {user?.lastName}. Switch to a buyer account or register a buyer profile to create sourcing requests.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/auth/register?role=BUYER"
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Register buyer account
          </Link>
          <Link
            href="/rfqs"
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Back to RFQ board
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
