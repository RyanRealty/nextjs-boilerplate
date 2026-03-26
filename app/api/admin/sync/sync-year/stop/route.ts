import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { parseYearCache } from '../../_shared/run-year-sync'

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
    if (!Number.isFinite(rawYear) || rawYear < 1990) {
      return NextResponse.json({ ok: false, error: 'Valid year is required.' }, { status: 400 })
    }
    const year = Math.floor(rawYear)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: stateRow } = await supabase
      .from('sync_state')
      .select('year_sync_matrix_cache')
      .eq('id', 'default')
      .maybeSingle()

    const cache = parseYearCache((stateRow as { year_sync_matrix_cache?: unknown } | null)?.year_sync_matrix_cache)
    const yearKey = String(year)
    const row = cache.rows[yearKey]
    if (row?.runStatus !== 'running') {
      return NextResponse.json(
        { ok: false, error: `No sync running for year ${year}.` },
        { status: 400 }
      )
    }

    cache.rows[yearKey] = { ...row, cancelRequested: true, runUpdatedAt: new Date().toISOString() }
    cache.updatedAt = new Date().toISOString()
    await supabase
      .from('sync_state')
      .upsert({ id: 'default', year_sync_matrix_cache: cache, updated_at: cache.updatedAt }, { onConflict: 'id' })

    return NextResponse.json({ ok: true, message: 'Stop requested. Sync will finish current chunk and stop.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
