# Tool: OpenAI API

Verified: 2026-05-06. Sources: openai.com/api/pricing, devtk.ai, costgoat.com, tokenmix.ai, intuitionlabs.ai, magichour.ai.

---

## Current usage in codebase (verified 2026-05-06)

| File | Model | Purpose |
|------|-------|---------|
| `app/actions/semantic-search.ts` | `text-embedding-3-small` | Generates 1,536-dim embeddings for natural-language listing search; stored in `listing_embeddings` table via `match_listings_semantic` RPC |
| `lib/photo-classification.ts` | `gpt-4o` (vision) | Classifies listing photos into 14 tags (`exterior_front`, `aerial_drone`, `view_mountain`, etc.) + quality score 0–100 for hero selection |
| `app/actions/photo-classification.ts` | — (uses `lib/photo-classification.ts`) | Orchestrates per-listing classification loop; upserts to `listing_photo_classifications` |
| `scripts/verify-env.ts` | — | Connectivity check only; calls `/v1/models` to confirm key is valid |

**Auth pattern in use:** raw `fetch` with `Authorization: Bearer ${process.env.OPENAI_API_KEY}`. No `openai` npm SDK installed in current codebase.

---

## Untapped capabilities for content engine

### 1. Text generation — GPT-5.4 family

**Current model landscape (May 2026):**

OpenAI's active flagship line is the GPT-5.4 family, which replaced GPT-4o as the primary recommendation. The legacy `gpt-5` model (original release) remains available at lower cost.

| Model | Input $/1M | Output $/1M | Best for |
|-------|-----------|------------|---------|
| `gpt-5.5` | $5.00 | $30.00 | Maximum reasoning, complex synthesis |
| `gpt-5.5-pro` | $30.00 | $180.00 | Expert-level; rarely needed |
| `gpt-5.4` (standard) | $2.50 | $15.00 | Primary workhorse — caption variants, listing copy |
| `gpt-5.4-mini` | $0.75 | $4.50 | High-volume structured tasks (caption batching) |
| `gpt-5.4-nano` | $0.20 | $1.25 | Cheapest path for simple classification or tagging |
| `gpt-5` (legacy) | $1.25 | $10.00 | Still available; cheaper input than GPT-4o |
| `gpt-4o` (legacy) | $2.50 | $10.00 | Current codebase model — same input cost as gpt-5.4, lower output |
| `o3` | $2.00 | $8.00 | Reasoning tasks; slower |
| `o3-mini` | $1.10 | $4.40 | Cheaper reasoning; good for data synthesis |

**When to choose OpenAI text vs Claude vs Gemini:**

| Task | Use OpenAI when | Otherwise |
|------|----------------|-----------|
| Caption variants (A/B social copy) | Need 5+ variations in one JSON call with `response_format: json_schema` — 100% schema compliance guaranteed | Claude if voice-match to Victoria VO is paramount |
| Post-mortem synthesis (video performance → next brief) | Structured output with typed schema, large batch of analytics rows | Claude Opus for nuanced creative judgment |
| Listing description drafts | Speed matters, high volume (50+ listings/week), cost-sensitive | Claude Sonnet for brand voice enforcement |
| Market data narration | Either — OpenAI's structured output ensures no hallucinated numbers in JSON fields | Claude if narrative complexity is high |
| MLS remarks parsing | GPT-5.4-nano at $0.20/1M input — cheapest option for simple extraction | — |

**5 worked use cases for Ryan Realty:**

1. **Caption variant batch:** Send one listing's stats + photo tags → get back JSON array of 5 captions (TikTok, Reels, FB, LinkedIn, X) with character counts enforced by schema. Use `gpt-5.4-mini` at $0.75/1M input. 50 listings × 5 captions ≈ $0.04 at average token counts.

2. **Post-mortem synthesis:** Feed last 30 days of video performance metrics (views, watch time, shares per format) → structured brief for next week's content. Use `o3-mini` for the reasoning pass; $1.10/1M input.

