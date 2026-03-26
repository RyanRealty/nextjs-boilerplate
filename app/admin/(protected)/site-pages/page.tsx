import { getBrokerageSettings } from '@/app/actions/brokerage'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth'
import { getAdminRoleForEmail } from '@/app/actions/admin-roles'
import SiteLogoForm from './SiteLogoForm'
import HeroMediaForm from './HeroMediaForm'
import TeamImageForm from './TeamImageForm'
import SitePagesList from './SitePagesList'

export const dynamic = 'force-dynamic'

export default async function AdminSitePagesPage() {
  const session = await getSession()
  const adminRole = await getAdminRoleForEmail(session?.user?.email ?? null)
  if (adminRole?.role !== 'superuser') redirect('/admin/access-denied')

  const brokerage = await getBrokerageSettings()
  const logoUrl = brokerage?.logo_url ?? null
  const heroVideoUrl = brokerage?.hero_video_url ?? null
  const heroImageUrl = brokerage?.hero_image_url ?? null
  const teamImageUrl = brokerage?.team_image_url ?? null

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Site pages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Logo, branding, hero media, and editable content for public pages.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Need broader asset control? Open the <Link href="/admin/media" className="underline">Media Library</Link>.
      </p>

      <div className="mt-8">
        <SiteLogoForm initialLogoUrl={logoUrl} />
      </div>

      <div className="mt-10">
        <HeroMediaForm initialHeroVideoUrl={heroVideoUrl} initialHeroImageUrl={heroImageUrl} />
      </div>

      <div className="mt-10">
        <TeamImageForm initialTeamImageUrl={teamImageUrl} />
      </div>

      <div className="mt-10">
        <SitePagesList />
      </div>
    </main>
  )
}
