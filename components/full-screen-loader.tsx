import { LoadingBrandMark } from '@/components/loading-brand-mark'

export function FullScreenLoader({
  label = 'Loading marketplace...',
}: {
  label?: string
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[radial-gradient(circle_at_top,#fff6ef_0%,#fffaf7_45%,#ffffff_100%)]">
      <div className="rounded-[30px] border border-orange-100 bg-white/95 px-9 py-8 shadow-[0_30px_80px_-40px_rgba(249,115,22,0.35)] backdrop-blur">
        <LoadingBrandMark label={label} />
      </div>
    </div>
  )
}
