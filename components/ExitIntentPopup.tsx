'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { submitExitIntentLead } from '@/app/actions/lead-capture'

const SESSION_KEY = 'ryan_realty_exit_popup_seen'

function readCampaign(): {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
} {
  if (typeof window === 'undefined') return {}
  const query = new URLSearchParams(window.location.search)
  return {
    source: query.get('utm_source') ?? undefined,
    medium: query.get('utm_medium') ?? undefined,
    campaign: query.get('utm_campaign') ?? undefined,
    term: query.get('utm_term') ?? undefined,
    content: query.get('utm_content') ?? undefined,
  }
}

export default function ExitIntentPopup() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const campaign = useMemo(() => readCampaign(), [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SESSION_KEY) === '1') return
    const onMouseLeave = (event: MouseEvent) => {
      if (event.clientY > 24) return
      setOpen(true)
      sessionStorage.setItem(SESSION_KEY, '1')
      document.removeEventListener('mouseleave', onMouseLeave)
    }
    document.addEventListener('mouseleave', onMouseLeave)
    return () => document.removeEventListener('mouseleave', onMouseLeave)
  }, [])

  async function handleSubmit() {
    setSubmitting(true)
    setStatus('idle')
    const result = await submitExitIntentLead({
      email,
      context: `exit-intent:${pathname}`,
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      campaign,
    })
    setSubmitting(false)
    setStatus(result.ok ? 'success' : 'error')
    if (result.ok) {
      setTimeout(() => setOpen(false), 900)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Before you go</DialogTitle>
          <DialogDescription>
            Get new listings and market updates sent to your inbox.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            aria-label="Email address"
          />
          {status === 'success' && <p className="text-sm text-success">You are all set.</p>}
          {status === 'error' && <p className="text-sm text-destructive">Please enter a valid email.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Not now
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Get updates'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
