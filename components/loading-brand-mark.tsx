import { Loader2 } from 'lucide-react'

export function LoadingBrandMark({
  label,
  compact = false,
}: {
  label: string
  compact?: boolean
}) {
  const appName = 'Kaniz Global Trade'

  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'gap-3' : 'gap-4'}`}>
      <div className="relative flex items-center justify-center">
        <span className={`absolute rounded-full bg-orange-200/70 blur-xl ${compact ? 'h-14 w-14' : 'h-20 w-20'}`} />
        <span className={`absolute rounded-full border border-orange-200/80 ${compact ? 'h-12 w-12' : 'h-16 w-16'} animate-ping opacity-40`} />
        <div className={`relative flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-[0_20px_38px_-22px_rgba(249,115,22,0.9)] ${compact ? 'h-11 w-11' : 'h-14 w-14'}`}>
          <Loader2 className={`${compact ? 'h-5 w-5' : 'h-6 w-6'} animate-spin`} />
        </div>
      </div>

      <div>
        <p className={`font-black tracking-[-0.04em] text-slate-900 ${compact ? 'text-base' : 'text-lg'}`}>
          <span className="kgt-wave-text" aria-label={appName}>
            {Array.from(appName).map((char, index) => (
              <span
                key={`${char}-${index}`}
                aria-hidden="true"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </span>
        </p>
        <p className={`mt-1 font-medium text-slate-500 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</p>
      </div>
    </div>
  )
}
