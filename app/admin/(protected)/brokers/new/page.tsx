import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import AdminBrokerCreateForm from '@/app/components/admin/AdminBrokerCreateForm'

export const dynamic = 'force-dynamic'

export default async function AdminBrokerNewPage() {
  const session = await getSession()
  const adminRole = await getAdminRoleForEmail(session?.user?.email ?? null)
  if (adminRole?.role !== 'superuser') redirect('/admin/access-denied')

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/brokers" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Brokers
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Add broker</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Required: display name, slug (URL), title, and Oregon license number. Dates are managed elsewhere.
      </p>
      <AdminBrokerCreateForm className="mt-6" />
    </main>
  )
}