3. **Video QA narration check:** After ElevenLabs render, send transcript text → GPT scans for banned words, checks sentence length ≤ 2 clauses, flags IPA candidates. Use `gpt-5.4-nano` at $0.20/1M. Purely mechanical — no need for large model.

4. **Seller/buyer market classification audit:** Send a batch of `(city, active_count, closed_6mo)` rows → get back JSON `{city, mos, verdict}`. Use `response_format: json_schema` to guarantee `verdict` is only one of `"seller" | "balanced" | "buyer"`. Catches human error in market reports.

5. **Email subject line testing:** Generate 10 subject-line variants for a market update email. `gpt-5.4-mini`, cost negligible. A/B test via Resend.

**Structured output reliability:** GPT models with `response_format: {type: "json_schema", ...}` score 100% schema adherence in OpenAI's published evals. This is the strongest guarantee in the market — Claude and Gemini both support JSON mode but OpenAI's constrained-decoding approach eliminates schema violations entirely.

---

### 2. Image generation — GPT-Image-1.5 (thumbnails)

DALL-E 3 is being retired (May 12, 2026). The current model family is GPT-Image-1.5 (flagship) and GPT-Image-1 Mini (budget).

**Pricing (May 2026, verified via costgoat.com):**

| Model | Quality | $/image | Best resolution |
|-------|---------|---------|----------------|
| GPT-Image-1.5 | Low | $0.009 | 1024×1024 |
| GPT-Image-1.5 | Medium | $0.034–$0.05 | 1024×1024 / 1024×1536 |
| GPT-Image-1.5 | High | $0.133–$0.20 | 1536×1024 |
| GPT-Image-1 | Low | $0.011 | 1024×1024 |
| GPT-Image-1 | High | $0.167–$0.25 | — |
| GPT-Image-1 Mini | Low | $0.005–$0.006 | — |
| GPT-Image-1 Mini | High | ~$0.036 | — |
| DALL-E 3 (retiring) | Standard | $0.04–$0.08 | — |

**Competitor comparison:**

| Model | $/image | Quality tier | Strengths vs GPT-Image-1.5 |
|-------|---------|-------------|---------------------------|
| GPT-Image-1.5 High | $0.133–$0.20 | Flagship | Best prompt interpretation, stylistic variety |
| Imagen 4 Ultra | $0.06 | Flagship | Cheaper high-quality; photorealistic; 10× faster |
| Imagen 4 Fast | $0.02 | Budget | Cheapest production-quality option |
| Grok Aurora | $0.02–$0.07 | Mid | Fast (2–4× GPT-Image); strong for conceptual, diagrammatic |
| Flux (Replicate) | ~$0.03 | Mid | Cheaper; good for stylized |

**For Ryan Realty thumbnails:** GPT-Image-1.5 Medium ($0.034–$0.05) is the sweet spot. Advantages over competitors:
- **Text-in-image accuracy:** GPT-Image models embed readable text reliably (price overlays, neighborhood names, stat callouts). Imagen 4 and Grok Aurora both struggle with accurate text rendering at this price tier.
- **Brand color prompt adherence:** GPT-Image-1.5 accepts hex codes in prompts (`Navy #102742, Gold #D4AF37`) with better adherence than diffusion-based competitors.
- **API pattern:** Returns base64 PNG or URL; fits cleanly into Next.js server actions.

**When to use Imagen 4 instead:** When generating bulk lifestyle/landscape imagery where text is not in frame and cost per image is the constraint. At $0.02/image vs $0.034, Imagen 4 Fast is 40% cheaper for background B-roll thumbnails.

**3 worked thumbnail examples for Ryan Realty:**

