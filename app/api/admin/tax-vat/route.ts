import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAdmin, ApiError } from '@/lib/permissions'
import { handleApiError, successResponse } from '@/lib/utils/api'
import { createAuditLog } from '@/lib/utils/audit'

const taxSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2),
  country: z.string().min(2),
  stateRegion: z.string().nullable().optional(),
  taxName: z.string().min(2),
  taxRate: z.number().min(0).max(100),
  taxType: z.enum(['VAT', 'GST', 'SALES_TAX', 'WITHHOLDING', 'OTHER']),
  applicationMode: z.enum(['INCLUSIVE', 'EXCLUSIVE']),
  appliesToBuyer: z.boolean().default(true),
  appliesToSupplier: z.boolean().default(false),
  appliesToServiceFee: z.boolean().default(true),
  appliesToSubscription: z.boolean().default(true),
  isActive: z.boolean().default(true),
})

const toggleSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
})

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const country = searchParams.get('country') || undefined
    const status = searchParams.get('status') || undefined

    const items = await prisma.taxVatSetting.findMany({
      where: {
        ...(country ? { country } : {}),
        ...(status === 'ACTIVE'
          ? { isActive: true }
          : status === 'INACTIVE'
            ? { isActive: false }
            : {}),
      },
      orderBy: [{ country: 'asc' }, { stateRegion: 'asc' }, { updatedAt: 'desc' }],
    })

    return successResponse(items, 'Tax & VAT rules fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = taxSchema.parse(await req.json())

    const saved = data.id
      ? await prisma.taxVatSetting.update({
          where: { id: data.id },
          data: {
            code: data.code,
            country: data.country,
            stateRegion: data.stateRegion ?? null,
            taxName: data.taxName,
            taxRate: data.taxRate,
            taxType: data.taxType,
            applicationMode: data.applicationMode,
            appliesToBuyer: data.appliesToBuyer,
            appliesToSupplier: data.appliesToSupplier,
            appliesToServiceFee: data.appliesToServiceFee,
            appliesToSubscription: data.appliesToSubscription,
            isActive: data.isActive,
            updatedById: admin.userId,
          },
        })
      : await prisma.taxVatSetting.create({
          data: {
            code: data.code,
            country: data.country,
            stateRegion: data.stateRegion ?? null,
            taxName: data.taxName,
            taxRate: data.taxRate,
            taxType: data.taxType,
            applicationMode: data.applicationMode,
            appliesToBuyer: data.appliesToBuyer,
            appliesToSupplier: data.appliesToSupplier,
            appliesToServiceFee: data.appliesToServiceFee,
            appliesToSubscription: data.appliesToSubscription,
            isActive: data.isActive,
            updatedById: admin.userId,
          },
        })

    await createAuditLog({
      userId: admin.userId,
      action: data.id ? 'UPDATE' : 'CREATE',
      module: 'tax-vat',
      targetType: 'TaxVatSetting',
      targetId: saved.id,
      newData: saved,
    })

    return successResponse(saved, data.id ? 'Tax rule updated' : 'Tax rule created', undefined, data.id ? 200 : 201)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin(req)
    const data = toggleSchema.parse(await req.json())
    const current = await prisma.taxVatSetting.findUnique({ where: { id: data.id } })
    if (!current) throw new ApiError(404, 'Tax rule not found')

    const updated = await prisma.taxVatSetting.update({
      where: { id: data.id },
      data: {
        isActive: data.isActive,
        updatedById: admin.userId,
      },
    })

    await createAuditLog({
      userId: admin.userId,
      action: 'UPDATE',
      module: 'tax-vat',
      targetType: 'TaxVatSetting',
      targetId: updated.id,
      oldData: current,
      newData: updated,
    })

    return successResponse(updated, data.isActive ? 'Tax rule enabled' : 'Tax rule disabled')
  } catch (error) {
    return handleApiError(error)
  }
}
