'use client'

import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from '@/lib/utils'

type YearRow = {
  year: number
  total: number
  finalized: number
  remaining: number
}

type Payload = {
  ok: boolean
  scope: { fromYear: number; toYear: number; mode: 'explicit' | 'lookback' | 'all' }
  workingRange: { fromYear: number | null; toYear: number | null }
  scopeTotals?: { total: number; finalized: number; remaining: number }
  degraded?: boolean
  warnings?: string[]
  rows: YearRow[]
  checkedAt: string
  error?: string
}

type LiveScopePayload = {
  ok: boolean
  scopeTerminal?: {
    total: number
    finalized: number
    remaining: number
    degraded: boolean
    warnings: string[]
  } | null
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export default function SyncTerminalYearlyBreakdown({ embedded = false }: { embedded?: boolean }) {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fromYear, setFromYear] = useState<string>('')
  const [toYear, setToYear] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null)
  const [lastManualRefreshAt, setLastManualRefreshAt] = useState<string | null>(null)
  const [liveScopeTotals, setLiveScopeTotals] = useState<LiveScopePayload['scopeTerminal'] | null>(null)

  async function load(syncInputs = true, source: 'auto' | 'manual' | 'initial' | 'save' = 'auto') {
    try {
      setLoading(true)
      const force = source === 'manual' || source === 'save'
      const query = force ? '?force=1' : ''
      const [res, liveRes] = await Promise.all([
        fetch(`/api/admin/sync/yearly-breakdown${query}`, {
          method: 'GET',
          cache: 'no-store',
        }),
        fetch(`/api/admin/sync/live?includeScopeTerminal=1&scopeOnly=1${force ? '&force=1' : ''}`, {
          method: 'GET',
          cache: 'no-store',
        }),
      ])
      if (!res.ok) throw new Error(`Yearly breakdown request failed (${res.status})`)
      const data = (await res.json()) as Payload
      const liveData = liveRes.ok ? (await liveRes.json()) as LiveScopePayload : null
      setPayload(data)
      setLiveScopeTotals(liveData?.scopeTerminal ?? null)
      if (syncInputs) {
        setFromYear(String(data.scope.fromYear))
        setToYear(String(data.scope.toYear))
      }
      const nowIso = new Date().toISOString()
      setLastLoadedAt(nowIso)
      if (source === 'manual') setLastManualRefreshAt(nowIso)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    void load(true, 'initial').then(() => {
      if (cancelled) return
    })
    const id = setInterval(() => {
      if (!cancelled && !saving) {
        void load(false, 'auto')
      }
    }, 10000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [saving])

  async function saveScope(nextFrom: number | null, nextTo: number | null) {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/sync/terminal-scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ fromYear: nextFrom, toYear: nextTo }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string; scope?: { fromYear: number | null; toYear: number | null } }
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Save failed (${res.status})`)
      }
      if (data.scope) {
        setFromYear(data.scope.fromYear != null ? String(data.scope.fromYear) : '')
        setToYear(data.scope.toYear != null ? String(data.scope.toYear) : '')
      }
      await load(true, 'save')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const rows = payload?.rows ?? []
  const scopeLabel = payload
    ? `${payload.scope.fromYear}–${payload.scope.toYear} (${payload.scope.mode})`
    : '—'
  const workingLabel = payload?.workingRange.fromYear && payload?.workingRange.toYear
    ? `${payload.workingRange.fromYear}–${payload.workingRange.toYear}`
    : payload?.workingRange.fromYear
      ? String(payload.workingRange.fromYear)
      : 'None remaining in current scope'
  const yearlyScopeRemaining = payload?.scopeTotals?.remaining ?? null
  const liveScopeRemaining = liveScopeTotals?.remaining ?? null
  const consistencyDelta =
    yearlyScopeRemaining != null && liveScopeRemaining != null
      ? Math.abs(yearlyScopeRemaining - liveScopeRemaining)
      : null
  const consistencyTolerance =
    yearlyScopeRemaining != null
      ? Math.max(5, Math.ceil(yearlyScopeRemaining * 0.01))
      : 5
  const consistencyOk = consistencyDelta != null && consistencyDelta <= consistencyTolerance
  const hasDetailedWarnings = (payload?.warnings?.length ?? 0) > 0 || (liveScopeTotals?.warnings?.length ?? 0) > 0

  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card p-5 shadow-sm",
        embedded ? "mt-4" : "mt-6"
      )}
      aria-labelledby="yearly-terminal-heading"
    >
      <h2 id="yearly-terminal-heading" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Terminal yearly breakdown</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Configured backfill scope</p>
          <p className="mt-0.5 font-mono text-sm font-medium text-foreground">{scopeLabel}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Current remaining range</p>
          <p className="mt-0.5 font-mono text-sm font-medium text-foreground">{workingLabel}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Checked at</p>
          <p className="mt-0.5 font-mono text-sm font-medium text-foreground">{formatDateTime(payload?.checkedAt ?? null)}</p>
        </div>
      </div>
      <div className={cn(
        "mt-3 rounded-lg border px-3 py-2 text-sm",
        consistencyDelta == null
          ? "border-border bg-muted/50 text-muted-foreground"
          : consistencyOk
            ? "border-success/40 bg-success/10 text-success"
            : "border-warning/40 bg-warning/10 text-warning"
      )}>
        <span className="font-medium">Consistency check:</span>{' '}
        {consistencyDelta == null
          ? 'Awaiting live scoped totals.'
          : consistencyOk
            ? `In sync. Yearly remaining ${yearlyScopeRemaining?.toLocaleString()} vs live scoped remaining ${liveScopeRemaining?.toLocaleString()} (delta ${consistencyDelta.toLocaleString()}, tolerance ${consistencyTolerance.toLocaleString()}).`
            : `Potential mismatch. Yearly remaining ${yearlyScopeRemaining?.toLocaleString()} vs live scoped remaining ${liveScopeRemaining?.toLocaleString()} (delta ${consistencyDelta.toLocaleString()}, tolerance ${consistencyTolerance.toLocaleString()}).`}
        {liveScopeTotals?.degraded && (
          <span className="ml-1 text-xs text-warning">Live scoped totals are degraded due to transient count errors.</span>
        )}
        {liveScopeTotals && (
          <span className="ml-1 text-xs text-muted-foreground">
            (Live scoped total {liveScopeTotals.total.toLocaleString()}, finalized {liveScopeTotals.finalized.toLocaleString()}, remaining {liveScopeTotals.remaining.toLocaleString()})
          </span>
        )}
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load(false, 'manual')}
            disabled={loading || saving}
          >
            {loading ? 'Refreshing...' : 'Refresh scoped diagnostics now'}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            Last manual refresh: {formatDateTime(lastManualRefreshAt)}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="global-terminal-from-year" className="text-xs text-muted-foreground">Global from year</Label>
          <Input
            id="global-terminal-from-year"
            type="number"
            value={fromYear}
            onChange={(e) => setFromYear(e.target.value)}
            placeholder="e.g. 2020"
            className="mt-1"
            disabled={saving}
          />
        </div>
        <div>
          <Label htmlFor="global-terminal-to-year" className="text-xs text-muted-foreground">Global to year</Label>
          <Input
            id="global-terminal-to-year"
            type="number"
            value={toYear}
            onChange={(e) => setToYear(e.target.value)}
            placeholder="e.g. 2025"
            className="mt-1"
            disabled={saving}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            onClick={() => {
              const from = fromYear.trim() ? Number(fromYear.trim()) : null
              const to = toYear.trim() ? Number(toYear.trim()) : null
              void saveScope(Number.isFinite(from as number) ? (from as number) : null, Number.isFinite(to as number) ? (to as number) : null)
            }}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving…' : 'Apply global year scope'}
          </Button>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const now = new Date().getUTCFullYear()
              setFromYear(String(now - 4))
              setToYear(String(now))
              void saveScope(now - 4, now)
            }}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving…' : 'One click last 5 years'}
          </Button>
        </div>
      </div>

      {loading && rows.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Loading yearly breakdown...</p>}
      {error && <p className="mt-2 text-sm text-warning">{error}</p>}
      {payload?.degraded && (
        <p className="mt-2 text-sm text-warning">
          Yearly counts are degraded due to transient query errors. Auto retry is on and the table will self-correct as retries succeed.
        </p>
      )}
      {hasDetailedWarnings && (
        <div className="mt-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
          <p className="text-xs font-medium text-warning">Scoped diagnostics warnings</p>
          {(payload?.warnings ?? []).slice(0, 4).map((warning) => (
            <p key={`yearly-${warning}`} className="mt-1 text-xs text-warning">{warning}</p>
          ))}
          {(liveScopeTotals?.warnings ?? []).slice(0, 4).map((warning) => (
            <p key={`live-${warning}`} className="mt-1 text-xs text-warning">{warning}</p>
          ))}
        </div>
      )}
      {payload?.scopeTotals && (
        <p className="mt-1 text-xs text-muted-foreground">
          In-scope totals: {payload.scopeTotals.total.toLocaleString()} total · {payload.scopeTotals.finalized.toLocaleString()} finalized · {payload.scopeTotals.remaining.toLocaleString()} remaining
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <Table className="min-w-full border-collapse text-sm">
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead className="py-1.5 pr-2 text-left font-medium text-muted-foreground">Year</TableHead>
                <TableHead className="py-1.5 px-2 text-right font-medium text-muted-foreground">Total</TableHead>
                <TableHead className="py-1.5 px-2 text-right font-medium text-muted-foreground">Finalized</TableHead>
                <TableHead className="py-1.5 pl-2 text-right font-medium text-muted-foreground">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.year} className="border-b border-border">
                  <TableCell className="py-1.5 pr-2 text-foreground">{row.year}</TableCell>
                  <TableCell className="py-1.5 px-2 text-right font-mono text-foreground">{row.total.toLocaleString()}</TableCell>
                  <TableCell className="py-1.5 px-2 text-right font-mono text-success">{row.finalized.toLocaleString()}</TableCell>
                  <TableCell className={`py-1.5 pl-2 text-right font-mono ${row.remaining > 0 ? 'text-warning' : 'text-success'}`}>
                    {row.remaining.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Use Advanced controls to run closed-terminal backfill for a selected year range.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Auto refresh every 10s{lastLoadedAt ? ` (last refresh ${formatDateTime(lastLoadedAt)})` : ''}.
      </p>
    </section>
  )
}
