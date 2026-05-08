# Production Pipeline — Earnest.

The reproducible end-to-end workflow for producing an Earnest. episode. Built around the 2026 AI cinema community's converged stack (Higgsfield + Krea + Veo 3.1 + Hedra + ElevenLabs + Hume Octave + DaVinci Resolve), not the Ryan Realty market-report stack.

Reference operation to study and emulate: **Neural Viz** (Josh Wallace Kerrigan, the Monoverse). Sustained serialized AI drama, ~12 hours per 2-3 minute episode, ~$100/month software subscriptions, Patreon-monetized at 408 paid members. Closest possible analogue to what Earnest. is trying to build.

## Tool Stack (locked)

| Stage | Primary | Backup | Monthly cost |
|---|---|---|---|
| Script / dialogue | Claude Opus 4.7 (this agent) | ChatGPT, Grok | $0 (existing) |
| Orchestration / multi-shot direction | **Higgsfield Cinema Studio 3.5** (Plus tier) | Krea AI | $39 |
| Character DNA / consistency | **Higgsfield Soul 2.0** + Flux 2 Pro LoRA per character | ComfyUI PuLID-Flux II | (in Higgsfield) |
| Look development / aesthetic lock | **Krea AI Pro** with FLUX Krea Dev | Midjourney v8 | $35 |
| Image-to-video, hero shots with dialogue | **Google Veo 3.1** (via Vertex AI, $0.75/sec with audio) | Kling 3.0, Hailuo 2.3 | usage |
| Image-to-video, B-roll without dialogue | Veo 3.1 Fast ($0.10/sec, no audio) | Kling 3.0 | usage |
| Lip-sync close-ups | **Hedra Character-3** ($0.05/min) | Runway Act-Two | $30 |
| Polish / relight | **Magnific Relight + Upscaler** (via Freepik) | Topaz Astra 2 alone | $25 |
| Final upscale to 4K | **Topaz Astra 2** | Magnific Upscaler | $25 |
| Voiceover — The Voice (Narrator) | **Hume Octave 2** Voice Design (custom voice ID) | (no alternate; locked) | $30 |
| Voiceover — character cast (15+) | **ElevenLabs Eleven v3** (Pro tier) Voice Library + Studio 3.0 | Hume Octave for emotion pickups | $99 |
| Caption forced alignment | ElevenLabs `/v1/forced-alignment` (cast lines) + WhisperX (Hume lines) | (no alternate) | (in ElevenLabs) |
| Music score | **Suno v5.5** (Pro plan) | Udio | $10 |
| Sound design / SFX | ElevenLabs Sound Effects v2 | (in ElevenLabs) | (in ElevenLabs) |
| Editor / final assembly | **DaVinci Resolve 19** (free tier) | CapCut | $0 |

**Total monthly: ~$293 base** (Higgsfield $39 + Krea $35 + Magnific $25 + Topaz amortized $25 + Hedra $30 + Hume $30 + ElevenLabs Pro $99 + Suno $10). Plus per-episode usage (~$80 in Veo charges per episode).

Compare to the market-report stack we use for Ryan Realty corporate (~$100/month): Earnest. lives in a different operational tier because it's a different category of work.

## Master Character Reference Set (build ONCE, week 0)

Generate each cast member in **Higgsfield Soul 2.0** with 20+ reference photos. Train a Flux 2 Pro LoRA per character on top (60-90 minutes per character, ~$3-10 each on fal.ai). Lock the Soul ID + LoRA reference. Catalog in `data/asset-library/manifest.json` per `video_production_skills/asset-library/SKILL.md`.

The aesthetic for Season 1 is **claymation** — Aardman / Wallace & Gromit lineage, hyperreal plasticine texture, fingerprint imperfections, soft sub-surface scattering. Chosen because:
- Claymation expects visible imperfections (fingerprints, slight color shifts shot-to-shot), which matches AI's natural output drift instead of fighting it.
- Emotional range is high (clay faces communicate grief, restraint, weariness in ways Lego cannot).
- Differentiates from the Iran Lego propaganda visual register (Earnest. should not read as related to that aesthetic).
- The texture catches the Ink-Bone-Bruise-Ember palette beautifully (warm clays against cool ground).

(If Season 1 is rejected on the claymation choice, alternatives in priority order: Lego, paper craft / origami, felt / yarn puppet, Aardman-adjacent stop-motion. Lock at production start, never mid-season.)

### Master prompts for the Season 1 cast

The character master prompts use claymation aesthetic descriptors throughout. Each character has a costume design that belongs to their archetype, not to the Ryan Realty visual identity (no navy suits, no gold, no cream — these are Earnest. characters in Earnest. clothes).

