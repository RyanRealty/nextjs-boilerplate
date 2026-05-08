# Episode Architecture — Earnest.

The structural rules every Earnest. episode follows. Built from prestige TV craft, vertical short-form drama beats, the 2026 TikTok algorithm, and the Earnest. brand system in `BRAND_SYSTEM.md`.

## Length

- **45-60 seconds, hard.** No episode under 45s, no episode over 60s.
- Long-form companion (8-12 min YouTube essay version) handled separately.

## The 60-Second Beat Skeleton

Validated against the ReelShort "Beat Engine" plus the prestige TV principle that great drama works in compressed scenes.

```
0:00–0:02   Cold open: "Earnest." brand mark sequence (per BRAND_SYSTEM.md)
0:02–0:08   Hook: a single image with a question implicit in the frame (no exposition)
0:08–0:25   Setup: who, where, what is being decided (almost entirely visual)
0:25–0:32   Episode title card: pull-quote → episode tag → resume (per BRAND_SYSTEM.md)
0:32–0:50   Pressure: the choice the character is forced to make
0:50–0:56   Interior monologue: The Voice (when she speaks) names what cannot be said
0:56–0:60   End card: "Earnest." brand mark sequence (per BRAND_SYSTEM.md)
```

Variations:
- A silent episode runs the same skeleton with no Voice narration. The interior monologue is communicated entirely through the character's gesture, the camera's choice of what to look at, and the score.
- An ensemble episode (e.g., "The Open House") cycles through six interior monologues in 5-7 second windows.

Note on title card placement: BRAND_SYSTEM.md specifies a 3.3-second title card. The skeleton above allocates 7 seconds (0:25-0:32) which includes a 1.5s buffer for cross-dissolve in/out. Tighten or loosen by ±1s based on episode pacing.

## The Cold Open (per BRAND_SYSTEM.md)

Every episode opens identically:

```
0:00.0 - 0:00.3   Black hold. Silence.
0:00.3 - 0:00.8   Horizon mark draws left and right from center. 0.5s ease-out.
0:00.8 - 0:01.3   "Earnest." wordmark fades in beneath. 0.5s ease-out.
0:01.3 - 0:01.7   Hold. Single piano note (C# minor, felted upright) lands as wordmark settles.
0:01.7 - 0:02.0   Hard cut to first content beat.
```

This 2-second mark IS the brand. No logo. No "A Ryan Realty Series." No "Episode N." Just the wordmark and the horizon. The piano note is the sonic mnemonic, identical across every episode forever.

## Hook Discipline

From CLAUDE.md video hard rules and viral guardrails research:

