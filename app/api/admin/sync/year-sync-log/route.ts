import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'

export const dynamic = 'force-dynamic'

type YearSyncLogRow = {
  id: string
  year: number
  status: 'completed' | 'failed' | 'skipped'
  listings_upserted: number
  history_inserted: number
  listings_finalized: number
  completed_at: string
  error: string | null
}

type SyncYearCursor = {
  current_year: number | null
  phase: string
  next_listing_page: number
  next_history_offset: number
  total_listings: number | null
  updated_at: string
}

export async function GET() {
  try {
    const supabaseAuth = await createServerClient()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    if (!user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const role = await getAdminRoleForEmail(user.email)
    if (!role) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 })
    }
    const supabase = createClient(supabaseUrl, serviceKey)

    const [{ data: cursorRow }, { data: logRows }] = await Promise.all([
      supabase
        .from('sync_year_cursor')
        .select('current_year, phase, next_listing_page, next_history_offset, total_listings, updated_at')
        .eq('id', 'default')
        .maybeSingle(),
      supabase
        .from('year_sync_log')
        .select('id, year, status, listings_upserted, history_inserted, listings_finalized, completed_at, error')
        .order('completed_at', { ascending: false })
        .limit(50),
    ])

    const cursor = cursorRow as SyncYearCursor | null
    const log = (logRows ?? []) as YearSyncLogRow[]

    return NextResponse.json({
      ok: true,
      cursor: cursor
        ? {
            currentYear: cursor.current_year,
            phase: cursor.phase,
            nextListingPage: cursor.next_listing_page,
            nextHistoryOffset: cursor.next_history_offset,
            totalListings: cursor.total_listings,
            updatedAt: cursor.updated_at,
          }
        : null,
      log,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
