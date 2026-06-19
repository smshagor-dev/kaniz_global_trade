import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { getAuthUser, requireCompanyAccess, ROLES, ApiError } from '@/lib/permissions'

const schema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().optional(),
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  durationSec: z.number().int().positive().optional(),
  language: z.string().min(2).max(10).default('en'),
  isFeatured: z.boolean().default(false),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await getAuthUser(req)

    const tours = await prisma.companyVirtualTour.findMany({
      where: authUser
        ? { companyId: id }
        : { companyId: id },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    })

    return successResponse(tours, 'Virtual tours fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireCompanyAccess(req, id)
    const data = schema.parse(await req.json())

    const created = await prisma.companyVirtualTour.create({
      data: {
        companyId: id,
        ...data,
      },
    })

    return successResponse(created, 'Virtual tour added', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url)
    const { id } = await params
    const tourId = searchParams.get('tourId')
    if (!tourId) throw new ApiError(422, 'tourId is required')

    const authUser = await requireCompanyAccess(req, id)
    const tour = await prisma.companyVirtualTour.findUnique({ where: { id: tourId } })
    if (!tour || tour.companyId !== id) throw new ApiError(404, 'Virtual tour not found')
    if (!authUser.roles.includes(ROLES.SUPER_ADMIN) && authUser.companyId !== id) {
      throw new ApiError(403, 'Access denied')
    }

    await prisma.companyVirtualTour.delete({ where: { id: tourId } })
    return successResponse(null, 'Virtual tour deleted')
  } catch (error) {
    return handleApiError(error)
  }
}
