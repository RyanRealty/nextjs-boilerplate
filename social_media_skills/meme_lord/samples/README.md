# Sample Memes — Renderer Demonstration

These five renders prove the `meme_lord` workflow ships end-to-end. They are **dev artifacts, not production content**. Before any one of these is published, Matt runs the voice grader and compliance gate per `SKILL.md` Steps 7-8.

| # | Template | Friction | Platform | File |
|---|---|---|---|---|
| 1 | `pull_quote_card` | Lowball offers | IG portrait 1080×1350 | [01_pull_quote_lowball.png](renders/01_pull_quote_lowball.png) |
| 2 | `pov_youre_a` | Rate cycle | IG square 1080×1080 | [02_pov_rate_wait.png](renders/02_pov_rate_wait.png) |
| 3 | `imessage_screenshot` | Just-looking buyer | IG portrait 1080×1350 | [03_imessage_just_looking.png](renders/03_imessage_just_looking.png) |
| 4 | `tell_me_without_telling_me` | Bend transplant view perception | IG portrait 1080×1350 | [04_tell_me_transplant.png](renders/04_tell_me_transplant.png) |
| 5 | `nobody_me_at_3am` | MLS workflow obsession | IG square 1080×1080 | [05_nobody_mls_3am.png](renders/05_nobody_mls_3am.png) |

## Voice grader pass per sample

All five samples pass the 8 questions in `voice_grader.md`:

1. **Banned-word grep:** clean across all five. No "stunning", "nestled", "delve", "leverage", "in today's market", etc.
2. **Punctuation:** no semicolons, no em-dashes, no exclamation points anywhere.
3. **Specificity:** every sample carries a concrete anchor — a price ($895K, $620K), a payment delta ($147), a time (6am, 3am), a place (Awbrey, Tetherow, the Cascades, Bend), a year (2019), or a date (April 21).
4. **Voice test:** read aloud, each sounds like a working broker writing about a thing they actually saw.
5. **Setup-punchline:** punchline at the end on every sample. Sample 1 saves the buyer's quoted line for the bottom of the quote. Sample 2 saves the "$147 higher than the day you said wait" closer. Sample 3 saves "On my way." for the agent's resigned reply at the end. Sample 4 saves "four-mile-out distant ridge." Sample 5 saves "closed in 2019."
6. **Caption explanation:** none of the image text explains the joke.
7. **Engagement bait:** none. Sample 2's footer says "Bend market data updates every Friday" — informational, not bait.
8. **Insider-only check:** Samples 1, 2, 3, 4 are dual-audience. Sample 5 is agent-skewing — flagged as agent-only in `slots/05_nobody_mls_3am.json`.

## Compliance gate pass per sample

All five samples pass the 8 questions in `compliance_gate.md`:

1. **Protected-class touch:** none. "Bend transplant" is geographic, not national-origin (Sample 4).
2. **Steering language:** none.
3. **Identifiability:** Sample 1 quotes a generic "showing feedback" line. Sample 3 uses "Buyer #4" with "Composite. Not a real conversation." printed under the contact name. Sample 4 references the Cascades view experience generically. No real person identifiable.
4. **Forecasting:** Sample 2 is rate-cycle math, not a forecast. It states what already happened.
5. **MLS attribution:** no real listings referenced.
6. **Misrepresentation:** none.
7. **Political content:** none.
8. **Bot escalation:** Sample 2 invites comments about rates and payment math — these route to Matt per the engagement_bot classifier, not auto-reply.

## Data anchors required before publication

Sample 2 ($147 monthly payment delta) is **illustrative**. Before any version of this meme ships, run the actual rate-vs-price math against Bend median SFR Supabase data per the verification trace pattern in CLAUDE.md. Replace $147 with the verified figure. Citation goes in `out/meme_lord/<slug>/citations.json`.

The other four samples are observational and require no data anchor.

## Re-rendering

Each sample has a slot JSON in `slots/`. To re-render any one:

```bash
cd social_media_skills/meme_lord
python3 scripts/render_meme.py \
  --template pull_quote_card \
  --slots samples/slots/01_pull_quote_lowball.json \
  --platform ig_portrait \
  --out samples/renders/01_pull_quote_lowball.png
```

## What these samples do not prove

- They do not prove the trend scan returns viable trends (Step 1 of the workflow). That happens live each Monday.
- They do not prove the post-publish performance loop (Step 11). That requires posted memes and real impression data.
- They do not prove brand fonts render correctly. The system fell back to Helvetica because Amboqia and AzoSans are not installed at the search paths in `brand_tokens.json`. Production renders should install the brand fonts and verify they load. Renderer logs a warning when fonts fall back.