> **Linda.** "Claymation plasticine sculpture of a woman in her late sixties. Gentle face with soft wrinkles around the eyes. Silver-streaked brown hair pulled back loosely. Wearing a faded green wool cardigan over an off-white blouse. Holding a clay coffee cup with both hands. Slight worried smile. Soft kitchen window light from camera-left. Hyperreal plasticine texture with visible fingerprint imperfections. Sub-surface scattering on the clay. Shallow depth of field. 35mm anamorphic. Aardman / Wallace & Gromit reference. --ar 9:16 --style raw --v 8"

> **Maya Tomlinson.** "Claymation plasticine sculpture of a woman in her mid-thirties. Dark brown hair in a low bun. Charcoal blouse and slim olive slacks. Holding a clay folder with papers visible. Focused analytical expression with one eyebrow slightly raised. Even daylight from a coffee-shop window. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Daniel Tomlinson.** "Claymation plasticine sculpture of a man in his mid-thirties. Sandy brown tousled hair. Burgundy henley over jeans. Holding a clay phone up to take a photo of a ceiling. Easy warm smile. Golden-hour interior light. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Carlos Garcia.** "Claymation plasticine sculpture of a man in his late twenties. Short black hair. Round glasses. Olive work shirt. Holding a clay clipboard with a thick stack of papers. Serious focused expression. Even daylight. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Sofia Garcia.** "Claymation plasticine sculpture of a woman in her late twenties. Dark wavy hair to shoulders. Rust-colored sweater. Holding a clay mug with steam rising. Calm steady smile, eyes on someone off-frame. Soft daylight. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Diana (sibling).** "Claymation plasticine sculpture of a woman in her early fifties. Gray-streaked hair in a ponytail. Wearing an oversized faded plaid shirt and jeans. Holding a clay binder. Tired determined expression. Dim garage light from above. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Frank (sibling).** "Claymation plasticine sculpture of a man in his late forties. Neat short hair. Maroon polo shirt and chinos. Holding a clay phone showing a real-estate listing. Impatient checking-watch posture. Daylight. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Tom (sibling).** "Claymation plasticine sculpture of a man in his late forties. Scruffy beard. Plain dark t-shirt. Hands in pockets. Deferential watching posture. Soft kitchen light. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Karen Cassidy.** "Claymation plasticine sculpture of a woman in her mid-forties. Blonde shoulder-length hair. Forest-green sweater. Holding a clay pen poised over a clay document. Composed but tight expression. Fluorescent overhead light. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Mark Cassidy.** "Claymation plasticine sculpture of a man in his mid-forties. Neat dark hair. Plain button-down shirt. Holding a clay pen. Deliberately neutral expression. Same fluorescent overhead light as Karen. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Priya Patel.** "Claymation plasticine sculpture of a woman in her late thirties. Long dark hair. Burnt-orange travel jacket. Holding a clay phone with a Pinterest board visible. Hopeful animated expression. Sunny outdoor light. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Anand Patel.** "Claymation plasticine sculpture of a man in his late thirties. Short dark hair. Casual zip jacket. Holding a clay coffee mug with an Astros logo. Polite reserved expression. Same sunny outdoor light as Priya. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Jordan (inspector).** "Claymation plasticine sculpture of a man in his fifties. Weathered face. Hard hat. Hi-vis vest over a plaid flannel. Holding a clay clipboard and a clay flashlight. Dry deadpan expression. Dramatic crawlspace under-lighting from below. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

> **Marisol (lender).** "Claymation plasticine sculpture of a woman in her forties. Dark hair in a sleek bob. Charcoal blazer over a deep-rust blouse. Holding a clay yellow legal pad and pen. Patient direct expression. Even office lighting. Hyperreal plasticine texture. Aardman style. --ar 9:16 --style raw --v 8"

For each character: lock the Soul ID URL and the LoRA reference. Catalog in `data/asset-library/manifest.json`. Every subsequent shot of that character starts from this still.

### Master prompts for recurring locations (Season 1)

> **Linda's house — exterior.** "Claymation plasticine diorama of a 1980s Bend Oregon ranch home. Three-bedroom. Brick chimney. Mature pine trees. Snow-capped Cascades visible in background. Golden-hour light. Hyperreal clay brick texture. Low angle hero shot. Aardman style. --ar 9:16"

> **Linda's house — kitchen.** "Claymation plasticine diorama interior. Warm ranch kitchen. Oak cabinets. Granite counter with a single clay coffee cup and a pair of clay reading glasses. Kitchen window with morning light. Family photos on the windowsill. Hyperreal plasticine texture. Soft 35mm anamorphic. Aardman style. --ar 9:16"

