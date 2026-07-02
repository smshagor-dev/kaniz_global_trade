import { HeadBucketCommand } from '@aws-sdk/client-s3'
import prisma from '@/lib/db/prisma'
import redis from '@/lib/db/redis'
import { meili } from '@/lib/search'
import { emailQueue, searchQueue, analyticsQueue, searchDeadLetterQueue } from '@/server/queues/client'
import { getRecentQueueFailures } from '@/server/queues/failure-log'
import { recordSystemEvent } from '@/lib/monitoring/system-events'

export type HealthStatus = 'healthy' | 'degraded' | 'down'

export type HealthDependencyReport = {
  name: string
  status: HealthStatus
  message: string
  latencyMs: number
  details?: Record<string, unknown>
}

export type SystemHealthReport = {
  status: HealthStatus
  generatedAt: string
  uptimeSeconds: number
  services: HealthDependencyReport[]
}

function deriveOverallStatus(services: HealthDependencyReport[]): HealthStatus {
  if (services.some((service) => service.status === 'down')) return 'down'
  if (services.some((service) => service.status === 'degraded')) return 'degraded'
  return 'healthy'
}

async function timedCheck(
  name: string,
  runner: () => Promise<{ message: string; details?: Record<string, unknown>; status?: HealthStatus }>
): Promise<HealthDependencyReport> {
  const started = Date.now()
  try {
    const result = await runner()
    return {
      name,
      status: result.status || 'healthy',
      message: result.message,
      latencyMs: Date.now() - started,
      details: result.details,
    }
  } catch (error) {
    return {
      name,
      status: 'down',
      message: error instanceof Error ? error.message : 'Health check failed',
      latencyMs: Date.now() - started,
    }
  }
}

export async function checkDatabaseHealth() {
  return timedCheck('database', async () => {
    await prisma.$queryRawUnsafe('SELECT 1')
    return { message: 'Prisma/MySQL reachable' }
  })
}

export async function checkRedisHealth() {
  return timedCheck('redis', async () => {
    const response = await redis.ping()
    return {
      message: response === 'PONG' ? 'Redis reachable' : 'Redis returned unexpected response',
      status: response === 'PONG' ? 'healthy' : 'degraded',
      details: { response },
    }
  })
}

export async function checkSearchHealth() {
  return timedCheck('search', async () => {
    const url = new URL('/health', process.env.MEILISEARCH_HOST || 'http://localhost:7700').toString()
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`Search health returned ${response.status}`)
    }
    const payload = await response.json().catch(() => ({}))
    return { message: 'Search engine reachable', details: payload as Record<string, unknown> }
  })
}

export async function checkSocketHealth() {
  return timedCheck('socket', async () => {
    const socketBase = process.env.SOCKET_INTERNAL_URL || process.env.NEXT_PUBLIC_SOCKET_URL || `http://127.0.0.1:${process.env.SOCKET_PORT || 3001}`
    const response = await fetch(new URL('/healthz', socketBase).toString(), { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(`Socket health returned ${response.status}`)
    }
    const payload = await response.json().catch(() => ({}))
    return { message: 'Socket.IO server reachable', details: payload as Record<string, unknown> }
  })
}

export async function checkQueueHealth() {
  return timedCheck('queue-workers', async () => {
    const [emails, search, analytics, deadLetter, failures] = await Promise.all([
      emailQueue.getJobCounts(),
      searchQueue.getJobCounts(),
      analyticsQueue.getJobCounts(),
      searchDeadLetterQueue.getJobCounts(),
      getRecentQueueFailures(5),
    ])

    const failedTotal = Number(emails.failed || 0) + Number(search.failed || 0) + Number(analytics.failed || 0)
    const deadLetterWaiting = Number(deadLetter.waiting || 0) + Number(deadLetter.failed || 0)
    const degraded = failedTotal > 0 || deadLetterWaiting > 0 || failures.length > 0

    return {
      status: degraded ? 'degraded' : 'healthy',
      message: degraded ? 'Queue workers have failed or dead-lettered jobs' : 'Queue workers healthy',
      details: { emails, search, analytics, searchDeadLetter: deadLetter, recentFailures: failures.length },
    }
  })
}

export async function checkStorageHealth() {
  return timedCheck('storage', async () => {
    const { getStorageConfig } = await import('@/lib/storage')
    const config = await getStorageConfig()

    if (!config.bucket || !config.endpoint) {
      return {
        status: 'degraded',
        message: 'Storage configuration incomplete',
        details: { bucketConfigured: !!config.bucket, endpointConfigured: !!config.endpoint },
      }
    }

    await config.s3.send(new HeadBucketCommand({ Bucket: config.bucket }))
    return {
      message: 'Storage reachable',
      details: { bucket: config.bucket, endpoint: config.endpoint },
    }
  })
}

export async function buildSystemHealthReport(overrides?: {
  app?: () => Promise<HealthDependencyReport>
  database?: () => Promise<HealthDependencyReport>
  redis?: () => Promise<HealthDependencyReport>
  search?: () => Promise<HealthDependencyReport>
  socket?: () => Promise<HealthDependencyReport>
  queue?: () => Promise<HealthDependencyReport>
  storage?: () => Promise<HealthDependencyReport>
}) {
  const uptimeSeconds = Math.floor(process.uptime())
  const services = await Promise.all([
    overrides?.app?.() || Promise.resolve({
      name: 'app',
      status: 'healthy' as const,
      message: 'Application responding',
      latencyMs: 0,
      details: { uptimeSeconds, nodeEnv: process.env.NODE_ENV || 'development' },
    }),
    overrides?.database?.() || checkDatabaseHealth(),
    overrides?.redis?.() || checkRedisHealth(),
    overrides?.search?.() || checkSearchHealth(),
    overrides?.socket?.() || checkSocketHealth(),
    overrides?.queue?.() || checkQueueHealth(),
    overrides?.storage?.() || checkStorageHealth(),
  ])

  const status = deriveOverallStatus(services)
  const report: SystemHealthReport = {
    status,
    generatedAt: new Date().toISOString(),
    uptimeSeconds,
    services,
  }

  if (status !== 'healthy') {
    await recordSystemEvent({
      severity: status === 'down' ? 'CRITICAL' : 'WARN',
      category: 'HEALTH',
      service: 'system-health',
      eventType: 'degraded_report',
      message: `System health report is ${status}.`,
      details: report,
    })
  }

  return report
}
