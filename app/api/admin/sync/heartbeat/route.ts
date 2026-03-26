import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { getSyncCursor, runOneFullSyncChunk } from '@/app/actions/sync-full-cron'
import { syncListingHistory } from '@/app/actions/sync-spark'
import { createClient } from '@supabase/supabase-js'

const HEARTBEAT_TICK_MS = 5000
const HEARTBEAT_MAX_CHUNKS = Math.max(1, Math.min(12, Number(process.env.SYNC_HEARTBEAT_MAX_CHUNKS ?? 6)))
const TERMINAL_ONLY_FLAG = (process.env.SYNC_TERMINAL_ONLY_MODE ?? '1').toLowerCase()
const SYNC_TERMINAL_ONLY_MODE =
  TERMINAL_ONLY_FLAG === '1' ||
  TERMINAL_ONLY_FLAG === 'true'

export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAdminRoleForEmail(user.email)
    if (!role) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const cursor = await getSyncCursor()
    if (!cursor) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'no_cursor' })
    }

    const hasWork = cursor.phase !== 'idle'
    if (!hasWork) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'idle' })
    }

    const updatedAt = cursor.updatedAt ? new Date(cursor.updatedAt).getTime() : 0
    const shouldTick = !updatedAt || (Date.now() - updatedAt) > HEARTBEAT_TICK_MS
    if (!shouldTick) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'throttled' })
    }

    if (SYNC_TERMINAL_ONLY_MODE) {
      const shouldRunTerminal = cursor.phase === 'history' && !!cursor.runStartedAt
      if (!shouldRunTerminal) {
        return NextResponse.json({ ok: true, skipped: true, reason: 'idle' })
      }
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
        return NextResponse.json({ ok: false, error: 'Supabase service role is not configured' }, { status: 503 })
      }
      const serviceSupabase = createClient(supabaseUrl, serviceKey)
      const limit = Math.max(1, Math.min(100, Number(process.env.SYNC_TERMINAL_HEARTBEAT_LIMIT ?? 8)))

      let chunkCount = 0
      let historyRows = 0
      let result: Awaited<ReturnType<typeof syncListingHistory>> | null = null
      while (chunkCount < HEARTBEAT_MAX_CHUNKS) {
        const r = await syncListingHistory({
          limit,
          offset: 0,
          activeAndPendingOnly: false,
        })
        result = r
        chunkCount++
        historyRows += r.historyRowsUpserted ?? 0
        if (!r.success || r.nextOffset == null) break
      }
      if (!result) {
        return NextResponse.json({ ok: false, error: 'No terminal heartbeat chunks executed.' }, { status: 500 })
      }
      const now = new Date().toISOString()
      if (result.success) {
        await serviceSupabase
          .from('sync_cursor')
          .upsert(
            {
              id: 'default',
              phase: result.nextOffset == null ? 'idle' : 'history',
              run_started_at: result.nextOffset == null ? null : (cursor.runStartedAt ?? now),
              run_history_rows: (cursor.runHistoryRows ?? 0) + historyRows,
              paused: result.nextOffset == null ? true : false,
              error: null,
              updated_at: now,
            },
            { onConflict: 'id' }
          )
      } else {
        const errorText = (result.error ?? result.message ?? '').trim() || 'Terminal heartbeat chunk failed'
        await serviceSupabase
          .from('sync_cursor')
          .upsert(
            {
              id: 'default',
              phase: 'history',
              run_started_at: cursor.runStartedAt ?? now,
              error: errorText,
              updated_at: now,
            },
            { onConflict: 'id' }
          )
      }
      return NextResponse.json({
        ok: result.success,
        recovered: result.success,
        chunksExecuted: chunkCount,
        phase: result.nextOffset == null ? 'idle' : 'history',
        done: result.nextOffset == null,
        message: result.message,
        error: result.error,
      }, { status: result.success ? 200 : 500 })
    }

    let chunkCount = 0
    let result: Awaited<ReturnType<typeof runOneFullSyncChunk>> | null = null
    while (chunkCount < HEARTBEAT_MAX_CHUNKS) {
      const r = await runOneFullSyncChunk()
      result = r
      chunkCount++
      if (!r.ok || r.done) break
    }
    if (!result) {
      return NextResponse.json({ ok: false, error: 'No heartbeat chunks executed.' }, { status: 500 })
    }
    return NextResponse.json({
      ok: result.ok,
      recovered: result.ok,
      chunksExecuted: chunkCount,
      phase: result.phase,
      done: result.done,
      message: result.message,
      error: result.error,
    }, { status: result.ok ? 200 : 500 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