> **Linda's house — son's bedroom (empty).** "Claymation plasticine diorama interior of a teenage boy's bedroom. Walls bare of posters but slightly lighter rectangles where posters used to be. Twin bed stripped to mattress. Single dust line on a shelf where a picture frame stood. Dim afternoon light through partly drawn curtains. Hyperreal plasticine texture. Melancholic interior cinematography. Aardman style. --ar 9:16"

> **Linda's house — Ray's office (closed door).** "Claymation plasticine diorama of a closed door at the end of a hallway. Slightly ajar by one centimeter. Dim hallway light. Framed family photo on the wall beside the door. Hyperreal plasticine texture. Aardman style. --ar 9:16"

> **The Tomlinson bungalow.** "Claymation plasticine diorama of a 1920s Bend bungalow. Front porch with two rocking chairs. Big maple in the yard turning gold. Neighborhood with sidewalks and parked Subarus. Autumn afternoon light. Hyperreal plasticine texture. Aardman style. --ar 9:16"

> **The closing table.** "Claymation plasticine diorama of a small office conference room. Oval table with a stack of clay documents. Two clay pens. Two clay water bottles. Fluorescent overhead light. Beige walls with no decoration. Hyperreal plasticine texture. Aardman style. --ar 9:16"

> **The crawlspace (inspection).** "Claymation plasticine diorama interior under a clay house. Dirt floor. Clay pipes visible. Dramatic lighting from a single clay flashlight. Dust motes in the beam. Hyperreal plasticine texture. Low ground-level angle. Aardman style. --ar 9:16"

> **The open house.** "Claymation plasticine diorama of a Bend Oregon mid-century home set up for an open house. Balloon arch at the front door. Sign on the lawn (no readable text). Six clay figures arriving from clay cars. Warm Sunday afternoon light. Hyperreal plasticine texture. Aardman style. --ar 9:16"

> **The first showing (Patels).** "Claymation plasticine diorama of a Bend cul-de-sac. Snow-capped Cascades in background. A clay SUV pulling up. Two clay figures stepping out. Late autumn light. Hyperreal plasticine texture. Low hero angle. Aardman style. --ar 9:16"

## The Per-Episode Production Loop (one week, ~12 working hours)

Modeled on Neural Viz's documented cadence (12 hours per 2-3 minute episode). Earnest. episodes are 45-60 seconds, so the loop scales accordingly.

### Day 1 (Mon) — Script and audio prep (~2 hours)

- Open `SEASON_1_TREATMENTS.md` to the target episode.
- Confirm character bibles in `CHARACTER_BIBLE.md` are current.
- Draft the shot list (12-16 beats for 45-60s).
- Draft The Voice's narration script (max 20s total runtime).
- Render Voice MP3 through **Hume Octave 2** with the locked custom voice ID + per-line Acting Instructions.
- Render character dialogue through **ElevenLabs Eleven v3** Studio 3.0, using locked Voice IDs from `cast.json`. Audio tags inline (`[whispers]`, `[crying]`, `[sighs]`).
- Send all audio files through ElevenLabs `/v1/forced-alignment` (cast lines) + WhisperX (Voice lines) to generate per-word timestamp JSON.
- If the episode needs music: write the Suno prompt (see "Music Score Discipline" below). Generate. Pick keeper.

### Day 2 (Tue) — Hero stills in Higgsfield (~3 hours)

For each shot in the shot list:
- Open Higgsfield Cinema Studio 3.5.
- Pull the locked character Soul ID(s) for that shot.
- Pull the locked location Soul ID.
- Configure camera body (ARRI Alexa Mini for intimate scenes, RED Komodo for hero exteriors) + lens (35mm for medium, 85mm for portrait close-ups).
- Use Popcorn for multi-shot composition (storyboard the beat, see character placement, lighting).
- Generate 2-4 variants per shot. Pick best.
- Polish in Magnific Relight if any shot has lighting drift across the sequence.
- Catalog in the asset library.

Show Matt the still set before any video generation. Wait for explicit approval. (Draft-first rule.)

### Day 3 (Wed) — Veo 3.1 image-to-video (~3 hours)

For each approved still, write the Veo 3.1 prompt using the Google Cloud 5-part formula:

```
[Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]
```

Plus quoted dialogue when the shot has spoken lines. Veo 3.1 generates lip-synced mouth movement natively when the prompt contains a quoted string.

Example prompt:

