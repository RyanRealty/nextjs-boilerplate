/**
 * POST: manually run one delta sync (super_admin only).
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { isSuperuserAdmin } from '@/lib/admin'
import { syncSparkListingsDelta } from '@/app/actions/sync-spark'

export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isSuperuserAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden: super_admin only' }, { status: 403 })
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
    })
  } catch (e) {
    console.error('POST /api/admin/sync/delta', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 })
  }
}
