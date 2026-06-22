import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'

const inputTypes = ['TEXT', 'FILE', 'BOTH'] as const

const createSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().optional().nullable(),
  inputType: z.enum(inputTypes).default('FILE'),
  isRequired: z.boolean().default(true),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
})

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
})

const deleteSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const requirements = await prisma.companyVerificationRequirement.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { submissions: true } },
      },
    })

    return successResponse(requirements, 'Company verification requirements fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const data = createSchema.parse(await req.json())

    const requirement = await prisma.companyVerificationRequirement.create({
      data: {
        ...data,
        description: data.description || null,
      },
    })

    return successResponse(requirement, 'Company verification requirement created', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req)
    const data = updateSchema.parse(await req.json())

    const existing = await prisma.companyVerificationRequirement.findUnique({
      where: { id: data.id },
    })
    if (!existing) throw new ApiError(404, 'Requirement not found')

    const requirement = await prisma.companyVerificationRequirement.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description || null,
        inputType: data.inputType,
        isRequired: data.isRequired,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    })

    return successResponse(requirement, 'Company verification requirement updated')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { id } = deleteSchema.parse(await req.json())

    await prisma.companyVerificationRequirement.delete({ where: { id } })

    return successResponse(null, 'Company verification requirement deleted')
  } catch (error) {
    return handleApiError(error)
  }
}
