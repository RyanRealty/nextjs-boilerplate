import type { Metadata } from 'next'
import Link from 'next/link'
import ContactForm from './ContactForm'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryanrealty.com').replace(/\/$/, '')

type PageProps = { searchParams: Promise<{ inquiry?: string }> }

export const metadata: Metadata = {
  title: 'Contact Us | Ryan Realty',
  description: 'Get in touch with Ryan Realty. Office address, phone, email, and contact form for buying or selling in Central Oregon.',
  alternates: { canonical: `${siteUrl}/contact` },
  openGraph: { title: 'Contact Us | Ryan Realty', url: `${siteUrl}/contact`, type: 'website' },
}

export default async function ContactPage({ searchParams }: PageProps) {
  const params = await searchParams
  const defaultInquiry = params.inquiry ?? undefined
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Ryan Realty',
    url: `${siteUrl}/contact`,
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-bold text-zinc-900">Contact Us</h1>
      <p className="mt-2 text-zinc-600">
        Have a question or ready to get started? Reach out and we&apos;ll respond as soon as we can.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <ContactForm defaultInquiryType={defaultInquiry} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Office</h2>
          <p className="mt-2 text-zinc-600">
            Ryan Realty<br />
            Central Oregon
          </p>
          <p className="mt-4 text-sm text-zinc-500">
            Hours and full address can be updated in your site settings or Google Business Profile for NAP consistency.
          </p>
          <div className="mt-6">
            <Link href="/team" className="text-[var(--brand-navy)] hover:underline">
              Meet the team
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
