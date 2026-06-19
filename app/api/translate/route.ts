import { NextRequest } from 'next/server'
import { z } from 'zod'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { translateText } from '@/lib/translation'

const schema = z.object({
  text: z.string().min(1).max(5000),
  targetLanguage: z.string().min(2).max(10),
})

export async function POST(req: NextRequest) {
  try {
    const data = schema.parse(await req.json())
    const translated = await translateText(data.text, data.targetLanguage)
    return successResponse(translated, 'Translation completed')
  } catch (error) {
    return handleApiError(error)
  }
}
