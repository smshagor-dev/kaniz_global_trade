'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { LoadingBrandMark } from '@/components/loading-brand-mark'

type LoadingEventDetail = {
  type: 'request-start' | 'request-end' | 'pulse'
}

declare global {
  interface WindowEventMap {
    'kgt:loading': CustomEvent<LoadingEventDetail>
  }
}

function isRouteNavigation(target: EventTarget | null, event: MouseEvent) {
  if (!(target instanceof Element)) return false

  if (target.closest('[data-skip-loading="true"]')) return false

  const link = target.closest('a[href]') as HTMLAnchorElement | null
  if (!link) return false
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  if (link.target && link.target !== '_self') return false
  if (link.hasAttribute('download')) return false

  const nextUrl = new URL(link.href, window.location.href)
  if (nextUrl.origin !== window.location.origin) return false

  const currentUrl = new URL(window.location.href)
  return (
    nextUrl.pathname !== currentUrl.pathname ||
    nextUrl.search !== currentUrl.search ||
    nextUrl.hash !== currentUrl.hash
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
      if (isRouteNavigation(event.target, event)) startPulse()
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
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[100] flex items-center justify-center transition-all duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="rounded-[26px] border border-orange-100 bg-white/92 px-7 py-6 shadow-[0_26px_70px_-38px_rgba(249,115,22,0.38)] backdrop-blur">
        <LoadingBrandMark label="Loading..." compact />
      </div>
    </div>
  )
}
