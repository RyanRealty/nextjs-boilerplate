import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { createClient } from '@supabase/supabase-js'
import { getTerminalScopeCounts } from '@/lib/terminal-scope-counts'

export const dynamic = 'force-dynamic'

function getConfiguredYearScope(scopeRow?: { terminal_from_year?: number | null; terminal_to_year?: number | null } | null) {
  const currentYear = new Date().getUTCFullYear()
  const rawFrom = Number(scopeRow?.terminal_from_year ?? process.env.SYNC_TERMINAL_FROM_YEAR ?? 0)
  const rawTo = Number(scopeRow?.terminal_to_year ?? process.env.SYNC_TERMINAL_TO_YEAR ?? 0)
  const rawLookback = Number(process.env.SYNC_TERMINAL_LOOKBACK_YEARS ?? 5)

  const fromYear = Number.isFinite(rawFrom) && rawFrom > 0 ? Math.floor(rawFrom) : 0
  const toYear = Number.isFinite(rawTo) && rawTo > 0 ? Math.floor(rawTo) : 0
  const lookbackYears = Number.isFinite(rawLookback) ? Math.max(0, Math.min(20, Math.floor(rawLookback))) : 5

  if (fromYear > 0 || toYear > 0) {
    const start = fromYear > 0 ? fromYear : 1990
    const end = toYear > 0 ? toYear : currentYear
    return { fromYear: Math.min(start, end), toYear: Math.max(start, end), mode: 'explicit' as const }
  }

  if (lookbackYears > 0) {
    return { fromYear: currentYear - lookbackYears + 1, toYear: currentYear, mode: 'lookback' as const }
  }

  return { fromYear: 1990, toYear: currentYear, mode: 'all' as const }
}

type ScopeCachePayload = {
  version: 1
  scopeFromYear: number
  scopeToYear: number
  rowsByYear: Awaited<ReturnType<typeof getTerminalScopeCounts>>['result']['rowsByYear']
  scopeTotals: Awaited<ReturnType<typeof getTerminalScopeCounts>>['result']['scopeTotals']
  warnings: string[]
  meta: { yearsTotal: number; yearsFullyFailed: number; catastrophicTimeout: boolean }
  checkedAt: string
}

function isMissingCacheColumns(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error ?? '')
  return /column .*terminal_scope_counts_cache.* does not exist/i.test(msg)
}

function parseScopeCache(raw: unknown): ScopeCachePayload | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Partial<ScopeCachePayload>
  if (obj.version !== 1) return null
  if (!Number.isFinite(Number(obj.scopeFromYear)) || !Number.isFinite(Number(obj.scopeToYear))) return null
  if (!Array.isArray(obj.rowsByYear)) return null
  if (!obj.scopeTotals || typeof obj.scopeTotals !== 'object') return null
  return obj as ScopeCachePayload
}

