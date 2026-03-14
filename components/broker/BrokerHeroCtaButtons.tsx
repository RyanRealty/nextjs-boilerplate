'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/tracking'

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
        <a
          href={`tel:${phone.replace(/\D/g, '')}`}
          onClick={() => trackEvent('call_initiated', { broker_slug: slug })}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-primary hover:bg-accent/90"
        >
          Call {firstName}
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          onClick={() => trackEvent('email_agent', { broker_slug: slug })}
          className="inline-flex items-center justify-center rounded-lg border-2 border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white"
        >
          Email {firstName}
        </a>
      )}
      <Link
        href="#contact"
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
        onClick={() => trackEvent('click_cta', { context: 'broker_schedule_consultation', broker_slug: slug })}
      >
        Schedule Consultation
      </Link>
    </div>
  )
}
