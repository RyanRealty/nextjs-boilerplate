'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { trackHomeValuationCta } from '@/app/actions/lead-capture'

type Props = {
  className?: string
}

function getCampaignFromQuery(): {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
} {
  if (typeof window === 'undefined') return {}
  const query = new URLSearchParams(window.location.search)
  return {
    source: query.get('utm_source') ?? undefined,
    medium: query.get('utm_medium') ?? undefined,
    campaign: query.get('utm_campaign') ?? undefined,
    term: query.get('utm_term') ?? undefined,
    content: query.get('utm_content') ?? undefined,
  }
}

export default function HomeValuationCta({ className }: Props) {
  return (
    <div className={className}>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">Curious what your home is worth?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Get a free valuation with local market context and next-step guidance from our team.
        </p>
        <Button asChild className="mt-4" onClick={() => trackHomeValuationCta(getCampaignFromQuery())}>
          <Link href="/sell/valuation">Get your free home valuation</Link>
        </Button>
      </div>
    </div>
  )
}
