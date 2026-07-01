import { NextRequest } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db/prisma'
import { requireAuth } from '@/lib/permissions'
import { FeeCalculationService } from '@/lib/finance/service-fees'
import { handleApiError, successResponse } from '@/lib/utils/api'

const purchaseSchema = z.object({
  packageCode: z.string().min(2),
})

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const wallet = await prisma.rfqCreditWallet.findFirst({
      where: { userId: authUser.userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 25 } },
    })

    return successResponse(wallet, 'RFQ credit wallet fetched')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuth(req)
    const data = purchaseSchema.parse(await req.json())

    const pkg = await prisma.rfqCreditPackage.findUnique({ where: { code: data.packageCode } })
    if (!pkg || !pkg.isActive) throw new Error('RFQ credit package not found or inactive')

    const result = await prisma.$transaction(async (tx) => {
      const wallet =
        (await tx.rfqCreditWallet.findFirst({ where: { userId: authUser.userId } })) ||
        (await tx.rfqCreditWallet.create({
          data: {
            userId: authUser.userId,
            purchasedCredits: 0,
          },
        }))

      const revenueLedger = await new FeeCalculationService(tx).createRevenueLedger({
        sourceType: 'RFQ_CREDIT_PURCHASE',
        sourceId: pkg.id,
        userId: authUser.userId,
        companyId: wallet.companyId,
        grossAmount: Number(pkg.price),
        feeAmount: Number(pkg.price),
        netAmount: Number(pkg.price),
        currency: pkg.currency,
        refundableAmount: Number(pkg.price),
      })

      const updatedWallet = await tx.rfqCreditWallet.update({
        where: { id: wallet.id },
        data: {
          purchasedCredits: { increment: pkg.credits },
          expiresAt: pkg.expiryDays ? new Date(Date.now() + pkg.expiryDays * 24 * 60 * 60 * 1000) : wallet.expiresAt,
        },
      })

      const transaction = await tx.rfqCreditTransaction.create({
        data: {
          walletId: wallet.id,
          userId: authUser.userId,
          packageId: pkg.id,
          revenueLedgerId: revenueLedger.id,
          type: 'PURCHASE',
          credits: pkg.credits,
          amount: pkg.price,
          balanceAfter: updatedWallet.freeCredits + updatedWallet.purchasedCredits - updatedWallet.usedCredits,
          expiresAt: updatedWallet.expiresAt,
        },
      })

      return { wallet: updatedWallet, transaction, revenueLedger }
    })

    return successResponse(result, 'RFQ credits purchased', undefined, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
