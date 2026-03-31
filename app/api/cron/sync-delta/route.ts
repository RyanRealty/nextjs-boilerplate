import { NextResponse } from 'next/server'
import { syncSparkListingsDelta } from '@/app/actions/sync-spark'

/**
 * Delta Sync Cron — runs the shared delta sync path.
 * Auth: Authorization: Bearer CRON_SECRET
 */

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (secret?.trim()) {
    return request.headers.get('authorization') === `Bearer ${secret}`
  }
  return true
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncSparkListingsDelta({ maxPages: 200 })
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error ?? result.message ?? 'Delta sync failed',
        checkpointId: result.checkpointId ?? null,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: result.message,
    checkpointId: result.checkpointId ?? null,
    totalFetched: result.totalFetched ?? 0,
    totalUpserted: result.totalUpserted ?? 0,
    eventsEmitted: result.eventsEmitted ?? 0,
    listingsCreated: result.listingsCreated ?? [],
    listingsUpdated: result.listingsUpdated ?? [],
    listingsClosed: result.listingsClosed ?? [],
  })
}
