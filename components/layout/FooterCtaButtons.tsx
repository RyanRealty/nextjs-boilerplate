'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { trackCtaClick } from '@/lib/cta-tracking'

export default function FooterCtaButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        asChild
        size="sm"
        onClick={() =>
          trackCtaClick({
            label: 'Contact Us',
            destination: '/contact',
            context: 'footer',
          })
        }
      >
        <Link href="/contact">Contact Us</Link>
      </Button>
      <Button
        asChild
        size="sm"
        variant="outline"
        onClick={() =>
          trackCtaClick({
            label: 'Get Home Valuation',
            destination: '/sell/valuation',
            context: 'footer',
          })
        }
      >
        <Link href="/sell/valuation">Get Home Valuation</Link>
      </Button>
    </div>
  )
}
