import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runOneFullSyncChunk } from '@/app/actions/sync-full-cron'
import { syncListingHistory, syncSparkListingsDelta } from '@/app/actions/sync-spark'
import { runYearSyncChunk, parseYearCache } from '@/app/api/admin/sync/_shared/run-year-sync'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (secret?.trim()) {
    const auth = request.headers.get('authorization')
    return auth === `Bearer ${secret}`
  }
  return true
}

function parseIntParam(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

type CursorRow = {
  id: string
  phase: string | null
  paused: boolean | null
  abort_requested: boolean | null
  cron_enabled: boolean | null
  error: string | null
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const token = process.env.SPARK_API_KEY
  if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 })
  }
  if (!token?.trim()) {
    return NextResponse.json({ ok: false, error: 'SPARK_API_KEY not configured' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const terminalLimit = parseIntParam(searchParams.get('terminal_limit'), 200, 1, 200)
  const deltaPages = parseIntParam(searchParams.get('delta_pages'), 20, 1, 200)
  const year = Number.parseInt(searchParams.get('year') ?? '', 10)
  const targetYear = Number.isFinite(year) ? year : undefined
  const nowIso = new Date().toISOString()

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: beforeCursor } = await supabase
    .from('sync_cursor')
    .select('id, phase, paused, abort_requested, cron_enabled, error')
    .eq('id', 'default')
    .maybeSingle()

  // Clear stop/pause blockers and ensure cron lane can run.
  const { error: cursorError } = await supabase.from('sync_cursor').upsert(
    {
      id: 'default',
      paused: false,
      abort_requested: false,
      cron_enabled: true,
      error: null,
      updated_at: nowIso,
    },
    { onConflict: 'id' }
  )
  if (cursorError) {
    return NextResponse.json({ ok: false, error: cursorError.message }, { status: 500 })
  }

  // If year cursor is in an impossible state, reset it to idle.
  const { data: yearCursor } = await supabase
    .from('sync_year_cursor')
    .select('id, current_year, phase, next_listing_page, next_history_offset, total_listings')
    .eq('id', 'default')
    .maybeSingle()
  const yearCursorPhase = String((yearCursor as { phase?: string | null } | null)?.phase ?? 'idle')
  const yearCursorCurrentYear = (yearCursor as { current_year?: number | null } | null)?.current_year ?? null
  if ((yearCursorPhase === 'history' || yearCursorPhase === 'listings') && yearCursorCurrentYear == null) {
    await supabase.from('sync_year_cursor').upsert(
      {
        id: 'default',
        phase: 'idle',
        current_year: null,
        next_listing_page: 1,
        next_history_offset: 0,
        total_listings: null,
        updated_at: nowIso,
      },
      { onConflict: 'id' }
    )
  }

  // Remove stale cancel flags so year chunks can continue.
  const { data: stateRow } = await supabase
    .from('sync_state')
    .select('year_sync_matrix_cache')
    .eq('id', 'default')
    .maybeSingle()
  const cache = parseYearCache((stateRow as { year_sync_matrix_cache?: unknown } | null)?.year_sync_matrix_cache)
  let clearedCancelFlags = 0
  for (const key of Object.keys(cache.rows)) {
    if (cache.rows[key]?.cancelRequested === true) {
      cache.rows[key] = { ...cache.rows[key], cancelRequested: false, runStatus: 'idle', runPhase: null }
      clearedCancelFlags += 1
    }
  }
  if (clearedCancelFlags > 0) {
    await supabase
      .from('sync_state')
      .upsert({ id: 'default', year_sync_matrix_cache: cache, updated_at: nowIso }, { onConflict: 'id' })
  }

  async function runFullChunkWithRecovery() {
    const first = await runOneFullSyncChunk()
    if (first.ok) return { result: first, recovered: false, warning: null as string | null }
    const errorText = String(first.error ?? first.message ?? '').toLowerCase()
    const timedOut = errorText.includes('statement timeout') || errorText.includes('57014')
    if (!timedOut) return { result: first, recovered: false, warning: null as string | null }

    // One retry for transient DB timeout on large candidate scans.
    const retry = await runOneFullSyncChunk()
    if (retry.ok) {
      return { result: retry, recovered: true, warning: 'fullChunk recovered after timeout retry' }
    }
    return {
      result: retry,
      recovered: false,
      warning: 'fullChunk timeout persisted; other lanes started and cron will continue retrying',
    }
  }

  // Kick all operational lanes now so user gets immediate confirmation.
  const [fullChunkResult, terminalChunk, deltaChunk, yearChunk] = await Promise.all([
    runFullChunkWithRecovery(),
    syncListingHistory({
      activeAndPendingOnly: false,
      limit: terminalLimit,
      offset: 0,
      workerCount: 1,
      workerIndex: 0,
    }),
    syncSparkListingsDelta({
      maxPages: deltaPages,
      pageSize: 100,
    }),
    runYearSyncChunk({ supabase, token, targetYear }),
  ])
  const fullChunk = fullChunkResult.result
  const fullChunkRecoverableWarning = fullChunkResult.warning

  const { data: afterCursor } = await supabase
    .from('sync_cursor')
    .select('id, phase, paused, abort_requested, cron_enabled, error, updated_at, run_started_at')
    .eq('id', 'default')
    .maybeSingle()

  const hardFail = !terminalChunk.success || !deltaChunk.success || !yearChunk.ok
  const ok = !hardFail
  return NextResponse.json(
    {
      ok,
      message: ok
        ? 'Sync lanes restarted and kick-run completed.'
        : 'Sync start attempted; one or more lanes returned an error.',
      warnings: [fullChunkRecoverableWarning].filter(Boolean),
      confirmations: {
        blockersCleared: {
          before: (beforeCursor as CursorRow | null) ?? null,
          after: afterCursor ?? null,
          clearedCancelFlags,
        },
        lanesStarted: {
          fullChunk,
          fullChunkRecovered: fullChunkResult.recovered,
          terminalChunk,
          deltaChunk,
          yearChunk,
        },
      },
      generatedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 500 }
  )
}
