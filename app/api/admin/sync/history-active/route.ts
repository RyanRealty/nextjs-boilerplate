import { NextResponse } from 'next/server'
import { syncListingHistory } from '@/app/actions/sync-spark'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (secret?.trim()) {
    const auth = request.headers.get('authorization')
    if (auth === `Bearer ${secret}`) return true
  }
  if (!secret?.trim()) return true
  return false
}

/**
 * POST /api/admin/sync/history-active
 * Run syncListingHistory for active/pending listings only.
 * Query params: limit (default 50, max 200), offset (default 0)
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? 50)))
  const offset = Math.max(0, Number(searchParams.get('offset') ?? 0))

  const result = await syncListingHistory({
    limit,
    offset,
    activeAndPendingOnly: true,
  })
  return NextResponse.json(result)
}
