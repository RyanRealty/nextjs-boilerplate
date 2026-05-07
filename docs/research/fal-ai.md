# Tool: fal.ai

> Verified 2026-05-06. Sources: fal.ai/pricing, fal.ai/models, fal.ai/docs, and platform comparison benchmarks.

---

## What fal.ai uniquely does (vs Replicate/Vertex/Grok)

fal positions itself as a **speed-first inference platform** for media generation, not a general-purpose model zoo. The meaningful differentiators:

1. **Sub-second warm inference on FLUX variants.** fal runs custom CUDA kernels on FLUX schnell/dev that deliver under 1s generation at 1024×1024 on warm instances. Replicate cold-starts frequently exceed 60s on less popular models; fal's warm pool eliminates that penalty for sustained production traffic.

2. **Real-time WebSocket mode.** Two models (`fast-lcm-diffusion`, `fast-turbo-diffusion`) support a persistent WebSocket connection that bypasses the queue entirely — sub-100ms round trips for interactive apps. Replicate has no equivalent. Use at 512×512 for best latency; 1024×1024 adds ~300ms.

3. **Exclusive video model access.** fal is the **official API** for Seedance 2.0 (ByteDance), Kling v3 Pro (including 4K variant), and Nano Banana / Nano Banana 2 (Google Gemini Flash image). These are not available on Replicate as of 2026-05-06.

4. **Video-to-audio: Foley Control.** Generates synchronized sound effects from a video input using text prompts — no manual audio post-production. No equivalent on Replicate.

5. **Pricing structure favors video.** For video specifically, fal undercuts Replicate significantly: Wan 2.5 at $0.05/s vs Replicate's $0.25/s (80% cheaper); Kling v2.6 Pro at $0.07/s vs $0.12/s (42% cheaper). Image pricing is comparable or slightly cheaper (9–40% depending on model).

---

## Auth + endpoint (verified 2026-05-06)

