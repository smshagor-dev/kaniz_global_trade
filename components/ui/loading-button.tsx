'use client'

import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  icon?: ReactNode
  loadingText?: string
}

export function LoadingButton({
  children,
  className = '',
  disabled,
  loading = false,
  icon,
  loadingText,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  )
}
