import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import AdminMediaManager from './AdminMediaManager'

export const dynamic = 'force-dynamic'

export default async function AdminMediaPage() {
  const session = await getSession()
  const adminRole = await getAdminRoleForEmail(session?.user?.email ?? null)
  if (adminRole?.role !== 'superuser') redirect('/admin/access-denied')

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Media</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage uploaded media for branding, brokers, banners, and reports from one place.
      </p>
      <div className="mt-6">
        <AdminMediaManager />
      </div>
    </main>
  )
}
