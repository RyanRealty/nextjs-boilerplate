'use client'

import { useState } from 'react'
import type { ListingDetailAgent } from '@/app/actions/listing-detail'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/tracking'
import { submitListingInquiry } from '@/app/actions/track-contact-agent'

type Props = {
  agent: ListingDetailAgent | null
  address: string
  listingKey: string
  /** When true, show agent email and contact CTA; when false, only show name and office. We never show listing agency or agent phone on the site. */
  showContactInfo?: boolean
}

export default function AgentCard({ agent, address, listingKey, showContactInfo = true }: Props) {
  const [contactOpen, setContactOpen] = useState(false)

  if (!agent) {
    return (
      <Card id="listing-agent-card">
        <CardContent className="p-4">
          <p className="text-sm text-[var(--muted-foreground)]">No listing agent information available.</p>
        </CardContent>
      </Card>
    )
  }

  const name = agent.agent_name ?? 'Listing Agent'
  const email = agent.agent_email ?? ''

  const handleEmail = () => {
    trackEvent('email_agent', { listing_key: listingKey, agent_name: name })
  }

  return (
    <Card id="listing-agent-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--border)] flex-shrink-0 overflow-hidden">
            {/* Placeholder avatar - no agent photo URL in schema */}
          </div>
          <div>
            <h3 className="font-semibold text-primary">{name}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Listing Agent</p>
            {agent.office_name && <p className="text-sm text-[var(--muted-foreground)]">{agent.office_name}</p>}
          </div>
        </div>
        {showContactInfo && email && (
          <a href={`mailto:${email}`} onClick={handleEmail} className="block text-accent-foreground font-medium hover:underline break-all">
            {email}
          </a>
        )}
        <Button variant="default" size="default" className="w-full" onClick={() => setContactOpen(true)}>
          Contact {name.split(/\s+/)[0] ?? 'Agent'}
        </Button>
      </CardContent>

      {contactOpen && (
        <ContactModal
          agentName={name}
          address={address}
          listingKey={listingKey}
          onClose={() => setContactOpen(false)}
        />
      )}
    </Card>
  )
}

function ContactModal({
  agentName,
  address,
  listingKey,
  onClose,
}: {
  agentName: string
  address: string
  listingKey: string
  onClose: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(formData: FormData) {
    setStatus('sending')
    setErrorMsg('')
    const listingUrl = typeof window !== 'undefined' ? window.location.href : ''
    const result = await submitListingInquiry({
      type: 'question',
      listingKey,
      listingUrl,
      listingAddress: address,
      name: (formData.get('name') as string)?.trim() ?? null,
      email: (formData.get('email') as string)?.trim() ?? null,
      phone: (formData.get('phone') as string)?.trim() ?? null,
      message: (formData.get('message') as string)?.trim() ?? null,
    })
    if (result.ok) {
      setStatus('done')
      trackEvent('generate_lead', { source: 'listing_inquiry', type: 'question' })
      setTimeout(onClose, 1500)
    } else {
      setStatus('error')
      setErrorMsg(result.error ?? 'Something went wrong')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" aria-hidden onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-primary mb-4">Contact {agentName}</h3>
        {status === 'done' ? (
          <p className="text-[#22C55E]">Message sent. We&apos;ll be in touch soon.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }} className="space-y-3">
            <label className="block">
              <span className="text-sm text-primary">Name</span>
              <input type="text" name="name" required className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm text-primary">Email</span>
              <input type="email" name="email" required className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm text-primary">Phone</span>
              <input type="tel" name="phone" className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm text-primary">Message</span>
              <textarea name="message" rows={3} defaultValue={`I'm interested in ${address}`} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
            </label>
            {errorMsg && <p className="text-sm text-[var(--destructive)]">{errorMsg}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="submit" variant="default" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send'}</Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
