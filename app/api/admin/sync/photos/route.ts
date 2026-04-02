import { NextResponse } from 'next/server'
import { syncPhotosOnly } from '@/app/actions/sync-spark'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (secret?.trim()) {
    const auth = request.headers.get('authorization')
    if (auth === `Bearer ${secret}`) return true
  }
  // Allow if no CRON_SECRET is set (dev mode)
  if (!secret?.trim()) return true
  return false
}

/**
 * POST /api/admin/sync/photos
 * Run syncPhotosOnly to backfill PhotoURL and details for all listings.
 * Query params: maxPages (default 999), pageSize (default 100), startPage (default 1)
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const maxPages = Math.min(999, Math.max(1, Number(searchParams.get('maxPages') ?? 999)))
  const pageSize = Math.min(200, Math.max(10, Number(searchParams.get('pageSize') ?? 100)))
  const startPage = Math.max(1, Number(searchParams.get('startPage') ?? 1))

  const result = await syncPhotosOnly({ maxPages, pageSize, startPage })
  return NextResponse.json(result)
}
