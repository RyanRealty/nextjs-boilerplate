'use client'

import TilesSlider, { TilesSliderItem } from '@/components/TilesSlider'
import { Card, CardContent } from '@/components/ui/card'
import type { InventoryBreakdown } from '@/app/actions/inventory-breakdown'
import { TILE_MIN_HEIGHT_PX } from '@/lib/tile-constants'

type Props = {
  placeLabel: string
  breakdown: InventoryBreakdown
}

type TileConfig = {
  key: keyof InventoryBreakdown
  title: string
  sub: string
}

const TILE_CONFIGS: TileConfig[] = [
  { key: 'singleFamily', title: 'Single family homes', sub: 'Detached homes currently active' },
  { key: 'condoTownhome', title: 'Condo and townhome', sub: 'Attached housing options' },
  { key: 'landLot', title: 'Lots and land', sub: 'Vacant land inventory' },
  { key: 'manufacturedMobile', title: 'Manufactured and mobile', sub: 'Factory-built active listings' },
]

export default function InventoryTypeSlider({ placeLabel, breakdown }: Props) {
  return (
    <TilesSlider
      title={`Property types in ${placeLabel}`}
      subtitle="Quick inventory mix by active listing type."
      titleId="inventory-type-slider-heading"
      className="px-4 py-10 sm:px-6"
    >
      {TILE_CONFIGS.map((tile) => (
        <TilesSliderItem key={tile.key} style={{ minHeight: TILE_MIN_HEIGHT_PX }}>
          <Card className="h-full border-border bg-card">
            <CardContent className="flex h-full flex-col justify-between p-5">
              <div>
                <p className="text-sm font-semibold text-foreground">{tile.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tile.sub}</p>
              </div>
              <p className="mt-4 text-3xl font-bold text-primary">{breakdown[tile.key].toLocaleString()}</p>
            </CardContent>
          </Card>
        </TilesSliderItem>
      ))}
    </TilesSlider>
  )
}
