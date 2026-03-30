'use server'

import { sendEmail } from '@/lib/resend'
import { createClient } from '@supabase/supabase-js'

export async function sendAdminEmail(params: {
  to: string
  subject: string
  body: string
}): Promise<{ id?: string; error?: string }> {
  const result = await sendEmail({
    to: params.to.trim(),
    subject: params.subject.trim(),
    html: params.body.trim() || undefined,
    text: params.body.trim() || undefined,
  })
  if (result.error) return result

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url?.trim() && key?.trim()) {
    const supabase = createClient(url, key)
    await supabase.from('email_campaigns').insert({
      fub_campaign_id: result.id ?? null,
      template_type: 'manual_admin',
      subject: params.subject.trim(),
      sent_count: 1,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  return result
}
