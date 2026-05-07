# Tool: Inngest — Runtime for Autonomous Content Engine

**Verified:** 2026-05-06 — sources: inngest.com/pricing, inngest.com/docs, inngest.com/blog/how-to-solve-nextjs-timeouts, hashbuilds.com comparison article.

---

## What Inngest Is

Inngest is a durable event-driven workflow platform that runs on top of your existing serverless host (Vercel, Cloudflare Workers, AWS Lambda, etc.). You write normal TypeScript functions decorated with `step.run`, `step.sleep`, `step.waitForEvent`, and `step.sendEvent`; Inngest's infrastructure checkpoints each step, retries failures independently, and orchestrates fan-out across arbitrary numbers of parallel branches — without any separate worker process, queue broker, or Redis instance to operate.

---

## Inngest vs Vercel Cron — Decision Matrix

| Feature | Vercel Cron | Inngest |
|---|---|---|
| Schedule N times/day | Yes | Yes (cron trigger, `TZ=` aware) |
| Multi-step durable workflow | No | Yes |
| Retry failed steps (not whole function) | No — manual | Yes — per-step, up to 20 retries |
| Default retries | 0 | 4 (configurable 0–20) |
| Backoff strategy | None | Automatic (Inngest-managed) |
| Wait for human approval | No | Yes (`step.waitForEvent`, up to 1yr) |
| Fan-out to N parallel branches | No | Yes (`Promise.all([step.run(...)])` or `step.sendEvent`) |
| Sleep until specific time | No | Yes (`step.sleep` / `step.sleepUntil`) |
| Step-level observability / traces | No | Yes (24h on free, 7d on Pro) |
| Max function execution time | 60s (Hobby) / 5min (Pro) | Many hours (checkpointed across invocations) |
| Vercel free-tier timeout | 60s | N/A — Inngest handles long-running via checkpoints |
| Event payload size (free) | N/A | 256 KB |
| Cost | Included with Vercel | Free up to 50K executions / 100K events/mo |
| Infrastructure to operate | None | None |
| Step idempotency | Manual | Built-in (step ID memoization) |

**Verdict:** Vercel cron is right for fire-and-forget scheduled maintenance jobs that complete in under 60 seconds (Hobby) or 5 minutes (Pro) with no multi-step logic. Inngest is right for anything that needs retries, durability across timeouts, fan-out, or human approval. The content engine needs all four — Inngest is the correct runtime.

---

## Free-Tier Limits (Verified 2026-05-06)

