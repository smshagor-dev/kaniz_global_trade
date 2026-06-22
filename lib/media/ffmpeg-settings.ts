export async function getVideoProcessingSettings() {
  const { getSettingsMap } = await import('../settings/system')
  const settings = await getSettingsMap(['VIDEO_THUMBNAILS_ENABLED', 'FFMPEG_PATH'])

  return {
    thumbnailsEnabled: settings.VIDEO_THUMBNAILS_ENABLED !== 'false',
    ffmpegPath: settings.FFMPEG_PATH?.trim() || 'ffmpeg',
  }
}
