import Link from 'next/link'
import type { DeltaCheckpointRow } from '@/app/actions/sync-full-cron'
type DeltaCheckpointMetadata = NonNullable<DeltaCheckpointRow['metadata']>

import type { SyncHistoryRow } from '@/app/actions/sync-history'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { listingDetailPath } from '@/lib/slug'

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function deltaSummary(row: DeltaCheckpointRow): string {
  const meta = row.metadata ?? {}
  const created = (meta.listingsCreated ?? []).length
  const updated = (meta.listingsUpdated ?? []).length
  const closed = (meta.listingsClosed ?? []).length
  const pending = (meta.listingsPending ?? []).length
  const expired = (meta.listingsExpired ?? []).length
  const backOnMarket = (meta.listingsBackOnMarket ?? []).length
  const priceDropped = (meta.listingsPriceDropped ?? []).length
  const parts: string[] = []
  if (created > 0) parts.push(`${created} created`)
  if (updated > 0) parts.push(`${updated} updated`)
  if (closed > 0) parts.push(`${closed} closed`)
  if (pending > 0) parts.push(`${pending} pending`)
  if (expired > 0) parts.push(`${expired} expired`)
  if (backOnMarket > 0) parts.push(`${backOnMarket} back on market`)
  if (priceDropped > 0) parts.push(`${priceDropped} price drops`)
  if (parts.length === 0 && (row.total_count ?? 0) > 0) parts.push(`${row.total_count} listings`)
  if (parts.length === 0) return '0 listings'
  return parts.join(', ')
}

function listingHref(listingKey: string): string {
  return listingDetailPath(listingKey, undefined, undefined, undefined)
}

type DeltaSummaryKey = 'created' | 'updated' | 'closed' | 'pending' | 'expired' | 'backOnMarket' | 'priceDropped'

function eventLabel(key: DeltaSummaryKey): string {
  switch (key) {
    case 'created':
      return 'New listings'
    case 'updated':
      return 'Updated listings'
    case 'closed':
      return 'Closed listings'
    case 'pending':
      return 'Pending listings'
    case 'expired':
      return 'Expired or off market'
    case 'backOnMarket':
      return 'Back on market'
    case 'priceDropped':
      return 'Price drops'
    default:
      return key
  }
}

function metadataLinks(meta: DeltaCheckpointMetadata): Array<{ label: string; keys: string[] }> {
  return [
    { label: eventLabel('created'), keys: meta.listingsCreated ?? [] },
    { label: eventLabel('updated'), keys: meta.listingsUpdated ?? [] },
    { label: eventLabel('closed'), keys: meta.listingsClosed ?? [] },
    { label: eventLabel('pending'), keys: meta.listingsPending ?? [] },
    { label: eventLabel('expired'), keys: meta.listingsExpired ?? [] },
    { label: eventLabel('backOnMarket'), keys: meta.listingsBackOnMarket ?? [] },
    { label: eventLabel('priceDropped'), keys: meta.listingsPriceDropped ?? [] },
  ].filter((entry) => entry.keys.length > 0)
}

type LogEntry =
  | { type: 'delta'; at: string; summary: string; row: DeltaCheckpointRow }
  | { type: 'full'; at: string; summary: string; row: SyncHistoryRow }

type Props = {
  deltaRows: DeltaCheckpointRow[]
  fullRows: SyncHistoryRow[]
  /** Max entries to show (combined). */
  limit?: number
}

export default function SyncRunLog({ deltaRows, fullRows, limit = 60 }: Props) {
  const entries: LogEntry[] = []

  for (const row of deltaRows) {
    entries.push({ type: 'delta', at: row.completed_at, summary: deltaSummary(row), row })
  }
  for (const row of fullRows) {
    const parts: string[] = []
    if ((row.listings_upserted ?? 0) > 0) parts.push(`${(row.listings_upserted ?? 0).toLocaleString()} listings`)
    if ((row.history_rows_upserted ?? 0) > 0) parts.push(`${(row.history_rows_upserted ?? 0).toLocaleString()} history`)
    entries.push({ type: 'full', at: row.completed_at, summary: parts.length ? parts.join(', ') : '—', row })
  }

  entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const show = entries.slice(0, limit)

  if (show.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Sync run log</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No sync runs yet. Delta runs appear after `/api/cron/sync-delta` completes; full runs appear when Smart Sync or `/api/cron/sync-full` completes.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Sync run log</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Each run expands to show what changed, how much was pulled, and direct links into the affected listings.
      </p>
      <Accordion type="multiple" className="mt-4">
        {show.map((entry, i) => {
          const value = `${entry.type}-${entry.at}-${i}`
          return (
            <AccordionItem key={value} value={value} className="rounded-lg border border-border px-4 mb-3">
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex w-full flex-col gap-2 text-left md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.type === 'delta' ? 'default' : 'secondary'}>
                      {entry.type === 'delta' ? 'Delta sync' : 'Full sync'}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{formatDateTime(entry.at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.summary}</p>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {entry.type === 'delta' ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Listings fetched</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                          {(entry.row.total_count ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Listings processed</p>
                        <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                          {(entry.row.processed_count ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Completed at</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{formatDateTime(entry.row.completed_at)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Checkpoint</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground break-all">{entry.row.id}</p>
                      </div>
                    </div>
                    {entry.row.metadata ? (
                      <div className="space-y-3">
                        {metadataLinks(entry.row.metadata).map((group) => (
                          <div key={group.label} className="rounded-lg border border-border bg-muted/20 p-3">
                            <p className="text-sm font-medium text-foreground">
                              {group.label} · {group.keys.length.toLocaleString()}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {group.keys.slice(0, 12).map((listingKey) => (
                                <Link
                                  key={`${group.label}-${listingKey}`}
                                  href={listingHref(listingKey)}
                                  className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  {listingKey}
                                </Link>
                              ))}
                              {group.keys.length > 12 && (
                                <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                                  +{(group.keys.length - 12).toLocaleString()} more
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No per-event metadata available for this run.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Completed at</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{formatDateTime(entry.row.completed_at)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Listings upserted</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                        {(entry.row.listings_upserted ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">History rows upserted</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                        {(entry.row.history_rows_upserted ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                        {(entry.row.duration_seconds ?? 0).toLocaleString()}s
                      </p>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
