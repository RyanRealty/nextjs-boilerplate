# Tool: Replicate / Google Veo 3

**Verified:** 2026-05-06 — sources: replicate.com/google/veo-3, Google Cloud Vertex AI docs, OpenRouter, costgoat.com, community prompting guides.

---

## What it does

Generates 8-second, 1080p MP4 clips from a text prompt with **native synchronized audio** (ambient sound, diegetic effects, dialogue, music) baked into the video in a single API call — no separate audio pass required.

---

## When to choose Veo 3 (vs alternatives)

| Criterion | Veo 3 | Kling v2.1 Master (i2v) | Hailuo 02 | Sora |
|---|---|---|---|---|
| **Native audio** | Yes — ambient + SFX + music in one call | No — must layer separately | No | No |
| **Motion realism** | Strong — physics-aware | Best-in-class | Good for human motion | High |
| **Max duration** | 8s | 5s or 10s | 6s | 20s+ |
| **Input type** | Text-to-video (t2v); i2v available via Veo 3.1 | Image-to-video | Image-to-video | Text-to-video |
| **Cost / 8s clip** | ~$6.00 (Replicate/Vertex standard) | ~$2.80 per 10s | ~$2.16 (8s at ~$0.27/s) | Not publicly available |
| **Content filter** | Strict (Google SafeSearch baked in) | Moderate | Lenient | Moderate |
| **Portrait 9:16** | Yes | No (landscape only in v2.1) | Yes | Varies |

