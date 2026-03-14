'use client'

import { useState } from 'react'
import type { BrokerRow } from '@/app/actions/brokers'
import BrokerCardCompact from './BrokerCardCompact'

type Props = {
  brokers: BrokerRow[]
}

/** Cycle through broker cards (one at a time) with prev/next. */
export default function BrokerCardCarousel({ brokers }: Props) {
  const [index, setIndex] = useState(0)

  if (brokers.length === 0) return null
  if (brokers.length === 1) return <BrokerCardCompact broker={brokers[0]!} />

  const current = brokers[index] ?? brokers[0]!
  const prev = () => setIndex((i) => (i === 0 ? brokers.length - 1 : i - 1))
  const next = () => setIndex((i) => (i === brokers.length - 1 ? 0 : i + 1))

  return (
    <div className="space-y-3">
      <BrokerCardCompact broker={current} />
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={prev}
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-[var(--muted)]"
          aria-label="Previous broker"
        >
          ← Previous
        </button>
        <span className="text-xs text-[var(--muted-foreground)]">
          {index + 1} of {brokers.length}
        </span>
        <button
          type="button"
          onClick={next}
          className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-[var(--muted)]"
          aria-label="Next broker"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