1. **Market data social card (9:16):** `"Minimalist dark real estate social card, Navy #102742 background, Gold #D4AF37 accent line, bold white stat overlay showing '$487K Median Price — Bend, OR', AzoSans typography feel, no photos"` → GPT-Image-1.5 Medium, $0.034. Text renders accurately.

2. **Listing thumbnail (16:9):** `"High-end residential exterior photo, Pacific Northwest mountain backdrop, warm golden hour light, Bend Oregon Tetherow neighborhood, no text, photorealistic"` → GPT-Image-1.5 High, $0.133. Use when no actual listing photo is available for social preview.

3. **News clip cover frame (9:16):** `"Breaking news lower-third graphic, dark navy pill bar bottom frame, 'BEND MARKET UPDATE' in Gold #D4AF37, clean white background, news broadcast style"` → GPT-Image-1 Mini Low, $0.005. For quick-turnaround social cards.

**API pattern:**
```typescript
const res = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-image-1.5',
    prompt: '...',
    n: 1,
    size: '1024x1024',
    quality: 'medium',
    response_format: 'b64_json',
  }),
})
```

---

### 3. Whisper transcription — ElevenLabs forced-alignment fallback

**Models and pricing (May 2026):**

| Model | $/minute | Quality |
|-------|---------|---------|
| `gpt-4o-mini-transcribe` | $0.003/min ($0.18/hr) | Good; budget |
| `gpt-4o-transcribe` | $0.006/min ($0.36/hr) | Better; standard |

Billing is per-second. No speaker diarization in base price.

**Primary use cases for this codebase:**

1. **ElevenLabs forced-alignment fallback.** The current VO pipeline requires `/v1/forced-alignment` word-level timestamps for caption sync. If ElevenLabs forced-alignment is unavailable or rate-limited, Whisper `gpt-4o-transcribe` can produce a word-level transcript that serves as a fallback timestamp source. Cost: a 40-second VO clip ≈ $0.004.

2. **Client call transcription (Vault pipeline).** Buyer/seller consultation recordings stored in Vault could be transcribed for CRM notes, objection tracking, and follow-up email generation. At $0.006/min, a 30-minute consultation costs $0.18. This is one of the highest-leverage untapped uses — the transcript becomes structured input for GPT to generate FUB contact notes.

3. **Market report audio QA.** After ElevenLabs renders VO, run the MP3 through Whisper and diff the transcript against the original script. Catches mispronunciations or cut words before they reach the final render. At $0.003/min for the mini model, a 40-second VO = $0.002.

**API pattern:**
```typescript
const formData = new FormData()
formData.append('file', audioBlob, 'vo.mp3')
formData.append('model', 'gpt-4o-transcribe')
formData.append('response_format', 'verbose_json')  // includes word timestamps
formData.append('timestamp_granularities[]', 'word')

const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: formData,
})
```

---

### 4. TTS (text-to-speech) — cost fallback, not primary

**Models and pricing (May 2026):**

| Model | Pricing | Voices | Notes |
|-------|---------|--------|-------|
| `gpt-4o-mini-tts` | ~$0.015/min | 13 (Alloy, Ash, Ballad, Coral, Echo, Fable, Nova, Onyx, Sage, Shimmer, Verse, Marin, Cedar) | Steerability via natural language instructions; 50+ languages |
| `tts-1` | $15/1M chars | 6 standard | Legacy; faster |
| `tts-1-hd` | $30/1M chars | 6 standard | Higher fidelity than tts-1 |

**Comparison to ElevenLabs Victoria (our primary):**

| Dimension | ElevenLabs Victoria | OpenAI gpt-4o-mini-tts |
|-----------|--------------------|-----------------------|
| Voice quality | Best-in-class expressiveness; warm, conversational | Good; steerability via prompts |
| Customization | Stability/similarity/style knobs + `previous_text` chaining | Natural-language instructions ("speak slowly and warmly") |
| Cost | ~$0.03/min (Flash/Turbo) | ~$0.015/min — 50% cheaper |
| Voice ID lock | Victoria ID `qSeXEcewz7tA0Q0qk9fH` — locked 2026-04-27 | Generic voices; no cloning |
| Forced alignment | `/v1/forced-alignment` endpoint available | Not available natively |