- **API base (queue mode):** `https://queue.fal.run/`
- **Auth header:** `Authorization: Key $FAL_KEY`
- **Required env var:** `FAL_KEY`
- **npm package:** `@fal-ai/client` (not `@fal-ai/serverless-client` — that's the old name)
  ```bash
  npm install @fal-ai/client
  ```
- **Python package:** `fal_client`
  ```bash
  pip install fal_client
  ```

### Sync vs async

| Mode | Use when | How |
|---|---|---|
| **Sync** (`fal.subscribe`) | Generations < ~30s | Awaits result inline; returns when done |
| **Async/Queue** | Video models, long generations | Submit → get request_id → poll or webhook |
| **Real-time WebSocket** | Interactive live preview | `fal.realtime.connect()` — persistent warm connection |

Webhook pattern for long video jobs:
```javascript
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

// Submit
const { request_id } = await fal.queue.submit("fal-ai/kling-video/v3/pro/image-to-video", {
  input: { image_url: "...", prompt: "..." },
  webhookUrl: "https://your-endpoint.com/fal-webhook",
});

// Poll (if no webhook)
const result = await fal.queue.result("fal-ai/kling-video/v3/pro/image-to-video", {
  requestId: request_id,
});
```

---

## Pricing (verified 2026-05-06)

### GPU serverless (raw compute)

| GPU | VRAM | Per Hour | Per Second |
|---|---|---|---|
| A100 40GB | 40GB | $0.99 | $0.0003 |
| H100 80GB | 80GB | $1.89 | $0.0005 |
| H200 141GB | 141GB | $2.10 | $0.0006 |
| B200 184GB | — | Contact | — |

### Video model APIs (output-based pricing)

| Model | Price | Notes |
|---|---|---|
| Wan 2.5 | $0.05/s | 80% cheaper than Replicate |
| Kling 2.5 Turbo Pro | $0.07/s | 42% cheaper than Replicate |
| Kling v3 Pro | $0.112/s (no audio), $0.168/s (audio on) | fal exclusive |
| Veo 3 | $0.40/s | Same model as Vertex; fal routing may be cheaper |
| Seedance 2.0 | Two tiers — exact $/s TBD (standard vs fast tier) | fal official API |

### Image model APIs (output-based pricing)

| Model | Price | Notes |
|---|---|---|
| FLUX.1 schnell | $0.003/megapixel | ~$0.003 at 1MP |
| FLUX.1 dev | ~$0.025/image (1024×1024) | — |
| FLUX Kontext Pro | $0.04/image | — |
| Nano Banana 2 | $0.08/image (1K), $0.12 (2K), $0.16 (4K) | Google Gemini Flash |
| Nano Banana Pro | $0.15/image | Google Gemini 3 Pro |
| Seedream V4 | $0.03/image | — |
| Recraft V3 | $0.04/image ($0.08 for vector styles) | — |
| Nanobanana | $0.0398/image | — |

### Audio model pricing

| Model | Price |
|---|---|
| MiniMax Speech-02 HD | $0.10 per 1,000 characters |
| MiniMax voice clone | $1.50 per clone + $0.30/1K chars |

---

## Top 5 models for the Ryan Realty content engine

### 1. FLUX.1 [schnell] — fast thumbnail generation

**What it does:** 12B parameter text-to-image. 1–4 inference steps. Sub-second on warm instances. Licensed for commercial use.

**When to use:** Thumbnail drafts, social card backgrounds, rapid concept iteration. Not for client-facing hero images (use Recraft V3 or Nano Banana 2 for those).

**Cost:** $0.003/megapixel — roughly $0.003 per standard 1024×1024 image. Under $0.01 per thumbnail at any working resolution.

**vs Replicate:** Both host it at similar price. fal wins on warmup — near-instant vs Replicate's potential cold start. For sustained thumbnail pipelines (batch runs during listing prep), fal's warm pool pays off.

**Bend prompt pattern:**
```
High Desert landscape with volcanic ridgeline in distance, morning light, photorealistic, 
Oregon real estate, dramatic sky. For property at 3847 Cascade Ave, Bend OR.
```

---

### 2. Kling v3 Pro — cinematic listing video

**What it does:** Image-to-video or text-to-video with native audio generation, multi-shot narrative control, and custom element injection. 3–15 second clips. 4K output variant available. Characters and objects can be referenced via `@Element1` syntax for consistent identity across shots.

**When to use:** Listing reveal videos, agent b-roll, lifestyle neighborhood clips. This is the video model for the core content engine. Native audio means music + ambient SFX without a post-mix step.

**Cost:**
- No audio: $0.112/s → 10-second clip = $1.12
- Audio on: $0.168/s → 10-second clip = $1.68
- Voice control: $0.196/s
- 4K variant at premium

**fal exclusive:** Not on Replicate as of 2026-05-06.

**Bend use case:** Take the Matterport hero shot of a Sisters-area ranch, animate it with a slow push-in, inject the property address as a consistent text element, generate ambient wind + birds audio — one API call, no post-production audio track.

```javascript
const result = await fal.subscribe("fal-ai/kling-video/v3/pro/image-to-video", {
  input: {
    image_url: "https://cdn.ryan-realty.com/listings/sisters-ranch-hero.jpg",
    prompt: "Slow cinematic push-in toward the front porch, morning light, golden hour, Oregon high desert",
    duration: "10",
    aspect_ratio: "9:16",
    audio: true,
  }
});
```

---

### 3. Seedance 2.0 — multi-shot narrative video

**What it does:** ByteDance's multimodal video model (text + image + audio → video). Generates up to 15 seconds with multiple natural cuts in one pass. Director-level camera controls (dolly zoom, rack focus, tracking shot). Native audio including dialogue lip-sync and sound effects. Physics-aware motion for action sequences.

**When to use:** Market update videos, neighborhood flythrough sequences, lifestyle content where you need a multi-shot edit without stitching clips manually. The native multi-shot architecture is the differentiator — Kling v3 generates single shots; Seedance generates sequences.

**Cost:** Fast tier (lower latency, production workloads) and Standard tier (max quality). Per-second pricing — exact figure TBD, confirm at fal.ai/pricing before first production run.

**fal official API:** fal is the exclusive global API distribution partner. Not on Replicate.

**Bend use case:** "Bend market update, Q2 2026" — one Seedance prompt covers: aerial approach to Old Mill District, cut to downtown Saturday Market, cut to Deschutes River trail, with voiceover narration lip-synced or narrated by the audio generation layer.

---

### 4. Nano Banana 2 (Google Gemini 3.1 Flash Image) — property image editing

**What it does:** Google's Gemini 3.1 Flash image model, branded "Nano Banana 2" on fal. Generates and edits images with multimodal reasoning. Accurate in-image text rendering validated character-by-character. Maintains character/face consistency across up to 5 people in batch. Accepts up to 14 reference images as context for editing. Optional web search grounding for factual accuracy.

**When to use:** Creating marketing graphics with correct address/price text baked in (the text rendering is the feature — most diffusion models butcher text). Editing listing photos with specific object changes via natural language. Creating consistent agent headshots or lifestyle composites across a campaign.

**Cost:** $0.08/image at 1K resolution, $0.12 at 2K, $0.16 at 4K. Batch up to 4 images per call.

**vs Replicate/DALL-E:** The in-image text accuracy and multi-reference consistency are meaningfully better than FLUX or SDXL for branded marketing outputs. Replicate does not host this model.

**Bend use case:** Generate a "Just Listed" graphic with the exact address rendered cleanly in the image, correct price in the correct font, and the property photo as background — without having to Photoshop the text overlay in post.

---

### 5. Foley Control — video-to-audio for listing reels

**What it does:** Generates synchronized sound effects from a video input using text prompts. Connects V-JEPA2 video embeddings to a frozen Stable Audio Open DiT model via cross-attention — lightweight, production-modular. Matches timing and visual action automatically.

**When to use:** Adding ambient audio to silent drone footage or listing walk-throughs without a full post-production pipeline. Text prompt controls the sound character: "gentle wind through pine trees, distant river, quiet rural Oregon morning."

**vs Replicate:** Foley Control as a video-to-audio model with this architecture is not available on Replicate. Most Replicate audio models are text-to-audio only.

**Cost:** Not yet on the fal.ai/pricing page as a per-output line item — currently appears to run on GPU-second billing (A100 at $0.0003/s). Confirm live before production use.

**Bend use case:** Silent drone footage of Smith Rock or Mt. Bachelor ski terrain gets natural ambient audio in seconds without a VO or music license.

---

## Common failure modes

| Failure | Cause | Fix |
|---|---|---|
| **429 Too Many Requests** | Exceeded plan rate limit | Exponential backoff: wait `2^attempt` seconds, max 3 retries. Check `Retry-After` header. |
| **504 Gateway Timeout** | Long-running video generation exceeded sync timeout | Switch to queue mode + webhook or polling. Never use sync for video > ~20s. |
| **GPU queue backlog** | High-demand models (Kling, Veo 3) during peak hours | Submit async, poll every 10–15s. Expect up to 5 min wait during peak. |
| **Cold start on uncommon models** | Model not warm in fal's pool | First call may take 30–60s. Subsequent calls near-instant. Warm critical models with a cheap trigger call during low-traffic periods. |
| **Safety checker rejection** | Prompt or image triggered content filter | Retry with adjusted prompt. fal returns HTTP 422 with rejection reason. |
| **API key compromise** | Key leaked in frontend code | Never expose `FAL_KEY` client-side. Route all fal calls through a Next.js API route or Edge Function. |

---

## Output format (sync vs async)

**Sync response:**
```json
{
  "images": [{ "url": "https://fal.media/files/...", "width": 1024, "height": 1024 }],
  "seed": 1234567,
  "timings": { "inference": 0.91 }
}
```

**Async queue response (submit):**
```json
{ "request_id": "abc-123", "status": "IN_QUEUE" }
```

**Async queue response (completed):**
```json
{
  "video": { "url": "https://fal.media/files/...", "content_type": "video/mp4" },
  "status": "COMPLETED"
}
```

All media URLs are temporary CDN links (TTL varies — download to permanent storage immediately).

---

## Fallback when fal is down

| fal model | Replicate fallback | Notes |
|---|---|---|
| FLUX schnell | `black-forest-labs/flux-schnell` on Replicate | Same model, slightly higher cold starts |
| Kling v3 Pro | Kling v2.1 on Replicate (if available) | v3 not on Replicate — accept quality downgrade |
| Seedance 2.0 | Wan 2.1 on Replicate | Different model; no native multi-shot |
| Nano Banana 2 | GPT Image 2 via OpenAI API | Different architecture; text rendering may degrade |
| Foley Control | No direct equivalent on Replicate | Manual audio post or ElevenLabs SFX |
| Real-time WebSocket | Not available on Replicate | Drop to standard sync mode; accept latency increase |

Monitor fal status at: https://status.fal.ai (not yet confirmed as the official status page — verify before adding to monitoring).

---

## Integration pattern for Ryan Realty pipeline

```javascript
// app/api/generate/route.ts (Next.js API route)
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

export async function POST(req: Request) {
  const { model, input } = await req.json();
  
  // Use subscribe for images (fast sync)
  if (model.includes("flux") || model.includes("nano-banana")) {
    const result = await fal.subscribe(model, { input });
    return Response.json(result);
  }
  
  // Use queue for video (long-running)
  const { request_id } = await fal.queue.submit(model, {
    input,
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/fal-webhook`,
  });
  return Response.json({ request_id });
}
```

---

## Sources

- [fal.ai pricing](https://fal.ai/pricing)
- [fal.ai model catalog](https://fal.ai/models)
- [fal.ai docs](https://fal.ai/docs/)
- [Real-time inference docs](https://fal.ai/docs/documentation/model-apis/inference/real-time)
- [Seedance 2.0 on fal](https://fal.ai/seedance-2.0)
- [Nano Banana 2](https://fal.ai/models/fal-ai/nano-banana-2)
- [Kling v3 Pro i2v](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video)
- [MiniMax voice clone](https://fal.ai/models/fal-ai/minimax/voice-clone)
- [fal.ai vs Replicate comparison — TeamDay.ai](https://www.teamday.ai/blog/fal-ai-vs-replicate-comparison)
- [fal.ai vs WaveSpeedAI benchmark](https://wavespeed.ai/blog/posts/fal-ai-review-2026/)
- [AI image model pricing — PricePerToken](https://pricepertoken.com/image)
- [fal.ai blog — 2026 releases](https://blog.fal.ai/)
