import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'

export default async function AdminReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  const adminRole = await getAdminRoleForEmail(session?.user?.email ?? null)
  const canAccess = adminRole?.role === 'superuser' || adminRole?.role === 'report_viewer'
  if (!canAccess) {
    redirect('/admin/access-denied')
  }
  return <>{children}</>
}