> "Slow push-in dolly shot. Claymation Linda, late-sixties woman with silver-streaked hair pulled back, faded green cardigan, stands with one hand on the closed door at the end of a clay hallway. She does not turn the knob. She says, \"I haven't been in here.\" The door is slightly ajar by one centimeter. Dim afternoon light through a window down the hall. Hyperreal plasticine texture, sub-surface scattering, shallow depth of field, 35mm anamorphic, Aardman / Wallace & Gromit cinematic style. SFX: distant wind, faint clock tick."

Settings: 8s clip, 1080p, 9:16, with audio. Use the Higgsfield-approved still as the input image. Run 1-2 regenerations per shot. Budget ~96 paid seconds per episode = ~$72 in Veo charges.

For shots that need motion-heavy continuity (Linda walking down a hallway across two beats), use **Kling 3.0** with start+end frame control instead of Veo. Kling holds character identity better across longer takes.

### Day 4 (Thu) — Lip-sync rescue + audio polish (~1 hour)

For any hero close-up where Veo's native sync isn't tight to The Voice or character cadence, pipe the clip through **Hedra Character-3** with the Hume/ElevenLabs audio stem. ~$0.10/sec for Hedra. Most episodes need 0-2 rescue passes.

Run any Hume Octave Voice lines through WhisperX for forced alignment. Save JSON next to the MP3. Captions read from this file.

### Day 5 (Fri) — Edit, captions, final upscale, QA (~3 hours)

- Open **DaVinci Resolve** project from Earnest. template (when scaffolded). Free tier.
- Drop The Voice MP3 on timeline first. Drop the Suno score (if any) on a second audio track. Drop character dialogue stems on tracks 3+.
- Cut Veo clips to cadence. Standard beat 2-3s. No beat over 4s.
- Apply uniform color grade: LUT shifts the Aardman warm-clay palette toward Ink-Bone-Bruise-Ember discipline (slight desaturation, warm-shadow lift). Identical across every episode in the season.
- **Cold open:** render `<EarnestColdOpen />` Remotion component (when scaffolded) or insert pre-rendered MP4 (2.0s, Ink → horizon-mark draw → wordmark fade → piano note → cut).
- **Episode title card** at 50% mark: render `<EarnestTitleCard pullQuote="…" episodeTag="E01" />` (3.3s).
- **End card:** render `<EarnestEndCard />` (4.0s, Ink → wordmark + horizon → string drone → fade to black).
- **Captions:** Resolve caption track (or Remotion `<EarnestCaptionBand />`) reading from forced-alignment JSON. Full-sentence with active-word highlight (Ember scale 1.0→1.08 spring). Safe zone y 1480-1720, x 90-990. No overlap. Cross-fade between sentences (250ms).
- **Final upscale to 4K:** Topaz Astra 2 (purpose-built for AI-generated content, integrates with Resolve).
- Export H.264, 1080×1920, 30fps, target 25-50 MB.
- Run QA gate (see `EPISODE_ARCHITECTURE.md`).
- Score against `video_production_skills/VIRAL_GUARDRAILS.md`. Save `out/<episode-slug>/scorecard.json`.
- Save `out/<episode-slug>/citations.json` with every figure traced to a source.

### Day 5 (Fri) — Show Matt (~30 min)

- Drop the local MP4 path: `out/earnest_s1_e1_the_empty_room.mp4`.
- Include scorecard summary and citations summary.
- Wait for explicit approval. NO commit. NO push. NO copy to public path.
- On approval: copy to publish location, commit, push, queue distribution per `DISTRIBUTION.md`.

## Cinematography Library

Standard cinematic moves to call by name in Higgsfield prompts. Pick variety; never repeat the same move on consecutive beats.

- **Push-in dolly** — slow forward camera move on a static subject. Used for revelation, intimacy.
- **Push-counter** — slow backward camera move from tight to wide. Used for context reveal.
- **Slow pan** — horizontal camera move across a static scene. Used for survey, witness.
- **Multi-point pan** — camera moves between two or three subjects in one shot. Used for relationships in space.
- **Gimbal walk** — camera follows a moving subject. Used for momentum, anticipation.
- **Cinemagraph** — single static element with one moving sub-element (a curtain blowing, steam rising from coffee). Used for held emotion.
- **Parallax** — foreground and background move at different rates. Used for depth, dimension.
- **Rack focus** — focal plane shifts mid-shot. Used for revelation, attention shift.
- **Tilt** — vertical camera move. Used for scale, transition.
- **Dutch angle** — tilted frame. Used sparingly for unease (max once per episode).

