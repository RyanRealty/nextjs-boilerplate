import Link from 'next/link'
import { getCurrentBrokerDashboard } from '@/app/actions/broker-self'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function money(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

export default async function BrokerDashboardPage() {
  const data = await getCurrentBrokerDashboard()
  if (!data) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Broker dashboard</h1>
        <p className="text-muted-foreground">This account is not mapped to a broker profile yet.</p>
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Broker dashboard</h1>
        <p className="text-muted-foreground">
          {data.broker.display_name} performance snapshot for listings, engagement, and recent sales.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Active listings</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-foreground">{data.activeListings.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sold 24 months</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-foreground">{data.sold24m.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sold volume 24 months</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-foreground">{money(data.soldVolume24m)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Views</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-foreground">{data.viewCount.toLocaleString()}</p></CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Saves</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-foreground">{data.saveCount.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Likes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold text-foreground">{data.likeCount.toLocaleString()}</p></CardContent>
        </Card>
      </section>

      <Link
        href={`/team/${data.broker.slug}/edit`}
        className="inline-flex rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        Edit broker profile
      </Link>
    </main>
  )
}
