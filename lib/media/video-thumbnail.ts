import { spawn } from 'child_process'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'
import { getVideoProcessingSettings } from './ffmpeg-settings'

const DEFAULT_SCREENSHOT_AT = '00:00:01'

function runFfmpeg(binary: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(binary, args, { stdio: 'ignore' })

    child.once('error', reject)
    child.once('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`ffmpeg exited with code ${code ?? 'unknown'}`))
    })
  })
}

export async function createVideoThumbnail(buffer: Buffer, extension = '.mp4') {
  const settings = await getVideoProcessingSettings()
  if (!settings.thumbnailsEnabled) return null

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'kaniz-video-'))
  const inputPath = path.join(tempDir, `input${extension || '.mp4'}`)
  const outputPath = path.join(tempDir, 'thumbnail.jpg')

  try {
    await writeFile(inputPath, buffer)

    await runFfmpeg(settings.ffmpegPath, [
      '-y',
      '-ss',
      DEFAULT_SCREENSHOT_AT,
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=min(1280,iw):-2',
      outputPath,
    ])

    return await readFile(outputPath)
  } catch {
    return null
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
  }
}
