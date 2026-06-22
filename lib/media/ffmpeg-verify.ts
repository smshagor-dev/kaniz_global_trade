import { spawn } from 'child_process'
import { getVideoProcessingSettings } from './ffmpeg-settings'

export async function verifyFfmpegBinary(inputPath?: string) {
  const settings = await getVideoProcessingSettings()
  const binary = inputPath?.trim() || settings.ffmpegPath

  return new Promise<{
    binary: string
    ok: boolean
    code: number | null
    message: string
  }>((resolve) => {
    const child = spawn(binary, ['-version'], { stdio: ['ignore', 'pipe', 'pipe'] })
    const chunks: Buffer[] = []

    child.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    child.stderr.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    child.once('error', (error) => {
      resolve({
        binary,
        ok: false,
        code: null,
        message: error.message,
      })
    })
    child.once('close', (code) => {
      const output = Buffer.concat(chunks).toString('utf8').trim()
      resolve({
        binary,
        ok: code === 0,
        code,
        message: output.split(/\r?\n/)[0] || (code === 0 ? 'FFmpeg verified' : 'FFmpeg verification failed'),
      })
    })
  })
}
