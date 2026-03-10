import type { Metadata } from 'next'
import Link from 'next/link'
import { classifyMarketCondition } from '@/lib/market-condition'
import { createClient } from '@supabase/supabase-js'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ryanrealty.com').replace(/\/$/, '')

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url?.trim() || !key?.trim()) return null
  return createClient(url, key)
}

export const metadata: Metadata = {
  title: 'Sell Your Home | Ryan Realty',
  description: 'Thinking of selling? Get a free home value estimate and learn how Ryan Realty markets and sells Central Oregon homes.',
  alternates: { canonical: `${siteUrl}/sell` },
  openGraph: { title: 'Sell Your Home | Ryan Realty', url: `${siteUrl}/sell`, type: 'website' },
}

export default async function SellPage() {
  const supabase = getSupabase()
  let conditionLabel = 'Balanced Market'
  if (supabase) {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    const periodStart = startOfMonth.toISOString().slice(0, 10)
    const periodEnd = new Date().toISOString().slice(0, 10)
    const { data: row } = await supabase
      .from('reporting_cache')
      .select('metrics')
      .eq('geo_type', 'city')
      .eq('geo_name', 'Bend')
      .eq('period_type', 'monthly')
      .eq('period_start', periodStart)
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const metrics = (row?.metrics as Record<string, unknown>) ?? {}
    const result = classifyMarketCondition({
      monthsOfInventory: metrics.inventory_months != null ? Number(metrics.inventory_months) : null,
      avgDom: metrics.median_dom != null ? Number(metrics.median_dom) : null,
      listToSoldRatio: null,
    })
    conditionLabel = result.label
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <section className="rounded-2xl bg-[var(--brand-navy)] px-6 py-12 text-white">
        <h1 className="text-3xl font-bold tracking-tight">Thinking of Selling?</h1>
        <p className="mt-3 text-lg opacity-90">
          Get a data-driven estimate of your home&apos;s value and a plan that gets it sold.
        </p>
        <Link
          href="/listings"
          className="mt-6 inline-block rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:opacity-90"
        >
          What&apos;s Your Home Worth?
        </Link>
      </section>

      <section className="mt-12" aria-labelledby="why-sell-heading">
        <h2 id="why-sell-heading" className="text-2xl font-bold text-zinc-900">Why sell with Ryan Realty</h2>
        <ul className="mt-6 space-y-4 text-zinc-700">
          <li><strong>Marketing plan</strong> — Professional photography, listing placement, and targeted outreach.</li>
          <li><strong>Data-driven pricing</strong> — We use local comps and market trends to price for a strong offer.</li>
          <li><strong>Local expertise</strong> — Central Oregon is our backyard. We know the neighborhoods and buyers.</li>
        </ul>
      </section>

      <section className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50/50 p-6" aria-labelledby="market-heading">
        <h2 id="market-heading" className="text-lg font-semibold text-zinc-900">Bend market snapshot</h2>
        <p className="mt-2 text-zinc-600">
          Current conditions: <span className="font-medium text-zinc-900">{conditionLabel}</span>
        </p>
        <Link href="/reports/city/Bend" className="mt-3 inline-block text-sm text-[var(--brand-navy)] hover:underline">
          View Bend market report
        </Link>
      </section>

      <section className="mt-12" aria-labelledby="seller-resources-heading">
        <h2 id="seller-resources-heading" className="text-lg font-semibold text-zinc-900">Seller resources</h2>
        <p className="mt-1 text-zinc-600">Tips and guides from our blog.</p>
        <Link href="/blog?category=Selling%20Tips" className="mt-3 inline-block text-[var(--brand-navy)] hover:underline">
          Selling tips on the blog
        </Link>
      </section>

      <section className="mt-12 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm" aria-labelledby="consult-heading">
        <h2 id="consult-heading" className="text-lg font-semibold text-zinc-900">Get a free consultation</h2>
        <p className="mt-1 text-zinc-600">Tell us about your home and timeline. We&apos;ll follow up with a no-pressure conversation.</p>
        <Link
          href="/contact?inquiry=Selling"
          className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-zinc-900 hover:opacity-90"
        >
          Contact us
        </Link>
      </section>
    </main>
  )
}
