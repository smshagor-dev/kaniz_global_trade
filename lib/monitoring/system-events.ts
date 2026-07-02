import { SystemEventCategory, SystemEventSeverity } from '@prisma/client'

export type SystemEventInput = {
  severity: SystemEventSeverity
  category: SystemEventCategory
  service: string
  eventType: string
  message: string
  source?: string
  status?: string
  actorUserId?: string
  companyId?: string
  details?: unknown
}

let hasWarnedMissingSystemEventTable = false

export async function recordSystemEvent(input: SystemEventInput): Promise<void> {
  const payload = {
    timestamp: new Date().toISOString(),
    severity: input.severity,
    category: input.category,
    service: input.service,
    eventType: input.eventType,
    message: input.message,
    source: input.source || null,
    status: input.status || null,
    actorUserId: input.actorUserId || null,
    companyId: input.companyId || null,
    details: input.details || null,
  }

  const writer = input.severity === 'ERROR' || input.severity === 'CRITICAL'
    ? console.error
    : console.log
  writer(JSON.stringify(payload))

  try {
    const { default: prisma } = await import('@/lib/db/prisma')
    if (!('systemEvent' in prisma) || !prisma.systemEvent) {
      return
    }

    await prisma.systemEvent.create({
      data: {
        severity: input.severity,
        category: input.category,
        service: input.service,
        eventType: input.eventType,
        message: input.message,
        source: input.source,
        status: input.status,
        actorUserId: input.actorUserId,
        companyId: input.companyId,
        details: input.details ? JSON.stringify(input.details) : null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.toLowerCase().includes('systemevent') && message.toLowerCase().includes('does not exist')) {
      if (!hasWarnedMissingSystemEventTable) {
        hasWarnedMissingSystemEventTable = true
        console.warn(JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'WARN',
          category: 'HEALTH',
          service: 'system-events',
          eventType: 'table_missing',
          message: 'SystemEvent table is missing. Apply migrations to enable persistent observability logs.',
        }))
      }
      return
    }

    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      severity: 'ERROR',
      category: 'HEALTH',
      service: 'system-events',
      eventType: 'persist_failed',
      message: 'Failed to persist system event',
      details: { originalEventType: input.eventType, error: message },
    }))
  }
}

export async function listRecentSystemEvents(params?: {
  categories?: SystemEventCategory[]
  services?: string[]
  limit?: number
}) {
  const { default: prisma } = await import('@/lib/db/prisma')
  if (!('systemEvent' in prisma) || !prisma.systemEvent) {
    return []
  }

  return prisma.systemEvent.findMany({
    where: {
      ...(params?.categories?.length ? { category: { in: params.categories } } : {}),
      ...(params?.services?.length ? { service: { in: params.services } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: params?.limit || 20,
  })
}
