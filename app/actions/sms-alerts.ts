'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * SMS Instant Alerts for saved searches.
 *
 * When a high-priority listing match is found, sends an SMS
 * to users who have opted in. Uses Twilio or similar SMS API.
 *
 * This is a premium feature — only for users who explicitly opt in
 * and provide their phone number.
 */

/**
 * Opt in to SMS alerts for a saved search.
 */
export async function enableSmsAlerts(input: {
  savedSearchId: string
  phoneNumber: string
}): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Please sign in' }

    // Validate phone number (basic check)
    const phone = input.phoneNumber.replace(/\D/g, '')
    if (phone.length < 10) return { error: 'Please enter a valid phone number' }

    // Update saved search with SMS preference
    const { error } = await supabase
      .from('saved_searches')
      .update({
        sms_enabled: true,
        sms_phone: phone,
      })
      .eq('id', input.savedSearchId)
      .eq('user_id', user.id)

    if (error) {
      // If columns don't exist yet, handle gracefully
      if (error.message.includes('column')) {
        console.error('[enableSmsAlerts] SMS columns not yet added to saved_searches table')
        return { error: 'SMS alerts are being set up. Please try again later.' }
      }
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    console.error('[enableSmsAlerts]', err)
    return { error: 'Failed to enable SMS alerts' }
  }
}

/**
 * Disable SMS alerts for a saved search.
 */
export async function disableSmsAlerts(savedSearchId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Please sign in' }

    const { error } = await supabase
      .from('saved_searches')
      .update({ sms_enabled: false })
      .eq('id', savedSearchId)
      .eq('user_id', user.id)

    if (error) return { error: error.message }
    return { error: null }
  } catch (err) {
    console.error('[disableSmsAlerts]', err)
    return { error: 'Failed to disable SMS alerts' }
  }
}

/**
 * Send an SMS alert for a new listing match.
 * Called by the saved-search-alerts cron when a match is found
 * and the user has SMS enabled.
 *
 * Uses Twilio REST API. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 * TWILIO_PHONE_NUMBER environment variables.
 */
export async function sendSmsAlert(input: {
  to: string
  listingAddress: string
  listingPrice: string
  listingUrl: string
}): Promise<{ error: string | null }> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
    const fromPhone = process.env.TWILIO_PHONE_NUMBER?.trim()

    if (!accountSid || !authToken || !fromPhone) {
      console.error('[sendSmsAlert] Twilio not configured')
      return { error: null } // Silently skip
    }

    const message = `New listing match: ${input.listingAddress} — ${input.listingPrice}. View: ${input.listingUrl}`

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          To: input.to.startsWith('+') ? input.to : `+1${input.to}`,
          From: fromPhone,
          Body: message,
        }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('[sendSmsAlert] Twilio error:', res.status, text)
      return { error: 'SMS delivery failed' }
    }

    return { error: null }
  } catch (err) {
    console.error('[sendSmsAlert]', err)
    return { error: 'SMS delivery failed' }
  }
}
