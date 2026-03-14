'use client'

import { useState } from 'react'
import { submitValuationRequest } from './actions'
import { trackEvent } from '@/lib/tracking'

export default function ValuationForm() {
  const [state, setState] = useState<{ error?: string; success?: boolean; cmaSent?: boolean }>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setState({})
    const formData = new FormData(e.currentTarget)
    const result = await submitValuationRequest(formData)
    setLoading(false)
    setState(result)
    if (result.success) {
      trackEvent('generate_lead', { source: 'home_valuation', cma_sent: result.cmaSent ?? false })
    }
  }

  if (state.success) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10/80 p-8 text-center">
        <h2 className="text-xl font-semibold text-green-500">
          {state.cmaSent ? "We've emailed your valuation" : "Request received"}
        </h2>
        <p className="mt-2 text-green-500">
          {state.cmaSent
            ? "Check your inbox for your Comparative Market Analysis. If you don't see it, check spam or reply to this email and we'll resend."
            : "We'll prepare your home valuation and send it to you shortly. You can also expect a quick call from our team to answer any questions."}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" id="home_valuation">
      <div>
        <label htmlFor="val-address" className="block text-sm font-medium text-[var(--foreground)]">
          Property address <span className="text-destructive">*</span>
        </label>
        <input
          id="val-address"
          name="address"
          type="text"
          autoComplete="street-address"
          required
          className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--foreground)] shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="123 Main St, Bend, OR 97701"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="val-name" className="block text-sm font-medium text-[var(--foreground)]">
            Name
          </label>
          <input
            id="val-name"
            name="name"
            type="text"
            autoComplete="name"
            className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--foreground)] shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="val-email" className="block text-sm font-medium text-[var(--foreground)]">
            Email <span className="text-destructive">*</span>
          </label>
          <input
            id="val-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--foreground)] shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="you@example.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="val-phone" className="block text-sm font-medium text-[var(--foreground)]">
          Phone
        </label>
        <input
          id="val-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className="mt-1 block w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--foreground)] shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="(541) 555-0123"
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent px-6 py-3.5 text-base font-semibold text-primary shadow-md hover:bg-accent/90 disabled:opacity-70"
      >
        {loading ? 'Sending…' : 'Get my home value'}
      </button>
    </form>
  )
}
