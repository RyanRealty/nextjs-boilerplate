# Tool: Google Imagen 4 (Vertex AI direct)

> **STATUS AS OF 2026-05-06: SUNSET ADVISORY**
> All Imagen 4 model endpoints are deprecated and will shut down **June 30, 2026**.
> The `@google-cloud/vertexai` SDK is also deprecated (removed June 24, 2026).
> Active successor: **Gemini image generation ("Nano Banana")** via `@google/genai` SDK.
> This doc covers both so you can use Imagen 4 through June 2026 and migrate cleanly.

---

## What it does

Imagen 4 is Google's text-to-image model on Vertex AI — generates photorealistic and stylized images from a prompt, in 1–4 images per request, at up to 2816×1536 px resolution, with configurable aspect ratios, safety filters, and watermarking.

---

## When to choose Imagen 4 (vs Grok Aurora, Flux on Replicate, OpenAI DALL-E 3)

| Criterion | Imagen 4 Standard / Ultra | Grok Aurora | Flux 2 Pro (Replicate) | DALL-E 3 (OpenAI) |
|---|---|---|---|---|
| **Brand-color discipline** | Best. Hex codes in prompts produce nearest match for commercial product imagery. Reduces post-processing color correction for strict brand guidelines. | Adequate | Good for photography-style prompts; less reliable on brand hex reproduction | Moderate |
| **Prompt-instruction following** | Excellent — complex multi-element scenes with specific layout directives | Good | Good on photography-style instructions | Good |
| **Photorealism profile** | Top-tier for product/commercial photography; skin texture and lighting fidelity | Competitive, especially portraits | Best in class for camera-optical realism (DoF, lens distortion, grain) | Mid-tier |
| **Text rendering in image** | Strong improvement over Imagen 3 | Weak | Mediocre | Poor |
| **Resolution ceiling** | 2816×1536 (Ultra/Standard), 1408×768 (Fast) | 1024×1024 | 1408×768 max via Replicate | 1024×1024 HD |
| **9:16 portrait support** | Yes (native) | Limited | Yes | Yes |
| **Billing already on** | Yes — `ryan-realty-tc` Vertex, `us-central1` | Separate xAI account needed | Separate Replicate acct | Separate OpenAI acct |
| **Price per standard image** | $0.04 | $0.02–$0.03 | $0.05 (Pro) / $0.003 (Schnell) | $0.04 (Standard) / $0.08 (HD) |

