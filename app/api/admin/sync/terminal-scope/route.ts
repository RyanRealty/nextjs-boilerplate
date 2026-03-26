import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type ScopePayload = {
  fromYear: number | null
  toYear: number | null
}

function normalizeYear(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const y = Math.floor(n)
  const current = new Date().getUTCFullYear()
  if (y < 1990 || y > current) return null
  return y
}

function normalizeScope(input: ScopePayload): ScopePayload {
  const from = normalizeYear(input.fromYear)
  const to = normalizeYear(input.toYear)
  if (from == null && to == null) return { fromYear: null, toYear: null }
  if (from == null) return { fromYear: to, toYear: to }
  if (to == null) return { fromYear: from, toYear: from }
  return from <= to
    ? { fromYear: from, toYear: to }
    : { fromYear: to, toYear: from }
}

function canUseTerminalScopeColumns(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error ?? '')
  return !/column .*terminal_(from|to)_year .* does not exist/i.test(msg)
}

export async function GET() {
  try {
    const supabaseAuth = await createServerClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const role = await getAdminRoleForEmail(user.email)
    if (!role) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
      return NextResponse.json({ ok: false, error: 'Supabase service role is not configured' }, { status: 503 })
    }
    const supabase = createClient(supabaseUrl, serviceKey)
    const { data, error } = await supabase
      .from('sync_state')
      .select('terminal_from_year, terminal_to_year')
      .eq('id', 'default')
      .maybeSingle()
    if (error && canUseTerminalScopeColumns(error)) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    const row = data as { terminal_from_year?: number | null; terminal_to_year?: number | null } | null
    const normalized = normalizeScope({
      fromYear: row?.terminal_from_year ?? null,
      toYear: row?.terminal_to_year ?? null,
    })
    return NextResponse.json({ ok: true, scope: normalized })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabaseAuth = await createServerClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user?.email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    const role = await getAdminRoleForEmail(user.email)
    if (!role) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })

    const body = (await request.json().catch(() => ({}))) as Partial<ScopePayload>
    const normalized = normalizeScope({
      fromYear: body.fromYear ?? null,
      toYear: body.toYear ?? null,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
      return NextResponse.json({ ok: false, error: 'Supabase service role is not configured' }, { status: 503 })
    }
    const supabase = createClient(supabaseUrl, serviceKey)
    const { error } = await supabase.from('sync_state').upsert(
      {
        id: 'default',
        terminal_from_year: normalized.fromYear,
        terminal_to_year: normalized.toYear,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    if (error && canUseTerminalScopeColumns(error)) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    if (error && !canUseTerminalScopeColumns(error)) {
      return NextResponse.json(
        { ok: false, error: 'sync_state is missing terminal scope columns. Run latest Supabase migrations.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ ok: true, scope: normalized })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
