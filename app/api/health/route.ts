import { NextResponse } from 'next/server'
import { buildSystemHealthReport } from '@/lib/monitoring/health'

export async function GET() {
  const report = await buildSystemHealthReport()
  const statusCode = report.status === 'healthy' ? 200 : report.status === 'degraded' ? 200 : 503
  return NextResponse.json(report, { status: statusCode })
}