Source: [inngest.com/pricing](https://www.inngest.com/pricing)

| Limit | Free (Hobby) | Pro ($75/mo) |
|---|---|---|
| Executions/month | 50,000 | 1,000,000 |
| Events/month | 100,000 | 5,000,000 |
| Concurrent steps | 5 | 100+ |
| Max sleep duration | 7 days | 1 year |
| Trace retention | 24 hours | 7 days |
| Event payload size | 256 KB | 3 MB |
| Max step return size | 4 MB | 4 MB |
| Max steps per function | 1,000 | 1,000 |
| Max function run state | 32 MB | 32 MB |
| Staging environments | Unlimited | Unlimited |
| Users | 3 | 15+ |

**Ryan Realty load estimate:** At autonomous-pace start (~5 new listings/week, weekly market report, daily research, hourly cache refreshes):

- ~500–800 executions/month from content pipeline alone
- ~2,000–3,000 executions/month including cron-migrated jobs
- Well within the 50K free ceiling for the foreseeable future

The concurrent-step limit of 5 on free is the binding constraint. The 8-platform fan-out (Step 3 in the listing pipeline) fires 8 `step.run` calls in parallel — that saturates the free tier. **Upgrade to Pro ($75/mo) before enabling autonomous fan-out publishing.** At that point the $75/mo is justified by eliminating the Vercel timeout problem alone.

---

## Recommended Architecture for the Content Engine

```
Event: listing.created
  └─ Step 1: validate-listing
       → confirm photo_urls >= 12, listing data complete
       → write automation_runs row (idempotency key: md5(mls_number + status))
  └─ Step 2: build-storyboard
       → query Supabase for listing detail, neighborhood stats
       → produce storyboard JSON (beats, VO script, citations)
  └─ sleep('wait-for-spark-data', '5m')
       → allow Spark delta sync to refresh any pending fields
  └─ Step 3: render-master-video
       → POST /api/workers/content-job (listing_reveal)
       → poll content_jobs.status until 'complete' (with step-level retry)
  └─ Step 4 (parallel fan-out — Promise.all):
       → step.run('render-ig', ...)       Instagram 9:16 reel
       → step.run('render-tiktok', ...)   TikTok 9:16
       → step.run('render-yt-shorts', ...) YouTube Shorts 9:16
       → step.run('render-fb', ...)       Facebook 16:9 crop
       → step.run('render-linkedin', ...) LinkedIn 1:1 square
       → step.run('render-x', ...)        X 16:9
       → step.run('render-threads', ...)  Threads 4:5
       → step.run('render-pinterest', ...) Pinterest 2:3
  └─ Step 5: qa-pass
       → run viral scorecard (format minimum: 85 for listing video)
       → banned-word grep, citations.json check
       → if any fail: step.sendEvent('content.qa_failed', {assetId, failures})
         → end; Matt reviews via /admin/post-queue
  └─ Step 6: waitForEvent('matt.approval', {
         event: 'matt.approved',
         timeout: '24h',
         match: 'data.assetId'
       })
       → if null (timeout): capture in post_queue as 'pending_human_review'
       → if approved: continue to Step 7
  └─ Step 7: publish-all-platforms
       → for each variant: POST /api/social/publish
       → write post_performance baseline rows
  └─ Step 8: update-automation-run
       → automation_runs.status = 'complete', output_summary

Event: market.weekly_trigger (cron: 'TZ=America/Los_Angeles 0 5 * * 1')
  └─ Step 1: fetch-market-data (Supabase + Spark reconciliation gate)
  └─ Step 2: render-market-report-video
  └─ Step 3: waitForEvent('matt.approval', { timeout: '24h' })
  └─ Step 4: publish + write to market_reports table

Event: content.daily_research (cron: 'TZ=America/Los_Angeles 0 5 * * *')
  └─ Step 1: pull-trend-sources
  └─ Step 2: score-opportunities
  └─ Step 3: write to content_opportunity table

Event: token.meta_refresh (cron: '0 0 */50 * *')
  └─ Step 1: check Meta token expiry
  └─ Step 2: if < 10 days remaining: alert Matt via Resend

Event: token.tiktok_check (cron: '0 12 * * *')
  └─ Step 1: check TikTok token expiry
  └─ Step 2: if < 2 days remaining: refresh + update Supabase
```

---

## Integration Pattern (Next.js App Router + Vercel)

### 1. Install

```bash
npm install inngest
```

Environment variables already in `.env.example`:
```
INNGEST_EVENT_KEY=<from Inngest dashboard>
INNGEST_SIGNING_KEY=<from Inngest dashboard>
```

### 2. Client (`lib/inngest.ts`)

```typescript
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'ryan-realty-content',
  // typed event map for autocomplete (define as you add events)
})
```

### 3. Serve Handler (`app/api/inngest/route.ts`)

```typescript
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { listingCreatedPipeline } from '@/lib/inngest/listing-pipeline'
import { weeklyMarketReport } from '@/lib/inngest/market-report'
import { dailyContentResearch } from '@/lib/inngest/content-research'
import { tokenRefreshMeta } from '@/lib/inngest/token-refresh'
import { tokenRefreshTikTok } from '@/lib/inngest/token-refresh'
import { postScheduleDrain } from '@/lib/inngest/post-schedule'

// Required: raise Vercel function timeout for long-running steps
export const maxDuration = 300

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    listingCreatedPipeline,
    weeklyMarketReport,
    dailyContentResearch,
    tokenRefreshMeta,
    tokenRefreshTikTok,
    postScheduleDrain,
  ],
})
```

### 4. Function Definitions (`lib/inngest/listing-pipeline.ts`)

```typescript
import { inngest } from '@/lib/inngest'

export const listingCreatedPipeline = inngest.createFunction(
  {
    id: 'listing-created-pipeline',
    retries: 4,
    timeouts: {
      finish: '30m', // full pipeline including renders
    },
    concurrency: {
      limit: 2, // max 2 concurrent listing pipelines (render cost)
      scope: 'fn',
    },
  },
  { event: 'listing.created' },
  async ({ event, step }) => {
    // Step 1: Idempotency + validation
    const listing = await step.run('validate-listing', async () => {
      const { data } = await supabase
        .from('automation_runs')
        .select('id')
        .eq('idempotency_key', `md5(${event.data.mls_number}::${event.data.status})`)
        .maybeSingle()
      if (data) throw new Error('ALREADY_RAN') // Inngest will not retry non-Error throws
      // validate photo count, return listing row
      return event.data
    })

    // Step 2: Storyboard
    const storyboard = await step.run('build-storyboard', async () => {
      // query Supabase, build beats array, generate citations.json
      return { beats: [], voScript: '', citations: {} }
    })

    // Wait for Spark delta to refresh (non-blocking — function checkpoints here)
    await step.sleep('wait-for-spark-data', '5m')

    // Step 3: Master render
    const masterVideo = await step.run('render-master', async () => {
      // POST /api/workers/content-job, poll for completion
      return { url: '', path: '' }
    })

    // Step 4: Fan-out to 8 platforms (parallel)
    const variants = await Promise.all([
      step.run('render-ig',        async () => renderVariant(masterVideo, 'instagram')),
      step.run('render-tiktok',    async () => renderVariant(masterVideo, 'tiktok')),
      step.run('render-yt-shorts', async () => renderVariant(masterVideo, 'youtube')),
      step.run('render-fb',        async () => renderVariant(masterVideo, 'facebook')),
      step.run('render-linkedin',  async () => renderVariant(masterVideo, 'linkedin')),
      step.run('render-x',         async () => renderVariant(masterVideo, 'x')),
      step.run('render-threads',   async () => renderVariant(masterVideo, 'threads')),
      step.run('render-pinterest', async () => renderVariant(masterVideo, 'pinterest')),
    ])

    // Step 5: QA gate
    const qaResult = await step.run('qa-pass', async () => {
      // viral scorecard, banned-word grep, citations check
      return { passed: true, score: 0, failures: [] }
    })
    if (!qaResult.passed) return { status: 'qa_failed', failures: qaResult.failures }

    // Step 6: Human approval gate (24h timeout)
    const assetId = event.data.mls_number
    const approval = await step.waitForEvent('wait-for-matt-approval', {
      event: 'matt.approved',
      timeout: '24h',
      match: 'data.assetId',  // must match event.data.assetId === assetId
    })
    // approval is null if 24h elapsed with no event
    if (!approval) {
      await step.run('mark-pending-review', async () => {
        // set post_queue.review_status = 'pending_human_review'
      })
      return { status: 'awaiting_approval' }
    }

    // Step 7: Publish
    await step.run('publish-all', async () => {
      await Promise.all(variants.map(v => publishVariant(v)))
    })

    // Step 8: Finalize
    await step.run('finalize', async () => {
      // update automation_runs.status = 'complete'
    })

    return { status: 'complete', variants: variants.length }
  }
)
```

### 5. Triggering from Supabase listing INSERT

Supabase Database Webhooks (`pg_net` extension, non-blocking) can POST to your Inngest event endpoint when a new listing row lands:

```sql
-- In Supabase SQL editor or migration:
SELECT supabase_functions.http_request(
  'https://api.inngest.com/e/' || current_setting('app.inngest_event_key'),
  'POST',
  '{"Content-Type":"application/json"}',
  json_build_object(
    'name', 'listing.created',
    'data', json_build_object(
      'mls_number', NEW."ListNumber",
      'status',     NEW."StandardStatus",
      'list_price', NEW."ListPrice",
      'city',       NEW."City",
      'listing_id', NEW.id
    )
  )::text,
  '5000'
);
```

Or fire from the existing delta-sync cron (`/api/cron/sync-delta/route.ts`) — when it detects a new listing in the activity_events loop, call `inngest.send({ name: 'listing.created', data: {...} })`. This is the simpler path that avoids a Supabase trigger entirely and keeps the event logic in TypeScript.

---

## Inngest Functions to Define (Full Set)

| Function ID | Trigger | Replaces / Adds |
|---|---|---|
| `listing-created-pipeline` | event `listing.created` | Adds new — content engine entry point |
| `weekly-market-report` | cron `TZ=America/Los_Angeles 0 5 * * 1` | Replaces `/api/cron/market-report` (Sat 14:00 UTC) |
| `daily-content-research` | cron `TZ=America/Los_Angeles 0 5 * * *` | Adds new |
| `token-refresh-meta` | cron `0 0 */50 * *` | Adds new — Meta token expiry alert |
| `token-refresh-tiktok` | cron `0 12 * * *` | Adds new — TikTok token check/refresh |
| `post-schedule-drain` | cron `*/5 * * * *` | Replaces or wraps existing `post_scheduler` skill |

**Existing Vercel crons that do NOT need Inngest** (single-step, fast, no retry logic needed):

| Cron path | Schedule | Reason to keep in Vercel |
|---|---|---|
| `/api/cron/sync-delta` | `*/10 * * * *` | Fast Spark pull + upsert, completes in < 30s, already idempotent |
| `/api/cron/sync-history-terminal` | `*/5 * * * *` | Tight loop, single step |
| `/api/cron/refresh-video-tours-cache` | `*/30 * * * *` | Cache read/write, trivial |
| `/api/cron/refresh-listing-year-stats` | `0 * * * *` | Single SQL + cache write |
| `/api/cron/refresh-place-content` | `0 3 * * *` | Single step |
| `/api/cron/refresh-market-stats` | `0 */6 * * *` | Single step |
| `/api/cron/refresh-reporting-cache` | `15 3 * * *` | Single step |
| `/api/cron/refresh-market-stats-monthly-recompute` | `0 4 * * 0` | Single step |
| `/api/cron/saved-search-alerts` | `0 14 * * *` | Consider moving if email volume grows |
| `/api/cron/optimization-loop` | `0 6 * * 1` | Currently single-step; candidate for Inngest if health-check actions gain retry needs |
| `/api/cron/sync-full` | `0 2 * * 0` | Large but single-step; move to Inngest if it starts timing out |

---

## Migration Plan

**Phase 0 — Wire Inngest (no behavior change)**

1. `npm install inngest`
2. Create `lib/inngest.ts` (client), `app/api/inngest/route.ts` (serve handler with `maxDuration = 300`)
3. Set `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` in Vercel env vars (prod + preview)
4. Add Inngest Vercel integration from the Vercel marketplace — it auto-syncs on deploy and handles branch environments
5. Deploy. Verify `/api/inngest` responds to Inngest's handshake. No cron jobs touched yet.

**Phase 1 — Migrate market-report cron (lowest risk, highest gain)**

6. Define `weekly-market-report` Inngest function with `cron` trigger
7. Remove `/api/cron/market-report` from `vercel.json`
8. Gain: step-level retry if the report generation fails partway through, 30-minute timeout headroom vs Vercel's 5-minute Pro limit

**Phase 2 — Add listing pipeline (new capability)**

9. Wire `listing.created` event from delta-sync cron's new-listing detection branch
10. Define `listing-created-pipeline` function (stub steps that call existing `/api/workers/*` routes)
11. Enable human-approval gate via `/admin/post-queue` sending `matt.approved` events
12. Start with `review_status = 'pending_human_review'` for all posts (safety net per ANTI_SLOP_MANIFESTO rule 8)

**Phase 3 — Add token refresh + daily research**

13. Define `token-refresh-meta`, `token-refresh-tiktok`, `daily-content-research` functions
14. These are new capability, not migrations — add without removing anything

**Phase 4 — Migrate post-schedule-drain**

15. Move post scheduler logic from `/api/cron/post-scheduler` into Inngest function
16. Gain: if a publish fails, only that platform's step retries — not the entire drain batch

**Phase 5 — Upgrade to Pro before fan-out**

17. When listing pipeline is stable and QA is clean: upgrade to Inngest Pro ($75/mo)
18. This unlocks 100 concurrent steps — enables true 8-platform parallel fan-out
19. Remove the free-tier workaround (sequential platform renders)

---

## Common Failure Modes and Mitigations

| Failure | Cause | Mitigation |
|---|---|---|
| Step timeout | Default Vercel function timeout < step work time | Set `maxDuration = 300` on the serve route. For render steps that call internal workers, the step fires the job and polls — the poll is short, the actual render runs independently. |
| Event payload > 256 KB (free) / 3 MB (Pro) | Large listing photo array in event | Pass only MLS# + minimal metadata in the event; fetch full listing data inside `step.run` from Supabase. |
| Non-idempotent step on retry | Step mutates DB on first run, fails on retry, re-inserts | Use `INSERT ... ON CONFLICT DO NOTHING` or check-before-insert in every step that writes to Supabase. |
| `step.waitForEvent` timeout | Matt doesn't approve within 24h | Returns `null` — handled explicitly (move to `pending_human_review`). Never throw on null; treat it as a known state. |
| Concurrent-step limit (free: 5) | 8-platform fan-out fires 8 steps simultaneously | On free tier: render platforms sequentially inside one step. On Pro: true Promise.all fan-out. |
| Function run state > 32 MB | Accumulating large JSON across many steps | Return only IDs and URLs from render steps, not full video buffers. All binary content stays in Supabase Storage / CDN. |
| Vercel Deployment Protection blocks Inngest callbacks | Vercel access control on preview deployments | Configure "Protection Bypass for Automation" in Vercel and add the bypass secret in Inngest dashboard settings. |

---

## Code Pattern: Full Skeleton

```typescript
// lib/inngest.ts
import { Inngest } from 'inngest'
export const inngest = new Inngest({ id: 'ryan-realty-content' })

// lib/inngest/listing-pipeline.ts
import { inngest } from '@/lib/inngest'
import { createClient } from '@supabase/supabase-js'

export const listingCreatedPipeline = inngest.createFunction(
  { id: 'listing-created-pipeline', retries: 4, timeouts: { finish: '30m' } },
  { event: 'listing.created' },
  async ({ event, step }) => {

    const storyboard = await step.run('build-storyboard', async () => {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: listing } = await supabase
        .from('listings')
        .select('*')
        .eq('"ListNumber"', event.data.mls_number)
        .single()
      return { listing, beats: [] }
    })

    await step.sleep('wait-for-data', '5m')

    const masterRender = await step.run('render-master', async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/workers/content-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: event.data.listing_id, job_type: 'listing_reveal' }),
      })
      return res.json()
    })

    // Fan-out (sequential on free tier, Promise.all on Pro)
    const variants = await Promise.all([
      step.run('render-ig',        async () => ({ platform: 'instagram', url: '' })),
      step.run('render-tiktok',    async () => ({ platform: 'tiktok', url: '' })),
      step.run('render-yt-shorts', async () => ({ platform: 'youtube', url: '' })),
      step.run('render-fb',        async () => ({ platform: 'facebook', url: '' })),
      step.run('render-linkedin',  async () => ({ platform: 'linkedin', url: '' })),
      step.run('render-x',         async () => ({ platform: 'x', url: '' })),
      step.run('render-threads',   async () => ({ platform: 'threads', url: '' })),
      step.run('render-pinterest', async () => ({ platform: 'pinterest', url: '' })),
    ])

    const qaResults = await step.run('qa-pass', async () => {
      // run viral scorecard, banned-word grep, citations check
      return { passed: true, score: 87, failures: [] as string[] }
    })

    if (!qaResults.passed) {
      return { status: 'qa_failed', score: qaResults.score, failures: qaResults.failures }
    }

    const decision = await step.waitForEvent('wait-for-matt-approval', {
      event: 'matt.approved',
      timeout: '24h',
      match: 'data.assetId',  // event.data.assetId must equal the trigger event's assetId
    })

    if (!decision) {
      // Timeout — park in pending_human_review
      await step.run('mark-pending-review', async () => {
        // update post_queue rows
      })
      return { status: 'awaiting_approval' }
    }

    await step.run('publish', async () => {
      await Promise.all(
        variants.map(v =>
          fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/social/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform: v.platform, media_url: v.url }),
          })
        )
      )
    })

    return { status: 'complete', variants: variants.length }
  }
)

// app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { listingCreatedPipeline } from '@/lib/inngest/listing-pipeline'

export const maxDuration = 300  // required for long-running steps

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [listingCreatedPipeline],
})
```

---

## Sending the `matt.approved` Event (Admin Panel)

The `/admin/post-queue` page already exists. Wire a "Approve" button to call:

```typescript
// In the approval action:
await inngest.send({
  name: 'matt.approved',
  data: {
    assetId: post.mls_number,  // must match the match: 'data.assetId' in waitForEvent
    approvedBy: 'matt',
    approvedAt: new Date().toISOString(),
  },
})
```

Inngest wakes the sleeping function run within seconds.

---

## Cost Estimate

| Scenario | Executions/mo | Events/mo | Plan | Cost |
|---|---|---|---|---|
| Today (no content engine) | ~500 (migrated crons) | ~500 | Free | $0 |
| Content engine active, 1 listing/week | ~3,000 | ~5,000 | Free | $0 |
| Content engine at scale, 5 listings/week | ~12,000 | ~20,000 | Free | $0 |
| Full fan-out enabled (8 platforms × 5 listings/wk) | ~18,000 | ~25,000 | Pro | $75/mo |
| Full fan-out + market reports + daily research | ~25,000 | ~35,000 | Pro | $75/mo |

Free tier fits through scale for the foreseeable future. Pro becomes justified exactly when enabling true parallel 8-platform fan-out (the concurrent-step limit of 5 on free is the gating constraint, not event volume).

---

## References

- [Inngest Pricing](https://www.inngest.com/pricing) — verified 2026-05-06
- [Inngest Usage Limits](https://www.inngest.com/docs/usage-limits/inngest) — max steps (1,000), max run state (32 MB), max step return (4 MB)
- [Inngest Vercel Integration](https://www.inngest.com/docs/deploy/vercel) — serve handler, env vars, deployment protection bypass
- [step.waitForEvent API](https://www.inngest.com/docs/reference/functions/step-wait-for-event) — returns null on timeout, match via dot-notation
- [Scheduled Functions](https://www.inngest.com/docs/guides/scheduled-functions) — cron trigger with TZ= support, jitter option
- [Function Configuration](https://www.inngest.com/docs/reference/functions/create#configuration) — retries (default 4, max 20), concurrency, timeouts
- [step.run Reference](https://www.inngest.com/docs/reference/functions/step-run) — per-step retry counter, memoization, Promise.all parallel pattern
- [Next.js Timeout Blog Post](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts) — Vercel timeout limits by plan (Hobby 60s, Pro 5min, Enterprise 15min)
- [HashBuilds Comparison](https://www.hashbuilds.com/articles/next-js-background-jobs-inngest-vs-trigger-dev-vs-vercel-cron) — Inngest vs Vercel cron feature gap analysis
