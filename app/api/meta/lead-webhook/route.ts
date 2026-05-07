import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'

/**
 * POST /api/meta/lead-webhook
 *
 * Receives Facebook Lead Ads webhooks and creates/updates contacts in
 * Follow-Up Boss (FUB) for lead nurture.
 *
 * Meta sends a POST for each new lead. This handler:
 *   1. Verifies the X-Hub-Signature-256 HMAC against META_APP_SECRET.
 *   2. For each leadgen change in the payload:
 *      a. Fetches lead details from the Meta Graph API.
 *      b. Maps field_data to structured contact fields.
 *      c. Creates/updates the person in FUB via POST /v1/people.
 *      d. Adds a note with campaign context and lead intent.
 *   3. Returns 200 immediately (Meta requires < 20s response; errors are logged
 *      but not propagated to avoid Meta retry storms).
 *
 * GET /api/meta/lead-webhook
 *
 * Meta sends a GET with hub.challenge during initial webhook subscription.
 * This handler echoes the challenge back to verify the endpoint.
 *
 * Required env vars:
 *   META_APP_SECRET          — from Meta App Dashboard → App Settings → Basic
 *   META_PAGE_ACCESS_TOKEN   — long-lived page token (also META_PAGE_TOKEN)
 *   FUB_API_KEY              — FUB API key (also FOLLOWUPBOSS_API_KEY)
 *   FUB_PIPELINE_ID          — FUB pipeline ID for new leads (optional but recommended)
 *
 * Setup (one-time, in Meta App Dashboard):
 *   App Dashboard → Webhooks → Page → Subscribe to "leadgen" field.
 *   Callback URL: https://ryanrealty.vercel.app/api/meta/lead-webhook
 *   Verify Token: any string you set (checked in the GET handler).
 *
 * See: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const META_GRAPH_BASE = 'https://graph.facebook.com/v18.0'
const FUB_BASE = 'https://api.followupboss.com/v1'

function getMetaToken(): string {
  const token = (
    process.env.META_PAGE_ACCESS_TOKEN ||
    process.env.META_PAGE_TOKEN ||
    ''
  ).trim()
  if (!token) throw new Error('META_PAGE_ACCESS_TOKEN not configured')
  return token
}

function getFubConfig(): { apiKey: string; pipelineId: string | null } {
  const apiKey = (
    process.env.FUB_API_KEY ||
    process.env.FOLLOWUPBOSS_API_KEY ||
    ''
  ).trim()
  if (!apiKey) throw new Error('FUB_API_KEY not configured')
  const pipelineId = (process.env.FUB_PIPELINE_ID || '').trim() || null
  return { apiKey, pipelineId }
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

function verifySignature(body: string, signatureHeader: string | null): boolean {
  const appSecret = (process.env.META_APP_SECRET || '').trim()
  if (!appSecret) {
    console.warn('[lead-webhook] META_APP_SECRET not set — skipping signature verification (INSECURE)')
    return true // warn and proceed in dev; in production set META_APP_SECRET
  }

  if (!signatureHeader) {
    console.error('[lead-webhook] Missing X-Hub-Signature-256 header')
    return false
  }

  // Header format: "sha256=<hex>"
  const [algo, hexSig] = signatureHeader.split('=')
  if (algo !== 'sha256' || !hexSig) {
    console.error('[lead-webhook] Invalid signature header format:', signatureHeader)
    return false
  }

  const expected = createHmac('sha256', appSecret).update(body, 'utf8').digest('hex')

  try {
    return timingSafeEqual(
      Buffer.from(hexSig, 'hex'),
      Buffer.from(expected, 'hex')
    )
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Meta types
// ---------------------------------------------------------------------------

interface LeadFieldData {
  name: string
  values: string[]
}

interface MetaLeadDetail {
  id: string
  created_time: string
  ad_id?: string
  ad_name?: string
  adset_id?: string
  adset_name?: string
  campaign_id?: string
  campaign_name?: string
  form_id?: string
  field_data?: LeadFieldData[]
}

interface WebhookEntry {
  id: string
  time: number
  changes: Array<{
    field: string
    value: {
      leadgen_id?: string
      ad_id?: string
      ad_name?: string
      adset_id?: string
      adset_name?: string
      campaign_id?: string
      campaign_name?: string
      form_id?: string
      page_id?: string
    }
  }>
}

interface WebhookPayload {
  object?: string
  entry?: WebhookEntry[]
}

// ---------------------------------------------------------------------------
// Fetch lead details from Meta Graph API
// ---------------------------------------------------------------------------

async function fetchLeadDetails(leadId: string): Promise<MetaLeadDetail | null> {
  const token = getMetaToken()
  const fields = 'id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data'
  const url = `${META_GRAPH_BASE}/${leadId}?fields=${fields}&access_token=${encodeURIComponent(token)}`

  let res: Response
  try {
    res = await fetch(url)
  } catch (err) {
    console.error(`[lead-webhook] Network error fetching lead ${leadId}:`, err)
    return null
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[lead-webhook] Meta API error for lead ${leadId} (HTTP ${res.status}): ${body}`)
    return null
  }

  const data = await res.json() as MetaLeadDetail
  return data
}

// ---------------------------------------------------------------------------
// Parse field_data into a contact record
// ---------------------------------------------------------------------------

interface ParsedLead {
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  buySellIntent: string | null
  campaignName: string | null
  adSetName: string | null
  leadId: string
  createdTime: string
}

function parseLeadFields(lead: MetaLeadDetail): ParsedLead {
  const fields = lead.field_data || []

  function get(name: string): string | null {
    const f = fields.find(f => f.name.toLowerCase() === name.toLowerCase())
    return f?.values?.[0]?.trim() || null
  }

  return {
    firstName: get('first_name'),
    lastName: get('last_name'),
    email: get('email'),
    phone: get('phone_number') || get('phone'),
    buySellIntent: get('buy_sell_intent'),
    campaignName: lead.campaign_name || null,
    adSetName: lead.adset_name || null,
    leadId: lead.id,
    createdTime: lead.created_time,
  }
}

// ---------------------------------------------------------------------------
// Create/update person in FUB
// ---------------------------------------------------------------------------

function fubHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
  }
  const system = (process.env.FOLLOWUPBOSS_SYSTEM || '').trim()
  const systemKey = (process.env.FOLLOWUPBOSS_SYSTEM_KEY || '').trim()
  if (system) headers['X-System'] = system
  if (systemKey) headers['X-System-Key'] = systemKey
  return headers
}

async function createFubContact(lead: ParsedLead): Promise<number | null> {
  const { apiKey, pipelineId } = getFubConfig()

  const source = lead.campaignName
    ? `Facebook Lead Ad — ${lead.campaignName}`
    : 'Facebook Lead Ad — Market Report'

  const tags = ['FB Lead Ad', 'Market Report']
  if (lead.buySellIntent === 'buying') tags.push('Intent: Buying')
  else if (lead.buySellIntent === 'selling') tags.push('Intent: Selling')
  else if (lead.buySellIntent === 'both') tags.push('Intent: Buying + Selling')
  else if (lead.buySellIntent === 'exploring') tags.push('Intent: Exploring')

  const body: Record<string, unknown> = {
    source,
    tags,
    stage: 'Lead',
    ...(lead.firstName && { firstName: lead.firstName }),
    ...(lead.lastName && { lastName: lead.lastName }),
    ...(lead.email && { emails: [{ value: lead.email, type: 'Primary' }] }),
    ...(lead.phone && { phones: [{ value: lead.phone, type: 'Mobile' }] }),
    // Custom fields
    ...(lead.buySellIntent && { buySellIntent: lead.buySellIntent }),
    ...(lead.campaignName && { campaign: lead.campaignName }),
  }

  if (pipelineId) {
    body.pipeline = pipelineId
  }

  let res: Response
  try {
    res = await fetch(`${FUB_BASE}/people`, {
      method: 'POST',
      headers: fubHeaders(apiKey),
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('[lead-webhook] FUB network error creating person:', err)
    return null
  }

  let data: Record<string, unknown>
  try {
    data = await res.json() as Record<string, unknown>
  } catch {
    console.error(`[lead-webhook] FUB non-JSON response (HTTP ${res.status})`)
    return null
  }

  if (!res.ok) {
    const msg = (data.error as Record<string, string>)?.message || JSON.stringify(data)
    console.error(`[lead-webhook] FUB createPerson failed (HTTP ${res.status}): ${msg}`)
    return null
  }

  const personId = (data.id || (data.person as Record<string, unknown>)?.id) as number | undefined
  return personId ?? null
}

async function addFubNote(personId: number, lead: ParsedLead): Promise<void> {
  const { apiKey } = getFubConfig()

  const lines = [
    `Facebook Lead Ad capture`,
    `Lead ID: ${lead.leadId}`,
    `Captured: ${new Date(lead.createdTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST`,
    lead.campaignName ? `Campaign: ${lead.campaignName}` : null,
    lead.adSetName ? `Ad Set: ${lead.adSetName}` : null,
    lead.buySellIntent ? `Intent: ${lead.buySellIntent}` : null,
    `---`,
    `Source: Facebook Lead Generation Ad`,
    `Lead magnet: Monthly Market Report`,
  ].filter(Boolean).join('\n')

  try {
    await fetch(`${FUB_BASE}/notes`, {
      method: 'POST',
      headers: fubHeaders(apiKey),
      body: JSON.stringify({ personId, body: lines, isHtml: false }),
    })
  } catch (err) {
    console.warn('[lead-webhook] FUB addNote error (non-fatal):', err)
  }
}

// ---------------------------------------------------------------------------
// Process a single lead
// ---------------------------------------------------------------------------

async function processLead(leadId: string, adName?: string): Promise<void> {
  console.log(`[lead-webhook] Processing lead: ${leadId} (ad: ${adName || 'unknown'})`)

  // Fetch full lead details from Meta
  const leadDetail = await fetchLeadDetails(leadId)
  if (!leadDetail) {
    console.error(`[lead-webhook] Could not fetch lead details for ${leadId} — skipping`)
    return
  }

  const parsed = parseLeadFields(leadDetail)
  console.log(`[lead-webhook] Lead fields — name: ${parsed.firstName} ${parsed.lastName}, email: ${parsed.email}, intent: ${parsed.buySellIntent}`)

  if (!parsed.email && !parsed.phone) {
    console.warn(`[lead-webhook] Lead ${leadId} has no email or phone — creating FUB contact anyway (name-only record)`)
  }

  // Create FUB contact
  const personId = await createFubContact(parsed)
  if (!personId) {
    console.error(`[lead-webhook] FUB person creation failed for lead ${leadId}`)
    return
  }

  // Add context note
  await addFubNote(personId, parsed)

  console.log(`[lead-webhook] Lead ${leadId} → FUB person ${personId} (${parsed.email || 'no email'})`)
}

// ---------------------------------------------------------------------------
// GET — webhook verification (Meta hub.challenge)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const challenge = url.searchParams.get('hub.challenge')
  const verifyToken = url.searchParams.get('hub.verify_token')

  if (mode === 'subscribe' && challenge) {
    // Optional: verify the token if META_WEBHOOK_VERIFY_TOKEN is set
    const expectedToken = (process.env.META_WEBHOOK_VERIFY_TOKEN || '').trim()
    if (expectedToken && verifyToken !== expectedToken) {
      console.error('[lead-webhook] Webhook verify token mismatch')
      return new NextResponse('Forbidden', { status: 403 })
    }

    console.log('[lead-webhook] Webhook verification challenge received — responding')
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return NextResponse.json({ ok: true, status: 'lead-webhook endpoint live' })
}

// ---------------------------------------------------------------------------
// POST — receive lead events
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Read the raw body for signature verification BEFORE parsing JSON
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    console.error('[lead-webhook] Failed to read request body')
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Verify signature
  const sigHeader = req.headers.get('x-hub-signature-256')
  if (!verifySignature(rawBody, sigHeader)) {
    console.error('[lead-webhook] Signature verification failed')
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  // Parse payload
  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody) as WebhookPayload
  } catch {
    console.error('[lead-webhook] Invalid JSON payload')
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Meta requires a fast 200 response — process async, return immediately
  // We respond 200 first, then process. This prevents Meta retry storms.

  // Fire-and-forget processing (errors are caught internally)
  void (async () => {
    try {
      const entries = payload.entry || []
      for (const entry of entries) {
        const changes = entry.changes || []
        for (const change of changes) {
          if (change.field !== 'leadgen') continue

          const leadId = change.value.leadgen_id
          if (!leadId) {
            console.warn('[lead-webhook] leadgen change missing leadgen_id:', change)
            continue
          }

          await processLead(leadId, change.value.ad_name)
        }
      }
    } catch (err) {
      console.error('[lead-webhook] Unhandled error during async processing:', err)
    }
  })()

  // Return 200 immediately so Meta doesn't retry
  return NextResponse.json({ ok: true })
}
