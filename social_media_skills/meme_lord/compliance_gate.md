# Compliance Gate — Fair Housing + Misrepresentation Checklist

Run this checklist on every meme before render and again before queue. A single fail kills the meme. There is no "soften it." Pick a different friction.

This gate exists because **Anti-Slop Rule 13** is non-negotiable. Matt is a licensed Oregon principal broker. The brokerage license is worth more than any post.

---

## The 8 questions

### 1. Protected-class touch — none?

Does the meme reference, joke about, or imply anything about:

- **Familial status** — kids, "kid-noise neighborhood", "no-kids zone", "adults only", "perfect for empty-nesters", "great for families"
- **Race / national origin / ethnicity** — including coded references via "neighborhood vibe", "good schools" used as a wink, "diverse community", "up-and-coming"
- **Religion** — including jokes about religious decor in listing photos
- **Disability** — accessibility features, mobility, mental health, "ADA-friendly"
- **Sex / gender / sexual orientation / gender identity** — including "single dad / single mom buyer" tropes
- **Source of income** — Section 8, vouchers, rental assistance (protected in Oregon)
- **Marital status** — "perfect for newlyweds", "honeymoon home"
- **Age** — outside legally established 55+ communities

**Pass condition:** zero touches. **Fail condition:** any touch, however indirect. **Fail action:** kill the meme. Pick a different friction.

### 2. Steering language — none?

Banned descriptors:
- "Family-friendly neighborhood"
- "Great for families" / "perfect for families"
- "Diverse community"
- "Up-and-coming area"
- "Safe neighborhood" (steering and unverifiable)
- "Walkable to good schools" used as a selling lead
- Any descriptor about who a property is "right for" based on a protected class

**Pass condition:** zero hits. **Fail action:** rewrite to describe the property and place, not the buyer type. "Walkable to Bend High and a Whole Foods" is fine. "A retreat for empty-nesters" is not.

### 3. Identifiability — composite only?

Could a real listing, agent, seller, or buyer recognize themselves in this meme?

**Examples that fail:**
- A meme that describes a recent listing in enough detail that the seller can identify it
- A meme that quotes an agent's actual language from a recent transaction
- A meme that uses a real client's text (even paraphrased) where they could recognize the conversation
- A meme that names or implies a specific brokerage in a negative context

**Pass condition:** characters are clearly composite, identifying details obscured or fictionalized. **Fail action:** generalize or kill.

### 4. Forecasting — properly framed?

Does the meme make a directional prediction about the market?

**Banned without explicit framing:**
- "This will appraise at..."
- "You'll be at $700K in 5 years."
- "Prices are about to drop."
- "Rates will spike."
- "The bubble is about to burst."

**Pass condition:** if the meme implies a forecast, the caption explicitly frames it as Matt's opinion + cites the data anchor that supports the directional read. Example: "Inventory up 31%, rates flat. My read: this favors buyers through summer. Not a guarantee."

**Fail action:** reframe with opinion + data citation, or kill.

### 5. MLS / listing attribution

Does the meme reference a specific property, price, or listing detail?

**Pass condition:**
- If a Ryan Realty listing: properly attributed.
- If another brokerage's listing: ORMLS attribution included ("per ORMLS"), and the meme is not negative about the property.
- If a composite: clearly composite with no real-listing identifiers.

**Fail action:** add attribution or generalize to composite.

### 6. Misrepresentation

Could a reasonable consumer read this meme as misrepresenting:

- Property characteristics (square footage, lot size, year built, condition)
- Schools, taxes, utilities, HOA terms
- Neighborhood characteristics (safety, demographics, services)
- Market direction (without proper opinion framing)
- Agent qualifications or affiliations
- Transaction terms (commission, fees, timing)

**Pass condition:** no reasonable consumer misreading possible. **Fail condition:** any plausible misread. **Fail action:** clarify or kill.

### 7. Political content

Does the meme make a partisan statement, endorse a candidate, or take a side on a political issue?

**Pass condition:** zero. Rate-cycle math is fine. "The Fed is destroying America" is not. NAR settlement absurdity is fine. "Lawyers ruined real estate" is not.

**Fail action:** reframe to the math, or kill.

### 8. Auto-reply / comment-bot escalation

If this meme is likely to generate comments that include any of:
- Specific price questions
- Showing requests
- Offer or counter language
- Earnest money / contingency / inspection / repair / closing date / lender / appraisal mentions
- Complaints about agents, brokerages, or transactions
- Fair-housing-sensitive questions

The comment auto-reply system **must escalate to Matt for a human reply**. Do not let any bot reply to those comment patterns. See `automation_skills/automation/engagement_bot/SKILL.md` for the full classifier.

**Pass condition:** the meme caption either does not invite those comment patterns, or the engagement_bot is configured to escalate them.

---

## The "tomorrow morning" test

Before queueing, picture the OREA license auditor opening this meme tomorrow morning. Is there anything in it that you would have to explain, defend, or apologize for?

If yes, kill it. The license is worth more than the post.

---

## Escalation

If any question above gets a "I'm not sure" answer, the meme escalates to Matt before publish. "Not sure" is a fail by default. The skill never ships uncertainty.

---

## Failure log

Every fail gets logged in `out/meme_lord/<slug>/compliance_log.md` with the question number, the issue, and the resolution (kill / rewrite / escalate). Weekly review of the log surfaces patterns to add to the friction-topics banned list.

---

Last reviewed: 2026-04-26.
