'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import type { SparkPhoto } from '../../lib/spark'
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils'

type Props = { photos: SparkPhoto[] }

/**
 * ListingGallery — photo gallery with lightbox, keyboard navigation, and mobile swipe.
 *
 * Features:
 * - Grid of thumbnails with primary photo large
 * - Full-screen lightbox on click
 * - Left/right arrow keyboard navigation
 * - Touch swipe left/right on mobile
 * - Photo counter ("3 of 25")
 * - Escape to close
 */
export default function ListingGallery({ photos }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  if (!photos.length) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        No photos
      </div>
    )
  }

  const primary = photos.find((p) => p.Primary) ?? photos[0]
  const displayList = [primary, ...photos.filter((p) => p !== primary)]
  const current = displayList[selectedIndex] ?? displayList[0]
  const src = current.Uri1600 ?? current.Uri1280 ?? current.Uri1024 ?? current.Uri800 ?? current.Uri640 ?? current.UriLarge ?? current.Uri300

  const goNext = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % displayList.length)
  }, [displayList.length])

  const goPrev = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + displayList.length) % displayList.length)
  }, [displayList.length])

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, goNext, goPrev])

  // Touch swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX
    touchEndX.current = null
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current == null || touchEndX.current == null) return
    const diff = touchStartX.current - touchEndX.current
    const minSwipe = 50

    if (Math.abs(diff) > minSwipe) {
      if (diff > 0) goNext() // Swipe left → next
      else goPrev() // Swipe right → prev
    }

    touchStartX.current = null
    touchEndX.current = null
  }, [goNext, goPrev])

  return (
    <>
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
        <div className="aspect-[16/10] relative bg-muted">
          <Button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Image
              src={src ?? ''}
              alt={current.Caption ?? `Photo ${selectedIndex + 1}`}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 1024px"
              priority={selectedIndex === 0}
            />
          </Button>

          {/* Photo counter */}
          <div className="absolute bottom-3 right-3 rounded-lg bg-foreground/70 px-2.5 py-1 text-xs font-medium text-background">
            {selectedIndex + 1} of {displayList.length}
          </div>

          {/* Navigation arrows on main image */}
          {displayList.length > 1 && (
            <>
              <Button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-foreground/50 text-background hover:bg-foreground/70 flex items-center justify-center"
                aria-label="Previous photo"
              >
                ‹
              </Button>
              <Button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-foreground/50 text-background hover:bg-foreground/70 flex items-center justify-center"
                aria-label="Next photo"
              >
                ›
              </Button>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        <div className="flex gap-2 overflow-x-auto border-t border-border p-2 no-scrollbar">
          {displayList.map((p, i) => {
            const thumb = p.Uri300 ?? p.Uri640 ?? p.Uri800
            return (
              <Button
                key={p.Id ?? i}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={cn(
                  'relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                  selectedIndex === i ? 'border-primary ring-1 ring-primary' : 'border-transparent opacity-70 hover:opacity-100'
                )}
              >
                <img
                  src={thumb ?? ''}
                  alt={`Photo ${i + 1} of property`}
                  width={96}
                  height={64}
                  className="h-full w-full object-cover"
                  decoding="async"
                />
              </Button>
            )
          })}
        </div>
      </div>

      {/* Full-screen lightbox with swipe support */}
      {lightboxOpen && src && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-foreground/95"
          role="dialog"
          aria-label="Photo lightbox"
          aria-modal="true"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-background/80">
              {selectedIndex + 1} / {displayList.length}
            </span>
            <Button
              type="button"
              className="h-10 w-10 rounded-full bg-background/20 text-background hover:bg-background/40 flex items-center justify-center text-lg"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close lightbox"
            >
              ✕
            </Button>
          </div>

          {/* Main image area */}
          <div className="flex-1 flex items-center justify-center w-full px-4 py-16">
            <img
              src={src}
              alt={current.Caption ?? `Property photo ${selectedIndex + 1}`}
              className="max-h-full max-w-full object-contain select-none"
              draggable={false}
              width={1200}
              height={750}
              decoding="async"
            />
          </div>

          {/* Navigation arrows */}
          {displayList.length > 1 && (
            <>
              <Button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/20 text-background text-2xl hover:bg-background/40 flex items-center justify-center"
                aria-label="Previous photo"
              >
                ‹
              </Button>
              <Button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/20 text-background text-2xl hover:bg-background/40 flex items-center justify-center"
                aria-label="Next photo"
              >
                ›
              </Button>
            </>
          )}
        </div>
      )}
    </>
  )
}
