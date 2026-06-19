'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

type LoadingEventDetail = {
  type: 'request-start' | 'request-end' | 'pulse'
}

declare global {
  interface WindowEventMap {
    'kgt:loading': CustomEvent<LoadingEventDetail>
  }
}

function isInteractiveAction(target: EventTarget | null) {
  if (!(target instanceof Element)) return false

  return Boolean(
    target.closest(
      'a[href], button, [role="button"], input[type="submit"], input[type="button"]'
    )
  )
}

export function GlobalLoadingIndicator() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeRequests, setActiveRequests] = useState(0)
  const [isPulsing, setIsPulsing] = useState(false)
  const pulseTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    function startPulse() {
      setIsPulsing(true)
      if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current)
      pulseTimeoutRef.current = window.setTimeout(() => {
        setIsPulsing(false)
        pulseTimeoutRef.current = null
      }, 900)
    }

    function handleLoadingEvent(event: WindowEventMap['kgt:loading']) {
      if (event.detail.type === 'request-start') {
        setActiveRequests((count) => count + 1)
        return
      }

      if (event.detail.type === 'request-end') {
        setActiveRequests((count) => Math.max(0, count - 1))
        return
      }

      startPulse()
    }

    function handleClick(event: MouseEvent) {
      if (isInteractiveAction(event.target)) startPulse()
    }

    document.addEventListener('click', handleClick, true)
    window.addEventListener('kgt:loading', handleLoadingEvent)

    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('kgt:loading', handleLoadingEvent)
      if (pulseTimeoutRef.current) window.clearTimeout(pulseTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    setIsPulsing(false)
  }, [pathname, searchParams])

  const isVisible = activeRequests > 0 || isPulsing
  const progressClass = useMemo(
    () =>
      activeRequests > 0
        ? 'w-2/3 opacity-100'
        : isPulsing
          ? 'w-1/3 opacity-100'
          : 'w-0 opacity-0',
    [activeRequests, isPulsing]
  )

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 bg-transparent">
        <div
          className={`h-full rounded-r-full bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-400 shadow-[0_0_18px_rgba(37,99,235,0.45)] transition-all duration-300 ${progressClass}`}
        />
      </div>

      <div
        className={`pointer-events-none fixed right-5 top-5 z-[100] transition-all duration-200 ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 rounded-full border border-blue-100 bg-white/95 px-3 py-2 text-xs font-medium text-blue-700 shadow-lg backdrop-blur">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Processing...
        </div>
      </div>
    </>
  )
}
