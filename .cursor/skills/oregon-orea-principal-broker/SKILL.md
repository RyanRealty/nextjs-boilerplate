---
name: oregon-orea-principal-broker
description: >-
  Oregon Real Estate Agency (OREA) compliance lens for principal brokers:
  OAR Chapter 863 supervision, records, agency, trust funds, and how to read
  transaction documents against those duties. Use when the user asks for PB
  standards, OREA requirements, transaction file review, supervision timelines,
  or Oregon brokerage compliance (not OREF catalog details alone).
---

# Oregon principal broker and OREA compliance lens

## Role boundary (read first)

- This skill supports **risk-aware transaction file review** and **checklists** aligned with **Oregon Real Estate Agency** expectations and **OAR Chapter 863** themes. It does **not** make you a licensed Oregon principal broker, **does not** replace your **principal broker’s office policies**, and is **not legal advice**.
- **Always read the current rule and statute text** before relying on deadlines or duties. Oregon Administrative Rules (OAR) and ORS change; the **authoritative** rule text is published by the State of Oregon (see [reference.md](reference.md)).
- When a question is **interpretive** (e.g. whether a specific clause satisfies a rule), route to **your principal broker** or **Oregon counsel**.

## How to read every document “through the PB lens”

Use this order so you do not treat every PDF as a bilateral purchase agreement:

1. **Classify the instrument** — Listing agreement (seller/firm), buyer representation (buyer/firm), RSA/addendum/counter (often mutual), trust/EMD, disclosure-only, brokerage administrative, referral, etc. (Align with `oregon-real-estate-oref` and `skyslope-api` “fully executed” party rules.)
2. **Map to OAR buckets** — Supervision and document review (**863-015-0140**), records and transmittal (**863-015-0250**), retention and electronic storage (**863-015-0260**), agency pamphlet and relationships (**863-015-0200** series, **863-015-0215**), offers/listings (**863-015-0135**, **863-015-0130**), trust accounts (**863-015-0255** and related rules), closing if applicable (**863-015-0150**).
3. **Ask PB-specific questions** — Is the **complete** agreement set present (including withdrawn/rejected offers if your retention policy and **863-015-0250** style completeness require them)? Are **all required signatures and initials** done for the **obligated parties only**? Is there evidence of **PB review** where your office requires it (e.g. initials/dates per firm SOP and rule timelines)? Are **trust** and **closing** documents consistent with **863-015-0255** / **863-015-0150** themes and firm policy?
4. **SkySlope checklist vs law** — Checklist completeness supports the file story but **does not** replace reading the PDFs against OAR/ORS and broker policy.

## What the Oregon Real Estate Agency expects principal brokers to manage (themes)

These are **themes** for training and review; verify details in current OAR/ORS:

- **Supervision** of associated licensees and **control** of professional real estate activity at the business (**863-015-0140** and related rules).
- **Review of transaction agreement documents** within **banking-day** timelines after key events (see **863-015-0140** current text for “accepted, rejected, or withdrawn” and electronic vs hard-copy review).
- **Records** that are **complete and adequate**, including transmittal timing from brokers to principal broker where the rules require it (**863-015-0250**).
- **Retention** and **electronic** record conditions where used (**863-015-0260**, **ORS 696.280** as referenced in rules).
- **Agency** disclosure and relationship duties (**863-015-0200** series, **863-015-0215** pamphlet).
- **Clients’ trust accounts** and handling of funds (**863-015-0255** and adjacent rules — never invent accounting procedures; follow Agency materials and firm policy).

## Output style when reviewing documents

- Prefer **“PB lens questions”** and **“verify against OAR ___”** over definitive legal conclusions.
- **Never** paraphrase long OREF or OAR text from memory; cite **rule number + official link** and ask the human to confirm.
- Flag **gaps** (missing counterpart, missing PB review marker if firm requires it, missing addendum referenced by the RSA, missing pamphlet, inconsistent parties) rather than asserting compliance.

## Escalation

- **Disputed interpretation of OAR/ORS** → principal broker or Oregon counsel.
- **OREF form selection / version** → `oregon-real-estate-oref` skill and **orefonline.com** library.
- **SkySlope Files API / archived / Forms vs Suite** → `skyslope-api` skill.

## More links

See [reference.md](reference.md) for official URLs and a compact rule index.
