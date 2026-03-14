import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getAdminListingsPage } from '@/app/actions/admin-listings'

export const metadata: Metadata = {
  title: 'Listings',
  description: 'Manage listings in the admin.',
}

export const dynamic = 'force-dynamic'

type SearchParams = { page?: string; search?: string; status?: string }

function formatPrice(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function daysOnMarket(onMarketDate: string | null | undefined): number | null {
  if (!onMarketDate) return null
  const d = new Date(onMarketDate)
  if (Number.isNaN(d.getTime())) return null
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000))
  return days >= 0 ? days : null
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { page, search, status } = await searchParams
  const pageNum = Math.max(0, parseInt(String(page), 10) || 0)
  const pageSize = 50
  const { rows, total } = await getAdminListingsPage(pageNum, pageSize, search?.trim() || undefined, status || undefined)
  const totalPages = Math.ceil(total / pageSize)

  return (
    <main className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Listings</h1>
        <Link
          href="/admin/sync"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          Sync status
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {total} total. Search by address, MLS number, or listing key.
      </p>

      <form method="get" className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search…"
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={status ?? 'all'} className="rounded-lg border border-border bg-white px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Closed">Closed</option>
        </select>
        <button type="submit" className="rounded-lg bg-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border">
          Filter
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Photo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Address</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Price</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Beds/Baths</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Community</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">DOM</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = (row.ListingKey ?? row.ListNumber ?? '').toString().trim()
              const address = [row.StreetNumber, row.StreetName].filter(Boolean).join(' ').trim() || row.City || key
              const dom = daysOnMarket(row.OnMarketDate)
              return (
                <tr key={key} className="border-b border-border hover:bg-muted">
                  <td className="px-3 py-2">
                    <Link href={`/admin/listings/${encodeURIComponent(key)}`} className="block h-12 w-16 overflow-hidden rounded bg-border">
                      {row.PhotoURL ? (
                        <Image src={row.PhotoURL} alt={`${address} listing photo`} width={64} height={48} className="h-12 w-16 object-cover" />
                      ) : (
                        <span className="flex h-12 w-16 items-center justify-center text-xs text-muted-foreground">—</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/listings/${encodeURIComponent(key)}`} className="font-medium text-foreground hover:underline">
                      {address}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{formatPrice(row.ListPrice)}</td>
                  <td className="px-3 py-2">{row.StandardStatus ?? '—'}</td>
                  <td className="px-3 py-2">{row.BedroomsTotal ?? '—'} / {row.BathroomsTotal ?? '—'}</td>
                  <td className="px-3 py-2">{row.SubdivisionName ?? '—'}</td>
                  <td className="px-3 py-2">{dom != null ? dom : '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.ModificationTimestamp ? new Date(row.ModificationTimestamp).toLocaleDateString() : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {pageNum > 0 && (
            <Link
              href={`/admin/listings?page=${pageNum - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${encodeURIComponent(status)}` : ''}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {pageNum + 1} of {totalPages}
          </span>
          {pageNum < totalPages - 1 && (
            <Link
              href={`/admin/listings?page=${pageNum + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${encodeURIComponent(status)}` : ''}`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </main>
  )
}
