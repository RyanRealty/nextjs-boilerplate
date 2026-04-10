---
name: oregon-real-estate-oref
description: >-
  Strong first pass on Oregon OREF workflows: form categories, transaction
  sequencing, earnest money and disclosure patterns. User is final authority.
  Pair with oregon-orea-principal-broker for OREA/OAR regulatory file review.
---

# Oregon real estate transactions and OREF

## Role boundary

- Deliver **educated first-pass** guidance: checklists, sequencing, and **which OREF families** apply—Matt reviews and decides final.
- **Do not** paste proprietary OREF clause text or present stale form language as current. Authoritative wording lives on the **authorized platform** (e.g. SkySlope) or **orefonline.com** under license.
- If **OREF numbering or release** is uncertain, say so and point to the **live library**.
- For **OREA / principal broker file duties** (supervision, records, agency, trust), use **`oregon-orea-principal-broker`** in the same pass. This skill stays on **OREF catalog and deal papering**; that skill stays on **regulatory file quality**.

## When this skill applies

Use for: offer structure, which **category** of OREF addendum might apply, transaction sequencing, common Oregon concepts (earnest money, timelines, agency), and **where to look** in the OREF library index.

## Core facts to remember

1. **OREF** is **Oregon Real Estate Forms, LLC** — standardized Oregon-specific forms, updated on a schedule. Library and indices live on **orefonline.com** (see [reference.md](reference.md)).
2. **Residential sale core** is often centered on **OREF 001 – Residential Real Estate Sale Agreement** plus **disclosures and addenda** chosen for the fact pattern. Exact numbering and titles change; always confirm the **current** index.
3. **Commercial** uses the **C-** series (e.g. commercial sale agreement and related addenda). Same rule: confirm current index.
4. **OREF 000 / advisory** materials exist for education; they are not a substitute for transaction documents selected for the deal.

## Workflow: help a licensee “paper” a deal (safe pattern)

1. **Identify**: property type (residential vs commercial), sides represented, financing contour, occupancy, HOA, wells/septic if any, new construction, tenant occupied, 1031, etc.
2. **Map to categories** (not verbatim text): e.g. financing addendum, inspection, title, HOA, seller rent-back, additional clauses — then name the **OREF form numbers** only if they match the **published library**; otherwise say “confirm on orefonline.com OREF library index.”
3. **SkySlope / transaction software**: if the brokerage uses **SkySlope**, forms are typically completed **inside SkySlope** with the correct checklist; advise syncing with broker compliance and SkySlope file status (see `skyslope-api` skill).
4. **Risk callouts** (generic): deadlines, counteroffer chains, notice delivery methods, deposit handling — always tie to **broker policy** and **current form instructions** on the authorized platform.

## Output style

- Prefer **numbered checklists** and **“confirm on OREF library”** over drafting contract language.
- Cite **https://orefonline.com/** for library structure, FAQs, and support — not scraped form bodies.

## Escalation

- **Form content or legal interpretation** → principal broker or Oregon counsel.
- **Software or API** for SkySlope files → `skyslope-api` skill and SkySlope Support.

## More links

See [reference.md](reference.md).
