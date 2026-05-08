# Earnest.
## A Ryan Realty Universe Skill

Status: DRAFT (created 2026-05-07, awaiting Matt's approval before commit/push).

**Earnest.** is the Ryan Realty serialized anthology drama. The series proposition: real estate is human emotion at every dimension, and Ryan Realty is the brand that sees the emotion, names it, holds space for it, and helps people through it.

This skill is the master architecture for building the series. Every writer, producer, animator, or editor working on Earnest. starts here.

## What This Skill Contains

| File | What it is | Read first when |
|---|---|---|
| `WORLDVIEW.md` | Brand worldview, A24-model brand architecture, the three-axis framework, The Voice (Hume Octave 2), recurring cast (ElevenLabs Eleven v3) | Onboarding any new contributor |
| `BRAND_SYSTEM.md` | Visual identity: Söhne/Inter Display + Editorial New, Ink/Bone/Bruise/Ember palette, the wordmark, the horizon mark, cold-open and end-card sequences, motion language, audio brand | Any design, render, or asset decision |
| `brand/` | Canonical brand assets: `wordmark.svg`, `mark.svg`, `wordmark-square.svg`, `wordmark-landscape.svg`, `palette.css` | Rendering any frame or microsite element |
| `CHARACTER_BIBLE.md` | The 17-question template plus full bibles for the recurring cast | Designing or scripting any character |
| `EPISODE_ARCHITECTURE.md` | 45-60s beat structure, hook discipline, cliffhanger types, caption rules | Writing or storyboarding an episode |
| `PRODUCTION_PIPELINE.md` | Tool stack (Higgsfield + Krea + Veo 3.1 + Hedra + ElevenLabs + Hume Octave + DaVinci Resolve), claymation aesthetic, prompt templates, render workflow, QA gate | Generating any image or video asset |
| `SEASON_1_TREATMENTS.md` | The seven Season 1 episodes; Episode 1 fully drafted with new brand-system timing | Producing any Season 1 episode |
| `DISTRIBUTION.md` | Owned-media-first architecture (earnest.show + Substack + Discord), discovery layer, festival circuit, FUB conversion, comment-keyword CTA, the BMW Films / A24 Ryan Realty crossover | Scheduling or shipping an episode |

## The Three Sources of Truth (priority order)

1. `CLAUDE.md` (root) — Data accuracy, draft-first/commit-last, video hard rules, anti-slop, brand-first.
2. `video_production_skills/ANTI_SLOP_MANIFESTO.md` and `VIRAL_GUARDRAILS.md` — Every Earnest. episode clears these gates.
3. This skill (`video_production_skills/earnest/`) — Series-specific architecture, layered on top of the above.

If a rule in this skill conflicts with CLAUDE.md, CLAUDE.md wins. Banned words in CLAUDE.md are banned here. The data accuracy gate in CLAUDE.md §0 applies to every market figure cited in any Earnest. episode.

## Quick-Start: Producing Episode 1

1. Read `WORLDVIEW.md` (15 min)
2. Read Linda's bible in `CHARACTER_BIBLE.md` (10 min)
3. Read `EPISODE_ARCHITECTURE.md` (10 min)
4. Read Episode 1 ("The Empty Room") in `SEASON_1_TREATMENTS.md` (20 min)
5. Generate Linda's character stills per `PRODUCTION_PIPELINE.md` (~2 hr)
6. Show Matt the stills before any video generation
7. On approval: render Veo 3.1 hero shots (~3 hr)
8. Show Matt the rendered shots
9. On approval: cut, caption, QA, render final
10. Show Matt the final MP4 before commit

Draft-first rule (CLAUDE.md): nothing commits or pushes until Matt has seen and approved the deliverable.

## The Brand Architecture (re-stated, non-negotiable)

Earnest. is a fully separate brand from Ryan Realty corporate. No Ryan Realty visual identity, no Ryan Realty typography, no Ryan Realty color, no Ryan Realty messaging in any frame. The Ryan Realty connection lives off-frame on the earnest.show microsite for viewers who go looking. **A24 model.**

Matt's avatar, voice, image, or persona is NEVER on screen, never in the audio, never the constant in any Earnest. content. The Voice (custom Hume Octave 2 voice ID, designed via natural-language prompt) is the brand made audible. The "Earnest." wordmark in the cold open and end card is the only visible brand presence. Curatorial intelligence is the brand's role: which stories get told, how they are told, what the camera sees.

## Status

DRAFT, created 2026-05-07. No episode has shipped. Episode 1 ("The Empty Room") is the production target. Awaiting Matt's approval before commit to main.
