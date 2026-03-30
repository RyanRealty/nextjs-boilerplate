import { Card, CardContent } from '@/components/ui/card'

type Props = {
  publicRemarks: string | null
  directions: string | null
}

export default function ShowcaseDescription({ publicRemarks, directions }: Props) {
  const hasRemarks = Boolean(publicRemarks?.trim())
  const hasDirections = Boolean(directions?.trim())
  if (!hasRemarks && !hasDirections) return null

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-foreground">About this home</h2>
        {hasRemarks && (
          <div className="mt-4 whitespace-pre-wrap text-sm text-foreground">{publicRemarks!.trim()}</div>
        )}
        {hasDirections && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-foreground">Directions</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{directions!.trim()}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
