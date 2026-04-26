# Sample Memes — Renderer Demonstration

These ten renders prove the `meme_lord` workflow ships end-to-end on real, recognizable meme templates. They are **dev artifacts, not production content**. Before any one ships, the workflow runs the voice grader (`voice_grader.md`) and compliance gate (`compliance_gate.md`) plus the viral guardrails scorecard (`video_production_skills/VIRAL_GUARDRAILS.md`) — logs for this batch live alongside this README at `voice_grader_log.md`, `compliance_log.md`, and `scorecard.json`.

The humor here is **universal real estate**, not Bend-specific. Bend angles get sprinkled in occasionally. The default is broad agent / buyer / seller pain that any RE pro or homebuyer instantly recognizes.

| # | Template | Friction | Platform | File |
|---|---|---|---|---|
| 1 | `drake` | Buyer behavior — Zillow links at 2am | IG square 1080×1080 | [01_drake_zillow_links.png](renders/01_drake_zillow_links.png) |
| 2 | `distracted_boyfriend` | Buyer behavior — budget creep | IG square 1080×1080 | [02_distracted_boyfriend_budget_creep.png](renders/02_distracted_boyfriend_budget_creep.png) |
| 3 | `this_is_fine` | Closing chaos — lender at 4:55pm | IG square 1080×1080 | [03_this_is_fine_lender.png](renders/03_this_is_fine_lender.png) |
| 4 | `expanding_brain` | Buyer behavior — escalating asks | IG square 1080×1080 | [04_expanding_brain_buyer_escalation.png](renders/04_expanding_brain_buyer_escalation.png) |
| 5 | `woman_yelling_cat` | Seller delusion — Zestimate denial | IG square 1080×1080 | [05_woman_yelling_cat_zestimate.png](renders/05_woman_yelling_cat_zestimate.png) |
| 6 | `change_my_mind` | Agent life — buyer fixer-upper fantasy | IG square 1080×1080 | [06_change_my_mind_open_houses.png](renders/06_change_my_mind_open_houses.png) |
| 7 | `epic_handshake` | Negotiation — refusing to name a number | IG square 1080×1080 | [07_epic_handshake_no_first_offer.png](renders/07_epic_handshake_no_first_offer.png) |
| 8 | `grus_plan` | Buyer behavior — DIY-flip delusion | IG square 1080×1080 | [08_grus_plan_diy_flip.png](renders/08_grus_plan_diy_flip.png) |
| 9 | `two_buttons` | Agent life — listing consult dilemma | IG square 1080×1080 | [09_two_buttons_listing_agent.png](renders/09_two_buttons_listing_agent.png) |
| 10 | `always_has_been` | Inspection drama — universal truth | IG square 1080×1080 | [10_always_has_been_inspections.png](renders/10_always_has_been_inspections.png) |

## What changed in this batch (rebuild from v1 corporate-style PIL renders)

- Real meme template base images (Drake, Distracted Boyfriend, This Is Fine, etc.) live in `templates/base_images/`, downloaded from imgflip canonical templates.
- Classic meme typography: Impact font, all caps, white fill with black stroke. Templates with label-box semantics (Distracted Boyfriend, Expanding Brain, Change My Mind, Two Buttons) use Arial Bold black-on-white instead.
- Canonical Ryan Realty logo applied bottom-right per Matt's directive: `listing_video_v4/public/brand/stacked_logo_white.png` is the only allowed branding asset.
- The previous five corporate-style PIL renders (pull_quote_card, pov_youre_a, imessage_screenshot, tell_me_without_telling_me, nobody_me_at_3am) and their slot files are removed.

## Voice grader

All 10 pass the 8-question checklist. Two fixes during the build:

1. Sample 01 caption originally read "Tag the agent who has been here." — engagement-bait pattern (`Tag a friend who...`). Rewritten to "If you know."
2. Sample 08 (Gru's Plan) originally referenced "toddler" in panels 3-4 — familial-status touch under Fair Housing. Rewritten to "50 hours a week and never used a saw" (same comedic beat, zero protected-class touch).

Full log: [voice_grader_log.md](voice_grader_log.md).

## Compliance gate

All 10 pass the 8-question Fair Housing + misrepresentation checklist. The Gru's Plan toddler rewrite is logged in [compliance_log.md](compliance_log.md). Three samples (#03 lender, #05 Zestimate, #10 inspection) are tagged for engagement-bot escalation when they generate transaction-specific replies.

## Viral guardrails scorecard

All 10 clear the meme format minimum (75/100 per `VIRAL_GUARDRAILS.md` §10). Lowest score in the batch: 85. Highest: 90. Zero auto-zero hits. Full per-sample breakdown: [scorecard.json](scorecard.json).

## Data anchors required before publication

None of the 10 samples carry a verified-data claim. The Distracted Boyfriend price points ($400K / $650K) and the Woman Yelling Cat $850K Zestimate are illustrative composites, not market figures. Per `VIRAL_GUARDRAILS.md` §10, meme content does not need citations because it does not make claims. If a future meme makes a market claim, run the verification trace per `CLAUDE.md` §0 and write `citations.json` next to the render.

## Re-rendering

Each sample has a slot JSON in `slots/`. To re-render any one:

```bash
cd social_media_skills/meme_lord
python3 scripts/render_meme.py \
  --template drake \
  --slots samples/slots/01_drake_zillow_links.json \
  --platform ig_square \
  --out samples/renders/01_drake_zillow_links.png
```

Available platforms: `ig_square`, `ig_portrait`, `ig_story`, `x_inline`, `x_tall`.

## What these samples do not prove

- They do not prove the trend scan returns viable trends (Step 1 of the workflow). That happens live each Monday.
- They do not prove the post-publish performance loop (Step 11). That requires posted memes and real impression data.
- They are sample punchlines for renderer/template demonstration. Production memes are written by Matt per Anti-Slop Manifesto Rule 9 (no AI humor); the skill never writes the punchline in the live workflow.
