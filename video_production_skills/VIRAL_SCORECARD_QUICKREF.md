---
name: viral-scorecard-quickref
description: 30-second pre-publish virality scan card. Index version of VIRAL_GUARDRAILS.md.
---

# Viral Scorecard — Quick Reference Card

**This is the 30-second pre-publish scan.** Full gate: [`VIRAL_GUARDRAILS.md`](VIRAL_GUARDRAILS.md). Read that for category sub-criteria and scoring math. Pin this card next to the editor for the actual ship-day pre-flight.

---

## Score 0-10 in each category. Total 100. Ship at 80+.

```
[__/10] 1. Hook (0-3s)            — motion by 0.4s, content by 1.0s, specific by 2.0s
[__/10] 2. Retention structure    — 25% / 50% / 75% / final-15% beats engineered
[__/10] 3. Text execution         — 900x1400 safe zone, 48px+, 2s+ dwell, units on numbers
[__/10] 4. Audio strategy         — register-matched music, beat-synced, ElevenLabs VO
[__/10] 5. Format compliance      — 9:16, length window, captions burned in, cover designated
[__/10] 6. Engagement triggers    — built-in share/save/comment/DM trigger present
[__/10] 7. Cover / first frame    — high-contrast, specific, thumb-stop test passes
[__/10] 8. CTA / payoff           — payoff matches hook, CTA matches platform register
[__/10] 9. Voice / brand          — sounds like Matt, brand colors + fonts, no in-frame logo
[__/10] 10. Anti-slop / data      — citations.json present, source trace, AI disclosed

TOTAL: __/100
```

| Score | Verdict |
|-------|---------|
| 90+ | Engineered to win — ship |
| 80-89 | Strong — ship, note weak categories |
| 70-79 | Borderline — do not ship without Matt approval |
| 60-69 | Weak — kill or rebuild |
| <60 | Dead — kill, rebuild from BEATS array |

**Hard floor: 80.** Format-specific floors (per [`VIRAL_GUARDRAILS.md`](VIRAL_GUARDRAILS.md) §10): listing video 85, market data 80, neighborhood 80, meme 75, earth zoom 85.

---

## Auto-zero kills (any one = no ship, regardless of score)

- Opens with logo, "REPRESENTED BY", agent intro, title card on black, banned-opening from manifesto Rule 4
- Any single beat exceeds 4 seconds
- Reveal contains contact info or brokerage attribution
- Number on screen with no citation in `citations.json`
- Banned word from manifesto Rule 1 (stunning, nestled, boasts, dream home, etc.)
- AI filler from manifesto Rule 11 (delve, leverage, robust, seamless, elevate, etc.)
- AI image of real place / property / person without disclosure pill
- Fair-housing language hit (great for families, safe neighborhood, diverse community, etc.)
- Wrong aspect ratio for the target platform
- No burned captions on a piece intended for muted feeds
- Stock library elevator loop, default Epidemic, off-beat cuts (>4 frames at 30fps)
- Robotic TTS that is not ElevenLabs
- Off-brand color (not Navy / Gold / Cream / Charcoal in chrome)
- Off-brand font (not Amboqia / AzoSans)
- Engagement bait that does not deliver (manifesto Rule 10)

---

## Hook gate — frame-by-frame (1080x1920, 30fps)

| Frame | Time | Required |
|-------|------|----------|
| 0 | 0.00s | Photo/video content. Never logo, never black, never title card |
| 12 | 0.40s | Motion engaged |
| 30 | 1.00s | First text element OR first VO syllable. Visual specificity present |
| 60 | 2.00s | Hook payoff complete or curiosity gap planted |
| 90 | 3.00s | Confirmation beat — second visual or info that confirms hook was real |

**1-second test:** cover everything except the first 1s of video and first 6 words of caption. Does that alone stop the scroll? If no, re-cut.

---

## Pattern interrupt timing (45s default)

| Mark | Time | Action |
|------|------|--------|
| 25% | 7-12s | New visual register or text shock |
| 50% | 20-25s | Hard register shift (exterior to interior, drone to closeup, etc.) |
| 75% | 33-37s | Payoff seed — reason to watch the last 10s |
| Final 15% | 38-45s | Kinetic stat reveal (price + address + status) |

---

## Engagement trigger menu (pick at least one, score the strongest)

- **Share trigger** — content people send to a specific person ("send this to your partner who said no to Bend")
- **Save trigger** — checklist, reference table, market data card with date range
- **Comment trigger** — controversial-but-defensible take, specific question mapped to lived experience
- **DM trigger** — specific resource name ("DM me 'tour' for the address")
- **Re-watch trigger** — final frame re-frames the open

If none, the piece scores 0 in Category 6 — kill.

---

## Audio path picker

- **Path A — Music + VO** (most listing/market video) — register-matched track, beat-synced cuts, music ducks under VO
- **Path B — Trending audio** (meme, trend-jack, low-register) — sound on trending tab within 7 days, contextually correct
- **Path C — VO-only** (no music) — ElevenLabs with `previous_text` chained, pronunciation overrides applied

---

## Platform length sweet spots

| Platform | Sweet spot | Hard cap |
|----------|------------|----------|
| IG Reels | 30-45s | 60s |
| TikTok | 30-60s | 3 min |
| YouTube Shorts | 30-60s | 60s |
| FB Reels | 30-60s | 90s |

All 9:16 / 1080x1920 / 30fps minimum.

---

## CTA by platform

| Platform | Primary CTA |
|----------|-------------|
| IG | DM-CTA with specific resource ("DM me 'tour'") |
| TikTok | Comment-prompt or follow-CTA |
| YouTube Shorts | Subscribe-CTA |
| Facebook | Comment-prompt, share-prompt |
| LinkedIn | Comment-prompt (dwell + threads = reach) |
| X | Reply-CTA, quote-tweet |

**Banned:** "click link in bio", "subscribe for more", "follow for more market updates", vague DM ("DM me 'info'").

---

## Pre-flight ship check

```
[ ] Score >= format minimum (§10)
[ ] No auto-zero hits
[ ] Manifesto Enforcement gate green
[ ] Master skill §6 quality gate green (blackdetect, etc.)
[ ] citations.json present, every number traced
[ ] Source trace per photo asset
[ ] AI disclosure pill if AI assets used
[ ] Beat-sync trace if music used
[ ] Cover frame designated (not auto-picked)
[ ] Caption written, banned-words pass
[ ] Hashtag set per platform
[ ] Format-review-window check — pending_review cleared if in 30-day window
```

Any unchecked = no ship. Fix, re-score, re-flight.

---

Full gate: [`VIRAL_GUARDRAILS.md`](VIRAL_GUARDRAILS.md). Manifesto: [`ANTI_SLOP_MANIFESTO.md`](ANTI_SLOP_MANIFESTO.md). Master skill: [`VIDEO_PRODUCTION_SKILL.md`](VIDEO_PRODUCTION_SKILL.md).
