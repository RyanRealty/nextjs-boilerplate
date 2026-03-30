import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { getAdminSyncCounts } from '@/app/actions/listings'
import { getSyncCursor } from '@/app/actions/sync-full-cron'
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
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const role = await getAdminRoleForEmail(user.email)
    if (!role) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const params = new URL(request.url).searchParams
    const includeScopeTerminal = params.get('includeScopeTerminal') === '1'
    const force = params.get('force') === '1'
    const scopeOnly = params.get('scopeOnly') === '1'
    const cacheTtlSeconds = Math.max(30, Math.min(3600, Number(process.env.SYNC_SCOPE_CACHE_TTL_SECONDS ?? 600)))

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const serviceSupabase =
      supabaseUrl?.trim() && serviceKey?.trim()
        ? createClient(supabaseUrl, serviceKey)
        : null

    let scopeRow: Record<string, unknown> | null = null
    if (serviceSupabase) {
      const { data: scopeWithCache, error: scopeError } = await serviceSupabase
        .from('sync_state')
        .select('terminal_from_year, terminal_to_year, terminal_scope_counts_cache, terminal_scope_counts_cache_checked_at')
        .eq('id', 'default')
        .maybeSingle()
      if (scopeError && isMissingCacheColumns(scopeError)) {
        const { data: fallbackRow } = await serviceSupabase
          .from('sync_state')
          .select('terminal_from_year, terminal_to_year')
          .eq('id', 'default')
          .maybeSingle()
        scopeRow = fallbackRow as Record<string, unknown> | null
      } else if (scopeError) {
        return NextResponse.json({ ok: false, error: scopeError.message }, { status: 500 })
      } else {
        scopeRow = scopeWithCache as Record<string, unknown> | null
      }
    }
    if (serviceSupabase && !scopeRow) {
      const { data: fallbackRow } = await serviceSupabase
        .from('sync_state')
        .select('terminal_from_year, terminal_to_year')
        .eq('id', 'default')
        .maybeSingle()
      scopeRow = fallbackRow as Record<string, unknown> | null
    }
    const scope = getConfiguredYearScope(scopeRow)

    let scopeTerminal:
      | {
          total: number
          finalized: number
          remaining: number
          degraded: boolean
          warnings: string[]
        }
      | null = null
    const resolveScopeTerminal = async () => {
      if (!serviceSupabase) return null
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
        return {
          total: cachedPayload.scopeTotals.total,
          finalized: cachedPayload.scopeTotals.finalized,
          remaining: cachedPayload.scopeTotals.remaining,
          degraded: cachedPayload.warnings.length > 0,
          warnings: cachedPayload.warnings.slice(0, 8),
        }
      }
      const { result, warnings, meta } = await getTerminalScopeCounts(
        serviceSupabase,
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
      await serviceSupabase
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

      if (meta.catastrophicTimeout && cacheScopeMatch && cachedPayload) {
        return {
          total: cachedPayload.scopeTotals.total,
          finalized: cachedPayload.scopeTotals.finalized,
          remaining: cachedPayload.scopeTotals.remaining,
          degraded: true,
          warnings: [
            'Scoped live totals timed out across all years. Showing last successful cached snapshot.',
            ...warnings,
          ].slice(0, 8),
        }
      }
      return {
        total: result.scopeTotals.total,
        finalized: result.scopeTotals.finalized,
        remaining: result.scopeTotals.remaining,
        degraded: warnings.length > 0 || meta.catastrophicTimeout,
        warnings: meta.catastrophicTimeout
          ? [
              'Scoped live totals timed out across all years. Previous dashboard values are retained until retry succeeds.',
              ...warnings,
            ].slice(0, 8)
          : warnings.slice(0, 8),
      }
    }

    if (includeScopeTerminal && serviceSupabase) {
      scopeTerminal = await resolveScopeTerminal()
    }

    if (scopeOnly) {
      return NextResponse.json(
        {
          ok: true,
          serverTime: new Date().toISOString(),
          scope,
          scopeTerminal,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      )
    }

    const [cursor, counts] = await Promise.all([
      getSyncCursor(),
      getAdminSyncCounts(),
    ])

    const closedTotalInDb = counts.closedFinalizedCount + counts.closedNotFinalizedCount
    const expiredTotalInDb = counts.expiredFinalizedCount + counts.expiredNotFinalizedCount
    const withdrawnTotalInDb = counts.withdrawnFinalizedCount + counts.withdrawnNotFinalizedCount
    const canceledTotalInDb = counts.canceledFinalizedCount + counts.canceledNotFinalizedCount
    const terminalTotalInDb = closedTotalInDb + expiredTotalInDb + withdrawnTotalInDb + canceledTotalInDb
    const terminalFinalizedInDb =
      counts.closedFinalizedCount +
      counts.expiredFinalizedCount +
      counts.withdrawnFinalizedCount +
      counts.canceledFinalizedCount
    const terminalRemainingInDb =
      counts.closedNotFinalizedCount +
      counts.expiredNotFinalizedCount +
      counts.withdrawnNotFinalizedCount +
      counts.canceledNotFinalizedCount
    const terminalFinalizedPct =
      terminalTotalInDb > 0 ? Math.min(100, Math.round((terminalFinalizedInDb / terminalTotalInDb) * 1000) / 10) : 0

    return NextResponse.json(
      {
        ok: true,
        serverTime: new Date().toISOString(),
        cursor,
        scope,
        scopeTerminal,
        terminal: {
          closedTotalInDb,
          closedFinalizedCount: counts.closedFinalizedCount,
          closedNotFinalizedCount: counts.closedNotFinalizedCount,
          expiredTotalInDb,
          expiredFinalizedCount: counts.expiredFinalizedCount,
          expiredNotFinalizedCount: counts.expiredNotFinalizedCount,
          withdrawnTotalInDb,
          withdrawnFinalizedCount: counts.withdrawnFinalizedCount,
          withdrawnNotFinalizedCount: counts.withdrawnNotFinalizedCount,
          canceledTotalInDb,
          canceledFinalizedCount: counts.canceledFinalizedCount,
          canceledNotFinalizedCount: counts.canceledNotFinalizedCount,
          terminalTotalInDb,
          terminalFinalizedInDb,
          terminalRemainingInDb,
          terminalFinalizedPct,
        },
        warnings: {
          listingsCountError: counts.listingsCountError ?? null,
          historyError: counts.historyError ?? null,
        },
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
