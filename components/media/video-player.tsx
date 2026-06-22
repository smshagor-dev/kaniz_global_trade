'use client'

import { getVideoProvider, getYouTubeEmbedUrl } from '@/lib/media/video'

type VideoPlayerProps = {
  title?: string
  url: string
  poster?: string | null
  className?: string
  iframeClassName?: string
  videoClassName?: string
}

export function VideoPlayer({
  title,
  url,
  poster,
  className = 'aspect-video w-full overflow-hidden rounded-xl bg-black',
  iframeClassName = 'h-full w-full border-0',
  videoClassName = 'h-full w-full bg-black object-cover',
}: VideoPlayerProps) {
  const provider = getVideoProvider(url)

  if (provider === 'youtube') {
    const embedUrl = getYouTubeEmbedUrl(url)

    if (embedUrl) {
      return (
        <div className={className}>
          <iframe
            src={embedUrl}
            title={title || 'Video player'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className={iframeClassName}
          />
        </div>
      )
    }
  }

  return (
    <div className={className}>
      <video
        key={url}
        src={url}
        poster={poster || undefined}
        controls
        playsInline
        preload="metadata"
        className={videoClassName}
      />
    </div>
  )
}
