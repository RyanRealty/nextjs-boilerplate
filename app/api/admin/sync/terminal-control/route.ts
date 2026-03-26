import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function getServiceSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl?.trim() || !serviceKey?.trim()) return null
  return createClient(supabaseUrl, serviceKey)
}

export async function POST(request: Request) {
  try {
    const supabaseAuth = await createServerClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const role = await getAdminRoleForEmail(user.email)
    if (!role) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    const body = (await request.json().catch(() => ({}))) as { action?: 'start' | 'stop' }
    if (body.action !== 'start' && body.action !== 'stop') {
      return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 })
    }

    const supabase = await getServiceSupabase()
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase service role is not configured' }, { status: 503 })
    }

    const now = new Date().toISOString()
    if (body.action === 'start') {
      await supabase.from('sync_cursor').upsert(
        {
          id: 'default',
          phase: 'history',
          run_started_at: now,
          run_listings_upserted: 0,
          run_history_rows: 0,
          paused: false,
          abort_requested: false,
          error: null,
          updated_at: now,
        },
        { onConflict: 'id' }
      )
      return NextResponse.json({ ok: true, state: 'running' })
    }

    await supabase
      .from('sync_cursor')
      .upsert(
        {
          id: 'default',
          phase: 'idle',
          run_started_at: null,
          paused: true,
          updated_at: now,
        },
        { onConflict: 'id' }
      )
    return NextResponse.json({ ok: true, state: 'stopped' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
