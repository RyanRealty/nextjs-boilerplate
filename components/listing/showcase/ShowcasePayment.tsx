import { Card, CardContent } from '@/components/ui/card'
import PaymentCalculator from '@/components/listing/PaymentCalculator'

type Props = {
  listPrice: number
  taxAmount?: number
  associationFee?: number
  associationYn?: boolean | null
}

export default function ShowcasePayment({ listPrice, taxAmount, associationFee, associationYn }: Props) {
  const hoa = associationYn ? (associationFee ?? 0) : undefined
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <PaymentCalculator
          listPrice={listPrice}
          taxAmount={taxAmount}
          associationFee={hoa}
        />
      </CardContent>
    </Card>
  )
}
