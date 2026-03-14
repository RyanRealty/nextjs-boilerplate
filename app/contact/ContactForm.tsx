'use client'

import { useState } from 'react'
import { submitContactForm } from './actions'
import { trackEvent } from '@/lib/tracking'

const INQUIRY_OPTIONS = [
  { value: 'Buying', label: 'Buying' },
  { value: 'Selling', label: 'Selling' },
  { value: 'Both', label: 'Both' },
  { value: 'General Inquiry', label: 'General Inquiry' },
  { value: 'Relocation', label: 'Relocation' },
]

export default function ContactForm({ defaultInquiryType }: { defaultInquiryType?: string }) {
  const [state, setState] = useState<{ error?: string; success?: boolean }>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setState({})
    const formData = new FormData(e.currentTarget)
    const result = await submitContactForm(formData)
    setLoading(false)
    setState(result)
    if (result.success) {
      trackEvent('generate_lead', { source: 'contact_page', inquiry: formData.get('inquiryType') })
    }
  }

  if (state.success) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-green-500">
        <p className="font-medium">Thanks for reaching out.</p>
        <p className="mt-1 text-sm">We&apos;ll get back to you soon.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-muted-foreground">
          Name
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium text-muted-foreground">
          Email <span className="text-destructive">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <div>
        <label htmlFor="contact-phone" className="block text-sm font-medium text-muted-foreground">
          Phone
        </label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <div>
        <label htmlFor="contact-inquiry" className="block text-sm font-medium text-muted-foreground">
          How can we help?
        </label>
        <select
          id="contact-inquiry"
          name="inquiryType"
          defaultValue={defaultInquiryType ?? 'General Inquiry'}
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {INQUIRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-muted-foreground">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          className="mt-1 block w-full rounded-lg border border-border px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
      >
        {loading ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
