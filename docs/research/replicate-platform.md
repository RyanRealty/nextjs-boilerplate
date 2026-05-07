# Tool: Replicate Platform (gateway)

**Verified:** 2026-05-06 — live fetch of https://replicate.com/docs/reference/http, /pricing, /docs/topics/predictions/output-files, /docs/topics/predictions/data-retention, /docs/topics/predictions/rate-limits, /docs/topics/webhooks/verify-webhook, and github.com/replicate/replicate-javascript README.

---

## What Replicate is

Serverless AI model marketplace. POST a prediction, Replicate spins up the GPU, runs the model, returns output. Pay-per-second of GPU runtime — no infrastructure, no standing costs, autoscales to zero when idle.

---

## Auth (verified 2026-05-06)

```
Authorization: Bearer $REPLICATE_API_TOKEN
```

- All API calls require this header.
- Token is scoped to your account — do not share across orgs.
- Manage tokens at https://replicate.com/account/api-tokens.
- Our env var: `REPLICATE_API_TOKEN` (confirmed set in `.env.local`).

**npm SDK (preferred):**

```bash
npm install replicate
```

```ts
import Replicate from 'replicate'
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
```

The SDK wraps auth, polling helpers, and TypeScript types. For Next.js API routes and server actions, import `replicate` in server context only — never expose the token to the client.

---

## Pricing model (verified 2026-05-06)

Pay-as-you-go. No flat monthly fee. No cold-start charge. You pay only for active GPU compute during a prediction run.

**GPU hardware rates (per second / per hour):**

| Hardware | $/s | $/hr |
|---|---|---|
| CPU (small) | $0.000025 | $0.09 |
| CPU | $0.000100 | $0.36 |
| Nvidia T4 | $0.000225 | $0.81 |
| Nvidia L40S | $0.000975 | $3.51 |
| Nvidia A100 80GB | $0.001400 | $5.04 |
| Nvidia H100 | $0.001525 | $5.49 |
| 2× A100 80GB | $0.002800 | $10.08 |
| 2× H100 | $0.003050 | $10.98 |

Most video generation models (Kling v2.1 Master, Hailuo 02, Seedance 1 Pro, Wan 2.5) run on A100 or H100. A 5-second clip on A100 typically takes 30–120 seconds of GPU time depending on model → $0.04–$0.17 per clip.

**Public models:** charged only for active compute. Failed runs that error before processing generally are not charged.

**Free credit:** No standing free tier or free credit allotment documented on the pricing page. Top up with a credit card. As your credit balance depletes, the API automatically applies stricter rate limits (down to 1 req/s / 6 req/min for accounts with granted credit but no payment method).

---

## Async/sync patterns

Replicate predictions are inherently async. Three completion patterns:

### 1. `Prefer: wait` (synchronous, up to 60s)

Pass the header `Prefer: wait=N` (1–60 seconds) on prediction creation. Replicate holds the HTTP connection open until the model finishes or the timeout elapses. If it finishes: you get the completed prediction in the response body. If it times out: you get a pending prediction and must fall back to polling or webhook.

Use for: fast models (< 30s), simple synchronous server actions.

```ts
const res = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
    'Content-Type': 'application/json',
    'Prefer': 'wait=60',
  },
  body: JSON.stringify({ version: MODEL_VERSION, input }),
})
const prediction = await res.json()
// prediction.status === 'succeeded' if it finished within 60s
```

Our existing `generateBrokerHeadshot` uses this pattern (polling fallback after 60 iterations × 2s = 120s). For video models that take 60–300s, `Prefer: wait` is not sufficient alone.

### 2. Polling

```ts
// Create
const prediction = await replicate.predictions.create({ version, input })

// Poll (SDK built-in helper)
const completed = await replicate.wait(prediction)
console.log(completed.output)
```

Or manually with `GET /v1/predictions/{id}` every 2–5s until `status === 'succeeded' | 'failed'`.

Status values: `starting` → `processing` → `succeeded | failed | canceled`.

Use for: server actions where the caller can wait (e.g., admin tools, one-off operations). Not suitable for long-running video generation in a user-facing request — connection will time out.

### 3. Webhook (recommended for content engine)

Fire-and-forget. Replicate POSTs your endpoint when the job completes. No held connections. Works for any duration model.

```ts
const prediction = await replicate.predictions.create({
  version: 'kwaivgi/kling-v2.1-master:abc123',
  input: { prompt, image, aspect_ratio: '9:16', duration: 5 },
  webhook: 'https://ryan-realty.com/api/replicate/webhook',
  webhook_events_filter: ['completed'],
})
// Store prediction.id in DB as 'pending', return immediately
```

---

## Webhook pattern (production recommended)

### Setup on prediction create

```ts
await replicate.predictions.create({
  version: MODEL_VERSION,
  input: { ... },
  webhook: 'https://ryan-realty.com/api/replicate/webhook',
  webhook_events_filter: ['completed'],   // only fire once, on final state
})
```

