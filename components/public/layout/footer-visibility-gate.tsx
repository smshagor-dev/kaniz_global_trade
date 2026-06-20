'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Footer } from '@/components/public/layout/footer'

const FOOTER_EVENT = 'kgt:home-footer-visible'

export function FooterVisibilityGate() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(pathname !== '/')

  useEffect(() => {
    if (pathname !== '/') {
      setVisible(true)
      return
    }

    setVisible(false)

    function handleFooterVisibility(event: Event) {
      const nextVisible = (event as CustomEvent<{ visible?: boolean }>).detail?.visible
      setVisible(Boolean(nextVisible))
    }

    window.addEventListener(FOOTER_EVENT, handleFooterVisibility)

    return () => {
      window.removeEventListener(FOOTER_EVENT, handleFooterVisibility)
    }
  }, [pathname])

  return (
    <>
      {pathname === '/' ? (
        <noscript>
          <style>{'#kgt-home-footer{display:block !important;}'}</style>
        </noscript>
      ) : null}
      <div id="kgt-home-footer" className={pathname === '/' && !visible ? 'hidden' : ''}>
        <Footer />
      </div>
    </>
  )
}
