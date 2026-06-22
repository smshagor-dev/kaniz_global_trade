import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { verifyFfmpegBinary } from '@/lib/media/ffmpeg-verify'

const verifySchema = z.object({
  path: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = verifySchema.parse(await req.json().catch(() => ({})))
    const result = await verifyFfmpegBinary(body.path)

    return successResponse(result, result.ok ? 'FFmpeg path verified' : 'FFmpeg path verification failed')
  } catch (error) {
    return handleApiError(error)
  }
}
