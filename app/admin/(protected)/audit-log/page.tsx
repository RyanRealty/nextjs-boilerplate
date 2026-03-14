import { getAdminActions } from '@/app/actions/admin-audit'
import Link from 'next/link'

export default async function AdminAuditLogPage() {
  const actions = await getAdminActions({ limit: 100 })

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">Audit log</h1>
      <p className="mt-1 text-sm text-muted-foreground">Recent admin actions (create, update, delete).</p>
      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-4 py-3 font-medium text-foreground">Time</th>
              <th className="px-4 py-3 font-medium text-foreground">Admin</th>
              <th className="px-4 py-3 font-medium text-foreground">Role</th>
              <th className="px-4 py-3 font-medium text-foreground">Action</th>
              <th className="px-4 py-3 font-medium text-foreground">Resource</th>
              <th className="px-4 py-3 font-medium text-foreground">ID</th>
            </tr>
          </thead>
          <tbody>
            {actions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No actions recorded yet.
                </td>
              </tr>
            ) : (
              actions.map((row) => (
                <tr key={row.id} className="border-b border-border">
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-medium text-foreground">{row.admin_email}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.role ?? '—'}</td>
                  <td className="px-4 py-2 text-foreground">{row.action_type}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.resource_type ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.resource_id ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        <Link href="/admin" className="underline hover:no-underline">Back to Dashboard</Link>
      </p>
    </div>
  )
}