**Choose Veo 3 when:**
- The scene needs real ambient sound (fire crackling, creek moving, street noise) and you want to skip a separate audio-layering step.
- You need portrait 9:16 for Reels/TikTok with convincing ambient atmosphere.
- The prompt is purely descriptive text — you have no source image to drive from.
- Audio hallucination prevention is important (Veo 3's audio follows explicit prompting more reliably than post-layered loops).

**Choose Kling v2.1 Master instead when:**
- You have a listing hero photo and need camera movement tied to a specific start frame.
- Fabric, water, foliage physics must look real.
- Audio can be handled by our Remotion ambient-sound layer or ElevenLabs VO.

**Choose Hailuo 02 instead when:**
- Humans are in frame (agent walk-and-talk, couple on patio) — face consistency and body motion are Hailuo's strengths.

**Choose Seedance 1 Pro instead when:**
- Budget is tight and you need volume b-roll — 10× cheaper than Veo 3 at ~$0.10/s.

---

## Auth + endpoint (verified 2026-05-06)

### Replicate gateway

**Model slugs (use these exact strings):**
- `google/veo-3` — the full-quality model with audio, GA
- `google/veo-3-fast` — lower cost, slightly reduced fidelity, GA
- `google/veo-3.1` — successor; adds i2v (up to 3 reference images), improved prompt adherence, portrait 9:16; same audio capability

**Base endpoint:**
```
POST https://api.replicate.com/v1/predictions
```

**Auth header (required on every call):**
```
Authorization: Bearer $REPLICATE_API_TOKEN
```
Env var already in `.env.local`: `REPLICATE_API_TOKEN` ✅ (verified active 2026-04-27).

**Async pattern — create then poll:**
```python
import os, time, requests

REPLICATE_API_TOKEN = os.environ["REPLICATE_API_TOKEN"]
HEADERS = {
    "Authorization": f"Bearer {REPLICATE_API_TOKEN}",
    "Content-Type": "application/json",
}

# 1. Create prediction
resp = requests.post(
    "https://api.replicate.com/v1/predictions",
    headers=HEADERS,
    json={
        "model": "google/veo-3",
        "input": {
            "prompt": "YOUR_PROMPT",
            "aspect_ratio": "9:16",
            "duration": 8,
        },
    },
)
prediction = resp.json()
prediction_id = prediction["id"]

# 2. Poll until done (Veo 3 typically 90–180s)
while True:
    result = requests.get(
        f"https://api.replicate.com/v1/predictions/{prediction_id}",
        headers=HEADERS,
    ).json()
    if result["status"] in ("succeeded", "failed", "canceled"):
        break
    time.sleep(8)   # Veo is slow — don't hammer at 1s

output_url = result["output"]   # HTTPS URL to the generated MP4
```

**Webhook alternative (preferred for production):**  
Pass `"webhook": "https://ryan-realty.com/api/webhooks/replicate"` in the create payload. Replicate will POST the completed prediction to that route. Our route already exists at `app/actions/broker-headshot.ts` as a reference pattern.

**Status values:** `starting` → `processing` → `succeeded` / `failed` / `canceled`

**Output:** HTTPS URL to an MP4 file (expires after ~1 hour — download and store immediately).

### Vertex AI direct (alternative path)

```
POST https://aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/veo-3.0-generate-001:predictLongRunning
```

Model IDs: `veo-3.0-generate-001`, `veo-3.1-generate-001`, `veo-3.1-fast-generate-001`  
Auth: Google Cloud OAuth 2.0 (requires `GOOGLE_APPLICATION_CREDENTIALS` service account — already in the project via Google Cloud integration).

---

## Pricing (verified 2026-05-06)

All figures are per **second of output video** generated.

| Provider | Veo 3 (standard + audio) | Veo 3 Fast | Veo 3.1 | Veo 3.1 Fast |
|---|---|---|---|---|
| **Replicate** | $0.75/s → **$6.00 per 8s clip** | Not hosted | $0.40/s → $3.20/8s | $0.10/s → $0.80/8s |
| **Vertex AI direct** | $0.75/s (audio) / $0.50/s (video-only) | $0.15/s | $0.40/s | $0.10/s |
| **OpenRouter** | — | — | $0.40/s | — |
| **Kie.ai (3rd-party)** | $0.05/s Fast / $0.25/s Quality | — | — | — |

**Key conclusion: Vertex AI direct is NOT cheaper for Veo 3 standard.** Both Replicate and Vertex charge $0.75/s for Veo 3 + audio. Vertex is slightly cheaper for video-only ($0.50 vs $0.75), but since audio is the reason to use Veo 3, the gateway markup is zero for the primary use case.

**Vertex direct has one real advantage:** if you're using the Gemini API path (not Vertex aiplatform), Veo 2 costs $0.35/s vs $0.50/s — 30% cheaper. For Veo 3 that delta does not exist.

**Cost model for Ryan Realty builds:**
- 1 hook clip (8s, Veo 3 + audio): **$6.00**
- 1 hook clip (8s, Veo 3 Fast): **~$1.25** (5s equivalent from API_INVENTORY)
- 1 market-report b-roll batch (5 × 8s clips, Veo 3 Fast): **~$6.25**
- Use Seedance 1 Pro ($0.10/s) for fill shots and keep Veo 3 for audio-critical hero beats

**Volume note:** $300 in free Google Cloud credits translates to ~600s of Veo 3 generation (~75 × 8s clips).

---

## Optimal parameters for real-estate hooks/openings

### Aspect ratio
- Always `"aspect_ratio": "9:16"` for Reels/TikTok/Shorts hooks.
- `"16:9"` only for YouTube pre-roll or email hero B-roll.

### Duration
- `4` — use for single-scene cutaways; aggressive cost control.
- `6` — hook + one environmental detail reveal; the sweet spot for most hooks.
- `8` — full hook beat: establishing → detail → audio payoff. Default for any clip that leads a video.

### Audio control
Audio is **not a boolean flag** — it is controlled entirely through prompt language.

To **enable specific audio:** describe it explicitly in the prompt (see template below).  
To **suppress audio:** end prompt with `"Ambient noise: silence. No music. No sound effects."` — this reduces but does not guarantee muting; if you need true no-audio output, render with audio and strip in ffmpeg post.

**No subtitles/captions from the model:** append `"No subtitles, no on-screen text, no captions."` to every prompt. Veo will sometimes generate burned-in dialogue captions otherwise.

### Negative prompt
The `negativePrompt` parameter IS supported at the Vertex AI level. On Replicate, pass as `"negative_prompt"` in the input object.

**Standard real-estate negative prompt:**
```
shaky camera, motion blur, watermark, logo overlay, text overlay, subtitles, 
blurry, overexposed, underexposed, lens flare, vignette, artificial bokeh,
CGI render, 3D animation, cartoon, distorted faces, duplicate people
```

Do NOT add "stunning" or design aesthetic words to negative prompts — the content filter and prompt adherence handle those. Keep negative prompts strictly about technical artifacts.

### Enhance prompt
Vertex AI exposes `enhance_prompt` (boolean, default `true`) which rewrites your prompt via a Gemini rewriter before sending. For precision real-estate prompts with specific address/location data, set `"enhance_prompt": false` — the rewriter tends to genericize place names.

### Seed
Pass `"seed": <integer>` for reproducible variations. Useful for A/B testing the same scene with different audio or camera moves without regenerating from scratch.

---

## Prompt template

```
[SHOT TYPE + CAMERA POSITION (thats where the camera is)]. [SUBJECT + PHYSICAL DETAIL]. 
[SETTING: LOCATION, TIME OF DAY, WEATHER]. [CAMERA MOVEMENT: direction + speed].
[LIGHTING: source, quality, color temperature]. [ACTION: what moves and how].
Ambient noise: [2-3 specific environmental sounds]. SFX: [triggered sounds on cut].
Music: [mood, instrumentation, duck under dialogue]. No subtitles, no on-screen text.
```

**Rules:**
1. Always include `(thats where the camera is)` after the camera position — this phrase significantly improves spatial coherence in community tests.
2. Name audio cues explicitly — open-ended ambience (e.g., "cozy sounds") causes hallucination; `"steady creek flow 10 feet camera-left, wind through pine needles, no music"` does not.
3. Keep dialogue under 6 words if used — Veo 3's lip-sync degrades at longer phrases.
4. Limit concurrent audio layers to 3 — ambient + SFX + music or ambient + dialogue + one SFX.
5. No banned words: not stunning, nestled, charming, luxurious, pristine, breathtaking.

---

## 5 worked real-estate examples

### 1. 5s hook: Tumalo Reservoir lakefront opening — $1.2M listing

```
Slow push-in from wide to medium, camera at dock level pointing toward 
the shoreline house (thats where the camera is). A waterfront home sits 
300 feet away — cedar siding, floor-to-ceiling windows, two-car garage 
flush with the waterline. Tumalo Reservoir at golden hour, high desert 
sun dropping behind the Sisters. Light reflects off flat water in 
horizontal bands. Ambient noise: light ripple against dock pilings, 
one distant Canada goose call, no wind. No music. No subtitles, 
no on-screen text.
```

Duration: 6s | Aspect: 9:16 | Negative: shaky camera, watermark, CGI, subtitles

### 2. Market data hook: Bend median up 8% YoY

```
Extreme close-up of a real estate sign staked in dry grass, camera 
positioned at sign-base level (thats where the camera is). The sign 
is generic "SOLD" — red lettering, white background. Slow crane-up 
from sign base to reveal the skyline of downtown Bend behind it, 
Pilot Butte visible in the far right. Bright noon light, no clouds, 
high desert haze. Ambient noise: light traffic hum four blocks away, 
one car door closing mid-clip, complete silence on the crane-up apex. 
No music. No subtitles, no on-screen text.
```

Duration: 8s | Aspect: 9:16 | Note: No data numbers in the Veo prompt — numbers render as Remotion overlays on top of this clip in the final comp.

### 3. Lifestyle vignette: family at dusk, Cascades backdrop

```
Medium shot, camera positioned at patio table height behind the family 
(thats where the camera is). A family of four — two adults, two kids 
under 10 — sits on a modern concrete patio facing the Cascade Range. 
The Three Sisters are visible in the distance, alpenglow orange and pink 
on the summits. Parents hold wine glasses; kids lean against the railing. 
Late evening, 8:45 PM high desert, no direct sun. Slow push-in toward 
the mountains over 6 seconds. Ambient noise: very faint breeze, child 
laughing once at 2 seconds, silence afterward. No music. 
No subtitles, no on-screen text.
```

Duration: 8s | Aspect: 9:16 | Negative: CGI, overexposed sky, blurry faces

### 4. AI disclosure viz: stylized abstract for AI-generated content

```
Slow zoom-in on a single glowing data node in a dark three-dimensional 
lattice, camera positioned at mid-lattice looking across the plane 
(thats where the camera is). The lattice is deep navy with fine gold 
connecting lines that pulse with soft light. No faces, no text, no 
logos. The single node brightens from dim to full glow over 6 seconds. 
Background transitions from black to dark navy. Ambient noise: very 
low digital pulse, sub-bass tone, no music. No dialogue. No subtitles, 
no on-screen text.
```

Duration: 6s | Aspect: 9:16 | Note: Used as disclosure-beat underlay — Remotion renders "AI-generated" pill on top. Audio suppresses naturally for VO mixing.

### 5. Earth-zoom-style: orbital descent to Bend, OR

```
Aerial tracking shot starting at 3,000 feet altitude looking down 
at the high desert, camera above and angled 30 degrees toward ground 
(thats where the camera is). The Deschutes River glints silver in the 
frame lower-left. Downtown Bend visible at center — the Old Mill District 
grid and Mirror Pond clearly legible. Slow continuous descent toward the 
city at 150 feet per second apparent speed. Golden hour, shadows 
long from the west, Pilot Butte landmark visible center-right. 
Ambient noise: high-altitude wind at start, softening to urban low hum 
at 6 seconds as altitude drops. No music. No subtitles, no on-screen text.
```

Duration: 8s | Aspect: 9:16 | Note: Competes with the Earth Studio pipeline by generating organic aerial motion instead of satellite-imagery fly-over. Pixel resolution is lower but organic motion and ambient audio are stronger. Use Veo for social; Earth Studio for websites where quality bar is higher.

---

## Common failure modes + fixes

| Failure | Symptom | Fix |
|---|---|---|
| **Audio doesn't match scene** | Music overrides ambient sound; generic "cinematic" score appears | Add explicit `"Music: none"` and enumerate the exact environmental sounds |
| **Dialogue captions burned in** | Subtitle text appears on the video frame | Append `"No subtitles, no on-screen text, no captions."` to prompt |
| **Camera position wrong** | Wide shot when close-up requested | Add `"(thats where the camera is)"` immediately after the camera position description |
| **Generic/hallucinated environment** | Cascades look like Alps; high desert looks like tropics** | Name specific Oregon landmarks: Sisters, Pilot Butte, Deschutes River, Mirror Pond, Old Mill |
| **Rendering artifacts at edges** | Flickering pixels, vignette crawl, edge distortion | Add `"no vignette, no lens distortion, no chromatic aberration"` to negative prompt |
| **Content filter rejection** | Replicate returns `"failed"` with policy message | Remove superlatives, property pricing, and any reference to financial value from the prompt — Veo's SafeSearch is aggressive on these |
| **Audio hallucination: wrong sounds** | Unexpected music, voices, crowd noise in empty scene | Specify 3 exact environmental sounds + `"no other ambient sound"` — specificity prevents the model filling gaps |
| **Audio drops at 6s mark** | Clip goes silent in the last 2 seconds | Describe audio as a sustained bed, not an event: `"steady creek flow throughout"` not `"creek sound"` |
| **SynthID watermark concerns** | All Veo outputs carry invisible SynthID; visible watermark if wrong access tier | Not removable — SynthID is forensic/invisible on direct API output; no visible frame watermark on Replicate/Vertex API. Do not use outputs from consumer-tier Google AI Studio which may show visible watermarks. |
| **60-90s generation time** | Integration appears to hang | Expected — Veo 3 standard takes 60–180s. Do NOT poll at < 8s intervals. Use webhook pattern for production. |

---

## Output format

- Container: MP4
- Resolution: 720p or 1080p (1080p is default on Replicate; Vertex allows selection)
- Frame rate: 24 FPS
- Audio: AAC stereo, baked in
- Duration: 4, 6, or 8 seconds (selected via `duration` parameter)
- Delivery: HTTPS URL (Replicate) or GCS URI (Vertex) — download immediately, URLs expire

**Post-processing note:** Veo output is a self-contained MP4 with stereo audio. To composite with ElevenLabs VO or Remotion overlays:
```bash
ffmpeg -i veo_output.mp4 -i elevenlabs_vo.mp3 \
  -filter_complex "[0:a]volume=0.2[ambient];[1:a]volume=1.0[vo];[ambient][vo]amix=inputs=2:duration=first[mix]" \
  -map 0:v -map "[mix]" -c:v copy -c:a aac composited.mp4
```
This ducks the Veo ambient audio to 20% and layers the VO at full level.

---

## Fallback (Kling i2v or Hailuo if Veo 3 down)

| Scenario | Fallback strategy |
|---|---|
| **Veo 3 content filter blocks prompt** | Rephrase to remove financial references; if still blocked, fall back to Kling v2.1 (`kwaivgi/kling-v2.1-master`) with source image + separate Remotion ambient-sound layer |
| **Veo 3 generation fails (5xx)** | Retry once at 30s; if failed, use Seedance 1 Pro (`bytedance/seedance-1-pro`) for the clip + manually source or generate ambient audio via ElevenLabs sound-effects endpoint |
| **Veo down entirely** | Human-motion clips → Hailuo 02 (`minimax/hailuo-02`); architectural/property clips → Kling v2.1 Master. Both require post-audio layering. |
| **Budget constraint: Veo 3 too expensive for batch** | Use Veo 3 Fast (`google/veo-3-fast`, ~$1.25/5s) for batch b-roll; reserve Veo 3 standard only for the hero hook clip where audio sync matters most |
| **Portrait 9:16 + audio required but Veo down** | Hailuo 02 supports portrait; add ambient loop via `scripts/mix_news_audio.sh` as fallback audio layer |

---

*Sources (verified 2026-05-06):*
- *replicate.com/google/veo-3 and replicate.com/google/veo-3.1*
- *docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-0-generate*
- *docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate*
- *cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1*
- *costgoat.com/pricing/google-veo (Veo pricing calculator, May 2026)*
- *openrouter.ai/google/veo-3.1 (pricing data point)*
- *kie.ai/v3-api-pricing (cross-provider comparison table)*
- *github.com/snubroot/Veo-3-Prompting-Guide (community-tested prompt patterns)*
- *skywork.ai/blog/how-to-audio-aware-prompting-veo-3-1-guide (audio prompting spec)*
- *adam.holter.com — Veo 3 GA pricing confirmation*
- *API_INVENTORY.md (existing slugs and cost estimates verified 2026-04-27)*
