'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { trackEvent } from '@/lib/tracking'
import { trackCtaClick } from '@/lib/cta-tracking'

type Agent = {
  agent_name: string | null
  agent_email: string | null
  agent_phone: string | null
  office_name: string | null
  office_phone: string | null
}

type Props = {
  listingKey: string
  address: string
  agent: Agent | null
  showContactInfo: boolean
  shareUrl: string
}

function initials(name: string | null): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function ShowcaseAgent({ listingKey, address, agent, showContactInfo, shareUrl }: Props) {
  if (!agent) return null

  const contactUrl = `/contact?listing=${encodeURIComponent(listingKey)}&reason=inquiry`
  const trackContact = () => {
    trackEvent('contact_agent_click', { listing_key: listingKey, listing_url: shareUrl })
    trackCtaClick({
      label: 'Contact agent',
      destination: contactUrl,
      context: `listing_showcase_agent:${listingKey}`,
    })
  }
  const trackSchedule = () => {
    trackEvent('schedule_tour_click', { listing_key: listingKey, listing_url: shareUrl })
    trackCtaClick({
      label: 'Schedule tour',
      destination: `/contact?listing=${encodeURIComponent(listingKey)}&reason=tour`,
      context: `listing_showcase_agent:${listingKey}`,
    })
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 rounded-full border border-border">
            <AvatarFallback className="bg-muted text-sm font-medium text-muted-foreground">
              {initials(agent.agent_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{agent.agent_name ?? 'Listing agent'}</p>
            {agent.office_name && (
              <p className="text-sm text-muted-foreground">{agent.office_name}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            asChild
            variant="default"
            size="default"
            className="w-full"
            onClick={trackContact}
          >
            <Link href={contactUrl}>Contact agent</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="default"
            className="w-full"
            onClick={trackSchedule}
          >
            <Link href={`/contact?listing=${encodeURIComponent(listingKey)}&reason=tour`}>Schedule tour</Link>
          </Button>
        </div>
        {showContactInfo && (agent.agent_email ?? agent.agent_phone) && (
          <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
            {agent.agent_email && (
              <a
                href={`mailto:${agent.agent_email}?subject=Inquiry about ${encodeURIComponent(address || 'listing')}`}
                className="block hover:text-foreground"
                onClick={() => {
                  trackEvent('email_agent', { listing_key: listingKey, agent_name: agent.agent_name ?? undefined })
                  trackCtaClick({
                    label: 'Email agent',
                    destination: `mailto:${agent.agent_email}`,
                    context: `listing_showcase_agent:${listingKey}`,
                  })
                }}
              >
                {agent.agent_email}
              </a>
            )}
            {agent.agent_phone && (
              <a
                href={`tel:${agent.agent_phone?.replace(/\D/g, '') ?? ''}`}
                className="mt-1 block hover:text-foreground"
                onClick={() => {
                  trackEvent('call_initiated', { listing_key: listingKey })
                  trackCtaClick({
                    label: 'Call agent',
                    destination: `tel:${agent.agent_phone?.replace(/\D/g, '') ?? ''}`,
                    context: `listing_showcase_agent:${listingKey}`,
                  })
                }}
              >
                {agent.agent_phone}
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
