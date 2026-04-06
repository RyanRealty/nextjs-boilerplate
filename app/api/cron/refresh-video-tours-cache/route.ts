import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { MARKET_REPORT_DEFAULT_CITIES } from '@/app/actions/market-report-types'
import { fetchVideoRowsViaListingVideosJoin } from '@/lib/video-tours-listing-videos-join'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret?.trim()) return true
  return request.headers.get('authorization') === `Bearer ${secret}`
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url?.trim() || !key?.trim()) return null
  return createClient(url, key)
}

/**
 * Rebuilds video_tours_cache for home (12) and /videos hub (48). Runs on a schedule; service role bypasses RLS on write.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 500 })
  }

  try {
    const citiesLower = new Set(MARKET_REPORT_DEFAULT_CITIES.map((c) => c.toLowerCase()))

    const [homeRows, hubRows] = await Promise.all([
      fetchVideoRowsViaListingVideosJoin(supabase, {
        maxRows: 12,
        priceDesc: true,
        citiesLower,
        listingVideosLimit: 1200,
      }),
      fetchVideoRowsViaListingVideosJoin(supabase, {
        maxRows: 48,
        priceDesc: true,
        citiesLower,
        listingVideosLimit: 4000,
      }),
    ])

    const now = new Date().toISOString()
    const { error } = await supabase.from('video_tours_cache').upsert(
      [
        { scope: 'central_oregon_home', listings: homeRows, updated_at: now },
        { scope: 'central_oregon_hub', listings: hubRows, updated_at: now },
      ],
      { onConflict: 'scope' }
    )

    if (error) {
      console.error('[refresh-video-tours-cache] upsert', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      homeCount: homeRows.length,
      hubCount: hubRows.length,
      updated_at: now,
    })
  } catch (err) {
    console.error('[refresh-video-tours-cache]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'refresh failed' },
      { status: 500 }
    )
  }
}
