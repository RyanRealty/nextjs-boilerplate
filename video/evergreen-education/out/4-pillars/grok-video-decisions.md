# Grok Video scout decisions — 4-pillars build

Generated: 2026-05-03 (cloud agent execution)

Per `CLAUDE.md` / `quality_gate/SKILL.md`: any clip that fails the slop check OR isn't picked by Matt falls back to deterministic Remotion motion on the still. The still + Remotion fallback is ALWAYS rendered as the safe ship.

## Decisions

### beat-1-cash-flow

- **Status:** ✗ FAIL — manual visual scrub
- **Auto slop check:** PASS (file integrity, duration 5.04s, 720x720, h264, 0.69MB)
- **Manual visual scrub:** FAIL
  - Color palette completely abandoned the source still: no cream `#faf8f4` background (Grok output is white/grey), house silhouette shifted to solid black instead of navy `#102742` outline, hand introduced beige/pink skin tone (source had navy outline only), coins shifted from gold-on-cream to thick-black-outlined cartoon clipart style
  - Style register shifted from "minimalist editorial vector" to "cartoon clipart"
  - Multiple hard-rule violations: palette drift, photoreal/illustrative drift, added cartoon outlines, added skin tone
- **Promoted to public:** NO — clip removed; beat will use deterministic Remotion fallback (still + spring-entrance CountUpPill animation)
- **Frame inspected:** `out/4-pillars/grok-video-scouts/beat-1-frame.jpg`

### beat-6-outro

- **Status:** ✗ FAIL — manual visual scrub
- **Auto slop check:** PASS (file integrity, duration 5.04s, 720x720, h264, 0.34MB)
- **Manual visual scrub:** FAIL
  - Color palette abandoned: source cream `#faf8f4` background replaced by warm gold/brown gradient
  - Columns shifted to dark brown silhouettes, abandoning navy `#102742`
  - Original gold/cream/navy palette reduced to a brown/gold monochrome — no longer matches the rest of the deck (the bookend with Beat 0 is broken)
- **Promoted to public:** NO — clip removed; beat will use deterministic Remotion fallback (still + Img with subtle Remotion-driven scale)
- **Frame inspected:** `out/4-pillars/grok-video-scouts/beat-6-frame.jpg`

## Outcome

**Grok Video FAILED on both beats. Both beats will ship with deterministic Remotion motion on the still.** The deterministic fallback was always engineered as the safe path; this is the expected behavior when Grok Video output drifts from the source aesthetic.

The full final render uses:
- Beat 1 (Cash Flow): still illustration + spring-entrance `<CountUpPill>` for the +$200/mo number
- Beat 6 (Outro): still illustration + tagline fade-in + subtle gold accent bar

No further Grok Video work on this build. Total scout spend: ~$0.40 (2 × $0.20 at 720p i2v).

## What broke and how to improve next time

The prompts were tight (locked-off camera, identical-style, negative prompt covered palette drift) but Grok Video appears to re-paint the start frame in its own style rather than animate the source pixels. That's a fundamental mismatch with the editorial-vector aesthetic — Grok Video is better suited for photoreal source frames where re-painting is invisible.

For future evergreen builds: do NOT use Grok Video on stylized vector illustrations. Reserve Grok Video for the formats explicitly approved in `VISUAL_STRATEGY.md` (listing exteriors, market-report b-roll). Stylized illustrations stay deterministic.
