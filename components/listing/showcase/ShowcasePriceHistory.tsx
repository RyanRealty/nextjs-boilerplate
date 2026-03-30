import { Card, CardContent } from '@/components/ui/card'
import PriceHistory from '@/components/listing/PriceHistory'
import type { ListingDetailPriceHistory } from '@/app/actions/listing-detail'

type Props = {
  priceHistory: ListingDetailPriceHistory[]
}

export default function ShowcasePriceHistory({ priceHistory }: Props) {
  if (priceHistory.length === 0) return null
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <PriceHistory priceHistory={priceHistory} />
      </CardContent>
    </Card>
  )
}
