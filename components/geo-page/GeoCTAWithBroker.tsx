'use client'

import Link from 'next/link'
import type { BrokerRow } from '@/app/actions/brokers'
import BrokerCardCarousel from './BrokerCardCarousel'

type Props = {
  /** CTA heading, e.g. "Looking for a Home in Bend?" */
  heading: string
  /** Short supporting text below buttons */
  supportingText?: string
  /** Primary CTA */
  primaryCta: { label: string; href: string }
  /** Secondary CTA */
  secondaryCta?: { label: string; href: string }
  brokers: BrokerRow[]
}

/** CTA section with content left and broker card carousel right (like listing detail layout). */
export default function GeoCTAWithBroker({
  heading,
  supportingText,
  primaryCta,
  secondaryCta,
  brokers,
}: Props) {
  return (
    <section className="bg-primary px-4 py-8 sm:px-6 sm:py-12 lg:px-8" aria-labelledby="geo-cta-heading">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          <div className="lg:col-span-2 flex flex-col justify-center">
            <h2 id="geo-cta-heading" className="text-2xl font-bold tracking-tight text-white">
              {heading}
            </h2>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href={primaryCta.href}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 font-semibold text-primary hover:bg-accent/90"
              >
                {primaryCta.label}
              </Link>
              {secondaryCta && (
                <Link
                  href={secondaryCta.href}
                  className="inline-flex items-center justify-center rounded-lg border-2 border-white/60 px-6 py-3 font-semibold text-white hover:bg-white/10"
                >
                  {secondaryCta.label}
                </Link>
              )}
            </div>
            {supportingText && (
              <p className="mt-4 text-sm text-white/80">{supportingText}</p>
            )}
          </div>
          <div className="lg:col-span-1">
            <BrokerCardCarousel brokers={brokers} />
          </div>
        </div>
      </div>
    </section>
  )
}