Higgsfield Cinema Studio 3.5 lets you specify camera body (ARRI Alexa Mini, RED Komodo, Sony VENICE 2) and lens (35mm, 50mm, 85mm) explicitly. Lock these per episode and stay consistent within a beat.

## Music Score Discipline

Earnest. is not a Lego Movie. The score is sparse and atmospheric, more *The Leftovers* (Max Richter) than *Lego Movie 2*.

- Suno v5.5 prompt template: "Sparse atmospheric score. Single piano motif. Slow tempo 60-65 BPM. Warm minor key. Sustained low string drone underneath. No drums. No vocals. No melody hook. Reference: Max Richter Cantos, Olafur Arnalds, Nils Frahm Says. Length 60 seconds."
- Generate 4 variants. Pick the one with the most silence.
- Use the score as a bed under The Voice. Drop the score volume 12dB whenever The Voice speaks.
- Some episodes have NO score. Silence is a tool. Episode 1 ("The Empty Room") may run with only ambient SFX and Linda's footsteps, plus the cold-open piano note and end-card string drone from `BRAND_SYSTEM.md`.

## Cost Per Episode (variable usage on top of base subscriptions)

| Line item | Cost |
|---|---|
| Veo 3.1 (~96 paid seconds × $0.75) | $72.00 |
| Hedra Character-3 lip-sync rescue (avg 1 min) | $0.05 |
| Topaz Astra 2 4K upscale (per-render compute) | included |
| Magnific Relight (avg 4 shots polished) | $2.00 |
| ElevenLabs character VO (within Pro $99 cap) | included |
| Hume Octave Voice (within $30 budget) | included |
| Suno score | included |
| **Variable per episode** | **~$74** |

Plus base subscriptions ~$293/month covers all production capacity.

Season 1 (7 episodes): ~$520 in variable compute + ~$293 × 2 months base = ~$1,106 total. Plus one-time Season 1 setup (~$80 in LoRA training across 14 characters, ~$20 in location reference generation, ~$30 in cold-open / end-card asset rendering).

Reference baseline (Neural Viz): $100/month, ~12 hours per 2-3 minute episode. Earnest. operates at ~3× the Neural Viz tooling spend because we're using the orchestration layer (Higgsfield) and the polish layer (Magnific + Topaz) Neural Viz doesn't. The trade-off: lower per-episode labor (Higgsfield's Popcorn + Soul automate the multi-shot continuity work Neural Viz does manually).

## Backup Workflows

- **Higgsfield down or rate-limited.** Drop to Krea AI Pro for orchestration; lose the camera-body emulation; manual character continuity via Flux 2 LoRA.
- **Veo 3.1 unavailable.** Use Veo 3.1 Fast for B-roll; use Kling 3.0 with start+end frame for hero shots needing camera movement; lose native audio; mix audio in post.
- **Krea down.** Higgsfield's built-in image generation handles look-development at lower fidelity.
- **Hume Octave down.** The Voice's lines for that episode get held until Hume returns. Do not substitute another voice. Voice identity is the brand.
- **ElevenLabs down.** Cast lines hold; do not substitute. The Voice IDs are the cast bible.
- **Hedra down.** Skip the lip-sync rescue pass; Veo 3.1 native sync is acceptable for B-tier shots.
- **Topaz down.** Magnific Upscaler is the alternate.
- **DaVinci Resolve down.** CapCut is the alternate (mobile-friendly, free).

## Pre-Render Asset Audit (mandatory)

Before any render or Resolve export, verify:

- All character Soul IDs and LoRA references are accessible.
- All location Soul IDs are accessible.
- The Voice MP3 (Hume Octave) exists and is non-silent.
- All character dialogue MP3s (ElevenLabs) exist and pass voice-fingerprint check.
- All forced-alignment JSONs exist and contain entries for every spoken word.
- The Suno score (if used) exists and is the correct length.
- Inter Display, Inter, and Editorial New are loaded (in `public/fonts/` or via web font CDN for Resolve title rendering).
- The cold-open and end-card brand assets render correctly in 2-second and 4-second previews respectively.

A render that proceeds without this audit is a render that will fail QA.

## Asset Library Discipline

Per `video_production_skills/asset-library/SKILL.md`:

- Every character Soul ID + Flux 2 LoRA reference goes into `data/asset-library/manifest.json` with character name, episode-of-first-use, and locked seed.
- Every location Soul ID goes into the same manifest.
- Every approved Veo 3.1 hero shot gets archived as MP4 + the source still + the Higgsfield prompt that produced it.
- Every Voice MP3 is archived with its forced-alignment JSON and the script text.

The library compounds. Year 2 Season 4 should be able to call back any Season 1 character or location with a single asset-library lookup.