**Verdict:** OpenAI TTS is NOT a replacement for Victoria. The voice cloning lock and ElevenLabs' superior natural expressiveness are non-negotiable for Ryan Realty's video VO. OpenAI TTS is worth using only for:
- Internal tooling audio (admin alerts, narrated QA reports)
- Multi-language variants of market content where a Victoria clone does not exist
- Cost-constrained non-consumer-facing audio (e.g., automated phone IVR for lead qualification)

Do not route consumer-facing video VO through OpenAI TTS without explicit approval from Matt.

---

### 5. Sora 2 (text-to-video) — GA, priced per second

**Status as of 2026-05-06:** Generally available via API. Launched September 30, 2025.

**Pricing:**

| Model | Resolution | $/second | Typical 10s clip |
|-------|-----------|---------|-----------------|
| `sora-2` | 720p | $0.10/s | $1.00 |
| `sora-2-pro` | 720p | $0.30/s | $3.00 |
| `sora-2-pro` | 1024p | $0.50/s | $5.00 |

**Competitor comparison:**

| Model | Platform | $/10s clip | Notes |
|-------|---------|-----------|-------|
| Sora 2 (720p) | OpenAI direct | $1.00 | GA; consistent quality |
| Sora 2 Pro (1024p) | OpenAI direct | $5.00 | Premium cinematic |
| Kling v2.1 Master | Replicate | $0.76–$1.08 | Superior fluid motion; our primary |
| Veo 3 | Google/Vertex | ~$0.50–$1.50 | Strong coherence; audio-native |
| Hailuo 02 Standard | fal.ai | ~$0.27/6s | Budget; good physics |
| Seedance 1 Pro | Replicate | ~$0.13/6s | Cheapest; lower ceiling |

**When Sora 2 makes sense for Ryan Realty:**
- Kling v2.1 Master is queued/rate-limited and a quick 10s neighborhood B-roll is needed now.
- 720p is acceptable (social preview, not primary deliverable).
- The prompt is text-to-video (no input image) — Sora 2 is a t2v model; Kling handles i2v better.

**When to stay on Kling:**
- Any listing video where an actual property photo is the source frame (i2v use case).
- 9:16 vertical portrait format — Sora 2's native output is 16:9; reframing degrades quality.
- Premium listing tiers where motion quality is the differentiator.

**Sora 2 is currently a backup, not primary.** Kling v2.1 Master and Veo 3 remain the primary AI video stack per `video_production_skills/API_INVENTORY.md`.

---

## Auth + endpoint

```
Base URL:   https://api.openai.com/v1
Auth:       Authorization: Bearer $OPENAI_API_KEY
Env var:    OPENAI_API_KEY (present in .env.local, verified by scripts/verify-env.ts)
SDK:        Not installed — raw fetch() pattern used throughout codebase
```

**If adding the `openai` npm SDK** (optional — reduces boilerplate for streaming and structured output):
```bash
npm install openai
```
```typescript
import OpenAI from 'openai'
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
```

Raw fetch is fine for the current usage pattern. Add the SDK if adding streaming responses or Responses API (stateful sessions).

---

## Pricing summary (verified 2026-05-06)

