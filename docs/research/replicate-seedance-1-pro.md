# Tool: Replicate / Seedance 1 Pro

## What it does
ByteDance's flagship i2v model — responds reliably to named camera-move tokens (dolly, orbit, push, lift, crane) and holds cinematic motion across 5s and 10s clips at up to 1080p.

---

## When to choose Seedance (vs Kling, Hailuo, Wan)

**Choose Seedance when:**
- The shot requires a named camera move and you need it executed accurately. Seedance honors dolly, orbit, push, pull, lift, lower, pan, follow, and crane at a higher hit-rate than Kling for multi-subject or architecture-scale prompts.
- Budget is a constraint. At ~$0.74/run on Replicate (1080p, standard Pro), Seedance 1 Pro is roughly half the cost of Kling 2.1 Master for equivalent-length clips.
- You need portrait 9:16 output for social-first cuts. Seedance handles aspect-ratio switching cleanly.
- The source photo has strong spatial depth (exterior, wide interior, landscape) — Seedance reads depth cues and uses them to guide dolly and push motion rather than generating flat zoom simulation.

**Choose Kling v2.1 Master when:**
- Single-subject micro-expression or subtle human motion (hair sway, weight shift, facial emotion) is the shot goal. Kling has a meaningful edge there.
- You need AI-generated video (t2v) from scratch with no source photo — Kling's t2v coherence is tighter for lifestyle/atmospheric content.

**Choose Hailuo 02 when:**
- You need longer clip duration (6–10s) at lowest cost and camera control is not critical.

**Choose Wan 2.5 i2v when:**
- Open-source / self-hosted deployment matters, or the shot is a static-to-subtle-motion cinemagraph where Wan's conservative motion is an asset.

---

## Auth + endpoint (verified 2026-05-06)

**Model slug:** `bytedance/seedance-1-pro`
**Fast variant slug:** `bytedance/seedance-1-pro-fast`

```python
import replicate

output = replicate.run(
    "bytedance/seedance-1-pro",
    input={
        "prompt": "Slow dolly push-in toward the great room, eye level, warm afternoon light",
        "image": open("listing_photo.jpg", "rb"),
        "duration": 5,
        "resolution": "1080p",
        "aspect_ratio": "9:16",
        "seed": 42
    }
)
```

Auth: `REPLICATE_API_TOKEN` in `.env.local`. All Replicate calls go through the existing `replicate` npm/Python package already in the repo.

---

## Pricing (verified 2026-05-06)

Replicate bills per-run (GPU-second). Figures based on confirmed community benchmarks as of May 2026:

| Variant | Duration | Resolution | Cost/run (approx.) |
|---------|----------|------------|---------------------|
| Seedance 1 Pro | 5s | 1080p | ~$0.74 |
| Seedance 1 Pro | 5s | 480p | ~$0.30 |
| Seedance 1 Pro | 10s | 1080p | ~$1.40–$1.50 |
| Seedance 1 Pro Fast | 5s | 1080p | ~$0.30 (60% lower than Pro) |
| Seedance 1 Pro Fast | 5s | 480p | ~$0.12 |

**Rule of thumb:** token cost = `(height × width × fps × duration) / 1024`. A 1080p 5s clip at 30fps ≈ 300k tokens ≈ $0.74 on Replicate markup.

**Pro vs Fast tradeoff:** Fast delivers 30–60% faster inference at 60% lower cost. Use Fast for motion tests and drafts; use Pro for the final render that goes to `public/v5_library/`.

No free tier. No Lite or Mini on Replicate (those tiers exist on BytePlus/Volcengine direct, not Replicate).

---

## Optimal parameters for real estate

```python
{
    "duration": 5,           # 5s for beat-length clips; 10s for full-room reveals
    "resolution": "1080p",   # Required for publish; use 480p for motion tests
    "aspect_ratio": "9:16",  # Portrait for Reels/TikTok/Shorts
    "seed": 42,              # Pin seed once you find a good motion; vary for alternates
    # No camera_fixed flag on this model — camera behavior is prompt-driven
}
```

**Notes:**
- There is no `camera_fixed` boolean parameter on Seedance 1 Pro (unlike some Hailuo configs). Camera behavior is entirely controlled via prompt language. To lock the camera, say "static locked-off shot" in the prompt.
- 9:16 aspect ratio is natively supported — do not crop from 16:9.
- 480p is acceptable for storyboard/motion-test passes but never for final publish renders.
- FPS output is 30fps at both durations.

---

## Prompt template (camera-direction language)

**Structure:** `[Shot type + angle] + [Camera move + speed + direction] + [Subject/space] + [Lighting + time of day] + [Motion in scene if any]`

**Camera tokens confirmed to work:**

| Token | Effect |
|-------|--------|
| `slow dolly push-in` | Camera advances forward at measured pace |
| `dolly pull-back` | Reveals context as camera retreats |
| `slow orbit` / `orbital track` | Circles the subject; great for exteriors |
| `crane shot` | Starts low, rises; reveals roofline or landscape |
| `tilt up` / `lift` | Camera rises in place, reveals vertical scale |
| `tilt down` / `lower` | Downward reveal; useful for entry/driveway |
| `pan left` / `pan right` | Lateral sweep; good for great rooms |
| `follow` | Tracks moving subject (water, smoke, curtain) |
| `static locked-off shot` | Locks camera; natural motion in scene only |
| `handheld` | Adds subtle shake; avoid for luxury listings |

