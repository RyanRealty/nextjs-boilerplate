'use client'

import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { cn } from '@/lib/utils'
import type { ActivityFeedItem } from '@/app/actions/activity-feed-shared'

type EventType = ActivityFeedItem['event_type']

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = () => setReduced(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

function confettiFromElement(el: HTMLElement, options: confetti.Options) {
  const rect = el.getBoundingClientRect()
  const x = (rect.left + rect.width / 2) / window.innerWidth
  const y = (rect.top + rect.height / 2) / window.innerHeight
  confetti({ ...options, origin: { x, y } })
}

type Props = {
  eventType: EventType
  containerRef: React.RefObject<HTMLDivElement | null>
  className?: string
}

/**
 * Celebration overlay for activity feed cards — Robin Hood–style: confetti for pending/sold,
 * CSS sparkles for new listing, falling “deal” for price drop. Respects prefers-reduced-motion.
 */
export default function ActivityCelebrationOverlay({
  eventType,
  containerRef,
  className,
}: Props) {
  const reducedMotion = useReducedMotion()
  const hasFired = useRef(false)

  useEffect(() => {
    if (reducedMotion) return
    const el = containerRef.current
    if (!el || hasFired.current) return

    if (eventType === 'status_pending') {
      hasFired.current = true
      confettiFromElement(el, {
        particleCount: 80,
        spread: 70,
        startVelocity: 35,
        colors: ['#22c55e', '#16a34a', '#15803d', '#fbbf24', '#f59e0b', '#ffffff'],
        ticks: 120,
        gravity: 0.8,
        scalar: 0.9,
      })
      const t2 = setTimeout(() => {
        confettiFromElement(el, { particleCount: 30, angle: 60, spread: 55, origin: { x: 0.3, y: 0.6 }, colors: ['#22c55e', '#fbbf24'] })
        confettiFromElement(el, { particleCount: 30, angle: 120, spread: 55, origin: { x: 0.7, y: 0.6 }, colors: ['#22c55e', '#fbbf24'] })
      }, 150)
      return () => clearTimeout(t2)
    }

    if (eventType === 'status_closed') {
      hasFired.current = true
      confettiFromElement(el, {
        particleCount: 100,
        spread: 80,
        startVelocity: 40,
        colors: ['#eab308', '#ca8a04', '#22c55e', '#16a34a', '#ffffff', '#fef3c7'],
        ticks: 150,
        gravity: 0.7,
        scalar: 1,
      })
      const t2 = setTimeout(() => {
        confettiFromElement(el, { particleCount: 40, angle: 90, spread: 100, origin: { x: 0.5, y: 0.5 }, colors: ['#eab308', '#22c55e'], scalar: 1.1 })
      }, 200)
      return () => clearTimeout(t2)
    }
  }, [eventType, containerRef, reducedMotion])

  if (reducedMotion) {
    return (
      <div
        className={cn(
          'pointer-events-none absolute inset-0 rounded-lg',
          eventType === 'new_listing' && 'bg-gradient-to-t from-primary/10 to-transparent',
          eventType === 'price_drop' && 'bg-gradient-to-t from-warning/10 to-transparent',
          eventType === 'status_pending' && 'bg-gradient-to-t from-success/10 to-transparent',
          eventType === 'status_closed' && 'bg-gradient-to-t from-accent/20 to-transparent',
          className
        )}
        aria-hidden
      />
    )
  }

  if (eventType === 'new_listing') {
    return (
      <div className={cn('pointer-events-none absolute inset-0 overflow-hidden rounded-lg', className)} aria-hidden>
        <div className="activity-sparkles absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="activity-sparkle absolute h-1.5 w-1.5 rounded-full bg-primary-foreground/70"
            style={{
              left: `${10 + (i * 7) % 80}%`,
              top: `${15 + (i * 11) % 70}%`,
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    )
  }

  if (eventType === 'price_drop') {
    return (
      <div className={cn('pointer-events-none absolute inset-0 overflow-hidden rounded-lg', className)} aria-hidden>
        <div className="activity-price-drop-shine absolute inset-0 bg-gradient-to-t from-warning/15 via-transparent to-transparent" />
        {[...Array(8)].map((_, i) => (
          <span
            key={i}
            className="activity-price-coin absolute text-[10px] opacity-80"
            style={{
              left: `${5 + (i * 12) % 90}%`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: '2.2s',
            }}
          >
            $
          </span>
        ))}
      </div>
    )
  }

  return null
}
