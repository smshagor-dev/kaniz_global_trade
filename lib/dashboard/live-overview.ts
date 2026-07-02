export interface DateBucket {
  date: string
  [key: string]: number | string
}

function startOfDay(value: Date) {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  return next
}

export function buildDateBuckets(days: number, seed: Record<string, number> = {}) {
  const buckets: DateBucket[] = []
  const today = startOfDay(new Date())

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    buckets.push({
      date: date.toISOString(),
      ...seed,
    })
  }

  return buckets
}

export function incrementBucket(
  buckets: DateBucket[],
  dateValue: Date | string | null | undefined,
  field: string,
  amount = 1
) {
  if (!dateValue) return
  const date = startOfDay(new Date(dateValue))
  const key = date.toISOString()
  const bucket = buckets.find((item) => item.date === key)
  if (!bucket) return
  const current = typeof bucket[field] === 'number' ? Number(bucket[field]) : 0
  bucket[field] = current + amount
}

export function sumStatusCounts<T extends { status: string; _count: number }>(
  rows: T[],
  excluded: string[] = []
) {
  return rows
    .filter((row) => !excluded.includes(row.status))
    .reduce((sum, row) => sum + row._count, 0)
}

export function mapStatusCounts<T extends { status: string; _count: number }>(rows: T[]) {
  return rows.map((row) => ({ name: row.status, value: row._count }))
}
