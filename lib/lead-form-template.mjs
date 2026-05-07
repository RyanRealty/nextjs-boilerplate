#!/usr/bin/env node
/**
 * Ryan Realty — FB lead form template manager.
 *
 * The lead form is created once and reused across every monthly market report
 * ad campaign. The form ID is cached in META_FB_LEAD_FORM_TEMPLATE_ID.
 *
 * Form spec (per social_media_skills/facebook-lead-gen-ad/SKILL.md §5):
 *   Fields (all FB-profile pre-fill except the custom intent question):
 *     1. First name  (FIRST_NAME — pre-fill from FB profile)
 *     2. Last name   (LAST_NAME  — pre-fill from FB profile)
 *     3. Email       (EMAIL      — pre-fill from FB profile)
 *     4. Phone       (PHONE      — pre-fill, optional)
 *     5. Intent      (CUSTOM, key=buy_sell_intent)
 *
 *   Privacy policy: https://ryan-realty.com/privacy
 *   Thank-you page: "Your Bend market report is on the way" → ryan-realty.com
 *
 * Usage:
 *   import { getOrCreateForm } from '../lib/lead-form-template.mjs'
 *   const formId = await getOrCreateForm()
 *
 * If META_FB_LEAD_FORM_TEMPLATE_ID is set in the environment, that ID is
 * returned immediately without a network call. If it's not set, a new form
 * is created, the ID is printed to stdout with a reminder to store it, and
 * the ID is returned.
 */

import { createLeadForm } from './meta-marketing-api.mjs'

// ---------------------------------------------------------------------------
// Form definition
// ---------------------------------------------------------------------------

const FORM_NAME = 'Ryan Realty Monthly Market Report — Lead Form'

const FORM_QUESTIONS = [
  { type: 'FIRST_NAME' },
  { type: 'LAST_NAME' },
  { type: 'EMAIL' },
  { type: 'PHONE' },
  {
    type: 'CUSTOM',
    key: 'buy_sell_intent',
    label: 'Are you currently in the market to buy or sell a home in Central Oregon?',
    options: [
      { value: 'buying', key: 'buying' },
      { value: 'selling', key: 'selling' },
      { value: 'both', key: 'both' },
      { value: 'exploring', key: 'exploring' },
    ],
  },
]

const FORM_PRIVACY_POLICY = {
  url: 'https://ryan-realty.com/privacy',
  link_text: 'Privacy Policy',
}

const FORM_THANK_YOU = {
  title: 'Your Bend market report is on the way',
  body: 'Check your inbox in the next 5 minutes. Matt Ryan, Principal Broker at Ryan Realty, will follow up personally if you indicated active intent.',
  button_text: 'Visit our website',
  button_type: 'VIEW_WEBSITE',
  website_url: 'https://ryan-realty.com',
}

// ---------------------------------------------------------------------------
// getOrCreateForm
// ---------------------------------------------------------------------------

/**
 * Return the form ID to use for a lead-gen ad creative.
 *
 * Steps:
 *   1. Check META_FB_LEAD_FORM_TEMPLATE_ID env var → return it if set.
 *   2. Create a new form via the Marketing API.
 *   3. Print a reminder to store the returned ID in .env.local.
 *   4. Return the new form ID.
 *
 * @returns {Promise<string>} — form ID
 */
export async function getOrCreateForm() {
  // Fast path: form template already created and stored
  const cached = process.env.META_FB_LEAD_FORM_TEMPLATE_ID?.trim()
  if (cached) {
    console.log(`[lead-form-template] Using cached form: META_FB_LEAD_FORM_TEMPLATE_ID=${cached}`)
    return cached
  }

  // Create the form
  console.log('[lead-form-template] META_FB_LEAD_FORM_TEMPLATE_ID not set — creating new form...')
  const { id } = await createLeadForm({
    name: FORM_NAME,
    questions: FORM_QUESTIONS,
    privacy_policy: FORM_PRIVACY_POLICY,
    thank_you_page: FORM_THANK_YOU,
  })

  console.log('\n' +
    '  ╔══════════════════════════════════════════════════════════════════╗\n' +
    '  ║  IMPORTANT: Save this form ID to avoid recreating it each run.  ║\n' +
    `  ║  Add to .env.local:                                             ║\n` +
    `  ║  META_FB_LEAD_FORM_TEMPLATE_ID=${id.padEnd(35)}║\n` +
    '  ╚══════════════════════════════════════════════════════════════════╝\n'
  )

  return id
}

// ---------------------------------------------------------------------------
// Exported form spec (for inspection / testing without creating)
// ---------------------------------------------------------------------------

export { FORM_NAME, FORM_QUESTIONS, FORM_PRIVACY_POLICY, FORM_THANK_YOU }
