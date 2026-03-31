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

/** Detect if URL is a direct video file (mp4, webm, etc.) vs an embed URL (YouTube, Vimeo, etc.) */
function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)
}

/** Build embeddable URL for known video platforms */
function getEmbedUrl(url: string): string {
  // YouTube: ensure it's an embed URL
  if (url.includes('youtube.com/watch')) {
    const id = new URL(url).searchParams.get('v')
    if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`
  }
  if (url.includes('youtube.com/embed/') || url.includes('youtu.be/')) {
    // Already an embed URL or short URL — ensure autoplay
    const base = url.split('?')[0]
    return `${base}?autoplay=1&mute=1`
  }
  // Vimeo
  if (url.includes('player.vimeo.com/video/')) {
    const base = url.split('?')[0]
    return `${base}?autoplay=1&muted=1&background=1`
  }
  if (url.includes('vimeo.com/') && !url.includes('player.vimeo.com')) {
    const parts = url.split('/')
    const id = parts[parts.length - 1]?.split('?')[0]
    if (id) return `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&background=1`
  }
  // Matterport, Aryeo, and other iframe-embeddable URLs — use as-is
  return url
}

export default function ShowcaseHero({ listingKey, heroVideoUrl, photos }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [showPhotos, setShowPhotos] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const firstPhoto = photos[0]
  const hasVideo = Boolean(heroVideoUrl?.trim())
  const isDirect = hasVideo && heroVideoUrl ? isDirectVideoUrl(heroVideoUrl) : false

  const handleVideoPlay = () => {
    trackEvent('play_video', { listing_key: listingKey, position: 'hero' })
  }

  // Video hero — show video first, photos in thumbnail strip below
  if (hasVideo && heroVideoUrl && !showPhotos) {
    return (
      <section className="relative w-full bg-background" aria-label="Listing media">
        <div className="aspect-video w-full max-w-full overflow-hidden bg-muted">
          {isDirect ? (
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
          ) : (
            <iframe
              src={getEmbedUrl(heroVideoUrl)}
              className="h-full w-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Listing video"
              onLoad={handleVideoPlay}
            />
          )}
        </div>
        {photos.length > 0 && (
          <div className="border-t border-border bg-card px-2 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scroll-smooth no-scrollbar">
              <button
                type="button"
                className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border-2 border-primary bg-muted"
                aria-label="Playing video"
              >
                <span className="text-xs font-medium text-primary">▶ Video</span>
              </button>
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setActiveIndex(i); setShowPhotos(true) }}
                  className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 border-transparent hover:border-muted-foreground/30 transition-colors"
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

  // Photo hero (no video, or user clicked a photo thumbnail)
  if (!firstPhoto && !hasVideo) {
    return (
      <section className="aspect-video w-full bg-muted" aria-label="Listing media">
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>
      </section>
    )
  }

  const activePhoto = photos[activeIndex] ?? firstPhoto
  const totalPhotos = photos.length

  return (
    <section className="relative w-full bg-background" aria-label="Listing media">
      {activePhoto && (
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <Image
            src={activePhoto.cdn_url ?? activePhoto.photo_url}
            alt="Property photo"
            fill
            priority
            className="object-cover object-top"
            sizes="100vw"
          />
          {totalPhotos > 1 && (
            <div className="absolute bottom-3 right-3 rounded-full bg-foreground/60 px-3 py-1 text-xs font-medium text-primary-foreground">
              {activeIndex + 1} of {totalPhotos}
            </div>
          )}
        </div>
      )}
      {(photos.length > 0 || hasVideo) && (
        <div className="border-t border-border bg-card px-2 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scroll-smooth no-scrollbar">
            {hasVideo && (
              <button
                type="button"
                onClick={() => setShowPhotos(false)}
                className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border-2 border-transparent hover:border-primary bg-muted transition-colors"
                aria-label="Watch video"
              >
                <span className="text-xs font-medium text-primary">▶ Video</span>
              </button>
            )}
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setActiveIndex(i); setShowPhotos(true) }}
                className={cn(
                  'relative h-16 w-24 shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                  showPhotos && activeIndex === i ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
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
