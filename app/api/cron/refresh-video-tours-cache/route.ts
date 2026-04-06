import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchListingsWithVideos } from '@/lib/fetch-listings-with-videos'

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
    const hubFilters = {
      region: 'central_oregon' as const,
      sort: 'price_desc' as const,
      status: 'active' as const,
      limit: 48,
    }
    const homeFilters = { ...hubFilters, limit: 12 }

    const [homeRows, hubRows] = await Promise.all([
      fetchListingsWithVideos(supabase, homeFilters),
      fetchListingsWithVideos(supabase, hubFilters),
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
