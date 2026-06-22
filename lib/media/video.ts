const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'])

export type VideoProvider = 'youtube' | 'direct'

export function isYouTubeUrl(value: string) {
  try {
    return YOUTUBE_HOSTS.has(new URL(value).hostname.toLowerCase())
  } catch {
    return false
  }
}

export function getYouTubeVideoId(value: string) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()

    if (hostname === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id || null
    }

    if (!YOUTUBE_HOSTS.has(hostname)) return null

    if (url.pathname.startsWith('/shorts/')) {
      const id = url.pathname.split('/').filter(Boolean)[1]
      return id || null
    }

    if (url.pathname.startsWith('/embed/')) {
      const id = url.pathname.split('/').filter(Boolean)[1]
      return id || null
    }

    return url.searchParams.get('v')
  } catch {
    return null
  }
}

export function getVideoProvider(value: string): VideoProvider {
  return getYouTubeVideoId(value) ? 'youtube' : 'direct'
}

export function getYouTubeEmbedUrl(value: string) {
  const videoId = getYouTubeVideoId(value)
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

export function getVideoThumbnailUrl(value: string) {
  const videoId = getYouTubeVideoId(value)
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null
}
