'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import TilesSlider, { TilesSliderItem } from '@/components/TilesSlider'
import { TILE_MIN_HEIGHT_PX } from '@/lib/tile-constants'

type LifestyleItem = {
  href: string
  label: string
  image: string
  alt: string
}

const LIFESTYLE_ITEMS: LifestyleItem[] = [
  {
    href: '/search/bend/luxury',
    label: 'Luxury homes',
    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1400&q=80',
    alt: 'Luxury home exterior with mountain backdrop',
  },
  {
    href: '/search/bend/mountain-view',
    label: 'Homes with mountain views',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80',
    alt: 'Home deck with mountain and Cascade view',
  },
  {
    href: '/search/bend/with-view',
    label: 'Homes with scenic views',
    image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80',
    alt: 'Modern home with panoramic valley view',
  },
  {
    href: '/search/bend/with-fireplace',
    label: 'Home with a fireplace',
    image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80',
    alt: 'Cozy living room fireplace in a modern home',
  },
  {
    href: '/search?keywords=fireplaces&city=Bend',
    label: 'Homes with fireplaces',
    image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80',
    alt: 'Large stone fireplace in a luxury home interior',
  },
  {
    href: '/search/bend/on-golf-course',
    label: 'Golf course homes',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1400&q=80',
    alt: 'Home overlooking a golf course fairway',
  },
  {
    href: '/search/bend/water-view',
    label: 'Homes with water views',
    image: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1400&q=80',
    alt: 'Home with lake and water view',
  },
  {
    href: '/search/bend/lake-view',
    label: 'Lake view homes',
    image: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=1400&q=80',
    alt: 'Lakefront home with dock and mountain horizon',
  },
  {
    href: '/search/bend/new-listings',
    label: 'New listings',
    image: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1400&q=80',
    alt: 'Contemporary home listed recently in Central Oregon',
  },
  {
    href: '/search/bend/open-house',
    label: 'Open house homes',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80',
    alt: 'Open house sign in front of a residential listing',
  },
]

export default function LifestyleSearchSlider() {
  return (
    <TilesSlider
      title="Discover by lifestyle"
      subtitle="Find homes that match how you want to live in Central Oregon."
      titleId="lifestyle-searches-heading"
      className="border-b border-border bg-card px-4 py-12 sm:px-6 sm:py-14"
      headerRight={
        <Link href="/search/bend" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          See all Bend searches →
        </Link>
      }
    >
      {LIFESTYLE_ITEMS.map((item) => (
        <TilesSliderItem key={item.href} style={{ minHeight: TILE_MIN_HEIGHT_PX }}>
          <Card className="h-full overflow-hidden border-border bg-background shadow-sm transition hover:border-primary/30 hover:shadow-md">
            <Link href={item.href} className="group block h-full">
              <div className="relative aspect-[5/3]">
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  sizes="(max-width: 768px) 90vw, 360px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
              </div>
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
              </CardContent>
            </Link>
          </Card>
        </TilesSliderItem>
      ))}
    </TilesSlider>
  )
}