- **Motion engaged by frame 12 (0.4s)** of the first content beat after the cold open. Never static at frame 0.
- **On-screen text by frame 30 (1.0s)** if any text appears. Centered, Inter Display, 64-80pt.
- **First spoken word is content.** No "hey," no "today," no "let's talk about." The Voice's first word, if she speaks at all in the hook, lands meaning immediately.
- **Hook contains a specific element.** A number, a place name, a contradicting claim, a visual surprise, an interior gesture (Linda's hand on the doorknob she has not turned in eight months).

Banned openings (CLAUDE.md):
- Brokerage logo
- Title card on black other than the cold-open brand sequence
- Agent intro
- Slow boundary draw
- Generic establishing shot with no overlay or sound

## Pacing Rules

- **Standard beat: 2-3 seconds.** Luxury hero shots (a slow claymation dolly across a kitchen) up to 4 seconds. **No beat over 4 seconds.**
- **Minimum 12 beats in a 45s video. Minimum 16 beats in a 60s video.** (Excludes cold-open + title-card + end-card sequences.)
- **Three motion types minimum per episode** (push_in, push_counter, slow_pan, multi_point_pan, gimbal_walk, cinemagraph, parallax, rack_focus). Repeating the same motion across consecutive beats is forbidden. See `PRODUCTION_PIPELINE.md` cinematography library.
- **No scene with readable text shorter than 2.5 seconds.** Viewers must be able to read every word.
- **Pattern interrupts at 25% mark and 50% mark.** New visual register or text shock. The 50% mark is a hard register shift (interior to exterior, wide to closeup, etc.) that lands the title card.
- **Final 15% before end card is kinetic.** A reveal, a turn, a held look, a closing image that earns the silence into the end card.

## Cliffhanger Types (the beat right before the end card)

The episode never lands. From the May 2026 research on vertical drama cliffhangers:

- **Mid-sentence cut** — character starts a sentence, frame cuts before the verb.
- **Visual reveal at half-frame** — door opens, frame cuts before what is behind the door is visible.
- **Music sting cut** — score crescendos to a single hit, hard stop on Ink as the end card begins.
- **POV flip / re-pricing** — the final shot shows what was off-screen the whole episode and changes the meaning of every prior beat.
- **The held look** — character stops mid-action, looks at something off-screen, frame holds for 1.5 seconds, hard cut to end card.
- **The choice not made** — character's hand hovers over the document, the pen, the doorknob, the closing button. Frame cuts before the action lands.

Rule: **cut two seconds earlier than feels safe.** The cliffhanger must be uncomfortable to leave.

## The Voice's Discipline

The Voice (Hume Octave 2 custom voice ID) narrates ONLY where her presence adds something the visual cannot deliver. Default position: silent. Speak only to:

- Name an interior emotion the character cannot say aloud.
- Reveal context the visual cannot show ("She has not opened this door since the funeral").
- Pose the question the audience is feeling but cannot articulate ("Why is this so hard?").
- Speak the season's thematic line, once, in the final 5 seconds of an episode where it lands.

The Voice's lines are short. One-clause sentences. No commas where Matt would not pause. Numbers spelled out for ingestion. IPA phoneme tags for Bend-area place names. Maximum total Voice runtime per episode: 20 seconds out of 60. If The Voice is on screen more than that, the visual is failing.

## Episode Title Card (per BRAND_SYSTEM.md, 50% mark of every episode)

```
0:00.0 - 0:00.3   Cross-dissolve from previous beat to Ink. 0.3s.
0:00.3 - 0:00.7   Pull-quote fades in. Editorial New Italic, 72pt, Bone on Ink, centered.
                  Max 12 words, single sentence. 0.4s ease-in.
0:00.7 - 0:02.2   Hold pull-quote. 1.5s.
0:02.2 - 0:02.6   Pull-quote dissolves out. Episode tag (e.g., "E01") fades in
                  in Inter Display Medium, 32pt, Bone-soft, top-right corner. 0.4s.
0:02.6 - 0:03.0   Hold tag. 0.4s.
0:03.0 - 0:03.3   Cross-dissolve to next content beat. 0.3s.
```

Total: 3.3 seconds.

Pull-quotes per episode are pre-written in `SEASON_1_TREATMENTS.md`.

## Caption Rules (per CLAUDE.md §0.5 + BRAND_SYSTEM.md)

- **Captions NEVER overlap other visual elements.** Reserved safe zone: y 1480-1720, x 90-990. Enforced via `<EarnestCaptionBand />` Remotion wrapper.
- **Pill:** Ink at 70% opacity (`var(--earnest-caption-pill)`), 24px corner radius, 16px padding.
- **Text:** Inter Regular 56pt, Bone (`#E8E2D6`).
- **Active-word highlight:** Ember (`#B25535`) + scale 1.0→1.08 spring, synced to forced-alignment timestamps.
- **Sentence transitions:** 250ms cross-fade, never hard cut.
- **Format:** full sentence on screen with active-word highlight (NOT word-by-word reveal).
- **Sync source:** ElevenLabs `/v1/forced-alignment` for cast lines + WhisperX for Hume Octave Voice lines. Always read from the per-line JSON, never from clock time.

## Visual Register Changes

Every episode contains at least three distinct visual registers:

- **Wide establishing.** The claymation diorama of the house, the street, the room.
- **Medium character.** The clay character in context (Linda standing in the doorway of the empty bedroom, three-quarter framing).
- **Tight detail.** A hand on a doorknob, a name on a deed, a coffee cup on a counter, a dust line on a shelf where a picture frame used to sit.

The 50% mark (title card) is a hard register shift. Holding one register too long flattens the episode.

## The Educational Spine (the save-bait)

Every Season 1 episode delivers one real-estate educational beat that the audience can save and use. This is the "save it for later" hook the 2026 TikTok algorithm rewards (saves got a major weight boost). Examples:

- **Episode 1 ("The Empty Room"):** the emotional reality that downsizing is grief, plus the practical concept of a "leave-behind list" (rooms you don't enter the day before close, photos you don't take down).
- **Episode 2 ("The Garage"):** the inheritance principle that disposition decisions (sell/keep/rent) should be agreed BEFORE object decisions (woodshop/recipe-box/photos), because object negotiation contaminates disposition.
- **Episode 3 ("The Counter"):** the multiple-offer dynamic and the truth that escalation clauses are a buyer's gamble, not a guarantee.
- **Episode 4 ("The Walk-Through"):** what to look for in a final walk-through (every functioning fixture, every promised repair documented).
- **Episode 5 ("The Closing Table"):** the divorce-divestment process and the financial reality of dividing equity.
- **Episode 6 ("The Open House"):** the seller's perspective on six visitors and what each one signals.
- **Episode 7 ("The First Showing"):** what a first-time-in-Bend buyer needs to know in the first 24 hours.

The educational beat is woven into the drama, not announced. The character lives the lesson; the audience absorbs it.

## End Card (per BRAND_SYSTEM.md)

```
T-4.0s  Hard cut from final content beat to Ink.
T-3.5s  "Earnest." wordmark + horizon mark fade in. 0.5s ease-in.
T-3.0s  Hold. Single sustained string drone (low D, warm) underneath. 2.5s.
T-0.5s  Cross-fade to black. 0.5s.
```

Total: 4.0 seconds. NO Ryan Realty mark in the frame. NO "A Ryan Realty Production" tag. NO logo. NO URL. The brand association lives off-frame on the microsite.

The string drone is the closing breath. Same note every episode, every season, forever.

The CTA lives in the platform caption, not in the video. (See `DISTRIBUTION.md` for the comment-keyword CTA architecture.)

## Quality Gate (run BEFORE asking for approval)

```
[ ] Length 45-60s exactly
[ ] Cold-open brand sequence renders correctly (Ink, horizon-draw, wordmark fade-in, piano note)
[ ] End-card brand sequence renders correctly (wordmark hold, string drone, fade)
[ ] Motion + content by frame 30 of first content beat after cold open
[ ] Frame at 25% has visual register change
[ ] Frame at 50% has hard register shift + episode title card (pull-quote in Editorial New)
[ ] Final 15% before end card is kinetic (held look, reveal, or cut-on-question)
[ ] No beat over 4 seconds
[ ] Minimum 12 beats (45s) or 16 beats (60s)
[ ] Three distinct motion types used
[ ] No frozen frames at beat boundaries
[ ] No black bars at transitions (parent div transparent + Sequence overlap)
[ ] Caption safe zone respected (y 1480-1720, no overlap)
[ ] Caption sentence transitions are 250ms cross-fades (no hard cuts)
[ ] Caption sync to forced-alignment JSON (verify file exists)
[ ] Caption pill is Ink at 70%, text is Bone, active-word is Ember
[ ] Banned-words grep clean across captions, VO script, on-screen text
[ ] All on-screen numbers carry units and trace to citations.json
[ ] Voice runtime ≤ 20s
[ ] No logo, no phone, no agent name, no URL, no Ryan Realty mention in any frame
[ ] Cold-open and end-card "Earnest." marks render identically
[ ] File size < 100 MB
[ ] ffmpeg blackdetect strict (pix_th=0.05) returns ZERO sequences inside content body
[ ] Final upscaled to 4K via Topaz Astra 2
```

Plus the viral scorecard ≥ 80/100 per `video_production_skills/VIRAL_GUARDRAILS.md`.
