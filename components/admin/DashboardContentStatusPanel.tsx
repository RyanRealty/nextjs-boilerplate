import Link from 'next/link'
import type { DashboardContentStatus } from '@/app/actions/dashboard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  data: DashboardContentStatus | null
  error: string | null
}

export default function DashboardContentStatusPanel({ data, error }: Props) {
  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>
  }
  if (!data) {
    return <p className="text-sm text-muted-foreground">Unable to load content status.</p>
  }

  const items: { title: string; value: number; caption: string }[] = [
    {
      title: 'Published guides',
      value: data.publishedGuides,
      caption: 'Rows in guides with status published',
    },
    {
      title: 'Published blog posts',
      value: data.publishedBlogPosts,
      caption: 'Rows in blog_posts with status published',
    },
    {
      title: 'Communities with description',
      value: data.communitiesWithDescription,
      caption: 'Rows in communities with a non-null description',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} size="sm">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-foreground">{item.value.toLocaleString()}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/admin/guides">Open guides admin</Link>
      </Button>
    </div>
  )
}
