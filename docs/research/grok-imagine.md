# Tool: xAI Grok Imagine (image + video)

_Verified 2026-05-06. Sources: docs.x.ai, fal.ai pricing, deeplearning.ai Batch writeup, modelslab developer comparison._

## What it does

Grok Imagine is xAI's unified creative API that generates still images from text (grok-imagine-image) and short video clips from text or still images (grok-imagine-video), with native synchronized audio on video outputs.

---

## When to choose Grok Imagine (vs alternatives)

### Image mode — vs Imagen 4, DALL-E 3, Flux

| Model | Cost/image | Notes |
|---|---|---|
| `grok-imagine-image` | $0.02 | Fast, 1k/2k resolution, up to 10 images/request, 300 RPM |
| `grok-imagine-image-quality` | $0.07 | Higher fidelity; replaced retired `-pro` variant |
| Imagen 4 Fast | $0.02 | Speed-matched; stronger at rendering fine architecture text |
| Imagen 4 Standard | $0.04 | Better detail on complex scenes than grok-imagine-image |
| DALL-E 3 | $0.04–$0.08 | Strong composition; watermarks API outputs |
| Flux (via Replicate) | $0.003–$0.055 | Cheapest/highest variety; open-weight; no audit trail |

**When to use grok-imagine-image:** A/B variant grids (up to 10 images per call), quick hero banner generation, and social thumbnail experiments where speed matters more than photorealism ceiling. The $0.02/image rate makes iteration cheap. Use `response_format: b64_json` and re-upload to Supabase Storage immediately — Grok image URLs are temporary.

**When to use grok-imagine-image-quality:** Listing hero images, print-quality crops, or any asset where you'd otherwise spend money on a stock license. Better instruction-following on complex architectural prompts.

### Video mode — vs Veo 3, Kling, Hailuo

| Model | Cost | Max resolution | Max duration | Native audio |
|---|---|---|---|---|
| `grok-imagine-video` | $0.05/s (480p) · $0.07/s (720p) | 720p | 15s | Yes — music + SFX built in |
| Veo 3.1 | ~$0.20/s ($12/min) | 1080p | 8s | Yes |
| Kling v2.1 / 3.0 | ~$0.15–$0.20/s | 1080p | 3 min | No |
| Hailuo 02 (Replicate) | ~$0.04/s | 720p | 10s | No |
| Seedance 1 Pro (Replicate) | ~$0.06/s | 1080p | 5–10s | No |

**When to use grok-imagine-video:**
- B-roll for Remotion comps: 6–10s clips at 720p drop straight into our 1080×1920 Sequence timeline.
- Text-to-video hook footage: aerial perspectives, neighborhood drive-bys, Cascade skyline passes — where you want fast turnaround and don't need 1080p native.
- Budget-conscious iteration: at $0.42 for a 6-second 720p clip, you can generate 10 variants for the price of one Veo 3 clip.
- Native audio is a differentiator when you want ambient music/SFX without a post-mix step.

