import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth, requireCompanyAccess, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { getVideoThumbnailUrl, getVideoProvider } from '@/lib/media/video'

const videosSchema = z.object({
  videos: z.array(
    z.object({
      url: z.string().url(),
      title: z.string().optional(),
      thumbnailUrl: z.string().optional(),
    })
  ).default([]),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req)
    const { id } = await params
    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) throw new ApiError(404, 'Product not found')

    await requireCompanyAccess(req, product.companyId)
    const body = await req.json()
    const data = videosSchema.parse(body)

    await prisma.productVideo.deleteMany({ where: { productId: id } })

    if (!data.videos.length) {
      return successResponse([], 'Product videos cleared')
    }

    await prisma.productVideo.createMany({
      data: data.videos.map((video) => ({
        productId: id,
        url: video.url.trim(),
        title: video.title?.trim() || undefined,
        thumbnailUrl:
          video.thumbnailUrl?.trim() ||
          (getVideoProvider(video.url) === 'youtube' ? getVideoThumbnailUrl(video.url) || undefined : undefined),
      })),
    })

    return successResponse(null, 'Product videos saved')
  } catch (error) {
    return handleApiError(error)
  }
}
