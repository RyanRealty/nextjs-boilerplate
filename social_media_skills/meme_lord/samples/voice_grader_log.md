# Voice Grader Log — 2026-04-26 sample batch (10 memes)

Each sample passes the 8-question checklist in `voice_grader.md`. Failures during the build are captured below with the fix applied.

---

## Q1 — Banned-word grep

Automated grep against the manifesto banlist (delve, leverage, navigate, robust, seamless, comprehensive, pivotal, transformative, elevate, empower, unlock, unleash, harness, foster, facilitate, "in today's market", dream home, charming, must-see, gorgeous, pristine, meticulously maintained, entertainer's dream, truly, breathtaking, spacious, cozy, luxurious, hidden gem, tucked away, stunning, nestled, boasts, coveted).

**Result:** zero hits across all 10 slot files.

## Q2 — Punctuation

Scan for semicolons, em-dashes, en-dashes-as-em-dashes, hyphens used as dashes, ellipses outside quoted speech, exclamation points outside genuine surprise.

**Result:** zero hits.

## Q3 — Specificity

Each meme must carry at least one concrete anchor (number, place, brokerage, MLS field, listing detail, time/date).

| # | Meme | Anchor |
|---|------|--------|
| 01 | Drake / Zillow links | "47 Zillow links at 2am" |
| 02 | Distracted Boyfriend / budget creep | "$400K", "$650K" |
| 03 | This Is Fine / lender | "4:55pm on closing day" |
| 04 | Expanding Brain / escalation | "wine fridge, lawn furniture, golden retriever" |
| 05 | Woman Yelling Cat / Zestimate | "$850,000" |
| 06 | Change My Mind / fixer-upper | "fixer-upper" (concrete buyer category) |
| 07 | Epic Handshake / first offer | "Buyers" / "Sellers" (specific roles) |
| 08 | Gru's Plan / DIY flip | "50 hours a week", "never used a saw" |
| 09 | Two Buttons / listing agent | "wallpaper", "listing photos" |
| 10 | Always Has Been / inspections | "the inspection", "EVERY house" |

**Result:** all 10 anchored.

## Q4 — Voice test (read aloud)

Each line read aloud against the reference: "40-something Bend principal broker through three rate cycles, not a chatbot." Lines that sounded chatbot-adjacent were rewritten before render.

| # | Verdict |
|---|---------|
| 01–10 | Pass |

## Q5 — Setup-punchline structure

Punchline at the bottom (image) or end (caption). Setup leads.

| # | Setup | Punchline | Verdict |
|---|-------|-----------|---------|
| 01 | top: clean offer | bottom: 47 Zillow links at 2am | Pass |
| 02 | left/center: budget + buyer | right: $650K wine cellar | Pass |
| 03 | top: lender at 4:55pm | bottom: "this is fine" | Pass |
| 04 | panels 1–3 escalate | panel 4: golden retriever | Pass |
| 05 | woman: Zillow $850K | cat: Zillow has never been inside | Pass |
| 06 | sign: "until they see one" | (single-take format) | Pass |
| 07 | top: refusing to name a number | sleeves: Buyers / Sellers | Pass |
| 08 | panels 1–2: plan | panels 3–4: "never used a saw" | Pass |
| 09 | top: two button choices | bottom: listing agent at consult | Pass |
| 10 | front: realization | back: "always has been" | Pass |

## Q6 — Caption explanation

Captions must not narrate the image.

| # | Caption | Verdict |
|---|---------|---------|
| 01 | "If you know." | Pass |
| 02 | "Every. Single. Time." | Pass |
| 03 | "If you know, you know." | Pass |
| 04 | "The negotiation always escalates." | Pass |
| 05 | "Comps > Zestimate. Always." | Pass |
| 06 | (empty) | Pass |
| 07 | "Every negotiation, ever." | Pass |
| 08 | "The HGTV-to-reality pipeline." | Pass |
| 09 | "There is no third button." | Pass |
| 10 | "Spoiler: yes." | Pass |

## Q7 — Engagement bait

Banned: "Tag a friend", "Comment below", "Double tap", "Save this for later", "Wait until you see", "You won't believe".

**During build:** sample 01 originally read "Tag the agent who has been here." Caught at the gate; rewritten to "If you know."

**Final:** zero hits. Pass.

## Q8 — Insider-only check

Would a non-agent get the joke?

| # | Audience read |
|---|---------------|
| 01 | Both — buyers send the links, agents receive them |
| 02 | Both — universal scope creep |
| 03 | Both — closing day chaos is recognizable to anyone who has bought |
| 04 | Both — buyer escalation lands either way |
| 05 | Both — Zestimate denial is universal seller territory |
| 06 | Both — the "fixer-upper fantasy" is a buyer self-mock |
| 07 | Both — negotiation deadlock |
| 08 | Both — DIY-flip delusion is HGTV-coded, universal |
| 09 | Agent-leaning — listing agent dilemma. Acceptable, not over-cap |
| 10 | Both — inspection drama lands for buyers + agents |

**Result:** 9 of 10 are dual-audience. 1 is agent-leaning (#9), within the cap allowed by `voice_grader.md` Q8.

## "Would Matt actually post this" test

Mom / spouse / past client / OREA auditor pass for all 10. No piece punches down at clients; agent self-roasting where applicable.

---

**Overall verdict:** all 10 sample memes pass the voice grader.
