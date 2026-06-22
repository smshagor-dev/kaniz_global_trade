import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { requireCompanyAccess, ROLES, ApiError } from '@/lib/permissions'

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}, z.string().max(2000).optional())

const schema = z.object({
  title: z.string().trim().min(3).max(160),
  description: optionalTrimmedString,
  videoUrl: z.string().trim().url(),
  thumbnailUrl: z.preprocess((value) => {
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }, z.string().url().optional()),
  durationSec: z.number().int().positive().max(14400).optional(),
  language: z.string().trim().min(2).max(10).default('en'),
  isFeatured: z.boolean().default(false),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    void req

    const tours = await prisma.companyVirtualTour.findMany({
      where: { companyId: id },
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
    const existingCount = await prisma.companyVirtualTour.count({ where: { companyId: id } })

    if (existingCount >= 12) throw new ApiError(409, 'You can publish up to 12 virtual tours per company')

    const created = await prisma.$transaction(async (tx) => {
      if (data.isFeatured) {
        await tx.companyVirtualTour.updateMany({
          where: { companyId: id, isFeatured: true },
          data: { isFeatured: false },
        })
      }

      return tx.companyVirtualTour.create({
        data: {
          companyId: id,
          ...data,
        },
      })
    })

    return successResponse(created, 'Virtual tour added', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await requireCompanyAccess(req, id)

    const body = await req.json()
    const tourId = z.string().uuid().parse(body?.tourId)
    const data = schema.parse(body)

    const existing = await prisma.companyVirtualTour.findUnique({ where: { id: tourId } })
    if (!existing || existing.companyId !== id) throw new ApiError(404, 'Virtual tour not found')

    const updated = await prisma.$transaction(async (tx) => {
      if (data.isFeatured) {
        await tx.companyVirtualTour.updateMany({
          where: { companyId: id, isFeatured: true, id: { not: tourId } },
          data: { isFeatured: false },
        })
      }

      return tx.companyVirtualTour.update({
        where: { id: tourId },
        data,
      })
    })

    return successResponse(updated, 'Virtual tour updated')
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
