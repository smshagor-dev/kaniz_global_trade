'use client'

import { useEffect, useState } from 'react'
import { FullScreenLoader } from '@/components/full-screen-loader'

export function AppBootLoader() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null

  return <FullScreenLoader label="Preparing your marketplace..." />
}
