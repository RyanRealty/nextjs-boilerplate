import Link from 'next/link'
import { getBrokersForAdmin } from '@/app/actions/brokers'

export const dynamic = 'force-dynamic'

export default async function AdminBrokersPage() {
  const brokers = await getBrokersForAdmin()

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Brokers</h1>
        <Link
          href="/admin/brokers/new"
          className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500/85"
        >
          Add broker
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Team members appear on the public <Link href="/team" className="text-green-500 hover:underline">/team</Link> page. Required: display name, title, Oregon license number.
      </p>
      <div className="mt-6 overflow-hidden rounded-lg border border-border bg-white">
        <table className="min-w-full divide-y divide-border">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Profile</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {brokers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No brokers yet. Click &quot;Add broker&quot; to create one (required: display name, slug, title, Oregon license number).
                </td>
              </tr>
            ) : (
              brokers.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{b.display_name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{b.title}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{b.slug}</td>
                  <td className="px-4 py-3">
                    {b.is_active ? (
                      <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-xs text-green-500">Active</span>
                    ) : (
                      <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted-foreground">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {b.is_active && (
                      <Link href={`/team/${b.slug}`} className="text-sm text-green-500 hover:underline" target="_blank" rel="noopener">
                        View
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/brokers/${b.id}`} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
