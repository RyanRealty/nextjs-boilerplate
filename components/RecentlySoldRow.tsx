import Link from 'next/link'
import Image from 'next/image'
import TilesSlider, { TilesSliderItem } from '@/components/TilesSlider'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { listingDetailPath } from '@/lib/slug'
import type { RecentlySoldListing } from '@/app/actions/recently-sold'

type Props = {
  title?: string
  listings: RecentlySoldListing[]
}

function formatPrice(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return 'Price unavailable'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function formatAddress(item: RecentlySoldListing): string {
  const street = [item.streetNumber, item.streetName].filter(Boolean).join(' ').trim()
  const cityState = [item.city, item.state].filter(Boolean).join(', ').trim()
  return [street, cityState].filter(Boolean).join(', ') || 'Recently sold home'
}

function formatDate(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function RecentlySoldRow({ title = 'Recently sold nearby', listings }: Props) {
  if (listings.length === 0) return null

  return (
    <TilesSlider title={title}>
      {listings.map((item) => (
        <TilesSliderItem key={item.listingKey}>
          <Link
            href={listingDetailPath(
              item.listingKey,
              {
                streetNumber: item.streetNumber,
                streetName: item.streetName,
                city: item.city,
                state: item.state,
                postalCode: item.postalCode,
              },
              { city: item.city },
              { mlsNumber: item.listNumber }
            )}
            className="block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full overflow-hidden">
              <div className="relative aspect-[4/3] bg-muted">
                {item.photoUrl ? (
                  <Image
                    src={item.photoUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 85vw, 320px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No photo</div>
                )}
                <div className="absolute left-2 top-2">
                  <Badge variant="outline">Sold</Badge>
                </div>
              </div>
              <CardContent className="space-y-1 p-3">
                <p className="line-clamp-2 text-sm font-medium text-foreground">{formatAddress(item)}</p>
                <p className="text-sm font-semibold text-primary">{formatPrice(item.closePrice ?? item.listPrice)}</p>
                {item.closeDate && <p className="text-xs text-muted-foreground">Closed {formatDate(item.closeDate)}</p>}
              </CardContent>
            </Card>
          </Link>
        </TilesSliderItem>
      ))}
    </TilesSlider>
  )
}
