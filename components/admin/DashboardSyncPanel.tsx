import Link from 'next/link'
import type { SyncHistoryRow } from '@/app/actions/sync-history'
import type { SyncCursor } from '@/app/actions/sync-full-cron'
import CronSyncStatus from '@/app/admin/(protected)/sync/CronSyncStatus'

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

type Props = {
  history: SyncHistoryRow[]
  cursor: SyncCursor | null
  counts: {
    activeCount: number
    totalListings: number
    historyCount: number
    historyFinalizedCount: number
    closedFinalizedCount: number
    closedNotFinalizedCount: number
    expiredFinalizedCount?: number
    expiredNotFinalizedCount?: number
    withdrawnFinalizedCount?: number
    withdrawnNotFinalizedCount?: number
    canceledFinalizedCount?: number
    canceledNotFinalizedCount?: number
    historyError?: string
  }
  breakdown: { total: number; byStatus: { status: string; count: number }[]; breakdownError?: string }
  historyTableStatus: { exists: boolean; error?: string }
  dataQuality: { totalListings: number; missingPrimaryPhoto: number; classifiedPhotos: number }
}

export default function DashboardSyncPanel(props: Props) {
  const { history, cursor, counts, breakdown, historyTableStatus, dataQuality } = props
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Listings (total)</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{counts.totalListings.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active</p>
          <p className="mt-1 text-xl font-semibold text-green-500">{counts.activeCount.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-muted p-3" title="Excluded from history re-sync (history_finalized = true)">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Finalized (skipped)</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{counts.historyFinalizedCount.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-muted p-3" title="Closed + history synced">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Closed finalized</p>
          <p className="mt-1 text-xl font-semibold text-green-500">{counts.closedFinalizedCount.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-muted p-3" title="Closed, backfill pending">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Closed not finalized</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{counts.closedNotFinalizedCount.toLocaleString()}</p>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">Current sync state</h3>
        <div className="mt-2">
          <CronSyncStatus cursor={cursor} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">Sync job history (last 10)</h3>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No sync runs recorded yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1.5 pr-3 text-left font-medium text-muted-foreground">Completed</th>
                  <th className="py-1.5 pr-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="py-1.5 pr-3 text-right font-medium text-muted-foreground">Duration</th>
                  <th className="py-1.5 pr-3 text-right font-medium text-muted-foreground">Listings</th>
                  <th className="py-1.5 pl-3 text-left font-medium text-muted-foreground">Error</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((row) => (
                  <tr key={row.id} className={`border-b border-border ${row.error ? 'bg-destructive/10/50' : ''}`}>
                    <td className="py-1.5 pr-3 text-foreground">{formatDateTime(row.completed_at)}</td>
                    <td className="py-1.5 pr-3 capitalize text-muted-foreground">{row.run_type}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-muted-foreground">{formatDuration(row.duration_seconds)}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-muted-foreground">{row.listings_upserted > 0 ? row.listings_upserted.toLocaleString() : '—'}</td>
                    <td className="py-1.5 pl-3 text-xs text-destructive max-w-[180px] truncate" title={row.error ?? undefined}>{row.error ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2">
          <Link href="/admin/sync" className="text-sm font-medium text-green-500 hover:underline">Full sync page</Link>
        </p>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground">Data quality</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-white p-3">
            <p className="text-xs text-muted-foreground">Active listings missing primary photo</p>
            <p className={`mt-1 font-semibold ${dataQuality.missingPrimaryPhoto > 0 ? 'text-yellow-500' : 'text-foreground'}`}>{dataQuality.missingPrimaryPhoto.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-3">
            <p className="text-xs text-muted-foreground">Photos classified</p>
            <p className="mt-1 font-semibold text-foreground">{dataQuality.classifiedPhotos.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-3">
            <p className="text-xs text-muted-foreground">History table</p>
            <p className={`mt-1 text-sm font-medium ${historyTableStatus.exists ? 'text-green-500' : 'text-yellow-500'}`}>{historyTableStatus.exists ? 'OK' : (historyTableStatus.error ?? 'Missing')}</p>
          </div>
        </div>
      </div>
      {!breakdown.breakdownError && breakdown.byStatus.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">By status</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {breakdown.byStatus.slice(0, 8).map(({ status, count }) => (
              <span key={status} className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">{status}: <strong>{count.toLocaleString()}</strong></span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
