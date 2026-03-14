import Link from 'next/link'
import { listSubdivisionsWithFlags } from '@/app/actions/subdivision-flags'
import ResortCommunityToggle from './ResortCommunityToggle'
import SeedResortButton from './SeedResortButton'

export const dynamic = 'force-dynamic'

export default async function AdminResortCommunitiesPage() {
  const rows = await listSubdivisionsWithFlags()

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Resort & master plan communities</h1>
      <p className="mt-2 text-muted-foreground">
        Flag subdivisions as resort or master plan communities. When flagged, the community page shows the full amenities & lifestyle section (attractions, dining) and resort schema. Unflagged subdivisions use the standard community page.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Changes save automatically when you toggle a checkbox. Subdivisions in the built-in Oregon resort & master plan list appear checked until you turn them off.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        <Link href="/admin" className="underline">← Admin</Link>
      </p>

      <section className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted p-4">
        <span className="text-sm text-muted-foreground">Copy the built-in Oregon resort & master plan list into the database so you can edit it here.</span>
        <SeedResortButton />
      </section>

      <section className="mt-8 rounded-lg border border-border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">City</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Subdivision</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Resort & master plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No subdivisions found. Sync listings first so city/subdivision pairs appear.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.entity_key}
                    className={r.is_resort ? 'bg-green-500/10/60 hover:bg-green-500/10' : 'hover:bg-muted'}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">{r.city}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{r.subdivision}</td>
                    <td className="px-4 py-3">
                      <ResortCommunityToggle entityKey={r.entity_key} initialResort={r.is_resort} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-4 text-xs text-muted-foreground">
        Rows with a green tint are currently treated as resort & master plan communities on the site. Toggle off to remove that treatment; toggle on to add it (and backfill hero + content if needed).
      </p>
    </main>
  )
}
