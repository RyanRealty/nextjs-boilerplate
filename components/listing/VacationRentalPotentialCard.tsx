import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { VacationRentalPotential } from '@/lib/vacation-rental-potential'

function labelForSuitability(value: VacationRentalPotential['suitability']) {
  switch (value) {
    case 'high':
      return 'High rental potential'
    case 'medium':
      return 'Moderate rental potential'
    default:
      return 'Limited rental potential'
  }
}

type Props = {
  potential: VacationRentalPotential
}

export default function VacationRentalPotentialCard({ potential }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Vacation rental potential</CardTitle>
          <Badge variant={potential.suitability === 'high' ? 'default' : 'secondary'}>
            {labelForSuitability(potential.suitability)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="text-xs text-muted-foreground">Suitability score</p>
            <p className="text-2xl font-semibold text-foreground">{potential.score}/100</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estimated monthly revenue</p>
            <p className="text-2xl font-semibold text-foreground">
              {potential.estimatedMonthlyRevenue != null
                ? `$${potential.estimatedMonthlyRevenue.toLocaleString()}`
                : 'Not available'}
            </p>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          {potential.notes.map((note) => (
            <p key={note} className="text-sm text-muted-foreground">
              {note}
            </p>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Source: {potential.confidence === 'provider' ? 'Provider estimate' : 'Heuristic estimate'}
        </p>
        <Link href="/contact" className="text-sm font-medium text-primary hover:underline">
          Ask our team for STR rule and permit guidance
        </Link>
      </CardContent>
    </Card>
  )
}
