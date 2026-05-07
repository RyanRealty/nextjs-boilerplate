---
name: storyboard_pass
description: Pre-render concept gate. Drafts the full BEATS array, citation list, VO script, music choice, and viral scorecard prediction before any render fires. Auto-invoked by content_engine on every non-listing content request. Skipped only when Matt says "skip storyboard", "just build it", or "just render". Use when Matt says "draft a storyboard for", "show me the concept first", "brief me before rendering", "preview the BEATS", or "review the storyboard for [topic]". NOT for listing_reveal (formula is fixed — skip unless concept drift). Saves $0.50–$5 per avoided bad render.
when_to_use: Also fires when a new format has never been rendered before, when research data doesn't yet exist and needs to be gathered before committing to a direction, or when Matt asks "what would this look like" for any video topic. Skip when Matt approved the same storyboard within last 7 days and format/data are unchanged.
---

# Storyboard Pass

## What it is

The pre-render concept review gate. Sits between `content_engine` receiving a request and the format skill firing the render. Drafts the full BEATS array, citation list, VO script, music selection, and viral scorecard prediction. Matt gets a 30-second skim and says go or redirects. One storyboard pass costs ~$0.005 (Gemini 2.5 Flash). One avoided bad render saves $0.50–$5.

## When NOT to invoke

- Matt says "skip storyboard" / "just build it" / "just render" — honor it, proceed to render
- `listing_reveal` format following its 16-beat formula exactly (no concept drift, no new creative direction)
- Same storyboard approved by Matt within last 7 days, same data window, same format

## Hard constraints

- Predicted scorecard must meet format minimum BEFORE showing Matt. Auto-iterate once if it falls short. If second pass still fails, show Matt with the gap flagged — do not silently suppress.
- Citation list must be complete before Matt sees the skim. No "TBD" figures. Every number traces to a named source (Supabase query + filter, Spark API, or primary-source URL).
- VO script must pass banned-words grep before Matt sees it. Banned list: stunning, nestled, boasts, charming, pristine, gorgeous, breathtaking, must-see, dream home, meticulously maintained, entertainer's dream, tucked away, hidden gem, truly, spacious, cozy, luxurious, updated throughout, approximately, roughly, about, em-dashes, semicolons, delve, leverage, tapestry, navigate, robust, seamless, comprehensive, elevate, unlock.
- Cost estimate must be present. Never omit it.
- The 30-second skim format below is FIXED. Do not invent variations.

## Procedure

1. **Receive intent.** Format type, topic, target platforms, research data in hand (or pull it now).
2. **Load the format skill's BEATS template.** Read `video_production_skills/<format>/SKILL.md` for the beat count, timing, required motion types, and pattern-interrupt positions. Do not scaffold beats from memory.
3. **Pull and verify all figures.** Query Supabase or Spark API fresh. Print raw result. Compute derived stats. No inherited numbers from prior sessions.
4. **Draft the storyboard.** Generate `out/<slug>/storyboard.md` containing:
   - BEATS array (full JSON — see schema below)
   - Citation list (one entry per figure)
   - VO script (full text, Victoria-ready, numbers spelled out)
   - Music choice (beat-synced genre or "none" with rationale)
   - Cover frame description (for thumbnail prompt)
5. **Run banned-words grep** on VO script and all on-screen text. Fix before proceeding.
6. **Predict viral scorecard.** Score against `video_production_skills/VIRAL_GUARDRAILS.md` rubric. If predicted score is below format minimum, revise the BEATS array once and re-score. Show Matt the second-pass score.
7. **Compute cost estimate.** ElevenLabs char count × $0.00003 + render time estimate + any API calls.
8. **Surface the 30-second skim** (format below). Stop. Wait for Matt.
9. **On approval:** hand off BEATS array JSON and citations to the format skill. Render proceeds.
10. **On redirect:** capture feedback in `feedback_loop/SKILL.md` pattern. Regenerate storyboard with the constraint applied. Re-surface skim.

## The 30-second skim (exact format — do not alter)

```
## Storyboard: <FORMAT> — <TOPIC> — <DATE>

**Hook (0–2s):** <On-screen text> / VO: "<first line>"
**Beat <N> (~<timecode>s):** <What happens — motion type, text, VO line>
**Beat <N> (~<timecode>s — 50% interrupt):** <Register shift description>
**Final reveal (~<timecode>s):** <Kinetic stat or punchline — exact numbers>

**Predicted scorecard:** <XX>/100 (format minimum: <YY>) — <PASS / NEEDS REVISION>
**VO length:** ~<XXX> words (~<Y>s)
**Citations:** <N> figures — all sourced
**Cost estimate:** ~$<X> (render + ElevenLabs + APIs)

Approve to build, redirect, or say "skip storyboard" to go direct next time.
```

## BEATS array JSON schema

Format-agnostic. Every format skill receives this structure:

```json
{
  "format": "string — e.g. market_data_video, news_clip, listing_reveal",
  "slug": "string — kebab-case output filename root",
  "duration_target_s": 45,
  "beats": [
    {
      "index": 1,
      "start_s": 0.0,
      "duration_s": 3.0,
      "motion": "push_in | push_counter | slow_pan_lr | slow_pan_rl | gimbal_walk | Ken_Burns | depth_parallax | kinetic_stat_reveal | static_hold",
      "asset": "string — photo path, video clip path, or 'generated:<description>'",
      "on_screen_text": "string — max 7 words, units included, or null",
      "vo_line": "string — Victoria-ready, numbers spelled out, or null",
      "pattern_interrupt": false,
      "notes": "string — optional build note"
    }
  ],
  "vo_full_script": "string — complete VO in order, newline-separated by beat",
  "music": {
    "choice": "string — genre/track name or 'none'",
    "rationale": "string"
  },
  "cover_frame_beat": 1,
  "cover_frame_description": "string — thumbnail prompt"
}
```

## Outputs

| File | Location | Description |
|------|----------|-------------|
| `storyboard.md` | `out/<slug>/` | Full human-readable skim + BEATS detail |
| `storyboard.json` | `out/<slug>/` | Machine-readable BEATS array (schema above) |
| `citations.json` | `out/<slug>/` | One entry per figure: source, query, filter, row count, fetched_at |

Both files are gitignored (`out/`). They do not commit.

## Cost

| Action | Cost |
|--------|------|
| Storyboard generation (Gemini 2.5 Flash, ~50K tokens) | ~$0.005 |
| Auto-iterate if first pass fails scorecard | ~$0.005 |
| Avoided bad render (ElevenLabs + Remotion + API calls) | $0.50–$5.00 |

## See also

- `video_production_skills/VIRAL_GUARDRAILS.md` — scorecard rubric and format minimums
- `video_production_skills/ANTI_SLOP_MANIFESTO.md` — banned content gate
- `video_production_skills/VIDEO_PRODUCTION_SKILL.md` — BEATS constraints, motion types, hook rules
- `automation_skills/automation/feedback_loop/SKILL.md` — captures redirect feedback for next storyboard pass
- `automation_skills/automation/qa_pass/SKILL.md` — post-render gate (fires after, not before, render)