**When NOT to use grok-imagine-video:**
- When the final deliverable will be viewed at 1080p: Grok maxes at 720p (1280×720 or 854×480). For luxury listing hero footage that ships at true 1080p, route to Veo 3 or Kling via Replicate.
- Clips longer than 15 seconds: use Kling.
- When temporal consistency of a specific subject (a home's exterior, a specific car) matters across a long sequence: Veo 3.1 and Kling hold objects more coherently.

---

## Auth + endpoint (verified 2026-05-06)

### Image

```
POST https://api.x.ai/v1/images/generations
POST https://api.x.ai/v1/images/edits
Authorization: Bearer $XAI_API_KEY
```

Model names in production today:
- `grok-imagine-image` — primary, $0.02/image
- `grok-imagine-image-quality` — premium, $0.07/image (replaces `grok-imagine-image-pro` which retires May 15, 2026)

**Note:** Our `lib/grok-image.ts` hardcodes `'grok-imagine-image'` — correct as of today. Add `grok-imagine-image-quality` as a parameter option when higher fidelity is needed.

### Video

```
POST https://api.x.ai/v1/videos/generations      ← start job
GET  https://api.x.ai/v1/videos/{request_id}     ← poll status
Authorization: Bearer $XAI_API_KEY
```

Model name: `grok-imagine-video` — correct in our `lib/grok-video.ts`.

Additional endpoints now live (not yet wired):
- `POST https://api.x.ai/v1/videos/edits` — edit/restyle existing video
- `POST https://api.x.ai/v1/videos/extensions` — extend a video by 2–10s

Async polling: returns `request_id` on submit. Poll `GET /v1/videos/{request_id}`. Status values: `pending` → `done` / `expired` / `failed`. Our lib polls every 5s with a 10-min timeout — matches xAI's recommended defaults (Python SDK default interval is 100ms, timeout 10 min; we use 5s which is conservative but safe).

---

## Pricing (verified 2026-05-06)

### Image

| Model | Per image |
|---|---|
| `grok-imagine-image` | $0.02 |
| `grok-imagine-image-quality` | $0.07 |
| Image editing (edits endpoint) | charged for input + output image |

Rate limits: `grok-imagine-image` at 300 RPM (high-volume safe). `grok-imagine-image-quality` at 30 RPM.

### Video

| Resolution | Per second |
|---|---|
| 480p (854×480) | $0.05 |
| 720p (1280×720) | $0.07 |

Quick math for common Ryan Realty clip lengths:

| Duration | 480p | 720p |
|---|---|---|
| 5s | $0.25 | $0.35 |
| 6s | $0.30 | $0.42 |
| 10s | $0.50 | $0.70 |
| 15s | $0.75 | $1.05 |

At $4.20/min ($0.07/s at 720p) this is roughly 3× cheaper than Veo 3.1 and 7× cheaper than Sora 2 Pro. Includes native audio at no extra charge.

### Free tier

No documented free API tier as of 2026-05-06. Consumer (SuperGrok) plans include image and video generation credits but those don't apply to API calls billed against `XAI_API_KEY`.

---

## Optimal parameters for real estate

### Image mode (`lib/grok-image.ts`)

**Current lib supports:** `prompt`, `aspect_ratio` (1:1, 2:1, 16:9). Expand for full production use:

```typescript
{
  model: 'grok-imagine-image',          // or 'grok-imagine-image-quality'
  prompt: string,
  n: 1-10,                              // generate variants in one call
  aspect_ratio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '2:1' | '1:2'
              | '3:2' | '2:3' | '19.5:9' | '9:19.5' | '20:9' | '9:20' | 'auto',
  resolution: '1k' | '2k',             // 2k for print/hero use
  response_format: 'b64_json',          // ALWAYS use b64_json — URLs are temporary
}
```

**Lib gap:** current `grok-image.ts` only supports `'1:1' | '2:1' | '16:9'`. Missing `9:16` (portrait for Reels/TikTok thumbnails) and `2k` resolution parameter. Neither is wired. Update before first production image-to-social run.

**Prompt structure for real estate (FLUX-based Aurora architecture responds to natural language over keyword stacking):**

```
[Subject + location + time of day], [material/texture detail], [lighting style], [camera/lens], [mood/atmosphere]
```

Examples:
- Hero banner (2:1): `"Single-story modern ranch home exterior in Central Oregon high desert, warm cedar siding and black steel trim, golden hour side lighting, wide-angle shot on Canon EOS R5 24mm, dry ponderosa pines framing left edge, clear blue sky"`
- Listing thumbnail (9:16): `"Northwest contemporary home facade, dark board-and-batten siding, large picture windows reflecting Cascades, overcast diffused light, architectural photography, clean foreground, no people"`
- Neighborhood aerial (16:9): `"Aerial view of residential neighborhood in Bend Oregon, Deschutes River visible, snow-capped Three Sisters peaks in background, late afternoon golden light, drone photography style, no people, no text"`

**What to avoid in prompts:** "stunning," "gorgeous," "beautiful," "luxury" — they produce generic stock-photo aesthetics. Be specific about materials, angles, and light instead.

### Video mode (`lib/grok-video.ts`)

**Current lib supports:** `prompt`, `duration` (1–15), `aspect_ratio` (16:9, 9:16, 1:1), `resolution` (720p, 480p). This matches the full documented parameter set for generation.

**Not yet wired (consider adding):**
- `image` field — public URL or base64 data URI for image-to-video (already in `generateImageToVideo()`, passes as `image_url` but docs use `image` key — verify field name against live API)
- `reference_images` — array of image URLs to guide visual style without locking the first frame
- `video_url` — source for the edits and extensions endpoints

**Recommended settings by use case:**

| Use case | Duration | Resolution | Aspect |
|---|---|---|---|
| Remotion B-roll insert | 5–8s | 720p | 16:9 |
| TikTok/Reel hook clip | 5–8s | 720p | 9:16 |
| Earth-zoom opener | 8–10s | 720p | 9:16 |
| Listing reveal motion | 5s | 720p | 9:16 |
| Neighborhood flyover | 10–12s | 720p | 16:9 |

**Note from Replicate/fal docs:** "shorter clips are more stable — 5–8 seconds is the sweet spot. 15-second clips work but are more likely to show artifacts." For listing videos, cap at 10s per Grok clip; cut and comp in Remotion.

---

## Prompt templates

### Image — 5 real-estate patterns for Ryan Realty, Bend, OR

```
# 1. Hero banner — Bend neighborhood page (2:1, 2k)
"Aerial perspective of Awbrey Butte neighborhood in Bend Oregon, 
high desert sage and juniper landscape, Cascade mountain range visible 
in distance, homes with modern Pacific Northwest architecture, late afternoon 
golden light casting long shadows, no people, photorealistic drone photography"

# 2. Listing exterior thumbnail (9:16, 2k)
"Single-family modern farmhouse exterior, white board-and-batten siding, 
black window frames, xeriscaped front yard with ornamental grasses, 
clear high desert sky, overcast soft light, architectural photography, 
no text, no watermark, Central Oregon"

# 3. Interior living room hero (16:9, 2k)
"Open-plan living room with floor-to-ceiling windows overlooking pine forest, 
exposed wood beam ceiling, white walls, mid-century modern furniture in warm 
earth tones, natural afternoon light flooding in, wide-angle architectural 
interior photography, no people"

# 4. Gold accent social square (1:1, 1k) — for IG grid
"Abstract geometric pattern using deep navy and champagne gold tones, 
minimal texture, subtle mountain silhouette, professional real estate branding, 
no text"

# 5. Market data chart background (16:9, 1k) — behind stat overlays
"Soft blurred bokeh of Central Oregon pine forest at dusk, deep navy 
color grade, abstract, no identifiable structures, no text, suitable as 
video background with overlaid statistics"
```

### Video — 5 worked examples for Ryan Realty content

```
# 1. Aerial flyover B-roll — Bend city (9:16, 720p, 8s)
"Slow aerial drone flyover of downtown Bend Oregon at golden hour, 
Deschutes River winding through town, Mirror Pond visible, 
volcanic buttes in background, smooth panning camera motion from east to west, 
cinematic color grade, no text, no people in foreground"

# 2. Listing reveal motion — single home (9:16, 720p, 6s)
"Cinematic push-in toward a modern ranch home with dark siding surrounded 
by high desert landscaping, warm late afternoon sun, slow deliberate forward 
camera movement, shallow depth of field, no people, architectural video"

# 3. Earth-zoom descent opener (9:16, 720p, 10s)
"Camera descends from above clouds over the Oregon Cascades, snow-capped 
Three Sisters peaks visible, slowly zooming toward a residential neighborhood 
below, cinematic motion, no text overlay, satellite to ground perspective"

# 4. Neighborhood drive-by (16:9, 720p, 8s)
"Slow lateral tracking shot along a tree-lined residential street in Bend 
Oregon, craftsman and modern homes visible, dappled afternoon light through 
pine canopy, smooth gimbal-style motion, no people, no logos"

# 5. Interior walkthrough B-roll (16:9, 720p, 6s)
"Slow dolly move through a bright open kitchen with white quartz counters 
and stainless appliances, afternoon sun cutting across the counter, 
warm interior light, no people, architectural real estate video, cinematic"
```

---

## Common failure modes

| Failure | Cause | Fix |
|---|---|---|
| **Image URL 404 before download** | xAI image URLs are temporary (window not documented; assume minutes not hours) | Always pass `response_format: 'b64_json'` — our lib already does this correctly |
| **Video URL expires before download** | Temporary CDN URL on `vidgen.x.ai` — expires faster than 10-min poll window allows | Download immediately after `status === 'done'` — our lib returns the URL but caller must download + re-upload to Supabase Storage before using |
| **Brand color drift in images** | FLUX-based model doesn't understand hex codes | Describe colors in natural language: "deep navy blue," "warm champagne gold" — never `#102742` in prompts |
| **Watermark on consumer Grok** | Different product (grok.com/imagine) adds watermarks | API (`api.x.ai`) does not add watermarks — always use the API, never screen-cap the consumer UI |
| **Motion artifacts on 15s video** | Longer clips accumulate drift | Cap clips at 10s for production use; 15s only for low-stakes B-roll |
| **`respect_moderation: false`** | Prompt triggered content policy | Avoid terms like "exclusive," "gated," or any fair-housing-adjacent language; keep prompts architectural and landscape-focused |
| **Rate limit on image-quality model** | 30 RPM cap | Batch standard-model requests up to n=10; use quality model only for final hero selects |
| **`failed` status on video** | Oversized prompt, policy violation, or service error | Log the request_id; retry with simplified prompt; if persistent surface to Matt |
| **Audio not audible** | Grok video generates audio automatically — may be very low volume on ambient clips | For Remotion comps, strip Grok audio and use our licensed music track via `mix_news_audio.sh` |

---

## Output format

### Image

```json
{
  "data": [
    {
      "b64_json": "<base64-encoded JPEG string>",
      "model": "grok-imagine-image",
      "respect_moderation": true
    }
  ]
}
```

Our lib returns `Buffer.from(b64, 'base64')` — correct. Upload to Supabase Storage and use the permanent Supabase URL in all downstream assets.

### Video

Poll response when `status === 'done'`:

```json
{
  "status": "done",
  "video": {
    "url": "https://vidgen.x.ai/.../<uuid>/video.mp4",
    "duration": 8,
    "respect_moderation": true
  },
  "model": "grok-imagine-video"
}
```

Our lib returns the `video.url` string. **Caller must download and store immediately.** The CDN URL is temporary. Download with `fetch(url)` → write to `out/<name>.mp4` → move to `public/v5_library/` after Matt approval per draft-first rule.

**Video metadata in response** (from fal/docs): 24 fps, video/mp4 content type.

---

## Code gap: `image_url` vs `image` field name

Our `lib/grok-video.ts` sends `image_url` in the request body for image-to-video. The xAI docs (verified 2026-05-06) use `image` as the field name (either a public URL string or base64 data URI). Verify against live API before first i2v production run:

```bash
# Quick field-name test (requires XAI_API_KEY in env)
curl -s -X POST https://api.x.ai/v1/videos/generations \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-imagine-video",
    "image": "<public_image_url>",
    "prompt": "slow cinematic zoom",
    "duration": 5,
    "aspect_ratio": "16:9",
    "resolution": "480p"
  }' | jq '.request_id'
```

If this returns a `request_id`, the field is `image`. If it returns an error about missing prompt/image, try `image_url`. Fix the lib to match whichever works.

---

## Fallback chain

### Image generation fails

1. **Grok down / rate-limited** → `grok-imagine-image` (try again; 300 RPM is generous)
2. **Quality model rate-limited (30 RPM)** → queue and retry with exponential backoff
3. **Persistent failure** → Imagen 4 Standard via Vertex AI (`imagegeneration@006`, `$0.04/image`) — similar style range, slightly better photorealism ceiling
4. **Vertex unavailable** → DALL-E 3 via OpenAI (`dall-e-3`, `$0.04/image 1024×1024`) — note: no `n>1` in single call; loop for variants
5. **All cloud down** → Flux-dev via Replicate (`black-forest-labs/flux-1.1-pro`, ~$0.04/image) — no content audit trail, use for internal review only, not client-facing

### Video generation fails

1. **Grok `failed` status** → retry same prompt once (transient service errors are common)
2. **Repeated failures** → Veo 3 via Vertex AI direct (`imagegeneration` video endpoint) — `$0.20/s`, 1080p, 8s max; better quality ceiling
3. **Vertex unavailable** → Kling v2.1 Master via Replicate (`kwai-kolors/kling-video`, ~$0.15/s) — 1080p, 5-10s, no native audio
4. **Kling rate-limited** → Hailuo 02 via Replicate (`minimax/video-01`, ~$0.04/s) — 720p, 6s max, no audio
5. **All video APIs down** → render with Ken Burns motion on stills in Remotion (`photo-hero-drift` skill) — no external API dependency

---

## Lib files in this codebase

- `lib/grok-image.ts` — image generation only; missing `9:16`, `n>1`, `resolution`, `quality` model param
- `lib/grok-video.ts` — text-to-video and image-to-video; verify `image_url` vs `image` field name before production i2v use

Both libs correctly use `XAI_API_KEY` from `process.env` and are wired for server-side Next.js use. Neither calls the edits or extensions endpoints yet.

---

_Sources: [xAI Image Generation docs](https://docs.x.ai/developers/model-capabilities/images/generation) · [xAI Video Generation docs](https://docs.x.ai/developers/model-capabilities/video/generation) · [fal.ai grok-imagine-image pricing](https://fal.ai/models/xai/grok-imagine-image) · [fal.ai video per-second pricing](https://fal.ai/models/xai/grok-imagine-video/text-to-video) · [deeplearning.ai Grok Imagine 1.0](https://www.deeplearning.ai/the-batch/grok-imagine-1-0-sharply-cuts-costs-for-high-quality-video-generation/) · [image pricing comparison](https://blog.laozhang.ai/en/posts/ai-image-api-pricing-comparison) · [Grok vs Kling vs Veo developer comparison](https://modelslab.com/blog/video-generation/grok-imagine-api-vs-kling-3-veo-3-1-video-api-comparison-2026) · [releasebot xAI changelog](https://releasebot.io/updates/xai)_
