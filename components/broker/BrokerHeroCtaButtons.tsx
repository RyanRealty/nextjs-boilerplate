'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { trackCtaClick } from '@/lib/cta-tracking'

type Props = {
  firstName: string
  slug: string
  phone: string | null
  email: string | null
}

export default function BrokerHeroCtaButtons({ firstName, slug, phone, email }: Props) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {phone && (
        <Button
          asChild
          onClick={() =>
            trackCtaClick({
              label: `Call ${firstName}`,
              destination: `tel:${phone.replace(/\D/g, '')}`,
              context: 'broker_hero',
              brokerSlug: slug,
            })
          }
        >
          <a href={`tel:${phone.replace(/\D/g, '')}`}>
            Call {firstName}
          </a>
        </Button>
      )}
      {email && (
        <Button
          asChild
          variant="outline"
          onClick={() =>
            trackCtaClick({
              label: `Email ${firstName}`,
              destination: `mailto:${email}`,
              context: 'broker_hero',
              brokerSlug: slug,
            })
          }
        >
          <a href={`mailto:${email}`}>
            Email {firstName}
          </a>
        </Button>
      )}
      <Button
        asChild
        onClick={() =>
          trackCtaClick({
            label: `Schedule Consultation with ${firstName}`,
            destination: '#contact',
            context: 'broker_hero',
            brokerSlug: slug,
          })
        }
      >
        <Link href="#contact">
          Schedule Consultation
        </Link>
      </Button>
    </div>
  )
}