`webhook_events_filter` values:
- `start` — fires when prediction begins processing
- `output` — fires each time an output token/chunk is generated (streaming models)
- `logs` — fires as logs are appended
- `completed` — fires once, when status is `succeeded`, `failed`, or `canceled`

For video generation: `['completed']` only. No need for `output` or `logs`.

### Signature verification (HMAC-SHA256)

Every webhook delivery includes three headers:

| Header | Description |
|---|---|
| `webhook-id` | Unique message ID (same across retries) |
| `webhook-timestamp` | Unix epoch seconds when sent |
| `webhook-signature` | Base64-encoded HMAC-SHA256 signature(s), space-delimited |

**Retrieve signing secret once** (cache it):

```
GET https://api.replicate.com/v1/webhooks/default/secret
Authorization: Bearer $REPLICATE_API_TOKEN
```

Response: `{ "key": "whsec_<base64>" }` — strip the `whsec_` prefix, base64-decode to get the raw bytes.

**Signing string format:**

```
${webhook-id}.${webhook-timestamp}.${raw-body}
```

**Verification in Next.js API route:**

```ts
import crypto from 'crypto'

export async function POST(req: Request) {
  const body = await req.text()                // raw body — do not parse first
  const id = req.headers.get('webhook-id') ?? ''
  const timestamp = req.headers.get('webhook-timestamp') ?? ''
  const sig = req.headers.get('webhook-signature') ?? ''

  const signingKey = Buffer.from(process.env.REPLICATE_WEBHOOK_SECRET!, 'base64')
  const signed = `${id}.${timestamp}.${body}`
  const expected = crypto
    .createHmac('sha256', signingKey)
    .update(signed)
    .digest('base64')

  // webhook-signature may contain multiple sigs (space-delimited, prefixed v1,)
  const valid = sig.split(' ').some((s) => {
    const bare = s.replace(/^v1,/, '')
    return crypto.timingSafeEqual(Buffer.from(bare), Buffer.from(expected))
  })

  if (!valid) return new Response('Unauthorized', { status: 401 })

  const prediction = JSON.parse(body)
  // handle prediction.output, prediction.status, prediction.id
}
```

**Add `REPLICATE_WEBHOOK_SECRET` to `.env.local`** — fetch it once via the API and store it. Cache locally to avoid repeated API calls during verification.

### Retry behavior

Replicate retries webhook delivery on non-2xx responses. The `webhook-id` stays the same across retries — use it as an idempotency key in your handler to prevent double-processing.

---

## Output URLs

- Served from `replicate.delivery` and `*.replicate.delivery`.
- **Expire after 1 hour** — no extension mechanism available.
- All input parameters, output values, output files, and logs for API predictions are automatically deleted after 1 hour.
- Web UI predictions persist indefinitely; API predictions do not.

**Mandatory download pattern** — in webhook handler or immediately after polling:

```ts
async function persistReplicateOutput(replicateUrl: string, storagePath: string) {
  // Must do this within 1 hour of prediction completion
  const res = await fetch(replicateUrl)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const buffer = Buffer.from(await res.arrayBuffer())

  const { error } = await supabase.storage
    .from('v5_library')
    .upload(storagePath, buffer, { contentType: 'video/mp4', upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  return supabase.storage.from('v5_library').getPublicUrl(storagePath).data.publicUrl
}
```

If the download window is missed (1 hour elapsed), the only recovery is re-running the prediction.

---

## Storage handoff (download → Supabase Storage)

Established pattern from `app/actions/broker-headshot.ts`:

1. Create Replicate prediction (with or without webhook).
2. Receive output URL (`prediction.output[0]` for single-file models).
3. `fetch(outputUrl)` → `Buffer.from(await res.arrayBuffer())`.
4. `supabase.storage.from(bucket).upload(path, buffer, { contentType, upsert: true })`.
5. Construct permanent public URL via `getPublicUrl()` or `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`.
6. Write permanent URL to relevant DB row (listings, market_assets, etc.).

For video: bucket `v5_library`, path `<slug>/<filename>.mp4`. For images: bucket `brokers` or `market_assets`.

---

## Rate limits (verified 2026-05-06)

| Endpoint | Limit |
|---|---|
| `POST /v1/predictions` | 600 req/min |
| All other endpoints | 3000 req/min |

- Short burst above limits is allowed before throttling kicks in.
- HTTP `429` returned when throttled. Message includes reset window (~30s).
- **Credit-depletion throttling:** as balance drops toward zero, the API tightens limits automatically — down to 1 req/s / 6 req/min for low-balance accounts without a payment method.
- No documented per-tier concurrent prediction caps — rate limits apply uniformly, modified by credit balance.

---

## Error handling

| Code | Meaning | Action |
|---|---|---|
| `402` | Insufficient credits | Top up account, retry |
| `422` | Invalid input | Log the body, fix model inputs, do not retry |
| `429` | Rate limit exceeded | Exponential backoff, retry after ~30s |
| `404` | Model version not found | Update pinned version hash |
| `500` | Model crashed | Retry once after 5s linear backoff; if fails again, log and route to fallback |

