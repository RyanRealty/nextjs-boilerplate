import { after, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { parseYearCache, runYearSyncWithPersistence } from '../_shared/run-year-sync'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabaseAuth = await createServerClient()
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()
    if (!user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const role = await getAdminRoleForEmail(user.email)
    if (!role) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    const body = (await request.json().catch(() => ({}))) as { year?: number }
    const rawYear = Number(body.year)
    const currentYear = new Date().getUTCFullYear()
    if (!Number.isFinite(rawYear) || rawYear > currentYear || rawYear < 1990) {
      return NextResponse.json({ ok: false, error: 'Valid year is required.' }, { status: 400 })
    }
    const year = Math.floor(rawYear)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const accessToken = process.env.SPARK_API_KEY
    if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
      return NextResponse.json({ ok: false, error: 'Supabase service role is not configured' }, { status: 503 })
    }
    if (!accessToken?.trim()) {
      return NextResponse.json({ ok: false, error: 'SPARK_API_KEY is not configured' }, { status: 503 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: stateRow } = await supabase
      .from('sync_state')
      .select('year_sync_matrix_cache')
      .eq('id', 'default')
      .maybeSingle()

    const cache = parseYearCache((stateRow as { year_sync_matrix_cache?: unknown } | null)?.year_sync_matrix_cache)

    const anyRunning = Object.values(cache.rows).some((r) => r.runStatus === 'running')
    if (anyRunning) {
      const runningEntry = Object.entries(cache.rows).find(([, r]) => r.runStatus === 'running')
      const runningYear = runningEntry?.[0] ?? 'unknown'
      return NextResponse.json(
        { ok: false, error: `A sync is already running (year ${runningYear}). Only one sync at a time.` },
        { status: 409 }
      )
    }

    const sparkMin = typeof cache.sparkMinYear === 'number' ? cache.sparkMinYear : null
    if (sparkMin != null && year < sparkMin) {
      return NextResponse.json({ ok: false, error: 'Year is before data range.' }, { status: 400 })
    }

    const yearKey = String(year)
    const runStartedAt = new Date().toISOString()
    cache.rows[yearKey] = {
      ...(cache.rows[yearKey] ?? {}),
      runStatus: 'running',
      runPhase: 'Starting…',
      runStartedAt,
      runUpdatedAt: runStartedAt,
      processedListings: 0,
      totalListings: 0,
      listingsUpserted: 0,
      historyInserted: 0,
      lastError: null,
    }
    cache.updatedAt = runStartedAt
    await supabase
      .from('sync_state')
      .upsert({ id: 'default', year_sync_matrix_cache: cache, updated_at: runStartedAt }, { onConflict: 'id' })

    after(() =>
      runYearSyncWithPersistence(year, { supabase, token: accessToken }).catch(() => {})
    )

    return NextResponse.json(
      { ok: true, message: 'Sync started. It runs in the background and will continue if you leave this page.' },
      { status: 202 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
