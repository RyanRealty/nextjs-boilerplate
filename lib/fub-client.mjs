#!/usr/bin/env node
/**
 * Follow-Up Boss API client — lead creation + notes.
 *
 * This is a purpose-built ESM module for the FB Lead-Gen ad pipeline.
 * The existing lib/followupboss.ts covers event/tracking flows; this module
 * adds direct People POST (createPerson) and Notes POST (addNote) which the
 * FB lead webhook route needs to create contacts from scratch.
 *
 * Auth: HTTP Basic with FUB_API_KEY as username, empty password.
 *
 * Required env vars:
 *   FUB_API_KEY       — Follow-Up Boss API key (Settings → API)
 *   FUB_PIPELINE_ID   — which pipeline new FB leads enter (numeric string)
 *
 * Optional env vars (mirrors lib/followupboss.ts):
 *   FOLLOWUPBOSS_SYSTEM      — X-System header (system name shown in FUB)
 *   FOLLOWUPBOSS_SYSTEM_KEY  — X-System-Key header
 */

const FUB_BASE = 'https://api.followupboss.com/v1'

// ---------------------------------------------------------------------------
// Config / env
// ---------------------------------------------------------------------------

function getConfig() {
  // Support both FUB_API_KEY (new convention for scripts) and FOLLOWUPBOSS_API_KEY (site convention)
  const apiKey = (process.env.FUB_API_KEY || process.env.FOLLOWUPBOSS_API_KEY)?.trim()
  if (!apiKey) {
    throw new FubClientError(
      '[fub-client] Follow-Up Boss API key not configured. ' +
      'Generate at FUB → My Settings → API → Generate New Key. ' +
      'Add to .env.local as FUB_API_KEY=<key>.'
    )
  }
  const pipelineId = (process.env.FUB_PIPELINE_ID)?.trim() || null
  return { apiKey, pipelineId }
}

function fubHeaders(apiKey) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
  }
  const system = process.env.FOLLOWUPBOSS_SYSTEM?.trim()
  const systemKey = process.env.FOLLOWUPBOSS_SYSTEM_KEY?.trim()
  if (system) headers['X-System'] = system
  if (systemKey) headers['X-System-Key'] = systemKey
  return headers
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class FubClientError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'FubClientError'
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// createPerson
// ---------------------------------------------------------------------------

/**
 * Create or update a person in Follow-Up Boss.
 * FUB deduplicates by email — if the email already exists, the person is updated.
 *
 * @param {{
 *   firstName?: string,
 *   lastName?: string,
 *   emails?: Array<{ value: string, type?: string }>,
 *   phones?: Array<{ value: string, type?: string }>,
 *   source?: string,         — shown in FUB activity feed
 *   tags?: string[],
 *   stage?: string,          — e.g. "Lead", "Prospect"
 *   pipeline?: string,       — pipeline name (if using name-based routing)
 *   stageId?: number,        — direct FUB stage ID
 *   customFields?: Record<string, string>,
 * }} params
 * @returns {Promise<{ id: number }>}
 */
export async function createPerson({
  firstName,
  lastName,
  emails = [],
  phones = [],
  source,
  tags = [],
  stage,
  pipeline,
  stageId,
  customFields = {},
}) {
  const { apiKey, pipelineId } = getConfig()

  const body = {
    ...(firstName && { firstName }),
    ...(lastName && { lastName }),
    ...(emails.length && {
      emails: emails.map(e => ({ value: e.value, type: e.type || 'Primary' })),
    }),
    ...(phones.length && {
      phones: phones.map(p => ({ value: p.value, type: p.type || 'Mobile' })),
    }),
    ...(source && { source }),
    ...(tags.length && { tags }),
    ...(stage && { stage }),
    ...(stageId && { stageId }),
    ...(pipeline && { pipeline }),
  }

  // Attach pipeline ID from env if set and not already specified
  if (pipelineId && !pipeline && !stageId) {
    body.pipeline = pipelineId
  }

  // Custom fields: FUB accepts them as top-level keys (camelCase)
  for (const [k, v] of Object.entries(customFields)) {
    body[k] = v
  }

  const res = await fetch(`${FUB_BASE}/people`, {
    method: 'POST',
    headers: fubHeaders(apiKey),
    body: JSON.stringify(body),
  })

  let data
  try {
    data = await res.json()
  } catch {
    throw new FubClientError(`FUB createPerson: non-JSON response (HTTP ${res.status})`, res.status)
  }

  // FUB returns 201 for new creates, 200 for updates on email collision
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || JSON.stringify(data)
    throw new FubClientError(`FUB createPerson failed (HTTP ${res.status}): ${msg}`, res.status)
  }

  const personId = data.id || data.person?.id
  if (!personId) {
    throw new FubClientError(`FUB createPerson: no id in response — ${JSON.stringify(data)}`)
  }

  console.log(`[fub-client] Person created/updated: id=${personId} email=${emails[0]?.value || '—'}`)
  return { id: personId }
}

// ---------------------------------------------------------------------------
// addNote
// ---------------------------------------------------------------------------

/**
 * Add a note to an existing FUB person.
 *
 * @param {number} personId — FUB person ID
 * @param {string} body     — note text (plain text or basic markdown)
 * @returns {Promise<{ id: number }>}
 */
export async function addNote(personId, body) {
  const { apiKey } = getConfig()

  const res = await fetch(`${FUB_BASE}/notes`, {
    method: 'POST',
    headers: fubHeaders(apiKey),
    body: JSON.stringify({
      personId,
      body,
      isHtml: false,
    }),
  })

  let data
  try {
    data = await res.json()
  } catch {
    throw new FubClientError(`FUB addNote: non-JSON response (HTTP ${res.status})`, res.status)
  }

  if (!res.ok) {
    const msg = data?.error?.message || data?.message || JSON.stringify(data)
    throw new FubClientError(`FUB addNote failed (HTTP ${res.status}): ${msg}`, res.status)
  }

  const noteId = data.id || data.note?.id
  console.log(`[fub-client] Note added: id=${noteId} person=${personId}`)
  return { id: noteId }
}

// ---------------------------------------------------------------------------
// findPersonByEmail (thin wrapper — avoids duplicate creates)
// ---------------------------------------------------------------------------

/**
 * Search FUB for a person by email. Returns { id } or null.
 *
 * @param {string} email
 * @returns {Promise<{ id: number } | null>}
 */
export async function findPersonByEmail(email) {
  const { apiKey } = getConfig()

  const params = new URLSearchParams({
    email: email.trim(),
    limit: '1',
    fields: 'id,firstName,lastName,emails',
  })

  const res = await fetch(`${FUB_BASE}/people?${params}`, {
    headers: fubHeaders(apiKey),
  })

  if (!res.ok) return null

  let data
  try {
    data = await res.json()
  } catch {
    return null
  }

  const people = data.people || []
  return people.length > 0 ? { id: people[0].id } : null
}
