import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(({
    __internal: {
      // Force the local Node client to use the bundled query engine instead of
      // the Accelerate/Data Proxy runtime when a no-engine client was generated.
      configOverride: (config: { copyEngine?: boolean }) => ({ ...config, copyEngine: true }),
    },
    log: process.env.PRISMA_LOG_QUERIES === 'true'
      ? ['query', 'error', 'warn']
      : ['error', 'warn'],
  } as unknown) as ConstructorParameters<typeof PrismaClient>[0])

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
