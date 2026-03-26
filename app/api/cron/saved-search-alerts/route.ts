import { NextResponse } from 'next/server'
import { runSavedSearchAlerts } from '@/app/actions/saved-search-alerts'

/**
 * Cron endpoint to send saved-search alert emails.
 * Protect with Authorization: Bearer CRON_SECRET (same pattern as other cron routes).
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret?.trim() && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const maxSearches = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') ?? '120') || 120))
  const dryRun = url.searchParams.get('dryRun') === '1'

  try {
    const result = await runSavedSearchAlerts({ maxSearches, dryRun })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
