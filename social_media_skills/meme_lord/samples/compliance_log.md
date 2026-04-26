# Compliance Gate Log — 2026-04-26 sample batch (10 memes)

Each sample runs through the 8-question Fair Housing + misrepresentation checklist in `compliance_gate.md`. A single fail kills the meme.

---

## Q1 — Protected-class touch

Familial status, race / national origin, religion, disability, sex / gender / sexual orientation / gender identity, source of income, marital status, age.

**During build:** sample 08 (Gru's Plan / DIY flip) originally read "While we both work full time and have a toddler." The word "toddler" touched familial status. **Killed and rewritten** to "While we both work 50 hours a week and have never used a saw" — same comedic beat (overcommitment + skill gap), zero familial-status touch.

**Final scan, all 10:** zero protected-class touches. Pass.

## Q2 — Steering language

Banned descriptors: "family-friendly", "great for families", "diverse community", "up-and-coming area", "safe neighborhood", "walkable to good schools" as a selling lead, any descriptor about who the property is "right for" by protected class.

**Result:** zero hits across all 10. Pass.

## Q3 — Identifiability

Could a real listing, agent, seller, or buyer recognize themselves?

All 10 are composite scenarios using generic archetypes. No real-listing details. No real-agent quotes. No real-client text. The Distracted Boyfriend price points ($400K / $650K) are illustrative, not tied to any active listing.

**Result:** all composite. Pass.

## Q4 — Forecasting

Banned without "this is opinion + verified data" framing: "this will appraise at...", "you'll be at $700K in 5 years", "prices are about to drop", etc.

**Result:** zero forecasts in the batch. The Zestimate joke (#5) is a commentary on Zestimate accuracy, not a market forecast. Pass.

## Q5 — MLS / listing attribution

Does the meme reference a specific property, price, or listing detail?

**Result:** zero specific listings referenced. The Distracted Boyfriend $400K/$650K and Woman Yelling Cat $850K are illustrative numbers, not tied to ORMLS records. No attribution required.

## Q6 — Misrepresentation

Could a reasonable consumer misread this as misrepresenting property characteristics, schools, taxes, neighborhood, market direction, agent qualifications, or transaction terms?

| # | Misread risk | Verdict |
|---|---|---|
| 01 | None — buyer behavior | Pass |
| 02 | None — illustrative price points | Pass |
| 03 | None — closing chaos | Pass |
| 04 | None — buyer escalation joke | Pass |
| 05 | Could imply Zestimates are universally wrong. Reframe defense: the cat says "Zillow has never been inside *your* house" — it's about the specific Zestimate methodology limitation, not a blanket claim | Pass |
| 06 | None — the line is a buyer self-aware joke | Pass |
| 07 | None — negotiation behavior | Pass |
| 08 | None — DIY-flip self-roast | Pass |
| 09 | None — listing agent self-roast (no real seller) | Pass |
| 10 | Could imply Ryan Realty agents disclaim inspection findings. Defense: "always has been" frames it as an industry truth, not a Ryan-Realty-specific stance. Caption "Spoiler: yes." reinforces it as observational | Pass |

**Result:** no plausible consumer misreads. Pass.

## Q7 — Political content

Partisan statements, candidate endorsements, side-taking on political issues.

**Result:** zero hits. The closest adjacent territory is the inspection meme (#10), which is industry-observational, not political. Pass.

## Q8 — Auto-reply / engagement-bot escalation

Memes likely to generate price questions, showing requests, offer language, earnest money / contingency / inspection / repair / closing date / lender / appraisal mentions, complaints about agents/brokerages, or fair-housing-sensitive questions must escalate to Matt for human reply.

**Risk-tagged for escalation:**
- #03 (lender at closing) — likely to attract closing-process and lender questions. **Escalate.**
- #05 (Zestimate $850K) — likely to attract "what's my house actually worth" DMs. **Escalate.**
- #10 (inspection) — likely to attract inspection horror stories and questions. **Escalate.**

The other 7 are observational and unlikely to draw transaction-specific replies, but the engagement_bot classifier still escalates anything that mentions earnest money / contingency / inspection / repair / closing date / lender / appraisal per the standing config.

---

## "Tomorrow morning OREA auditor" test

For each meme: would there be anything to explain, defend, or apologize for if an OREA auditor opened it tomorrow?

**Result:** No. All 10 are observational humor about universal RE friction, no protected class, no steering, no forecasting, no misrepresentation, no specific identifiable parties. Pass.

---

**Overall verdict:** all 10 sample memes clear the compliance gate. The pre-render Gru's Plan rewrite is the only fix logged this batch.