**Tokens that get ignored or degraded:**
- Overly technical cinematography jargon without spatial reference ("rack focus to 85mm" — focal length numbers are ignored)
- Compound moves in a single clause ("push-in while orbiting left and tilting up") — pick one primary move per clip
- "Zoom" alone — use "dolly push-in" for forward motion; "zoom" sometimes produces digital zoom artifact

**Base template:**
```
[Shot size — establishing/medium/close]. [Camera move] [direction/target], [speed adjective]. [Subject description + location]. [Lighting]. [Secondary motion in scene if any].
```

---

## 5 worked real-estate examples

### 1. Cinematic dolly forward into great room — $850K listing

```
Establishing shot. Slow dolly push-in from the entryway threshold toward the great room, eye level, steady pace. Warm afternoon light through west-facing windows, wood floors, cathedral ceiling. Dust motes visible in light shafts.
```

**Beat use:** Opening hook beat, 5s. Establishes interior scale immediately.

---

### 2. Slow orbit around exterior — lakefront luxury home

```
Wide shot. Slow orbital track counterclockwise around the home, starting at the driveway corner, ending at the dock. Late golden hour, long shadows across the lawn. Mountain reflection visible in still water.
```

**Beat use:** 5s exterior beat at 25% mark. Strong pattern interrupt from interior sequence.

---

### 3. Vertical reveal — tilt up from foundation to roofline

```
Low-angle shot. Camera lifts slowly from ground level at the front foundation, tilting up to reveal the full facade and roofline. Overcast soft light. Cedar siding, black window trim, mature Ponderosa pines framing both sides.
```

**Beat use:** 5s, works as a second exterior beat or transition out of aerial. Emphasizes architectural height.

---

### 4. Push-in on architectural detail — kitchen island

```
Medium close shot. Slow dolly push-in toward the waterfall edge of the quartz island. Warm under-cabinet lighting, pendant lights out of focus in background. No people. No motion in scene.
```

**Beat use:** 5s detail beat. Stops motion for a visual breath before a fast-cut sequence. Works at the 50% mark pattern interrupt.

---

### 5. Rack focus effect — foreground tree to home in background

```
Medium shot from across the front yard. Camera static locked-off. Natural depth shift: sharp Ponderosa pine trunk in foreground gradually loses focus as attention draws to the home facade in background, lit by morning sun. No camera movement — depth separation carries the motion.
```

**Beat use:** 5s. Seedance holds static well when scene content provides movement interest. "Rack focus" in the prompt is hit-or-miss; describing the depth relationship directly is more reliable.

---

## Common failure modes

**1. Camera language ignored on complex compound moves.**
Seedance picks one dominant move from a multi-verb prompt and drops the rest. Fix: one primary camera verb per clip. Use successive clips for compound sequences.

**2. Motion drift on 10s clips.**
Longer clips sometimes let the subject drift from its original position — walls shift slightly, proportions change. Worse with exterior wide shots. Fix: keep architectural anchor language in the prompt ("camera moves, building stays fixed in frame") or use 5s clips and cut between them.

**3. Scene change artifacts at clip boundaries.**
When the generated motion doesn't fill the full duration, Seedance sometimes cuts to a different scene or adds a hard dissolve mid-clip. More common at 10s. Fix: ensure the described motion has enough spatial range to fill the duration ("slow orbit, full 90 degrees").

**4. Generic bokeh blur instead of named camera move.**
On vague prompts ("cinematic shot of the living room"), Seedance defaults to a slow zoom with heavy background blur rather than executing a specific move. Fix: always name the camera move explicitly using the token list above.

**5. Lighting changes mid-clip.**
Seedance occasionally shifts exposure or color temperature partway through — especially with "golden hour" prompts. Fix: pin the light direction ("west-facing, light from camera-left") rather than time-of-day shorthand alone.

---

## Output format

- Container: MP4
- Codec: H.264
- Resolution: 1920×1080 (1080p) or 854×480 (480p)
- Frame rate: 30fps
- Duration: exactly 5s or 10s
- Audio: none (silent; mix VO + music in post via ffmpeg)
- Aspect ratio: 9:16 delivered natively when specified — no crop needed

---

## Fallback

If `bytedance/seedance-1-pro` is unavailable or returns errors on Replicate:

1. **First fallback:** `bytedance/seedance-1-pro-fast` — same model family, faster, 60% cheaper, slightly softer motion at 480p. Acceptable for draft passes; fine for 1080p if motion is non-complex.
2. **Second fallback:** Kling v2.1 via Replicate (`kwai-kolors/kolors-video`) — stronger single-subject motion, ~2× cost. Camera language is less literal but reliable for dolly and orbit.
3. **Third fallback:** Wan 2.5 i2v via Replicate — conservative motion, lowest cost, good for cinemagraph-style static-to-subtle-motion beats. Not suited for active camera moves.

---

*Verified: 2026-05-06. Sources: Replicate model pages, Eachlabs parameter docs, Akool cost guide, Argil.ai benchmark, Atlabs prompting guide, JoyPix prompt guide, Atlas Cloud comparison.*