**Bottom line for Ryan Realty thumbnails:** Imagen 4 / Ultra wins when brand-color fidelity matters (navy #102742 backgrounds, gold #D4AF37 accents) and the result needs to look like a commercial photo. For high-volume low-cost bulk generation, Grok Aurora or Flux Schnell are cheaper but require color correction pass. For portrait-photorealism (agent headshots, lifestyle), Flux 2 Pro or GPT-Image-1.5 may outperform. For everything after June 30, 2026, migrate to Gemini 3.1 Flash Image (Nano Banana 2).

---

## Auth + endpoint (verified 2026-05-06)

### Endpoint URL pattern

```
POST https://us-central1-aiplatform.googleapis.com/v1/projects/ryan-realty-tc/locations/us-central1/publishers/google/models/{MODEL_ID}:predict
```

### Confirmed model IDs (Imagen 4)

| Variant | Model ID | Max resolution | Rate limit |
|---|---|---|---|
| Standard | `imagen-4.0-generate-001` | 2816×1536 | 75 req/min |
| Fast | `imagen-4.0-fast-generate-001` | 1408×768 | 150 req/min |
| Ultra | `imagen-4.0-ultra-generate-001` | 2816×1536 | 30 req/min |

### Auth — service account

Project `ryan-realty-tc`, location `us-central1`.
Service account `viewer@ryanrealty.iam.gserviceaccount.com` has `roles/aiplatform.user` — confirmed working (smoke-tested 2026-05-06 with Gemini 2.5 Flash).

### SDK choice (IMPORTANT)

`@google-cloud/vertexai` is deprecated and will be removed June 24, 2026.
Use **`@google/genai`** for all new code.

```bash
npm install @google/genai
```

### Node.js SDK example (Imagen 4, current)

```javascript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({
  vertexai: true,
  project: "ryan-realty-tc",
  location: "us-central1",
});

const response = await ai.models.generateImages({
  model: "imagen-4.0-generate-001",
  prompt: "...",
  config: {
    numberOfImages: 4,
    aspectRatio: "9:16",
    personGeneration: "dont_allow",
    safetySetting: "block_medium_and_above",
    addWatermark: false,
  },
});

for (const [i, generated] of response.generatedImages.entries()) {
  const buffer = Buffer.from(generated.image.imageBytes, "base64");
  fs.writeFileSync(`thumbnail-${i}.png`, buffer);
}
```

### REST API example (Imagen 4)

```bash
curl -X POST \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/ryan-realty-tc/locations/us-central1/publishers/google/models/imagen-4.0-generate-001:predict" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [{ "prompt": "YOUR PROMPT" }],
    "parameters": {
      "sampleCount": 4,
      "aspectRatio": "9:16",
      "personGeneration": "dont_allow",
      "safetySetting": "block_medium_and_above",
      "addWatermark": false,
      "outputOptions": { "mimeType": "image/png" }
    }
  }'
```

---

## Pricing (verified 2026-05-06)

### Imagen 4 on Vertex AI

| Variant | Price per image | Notes |
|---|---|---|
| **Standard** (`imagen-4.0-generate-001`) | **$0.04** | Up to 2816×1536 |
| **Fast** (`imagen-4.0-fast-generate-001`) | **$0.02** | Up to 1408×768 |
| **Ultra** (`imagen-4.0-ultra-generate-001`) | **$0.06** | Up to 2816×1536, highest fidelity |
| Upscaling | $0.06 | Per upscale operation |

### Competitor pricing (per image, standard quality)

| Tool | Price | Notes |
|---|---|---|
| Grok Aurora (xAI) | $0.02–$0.03 | Separate xAI API account |
| Flux Schnell (Replicate) | $0.003 | Fast, lower quality |
| Flux 2 Pro (Replicate) | $0.05 | Near Imagen 4 Standard quality |
| DALL-E 3 Standard (OpenAI) | $0.04 | 1024×1024 only |
| DALL-E 3 HD (OpenAI) | $0.08 | 1024×1024 only |
| GPT-Image-1.5 | $0.04–$0.06 | Newer, outperforms DALL-E 3 |

### Gemini image pricing (post-migration — Nano Banana)

Token-based pricing, not per-image flat rate:

| Model | ~512px | ~1K | ~2K | ~4K |
|---|---|---|---|---|
| Gemini 3.1 Flash Image (Nano Banana 2) | $0.045 | $0.067 | $0.101 | $0.150 |
| Gemini 3 Pro Image (Nano Banana Pro) | — | $0.134 | $0.134 | $0.240 |

Batch API discount: 50% off for non-time-sensitive requests (24h processing window).

**For A/B thumbnail grids (4 images):**
- Imagen 4 Standard: $0.16 per 4-up grid
- Imagen 4 Fast: $0.08 per 4-up grid
- Gemini 3.1 Flash Image at 2K: ~$0.40 per 4-up grid (tokens)
- Flux Schnell: $0.012 per 4-up grid

Imagen 4 Standard remains cost-competitive for production thumbnail batches through the shutdown date.

---

## "Nano Banana" — clarified

"Nano Banana" is Google's playful internal codename for **Gemini's native image generation models** — these are NOT Imagen models. Two generations exist:

| Codename | Formal name | Model ID | Status |
|---|---|---|---|
| Nano Banana | Gemini 2.5 Flash Image | `gemini-2.5-flash-image` | GA; prior preview deprecated |
| Nano Banana 2 | Gemini 3.1 Flash Image Preview | `gemini-3.1-flash-image-preview` | Preview (as of May 2026) |
| Nano Banana Pro | Gemini 3 Pro Image | `gemini-3-pro-image-preview` | Preview |

These are Gemini multimodal models with image output — fundamentally different architecture from Imagen. They run through `generateContent()` (not `generateImages()`), support conversational multi-turn editing, produce up to 14 images/prompt, and support 10 aspect ratios vs Imagen 4's 5.

Nano Banana 2 is rolling out as the default image generation engine across Google Search, Gemini app, and Lens globally as of early 2026.

**Imagen 4 Fast is NOT "Nano Banana Fast."** They are separate model families.

---

## Optimal parameters

### Aspect ratio

```
"aspectRatio": "9:16"   // 1080×1920 portrait — TikTok/Reels/Shorts thumbnails
"aspectRatio": "1:1"    // Square — IG grid, carousel covers
"aspectRatio": "16:9"   // YouTube thumbnails
"aspectRatio": "3:4"    // Pinterest pins (use 4:3 for landscape)
"aspectRatio": "4:3"    // Available but rarely used for social
```

### Safety filter level

```
"safetySetting": "block_low_and_above"    // Most restrictive
"safetySetting": "block_medium_and_above" // Default — use this for Ryan Realty
"safetySetting": "block_only_high"        // Least restrictive
```

### Person generation

```
"personGeneration": "dont_allow"  // Use for property/brand thumbnails (no face artifacts)
"personGeneration": "allow_adult" // Default — OK for lifestyle shots
"personGeneration": "allow_all"   // Permits minors — avoid for real estate use
```

For Ryan Realty thumbnail generation: default to `dont_allow` unless the creative brief explicitly requires people. Removes face-artifact failure mode.

### Output format

```
"outputOptions": { "mimeType": "image/png" }   // Lossless — use for print/OG assets
"outputOptions": { "mimeType": "image/jpeg" }  // Smaller — use for web thumbnails
```

PNG adds ~3× file size. Use JPEG for any asset going directly to social or video.

### Sample count

```
"sampleCount": 4  // Max per request — always generate 4, pick best
```

4 images = 4× cost, but A/B selection dramatically improves output quality. For $0.16/grid on Standard, always request 4.

### Watermark

```
"addWatermark": false  // Required for brand assets — disable SynthID watermark
```

Default is `true`. Must explicitly set `false` for any asset going to publish.

### Seed (for deterministic output)

```
"seed": 1234567  // Any integer 1–2147483647
"addWatermark": false  // Required — watermark disables determinism
```

Useful for iterating on a composition while varying only the prompt.

---

## Prompt template (brand-locked)

```
SYSTEM CONTEXT: You are generating a thumbnail for Ryan Realty, a luxury real estate brokerage in Bend, Oregon.

BRAND COLORS: Navy #102742 as dominant background, Gold #D4AF37 as primary accent, Cream #F2EBDD for text zones.

STYLE: Commercial photography, photorealistic, clean, professional. Not editorial. Not lifestyle magazine. Not AI-stylized.

FORMAT: [9:16 portrait / 1:1 square / 16:9 landscape] thumbnail for [platform].

SUBJECT: [describe exactly what should be in the frame]

COMPOSITION: [describe layout — e.g., "subject occupies bottom 60% of frame, dark navy overlay occupies top 40%, white sans-serif headline centered in top zone"]

LIGHTING: [natural daylight / golden hour / interior warm / twilight blue hour]

BANNED ELEMENTS: No watermarks. No text rendered in the image. No human faces. No real estate agent appearance. No generic stock-photo feel. No Instagram filter look.

OUTPUT: Single hero image, clean edges, no vignette, no letterbox bars.
```

Note: Imagen 4 largely ignores hex color codes as literal paint-fill instructions. Frame hex values as **dominant color relationship descriptions** — "deep navy blue background, nearly black-blue, not bright blue" produces more consistent results than `#102742`. Use hex in the system context for reference, but restate in natural language in the prompt.

---

## 5 worked real-estate thumbnail examples

### 1. YouTube thumbnail — "Bend Q1 2026 Market Report"

```
Platform: 16:9 YouTube thumbnail

Prompt:
"Aerial drone photograph of downtown Bend Oregon at golden hour, Columbia River in background, 
warm amber sky, Mount Bachelor visible in far distance with snow cap. 
Dark navy blue overlay covers left 50% of frame at 70% opacity. 
Clean commercial photography style, photorealistic, no text in image, 
no people visible. The sky transitions from deep warm orange on the right 
to dark navy blue on the left. Sharp foreground detail."

Parameters:
- aspectRatio: 16:9
- personGeneration: dont_allow
- safetySetting: block_medium_and_above
- addWatermark: false
- mimeType: image/png
- sampleCount: 4
```

Post-production: Add "Q1 2026 MARKET REPORT" in Amboqia font, gold #D4AF37, centered on the navy half in Canva or Remotion.

### 2. Instagram carousel cover — listing reveal

```
Platform: 1:1 IG carousel cover (first slide)

Prompt:
"Interior architectural photograph of a modern Pacific Northwest luxury home,
Cascade Range visible through floor-to-ceiling windows, warm wood tones,
concrete accents, afternoon natural light flooding in from the left.
Photorealistic commercial real estate photography style. 
No people, no clutter, no furniture staging visible.
Centered composition, symmetrical framing, deep depth of field.
Neutral cream walls, exposed timber ceiling."

Parameters:
- aspectRatio: 1:1
- personGeneration: dont_allow
- safetySetting: block_medium_and_above
- addWatermark: false
- mimeType: image/jpeg
- sampleCount: 4
```

### 3. TikTok cover frame — meme-style market stat

```
Platform: 9:16 TikTok cover

Prompt:
"Dark navy blue background, nearly black-blue (#102742 equivalent), completely solid.
A bold gold coin or circular medallion in the lower-center of the frame, 
warm metallic gold color, slightly embossed, photorealistic metal texture.
Clean product photography style, studio lighting from above, 
single drop shadow on coin. Top 40% of frame completely empty dark navy."

Parameters:
- aspectRatio: 9:16
- personGeneration: dont_allow
- safetySetting: block_medium_and_above  
- addWatermark: false
- mimeType: image/png
- sampleCount: 4
```

Post-production in Remotion: Overlay the stat number in Amboqia 80px gold over the coin, AzoSans caption below, Ryan Realty logo in 200px footer bar.

### 4. LinkedIn header — professional

```
Platform: 16:9 LinkedIn header (1584×396 — generate at 16:9, crop in post)

Prompt:
"Wide panoramic photograph of the Deschutes River winding through high desert 
canyon near Bend Oregon, late afternoon, warm golden light hitting red volcanic 
rock walls, blue-green river below, ponderosa pine trees in foreground.
Deep navy blue vignette on the left 30% of frame fading to full photograph.
Commercial landscape photography, photorealistic, no people, no buildings, 
no roads visible. Horizontal panoramic composition."

Parameters:
- aspectRatio: 16:9
- personGeneration: dont_allow
- safetySetting: block_medium_and_above
- addWatermark: false
- mimeType: image/jpeg
- sampleCount: 4
```

### 5. Pinterest pin — vertical, keyword-oriented

```
Platform: 9:16 Pinterest pin

Prompt:
"Vertical real estate photography of a modern craftsman home exterior in Bend Oregon,
surrounded by high desert landscaping — ornamental grasses, drought-tolerant shrubs, 
basalt rock path. Overcast sky providing even lighting, no harsh shadows.
Home features dark charcoal (nearly black) board-and-batten siding, 
warm wood garage door, minimal landscaping. 
Commercial real estate photography, photorealistic. 
Bottom 25% of frame shows front yard and entry path in clear detail.
No people, no cars in driveway."

Parameters:
- aspectRatio: 9:16
- personGeneration: dont_allow
- safetySetting: block_medium_and_above
- addWatermark: false
- mimeType: image/jpeg
- sampleCount: 4
```

---

## Common failure modes

### 1. Brand colors ignored

Imagen 4 does not interpret hex codes as fill directives. Prompting `"navy blue #102742 background"` frequently produces bright blue or teal instead of the near-black navy.

**Fix:** Describe in natural language — `"very dark navy blue, nearly black, not bright, a midnight dark blue-black"`. Test with `sampleCount: 4` and select. For critical color match, generate in Imagen 4 then do a Hue/Saturation pass in post.

### 2. Face and person artifacts

Even with `personGeneration: allow_adult`, Imagen 4 occasionally inserts blurry or distorted faces in crowd or interior shots.

**Fix:** Use `personGeneration: dont_allow` for all thumbnail generation. Add `"no people, no faces, no human figures"` explicitly to prompt. For lifestyle shots that require people, generate the background separately then composite a stock photo or Flux-generated figure.

### 3. Text rendering in the image

Requesting text as part of the generated image — headlines, stats, price overlays — produces garbled or misspelled output.

**Fix:** Never request text generation from Imagen 4. Generate a clean background image, then add all text in Remotion, Canva, or Figma as a separate typography layer. This is also brand-correct — AzoSans/Amboqia fonts cannot be reproduced by the model.

### 4. Oversaturation and HDR look

Imagen 4 defaults to punchy, slightly oversaturated output that reads as AI-generated.

**Fix:** Add `"muted color palette, natural color grading, not HDR, not oversaturated, documentary photography style"` to prompt. For listing images especially, aim for realistic DSLR color rather than Instagram-edit look.

### 5. Generic Pacific Northwest vibe (not Bend)

Prompting "Oregon" or "Pacific Northwest" produces rainy, green, coastal imagery — not Bend's high desert/volcanic landscape.

**Fix:** Always specify: `"high desert landscape, volcanic basalt rock, ponderosa pine, sagebrush, Cascade Range, dry sunny climate, Mount Bachelor visible"`. Distinguish from "green Oregon" in the prompt.

---

## Output format

Response is JSON. Generated images are returned as **base64-encoded strings** in `response.generatedImages[n].image.imageBytes`. There is no GCS URL output unless you separately configure Cloud Storage.

```javascript
// Decode base64 to buffer
const buffer = Buffer.from(generated.image.imageBytes, "base64");
fs.writeFileSync("out/thumbnail.png", buffer);
```

For batch generation pipelines, write to `out/thumbnails/` (gitignored), review, then copy approved assets to the tracked public directory.

---

## Migration path: Imagen 4 → Gemini image (Nano Banana)

**Required before June 30, 2026.**

### SDK change

```bash
# Remove deprecated SDK
npm uninstall @google-cloud/vertexai

# Install current SDK (if not already)
npm install @google/genai
```

### Code change — Imagen 4 generateImages → Gemini generateContent

```javascript
// OLD (Imagen 4 — works until June 30, 2026)
const response = await ai.models.generateImages({
  model: "imagen-4.0-generate-001",
  prompt: "...",
  config: { numberOfImages: 4, aspectRatio: "9:16" },
});
const bytes = response.generatedImages[0].image.imageBytes;

// NEW (Gemini 3.1 Flash Image / Nano Banana 2)
import { GoogleGenAI, Modality } from "@google/genai";
const ai = new GoogleGenAI({ vertexai: true, project: "ryan-realty-tc", location: "us-central1" });

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: "Generate: ...",
  config: { responseModalities: [Modality.IMAGE] },
});

// Extract image parts from response
for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data, "base64");
    fs.writeFileSync("out/thumbnail.png", buffer);
  }
}
```

### Model mapping

| Imagen 4 (deprecated) | Gemini replacement |
|---|---|
| `imagen-4.0-generate-001` | `gemini-2.5-flash-image` |
| `imagen-4.0-fast-generate-001` | `gemini-2.5-flash-image` |
| `imagen-4.0-ultra-generate-001` | `gemini-3-pro-image-preview` |

---

## Fallback chain (Grok Aurora → Flux on Replicate)

If Vertex AI is unavailable or hitting rate limits:

### Tier 1 fallback: Grok Aurora (xAI)

- **Cost:** $0.02–$0.03/image
- **API:** `POST https://api.x.ai/v1/images/generations`
- **Auth:** separate xAI API key (not currently provisioned — surface to Matt before use)
- **Best for:** fast, cheap volume generation; adequate color; no 9:16 native support

### Tier 2 fallback: Flux 2 Pro (Replicate)

- **Cost:** $0.05/image
- **Auth:** `REPLICATE_API_TOKEN` (verify current balance in `video_production_skills/API_INVENTORY.md`)
- **Best for:** portrait photorealism, camera-optical prompts (DoF, film grain)
- **Limitation:** weaker brand-hex color fidelity than Imagen 4

### Tier 3 fallback: Flux Schnell (Replicate)

- **Cost:** $0.003/image
- **Best for:** high-volume background generation where quality is secondary to cost
- **Limitation:** visibly lower quality; not suitable for hero thumbnails

---

## Verification trace (for this doc)

All data sourced from primary Google Cloud documentation and official announcements, fetched 2026-05-06:

- Model IDs and endpoints: [Imagen 4 Vertex AI docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/imagen/4-0-generate)
- Generate images guide: [Generate images Vertex AI](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images)
- API reference: [Imagen API reference](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/model-reference/imagen-api)
- Safety parameters: [Configure safety settings](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/configure-responsible-ai-safety-settings)
- Pricing: confirmed $0.02 / $0.04 / $0.06 per image per variant
- Deprecation / shutdown June 30, 2026: [Google Dev forums](https://discuss.google.dev/t/imagen-4-0-deprecation-and-canada-hosted-alternatives/342923) + [Firebase models](https://firebase.google.com/docs/ai-logic/models)
- Nano Banana naming: [Google AI Developers](https://ai.google.dev/gemini-api/docs/image-generation) + [Google Blog](https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/)
- Gemini image models: [Multimodal image generation](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation)
- Competitor pricing: [TokenMix](https://tokenmix.ai/blog/ai-image-generation-api-comparison) / [xAI Docs](https://docs.x.ai/developers/models)