**Retry pattern for production:**

```ts
async function createWithRetry(params: PredictionParams, retries = 2): Promise<Prediction> {
  try {
    return await replicate.predictions.create(params)
  } catch (err: any) {
    if (retries > 0 && err?.status === 500) {
      await new Promise(r => setTimeout(r, 5000))
      return createWithRetry(params, retries - 1)
    }
    throw err
  }
}
```

---

## Model versioning

Two ways to specify a model:

**1. `owner/model:version_id` (pinned — use in production):**

```ts
version: 'kwaivgi/kling-v2.1-master:abc123def456...'
```

Pins to an exact model checkpoint. Output is reproducible. Safe for production.

**2. `owner/model` (versionless — uses latest):**

```ts
model: 'black-forest-labs/flux-schnell'
```

Automatically uses the latest published version. Output may change when the model author pushes an update. Acceptable for experimentation; risky for production builds where output consistency matters.

**Rule:** always pin version hashes for models used in content engine production workflows (Kling, Hailuo, Seedance, Wan, Luma Ray). Track current hashes in `video_production_skills/API_INVENTORY.md`.

---

## Code pattern (TypeScript — Next.js API route with webhook)

```ts
import Replicate from 'replicate'
import { createClient } from '@supabase/supabase-js'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

// --- Kick off a video generation job ---
export async function startVideoGeneration(params: {
  prompt: string
  imageUrl: string
  slug: string
}) {
  const prediction = await replicate.predictions.create({
    version: 'kwaivgi/kling-v2.1-master:PINNED_HASH',
    input: {
      prompt: params.prompt,
      start_image: params.imageUrl,
      aspect_ratio: '9:16',
      duration: 5,
    },
    webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/replicate/webhook`,
    webhook_events_filter: ['completed'],
  })

  // Persist pending job to DB so webhook handler can look it up
  await supabase
    .from('video_jobs')
    .insert({ prediction_id: prediction.id, slug: params.slug, status: 'pending' })

  return prediction.id
}

// --- Webhook handler: app/api/replicate/webhook/route.ts ---
export async function POST(req: Request) {
  const body = await req.text()
  // ... verify signature (see above) ...

  const { id, status, output } = JSON.parse(body)
  if (status !== 'succeeded' || !output?.length) {
    await supabase.from('video_jobs').update({ status }).eq('prediction_id', id)
    return new Response('ok')
  }

  const storagePath = `videos/${id}.mp4`
  const permanentUrl = await persistReplicateOutput(output[0], storagePath)

  await supabase
    .from('video_jobs')
    .update({ status: 'done', output_url: permanentUrl })
    .eq('prediction_id', id)

  return new Response('ok')
}
```

---

## Fallback chain (when Replicate is down or out of credits)

For video generation:
1. **Vertex AI Veo 3 direct** (project `ryan-realty-platform`, Vertex AI enabled) — see `docs/research/vertex-veo-3.md`
2. **Grok Imagine** (image-to-video via xAI API) — see `docs/research/grok-imagine.md`
3. **Graceful degradation** — render with still photo + Ken Burns animation (Remotion only, no AI video)

For image generation:
1. **Vertex Imagen 4** — see `docs/research/vertex-imagen-4.md`
2. **Grok Imagine** (image generation)
3. **fal.ai** — NOTE: balance dry as of 2026-04-27, top up required before use

For VO (audio):
- ElevenLabs only — different platform, not affected by Replicate outages

Check https://www.replicatestatus.com/ for current outage status before routing to fallback.

---

## Common failure modes

| Failure | Symptom | Fix |
|---|---|---|
| Out of credits | `402` on create | Top up account at replicate.com/account/billing |
| Model deprecated | `404` on version | Update pinned hash in `API_INVENTORY.md` |
| Output URL expired | `403` or `404` fetching from `replicate.delivery` | Re-run prediction; improve webhook handler speed |
| Webhook never fires | Job shows `succeeded` in polling but no webhook POST | Add polling fallback for jobs pending > 10 min |
| Rate limit during batch | `429` | Add 100ms delay between prediction creates; use queue |
| Model crash | `500` + `status: 'failed'` | Retry once; if repeats, check model page for known issues |

**Webhook dead letter pattern** — periodically sweep `video_jobs` where `status = 'pending'` and `created_at < now() - 30 minutes`. Poll these directly via `GET /v1/predictions/{id}` and process any that are already `succeeded`.

---

## Sources

- [HTTP API Reference](https://replicate.com/docs/reference/http)
- [Pricing](https://replicate.com/pricing)
- [Output files](https://replicate.com/docs/topics/predictions/output-files)
- [Data retention](https://replicate.com/docs/topics/predictions/data-retention)
- [Rate limits](https://replicate.com/docs/topics/predictions/rate-limits)
- [Webhook verification](https://replicate.com/docs/topics/webhooks/verify-webhook)
- [Node.js client README](https://github.com/replicate/replicate-javascript)
- [Node.js quickstart](https://replicate.com/docs/get-started/nodejs)
