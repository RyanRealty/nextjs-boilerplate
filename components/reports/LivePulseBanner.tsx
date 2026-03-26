import { Card, CardContent } from '@/components/ui/card'

type Props = {
  title: string
  activeCount: number
  pendingCount: number
  newCount7d: number
  updatedAt?: string | null
}

function formatUpdatedAt(value?: string | null) {
  if (!value) return 'Updated recently'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'Updated recently'
  return `Updated ${d.toLocaleDateString()}`
}

export default function LivePulseBanner({ title, activeCount, pendingCount, newCount7d, updatedAt }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{formatUpdatedAt(updatedAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-foreground">Active {activeCount.toLocaleString()}</span>
          <span className="text-foreground">Pending {pendingCount.toLocaleString()}</span>
          <span className="text-foreground">New 7d {newCount7d.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}
