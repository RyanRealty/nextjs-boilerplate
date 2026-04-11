# SkySlope reference links

## SkySlope Forms vs Suite vs APIs

| Name | What it is | Typical integration |
|------|------------|---------------------|
| **SkySlope Forms** (transaction files) | Listing file + sale file cabinets, checklists, documents | **Listings/Sales Files API** — `api-latest.skyslope.com`, HMAC + `Session` (this repo) |
| **SkySlope Suite** | Different SkySlope **application** (office/brokerage suite) | **Not** the Files API above; do not conflate exports or UI with Forms file JSON |
| **Forms Partnership API** | Partner forms / envelopes | `forms.skyslope.com` — OAuth, different auth |
| **Offers API** | Offers analytics | `offers.skyslope.com` — OAuth |

**Archived files:** For Files API **folder lists**, exclude archived rows in tooling (e.g. filter `status`/`stage` text for “archived” or boolean flags). The unified `GET /api/files` endpoint documents an `archived` **status** filter but can omit active under-contract listings depending on filters—prefer **`/api/files/listings`** and **`/api/files/sales`** for a full Forms folder inventory.

**Listings/sales folder list pagination (critical):** Swagger defines **`earliestDate`** and **`latestDate`** as Unix **seconds** (not `fromDate`/`toDate` strings), **`pageNumber`** (1-based, max 1000), and **10 items per page**—there is **no** `pageSize` query parameter. Scripts that pass undocumented params and stop when `rows.length < 50` only retrieve the **first page** (~10 folders) and massively under-count inventory. Use `scripts/skyslope-files-api.mjs` (`fetchSkyslopeFileFolderRows`) in this repo.

---

## Fully executed (what that means for Ryan Realty work)

**Fully executed** is a **human transaction file standard**, not something API metadata or raw PDF text extraction can certify.

For a given instrument (OREF or otherwise), treat it as **fully executed** only when **all** of the following are true after review by someone who is expert in **Oregon OREF**, **SkySlope checklist expectations**, and **Oregon brokerage practice** (typically a principal broker, transaction coordinator, or compliance reviewer).

### Who must sign (classify the document first)

Execution is **not** always “buyer + seller.” Part of the review is deciding **which parties** the form obligates, then checking **only those** signatures and initials:

- **Listing agreements** (e.g. exclusive listing): for that instrument, **seller-side execution** is what matters—**sellers** (and firm/agent lines the form requires), not buyers. Do not reject a listing agreement as “incomplete” for missing buyer signatures.
- **Buyer-side agreements** (e.g. buyer representation / buyer agency as your office uses them): **buyer** signatures (and firm lines if applicable), not sellers.
- **Bilateral / mutual documents** (e.g. Residential Sale Agreement and many addenda and counters where **both** sides must bind): **fully executed** means every line the form assigns to **sellers, buyers, and any other required signers** is complete. If the form requires both sides, you verify **both**; if only one side signs on a given draft (e.g. an unsigned counter), it is **not** fully executed until the obligation pattern for that draft is satisfied per your process.

Checklist:

1. **Correct obligated parties** — For **this** document type, the parties who **should** sign are identified and match the deal, property, and (for mutual docs) the offer/counter chain.
2. **Complete signing for that obligation pattern** — Every signature, initial, and date the form requires **for those obligated parties** (seller-only, buyer-only, or both sides as applicable) is present—not blank, not the wrong signatory, not an obvious placeholder.
3. **Signature validity is credible** — Wet signatures look authentic for the context; e-sign (DigiSign, DocuSign, etc.) audit trails or completion certificates align with the parties and timeline SkySlope shows.
4. **OREF and brokerage completeness** — All **statutorily and contractually required** attachments and disclosures for **this** transaction stage are present (e.g. pamphlets, advisories, addenda referenced by the RSA, HOA/title packages where required). Missing or wrong-version forms mean the packet is **not** fully executed for file purposes even if one page has a signature.
5. **No unresolved SkySlope checklist gaps** — SkySlope activity status (“Required”, “In Review”, etc.) is a **workflow** signal; it does not replace (4), but persistent “Required” with no doc often means the file is incomplete.

**What LLMs and scripts can do:** inventory documents, sort timelines, flag keywords, count e-sign markers, and compare filenames to expected OREF numbers. **What they cannot do:** substitute for the review above, interpret Oregon law for a specific fact pattern, or guarantee that every required initial exists on every page of a flattened PDF.

When this repo’s audit script emits labels like `e_sign_vendor_markers_present`, read that strictly as **“text layer contains vendor stamps”**, not as **“fully executed.”**

---

| Topic | URL |
|-------|-----|
| Listings/Sales API Redoc (swagger UI) | https://api-latest.skyslope.com/api/docs/redoc/index.html?url=/swagger/v1/swagger.json |
| Swagger JSON | https://api-latest.skyslope.com/swagger/v1/swagger.json |
| Example: HMAC login (Node) | https://github.com/cybercoinc/skyslope-example-authentication |
| Example: bulk export | https://github.com/cybercoinc/skyslope-bulk-export-api |
| Forms Partnership API | https://forms.skyslope.com/partner/api/docs |
| Offers API | https://offers.skyslope.com/offers-api/reference |
| SkySlope support | https://support.skyslope.com/hc/en-us |
| Open API ecosystem (overview article) | https://skyslope.com/general/unlocking-the-power-of-your-data/ |

## Login hosts (confirm per your agreement)

- `https://api-latest.skyslope.com/auth/login`
- `https://api.skyslope.com/auth/login` (legacy/alternate; verify with SkySlope if latest fails)
