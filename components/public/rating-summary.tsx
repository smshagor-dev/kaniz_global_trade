import { Star } from 'lucide-react'
import type { RatingSummary } from '@/lib/ratings/public'

interface RatingSummaryProps {
  summary: RatingSummary
  noun?: string
  className?: string
  hideWhenEmpty?: boolean
}

export function RatingSummaryLabel({
  summary,
  noun = 'people',
  className = '',
  hideWhenEmpty = false,
}: RatingSummaryProps) {
  if (!summary.count && hideWhenEmpty) return null

  return (
    <div className={`inline-flex items-center gap-2 text-sm text-gray-600 ${className}`.trim()}>
      <Star className={`h-4 w-4 ${summary.count ? 'fill-[#f4b740] text-[#f4b740]' : 'text-gray-300'}`} />
      <span className="font-semibold text-gray-900">
        {summary.count ? `${summary.average.toFixed(1)} / 5` : 'No ratings yet'}
      </span>
      <span className="text-gray-500">
        {summary.count ? `(${summary.count} ${noun})` : `(0 ${noun})`}
      </span>
    </div>
  )
}
