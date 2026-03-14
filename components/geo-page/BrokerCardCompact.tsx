'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { BrokerRow } from '@/app/actions/brokers'

type Props = {
  broker: BrokerRow
}

/** Single broker card: headshot, name, contact, tagline. Used in carousel next to CTA. */
export default function BrokerCardCompact({ broker }: Props) {
  const name = broker.display_name ?? 'Agent'
  const photo = broker.photo_url?.trim() || null
  const tagline = (broker.tagline ?? broker.title ?? '').trim().slice(0, 120)

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-[var(--border)]">
          {photo ? (
            <Image src={photo} alt={`${name} — real estate agent`} width={64} height={64} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-primary/10" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-primary">{name}</h3>
          {broker.title && <p className="text-xs text-[var(--muted-foreground)]">{broker.title}</p>}
          {tagline && <p className="mt-1 text-sm text-[var(--muted-foreground)] line-clamp-2">{tagline}</p>}
          <div className="mt-2 space-y-0.5 text-sm">
            {broker.email && (
              <a href={`mailto:${broker.email}`} className="block truncate text-accent-foreground hover:underline">
                {broker.email}
              </a>
            )}
            {broker.phone && (
              <a href={`tel:${broker.phone}`} className="block text-[var(--muted-foreground)] hover:underline">
                {broker.phone}
              </a>
            )}
          </div>
        </div>
      </div>
      <Link
        href={`/team/${encodeURIComponent(broker.slug)}`}
        className="mt-4 flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-primary hover:bg-accent/90"
      >
        Meet {name.split(/\s+/)[0] ?? name}
      </Link>
    </div>
  )
}
