import type { SyncHistoryRow } from '@/app/actions/sync-history'

/** Format ISO date for display. Use UTC and fixed format to avoid server/client hydration mismatch. */
function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    const h = String(d.getUTCHours()).padStart(2, '0')
    const min = String(d.getUTCMinutes()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}`
  } catch {
    return iso
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m ${s}s`
}

type Props = { rows: SyncHistoryRow[] }

export default function SyncHistoryTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Full run history</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No completed full syncs yet. One row is added here each time a full sync finishes (listings + history).
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-lg border border-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Full run history</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        One row per completed full sync. Date, duration, and total listings and history rows for that run.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Date</th>
              <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Type</th>
              <th className="py-2 pr-4 text-right font-medium text-muted-foreground">Time</th>
              <th className="py-2 pr-4 text-right font-medium text-muted-foreground">Listings</th>
              <th className="py-2 pr-4 text-right font-medium text-muted-foreground">History</th>
              <th className="py-2 pr-4 text-right font-medium text-muted-foreground">Photos</th>
              <th className="py-2 pl-4 text-left font-medium text-muted-foreground">Error</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border">
                <td className="py-2 pr-4 text-foreground whitespace-nowrap">{formatDateTime(row.completed_at)}</td>
                <td className="py-2 pr-4 text-muted-foreground capitalize">{row.run_type}</td>
                <td className="py-2 pr-4 text-right font-mono text-muted-foreground">{formatDuration(row.duration_seconds)}</td>
                <td className="py-2 pr-4 text-right font-mono text-muted-foreground">{row.listings_upserted > 0 ? row.listings_upserted.toLocaleString() : '—'}</td>
                <td className="py-2 pr-4 text-right font-mono text-muted-foreground">{row.history_rows_upserted > 0 ? row.history_rows_upserted.toLocaleString() : '—'}</td>
                <td className="py-2 pr-4 text-right font-mono text-muted-foreground">{row.photos_updated > 0 ? row.photos_updated.toLocaleString() : '—'}</td>
                <td className="py-2 pl-4 text-destructive text-xs max-w-[200px] truncate" title={row.error ?? undefined}>{row.error ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
