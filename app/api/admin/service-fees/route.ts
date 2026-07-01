import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { createAuditLog } from '@/lib/utils/audit'

const serviceFeeSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2),
  name: z.string().min(2),
  categoryId: z.string(),
  feeType: z.enum(['PERCENTAGE', 'FIXED', 'FREE']),
  feeValue: z.number().min(0),
  minFee: z.number().min(0).nullable().optional(),
  maxFee: z.number().min(0).nullable().optional(),
  currency: z.string().min(3).max(8).default('USD'),
  appliesTo: z.string().min(2),
  isActive: z.boolean().default(true),
  description: z.string().nullable().optional(),
})

const toggleSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId') || undefined
    const status = searchParams.get('status') || undefined

    const [categories, items] = await Promise.all([
      prisma.serviceFeeCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.serviceFeeSetting.findMany({
        where: {
          ...(categoryId ? { categoryId } : {}),
          ...(status === 'ACTIVE'
            ? { isActive: true }
            : status === 'INACTIVE'
              ? { isActive: false }
              : {}),
        },
        include: { category: true },
        orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
      }),
    ])

    return successResponse({ categories, items }, 'Service fees fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = serviceFeeSchema.parse(await req.json())

    if (data.feeType === 'PERCENTAGE' && data.feeValue > 100) {
      throw new ApiError(422, 'Percentage fee cannot exceed 100')
    }
    if (data.maxFee != null && data.minFee != null && data.maxFee < data.minFee) {
      throw new ApiError(422, 'Maximum fee cannot be smaller than minimum fee')
    }

    const category = await prisma.serviceFeeCategory.findUnique({ where: { id: data.categoryId } })
    if (!category) throw new ApiError(404, 'Service fee category not found')

    const saved = data.id
      ? await prisma.serviceFeeSetting.update({
          where: { id: data.id },
          data: {
            code: data.code,
            name: data.name,
            categoryId: data.categoryId,
            feeType: data.feeType,
            feeValue: data.feeType === 'FREE' ? 0 : data.feeValue,
            minFee: data.minFee ?? null,
            maxFee: data.maxFee ?? null,
            currency: data.currency,
            appliesTo: data.appliesTo,
            isActive: data.isActive,
            status: data.isActive ? 'ACTIVE' : 'INACTIVE',
            description: data.description ?? null,
            version: { increment: 1 },
            updatedById: admin.userId,
          },
          include: { category: true },
        })
      : await prisma.serviceFeeSetting.create({
          data: {
            code: data.code,
            name: data.name,
            categoryId: data.categoryId,
            feeType: data.feeType,
            feeValue: data.feeType === 'FREE' ? 0 : data.feeValue,
            minFee: data.minFee ?? null,
            maxFee: data.maxFee ?? null,
            currency: data.currency,
            appliesTo: data.appliesTo,
            isActive: data.isActive,
            status: data.isActive ? 'ACTIVE' : 'INACTIVE',
            description: data.description ?? null,
            updatedById: admin.userId,
          },
          include: { category: true },
        })

    await createAuditLog({
      userId: admin.userId,
      action: data.id ? 'UPDATE' : 'CREATE',
      module: 'service-fees',
      targetType: 'ServiceFeeSetting',
      targetId: saved.id,
      newData: saved,
    })

    return successResponse(saved, data.id ? 'Service fee updated' : 'Service fee created', undefined, data.id ? 200 : 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = toggleSchema.parse(await req.json())
    const current = await prisma.serviceFeeSetting.findUnique({ where: { id: data.id } })
    if (!current) throw new ApiError(404, 'Service fee not found')

    const updated = await prisma.serviceFeeSetting.update({
      where: { id: data.id },
      data: {
        isActive: data.isActive,
        status: data.isActive ? 'ACTIVE' : 'INACTIVE',
        version: { increment: 1 },
        updatedById: admin.userId,
      },
      include: { category: true },
    })

    await createAuditLog({
      userId: admin.userId,
      action: 'UPDATE',
      module: 'service-fees',
      targetType: 'ServiceFeeSetting',
      targetId: updated.id,
      oldData: current,
      newData: updated,
    })

    return successResponse(updated, data.isActive ? 'Service fee enabled' : 'Service fee disabled')
  } catch (error) {
    return handleApiError(error)
  }
}