| Category | Model | Price |
|----------|-------|-------|
| **Text** | gpt-5.5 | $5.00 in / $30.00 out per 1M tokens |
| | gpt-5.4 | $2.50 in / $15.00 out per 1M tokens |
| | gpt-5.4-mini | $0.75 in / $4.50 out per 1M tokens |
| | gpt-5.4-nano | $0.20 in / $1.25 out per 1M tokens |
| | gpt-5 (legacy) | $1.25 in / $10.00 out per 1M tokens |
| | gpt-4o (legacy, in use) | $2.50 in / $10.00 out per 1M tokens |
| | o3 | $2.00 in / $8.00 out per 1M tokens |
| | o3-mini | $1.10 in / $4.40 out per 1M tokens |
| **Embeddings** | text-embedding-3-small (in use) | $0.02/1M tokens |
| | text-embedding-3-large | $0.13/1M tokens |
| **Image gen** | gpt-image-1.5 Medium | $0.034–$0.05/image |
| | gpt-image-1.5 High | $0.133–$0.20/image |
| | gpt-image-1 Mini Low | $0.005–$0.006/image |
| | DALL-E 3 Standard | $0.04–$0.08/image (retiring May 12, 2026) |
| **Transcription** | gpt-4o-transcribe | $0.006/min |
| | gpt-4o-mini-transcribe | $0.003/min |
| **TTS** | gpt-4o-mini-tts | ~$0.015/min |
| | tts-1 | $15/1M chars |
| | tts-1-hd | $30/1M chars |
| **Video** | sora-2 (720p) | $0.10/second |
| | sora-2-pro (1024p) | $0.50/second |

---

## When to choose OpenAI — decision tree

```
Need structured JSON output with schema compliance guarantee?
  → OpenAI (only provider with 100% constrained-decoding guarantee)

Need text-in-image or brand color accuracy in generated images?
  → GPT-Image-1.5 (best prompt adherence for hex colors + embedded text)
  → Imagen 4 Fast if text not in frame and cost is the constraint ($0.02 vs $0.034)

Need transcription?
  → gpt-4o-transcribe for quality, gpt-4o-mini-transcribe for cost
  → Whisper via Replicate if batch overnight (cheaper at scale)

Need TTS?
  → ElevenLabs Victoria for all consumer-facing video VO (non-negotiable)
  → gpt-4o-mini-tts for internal/tooling/multi-language at $0.015/min

Need AI video generation?
  → Kling v2.1 Master (primary, i2v, best motion quality)
  → Sora 2 as backup when Kling queued and t2v is acceptable
  → Veo 3 for long-form coherence + native audio

Need semantic search embeddings?
  → text-embedding-3-small (in use, correct choice — $0.02/1M, 1,536 dims)
  → text-embedding-3-large only if MTEB score difference matters ($0.13/1M, 3,072 dims)

Need complex narrative synthesis (post-mortem, market commentary)?
  → Claude Opus/Sonnet for brand voice adherence
  → OpenAI o3-mini if structured reasoning over data tables is primary
```

---

## Code pattern alignment with existing codebase

All four existing files use the same raw `fetch` pattern. New additions should match:

```typescript
// Standard text completion (structured output)
const res = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'gpt-5.4-mini',
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'caption_variants',
        strict: true,
        schema: { /* your schema here */ },
      },
    },
    messages: [{ role: 'user', content: '...' }],
  }),
})

// Image generation
const res = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'gpt-image-1.5',
    prompt: '...',
    n: 1,
    size: '1024x1024',
    quality: 'medium',   // 'low' | 'medium' | 'high'
    response_format: 'b64_json',
  }),
})

// Transcription
const formData = new FormData()
formData.append('file', audioBlob, 'vo.mp3')
formData.append('model', 'gpt-4o-transcribe')
formData.append('response_format', 'verbose_json')
formData.append('timestamp_granularities[]', 'word')

const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: formData,
})
```

**Guard pattern** (matches `hasOpenAiKey()` in semantic-search.ts):
```typescript
if (!process.env.OPENAI_API_KEY?.trim()) return null
```

---

## DALL-E 3 retirement note

DALL-E 3 is being retired on May 12, 2026. If any future code references `dall-e-3`, update it to `gpt-image-1.5`. The API endpoint is the same (`/v1/images/generations`); only the model string changes. Pricing is comparable.