export async function GET(request: Request) {
  try {
    const supabaseAuth = await createServerClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAdminRoleForEmail(user.email)
    if (!role) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl?.trim() || !serviceKey?.trim()) {
      return NextResponse.json({ ok: false, error: 'Supabase service role is not configured' }, { status: 503 })
    }
    const supabase = createClient(supabaseUrl, serviceKey)
    const force = new URL(request.url).searchParams.get('force') === '1'
    const cacheTtlSeconds = Math.max(30, Math.min(3600, Number(process.env.SYNC_SCOPE_CACHE_TTL_SECONDS ?? 600)))

    const scopeSelectWithCache =
      'terminal_from_year, terminal_to_year, terminal_scope_counts_cache, terminal_scope_counts_cache_checked_at'
    const fallbackScopeSelect = 'terminal_from_year, terminal_to_year'
    const { data: scopeRowWithCache, error: scopeRowError } = await supabase
      .from('sync_state')
      .select(scopeSelectWithCache)
      .eq('id', 'default')
      .maybeSingle()
    let scopeRow: Record<string, unknown> | null = scopeRowWithCache as Record<string, unknown> | null
    if (scopeRowError && isMissingCacheColumns(scopeRowError)) {
      const { data: fallbackRow } = await supabase
        .from('sync_state')
        .select(fallbackScopeSelect)
        .eq('id', 'default')
        .maybeSingle()
      scopeRow = fallbackRow as Record<string, unknown> | null
    } else if (scopeRowError) {
      return NextResponse.json({ ok: false, error: scopeRowError.message }, { status: 500 })
    }
    const persistedScope = scopeRow as { terminal_from_year?: number | null; terminal_to_year?: number | null } | null

    const scope = getConfiguredYearScope(persistedScope)
    const cachedPayload = parseScopeCache(scopeRow?.terminal_scope_counts_cache)
    const cacheCheckedAtRaw = typeof scopeRow?.terminal_scope_counts_cache_checked_at === 'string'
      ? scopeRow.terminal_scope_counts_cache_checked_at
      : null
    const cacheAgeMs = cacheCheckedAtRaw ? Date.now() - new Date(cacheCheckedAtRaw).getTime() : Number.POSITIVE_INFINITY
    const cacheFresh = cacheAgeMs >= 0 && cacheAgeMs <= cacheTtlSeconds * 1000
    const cacheScopeMatch =
      cachedPayload != null &&
      cachedPayload.scopeFromYear === scope.fromYear &&
      cachedPayload.scopeToYear === scope.toYear
    if (!force && cacheFresh && cacheScopeMatch && cachedPayload) {
      const yearRows = [...cachedPayload.rowsByYear]
      const remainingYears = yearRows.filter((row) => row.remaining > 0).map((row) => row.year)
      const workingRange = {
        fromYear: remainingYears.length > 0 ? Math.min(...remainingYears) : null,
        toYear: remainingYears.length > 0 ? Math.max(...remainingYears) : null,
      }
      return NextResponse.json(
        {
          ok: true,
          scope,
          workingRange,
          scopeTotals: cachedPayload.scopeTotals,
          degraded: cachedPayload.warnings.length > 0,
          meta: cachedPayload.meta,
          warnings: cachedPayload.warnings.slice(0, 8),
          rows: yearRows.sort((a, b) => b.year - a.year),
          notes: {
            yearSource:
              'Closed uses CloseDate when available (fallback ModificationTimestamp). Expired/withdrawn/canceled use ListDate first, then OnMarketDate, then ModificationTimestamp as final fallback.',
            source: 'sync_state_cache',
          },
          checkedAt: cachedPayload.checkedAt,
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      )
    }

    const { result, warnings, meta } = await getTerminalScopeCounts(
      supabase,
      {
        fromYear: scope.fromYear,
        toYear: scope.toYear,
      },
      cachedPayload?.rowsByYear
    )
    const checkedAt = new Date().toISOString()
    const nextCachePayload: ScopeCachePayload = {
      version: 1,
      scopeFromYear: scope.fromYear,
      scopeToYear: scope.toYear,
      rowsByYear: result.rowsByYear,
      scopeTotals: result.scopeTotals,
      warnings: warnings.slice(0, 8),
      meta,
      checkedAt,
    }
    await supabase
      .from('sync_state')
      .upsert(
        {
          id: 'default',
          terminal_scope_counts_cache: nextCachePayload,
          terminal_scope_counts_cache_checked_at: checkedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (meta.catastrophicTimeout) {
      if (cacheScopeMatch && cachedPayload) {
        const yearRows = [...cachedPayload.rowsByYear]
        const remainingYears = yearRows.filter((row) => row.remaining > 0).map((row) => row.year)
        const workingRange = {
          fromYear: remainingYears.length > 0 ? Math.min(...remainingYears) : null,
          toYear: remainingYears.length > 0 ? Math.max(...remainingYears) : null,
        }
        return NextResponse.json(
          {
            ok: true,
            scope,
            workingRange,
            scopeTotals: cachedPayload.scopeTotals,
            degraded: true,
            meta: cachedPayload.meta,
            warnings: [
              'Counts timed out across all years. Showing last successful cached snapshot.',
              ...warnings,
            ].slice(0, 8),
            rows: yearRows.sort((a, b) => b.year - a.year),
            notes: {
              yearSource:
                'Closed uses CloseDate when available (fallback ModificationTimestamp). Expired/withdrawn/canceled use ListDate first, then OnMarketDate, then ModificationTimestamp as final fallback.',
              source: 'sync_state_cache_fallback',
            },
            checkedAt: cachedPayload.checkedAt,
          },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        )
      }
      return NextResponse.json(
        {
          ok: false,
          error: 'Yearly diagnostics timed out across all years. Keeping previous values on the client until retries succeed.',
          degraded: true,
          warnings: warnings.slice(0, 8),
          checkedAt: new Date().toISOString(),
        },
        { status: 503, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      )
    }
    const yearRows = result.rowsByYear

    const remainingYears = yearRows
      .filter((row) => row.remaining > 0)
      .map((row) => row.year)
    const workingRange = {
      fromYear: remainingYears.length > 0 ? Math.min(...remainingYears) : null,
      toYear: remainingYears.length > 0 ? Math.max(...remainingYears) : null,
    }
    const scopeTotals = result.scopeTotals
    const degraded = warnings.length > 0

    return NextResponse.json(
      {
        ok: true,
        scope,
        workingRange,
        scopeTotals,
        degraded,
        meta,
        warnings: warnings.slice(0, 8),
        rows: yearRows.sort((a, b) => b.year - a.year),
        notes: {
          yearSource:
            'Closed uses CloseDate when available (fallback ModificationTimestamp). Expired/withdrawn/canceled use ListDate first, then OnMarketDate, then ModificationTimestamp as final fallback.',
            source: 'live_recompute',
        },
        checkedAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
