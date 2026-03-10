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
        <h1 className="text-2xl font-bold text-zinc-900">Listings</h1>
        <Link
          href="/admin/sync"
          className="rounded-lg bg-[var(--brand-navy)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-primary-hover)]"
        >
          Sync status
        </Link>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        {total} total. Search by address, MLS number, or listing key.
      </p>

      <form method="get" className="mt-4 flex flex-wrap gap-2">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={status ?? 'all'} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Closed">Closed</option>
        </select>
        <button type="submit" className="rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-300">
          Filter
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-3 py-2 text-left font-medium text-zinc-700">Photo</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-700">Address</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-700">Price</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-700">Status</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-700">Beds/Baths</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-700">Community</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-700">DOM</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-700">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = (row.ListingKey ?? row.ListNumber ?? '').toString().trim()
              const address = [row.StreetNumber, row.StreetName].filter(Boolean).join(' ').trim() || row.City || key
              const dom = daysOnMarket(row.OnMarketDate)
              return (
                <tr key={key} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-3 py-2">
                    <Link href={`/admin/listings/${encodeURIComponent(key)}`} className="block h-12 w-16 overflow-hidden rounded bg-zinc-200">
                      {row.PhotoURL ? (
                        <Image src={row.PhotoURL} alt="" width={64} height={48} className="h-12 w-16 object-cover" />
                      ) : (
                        <span className="flex h-12 w-16 items-center justify-center text-xs text-zinc-400">—</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/listings/${encodeURIComponent(key)}`} className="font-medium text-zinc-900 hover:underline">
                      {address}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{formatPrice(row.ListPrice)}</td>
                  <td className="px-3 py-2">{row.StandardStatus ?? '—'}</td>
                  <td className="px-3 py-2">{row.BedroomsTotal ?? '—'} / {row.BathroomsTotal ?? '—'}</td>
                  <td className="px-3 py-2">{row.SubdivisionName ?? '—'}</td>
                  <td className="px-3 py-2">{dom != null ? dom : '—'}</td>
                  <td className="px-3 py-2 text-zinc-500">
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
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-600">
            Page {pageNum + 1} of {totalPages}
          </span>
          {pageNum < totalPages - 1 && (
            <Link
              href={`/admin/listings?page=${pageNum + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${encodeURIComponent(status)}` : ''}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </main>
  )
}
