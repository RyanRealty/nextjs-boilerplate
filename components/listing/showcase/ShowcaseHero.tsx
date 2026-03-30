'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { trackEvent } from '@/lib/tracking'
import { cn } from '@/lib/utils'

type Photo = { id: string; photo_url: string; cdn_url?: string | null; sort_order: number }

type Props = {
  listingKey: string
  heroVideoUrl: string | null
  photos: Photo[]
}

export default function ShowcaseHero({ listingKey, heroVideoUrl, photos }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const firstPhoto = photos[0]
  const hasVideo = Boolean(heroVideoUrl?.trim())

  const handleVideoPlay = () => {
    trackEvent('play_video', { listing_key: listingKey, position: 'hero' })
  }

  if (hasVideo && heroVideoUrl) {
    return (
      <section className="relative w-full bg-background" aria-label="Listing media">
        <div className="aspect-video w-full max-w-full overflow-hidden bg-muted">
          <video
            ref={videoRef}
            src={heroVideoUrl}
            className="h-full w-full object-cover"
            playsInline
            muted
            loop
            autoPlay
            controls
            preload="metadata"
            onPlay={handleVideoPlay}
            aria-label="Listing video"
          />
        </div>
        {photos.length > 0 ? (
          <div className="border-t border-border bg-card px-2 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scroll-smooth no-scrollbar">
              <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border-2 border-primary bg-muted">
                <span className="text-xs font-medium text-primary">Video</span>
              </div>
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    'relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                    activeIndex === i ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
                  )}
                  aria-label={`View photo ${i + 1}`}
                >
                  <Image
                    src={p.cdn_url ?? p.photo_url}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    )
  }

  if (!firstPhoto) {
    return (
      <section className="aspect-video w-full bg-muted" aria-label="Listing media">
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>
      </section>
    )
  }

  const active = photos[activeIndex] ?? firstPhoto
  return (
    <section className="relative w-full bg-background" aria-label="Listing photos">
      <div className="relative aspect-video w-full max-w-full overflow-hidden bg-muted">
        <Image
          src={active.cdn_url ?? active.photo_url}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      </div>
      {photos.length > 1 && (
        <div className="border-t border-border bg-card px-2 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scroll-smooth no-scrollbar">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                  activeIndex === i ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
                )}
                aria-label={`View photo ${i + 1}`}
              >
                <Image
                  src={p.cdn_url ?? p.photo_url}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
