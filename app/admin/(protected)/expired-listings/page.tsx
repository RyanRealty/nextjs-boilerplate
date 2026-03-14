import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import { listExpiredListings } from '@/app/actions/expired-listings'
import { ExpiredListingsClient } from './ExpiredListingsClient'
import { ExpiredListingRow } from './ExpiredListingRow'

export const dynamic = 'force-dynamic'

export default async function ExpiredListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; city?: string }>
}) {
  const session = await getSession()
  const adminRole = await getAdminRoleForEmail(session?.user?.email ?? null)
  if (adminRole?.role !== 'superuser') {
    redirect('/admin/access-denied')
  }

  const { page, city } = await searchParams
  const pageNum = Math.max(0, parseInt(String(page), 10) || 0)
  const pageSize = 50
  const { rows, total } = await listExpiredListings({
    limit: pageSize,
    offset: pageNum * pageSize,
    city: city?.trim() || undefined,
  })
  const totalPages = Math.ceil(total / pageSize)

  return (
    <main className="mx-auto max-w-[1600px]">
      <h1 className="text-2xl font-bold text-foreground">Expired listings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        All expired/withdrawn listings for prospecting. Use owner name (or list agent) + address to search online or on Facebook for phone and email, then save contact info below.
      </p>

      <div className="mt-4">
        <ExpiredListingsClient />
      </div>

      <form method="get" className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          name="city"
          defaultValue={city}
          placeholder="Filter by city"
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border">
          Filter
        </button>
      </form>

      <p className="mt-2 text-sm text-muted-foreground">
        {total} total. Page {pageNum + 1} of {totalPages || 1}.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Address</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">City</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Owner name</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">List agent</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">List office</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">List price</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">DOM</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Expired</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Contact / notes</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Search / Edit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">
                  No expired listings yet. Run &quot;Backfill last 6 months from Spark&quot; to load historical data.
                </td>
              </tr>
            ) : (
              rows.map((row) => <ExpiredListingRow key={row.id} row={row} />)
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-4 flex gap-2">
          {pageNum > 0 && (
            <a
              href={`?page=${pageNum - 1}${city ? `&city=${encodeURIComponent(city)}` : ''}`}
              className="rounded bg-border px-3 py-1 text-sm text-foreground hover:bg-border"
            >
              Previous
            </a>
          )}
          {pageNum < totalPages - 1 && (
            <a
              href={`?page=${pageNum + 1}${city ? `&city=${encodeURIComponent(city)}` : ''}`}
              className="rounded bg-border px-3 py-1 text-sm text-foreground hover:bg-border"
            >
              Next
            </a>
          )}
        </nav>
      )}
    </main>
  )
}
