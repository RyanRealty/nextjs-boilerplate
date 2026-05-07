---
name: asset-library
description: >
  Single source of truth for every photo, video clip, audio file, and rendered MP4
  in the Ryan Realty media pipeline. Use this skill when the user says "check the
  asset library", "register this asset", "reuse the X photo", "what photos do we
  have for Bend", or whenever a content build needs to fetch media — because
  asset-library-FIRST is the default sourcing rule. If you are about to call an
  external API (Unsplash, Shutterstock, Pexels, Replicate, etc.) to obtain a photo
  or video, check the asset library first. Use this skill also when a build fails
  on a photo-diversity assertion, when you need to track license costs, or when
  Matt asks "what do we have" for any media type.
---

# Asset Library — Ryan Realty

**Version:** 1.0 — Authored 2026-05-07  
**Cross-references:** `media-sourcing/SKILL.md`, `market-data-video/SKILL.md`

---

## What the asset library is

A local manifest + filesystem store that tracks every media asset the team has
ever fetched, generated, or rendered. It de-duplicates external API calls (cost
saver), enforces photo diversity (no repeats in a render), and carries license
metadata so production compliance is auditable.

The library is the answer to: "Do we already have a good Pilot Butte photo, or
do we need to call Unsplash again?"

---

## File structure

```
data/asset-library/
  manifest.json          ← index of all assets (source of truth)
  schema.json            ← field definitions

public/asset-library/
  photos/
    unsplash/<uuid>.jpg
    shutterstock/<shutterstock_id>.jpg
    pexels/<pexels_id>.jpg
    generated/<uuid>.jpg  ← AI-generated images
  videos/
    renders/<uuid>.mp4    ← our own rendered Remotion outputs
  audio/
    <uuid>.mp3
```

Each asset record in `manifest.json` links to its file via a repo-relative
`file_path` (`public/asset-library/photos/unsplash/abc.jpg`). The manifest
is the index; the files are the binary store.

---

## Schema — key fields per asset record

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Stable identifier. Used in `markUsed()` calls. |
| `type` | string | `photo` / `video` / `audio` / `render` |
| `source` | string | `unsplash` / `shutterstock` / `pexels` / `generated-replicate` / `render` |
| `source_id` | string | Original API ID (Unsplash photo ID, Shutterstock image ID, etc.) |
| `license` | string | `unsplash` / `shutterstock` / `pexels` / `cc0` / `proprietary` |
| `license_metadata` | object | `license_required`, `preview_only`, `license_cost_usd`, `license_id` |
| `creator` | string | Photographer / model credit |
| `creator_url` | string | Link to photographer profile |
| `file_path` | string | Repo-relative path to the downloaded file |
| `geo_tags` | string[] | e.g. `["bend", "central-oregon", "oregon"]` |
| `subject_tags` | string[] | e.g. `["mountain", "river", "sunset"]` |
| `search_query` | string | The query that surfaced this asset |
| `width` / `height` | number | Pixels |
| `registered_at` | ISO string | When first added |
| `last_used_at` | ISO string | When last copied into a render |
| `used_in` | array | `{ render_path, scene_id, render_type, used_at }` per use |
| `approval` | string | `approved` / `intake` / `rejected` / `expired` |

Full schema: `data/asset-library/schema.json`.

---

## Approval states

| State | Meaning |
|---|---|
| `approved` | Ready to use in production renders. Free assets (Unsplash, Pexels) auto-approve on registration. |
| `intake` | Fetched but pending review. Shutterstock previews land here (watermarked; need license before production). |
| `rejected` | Failed QA — wrong geography, people-as-subject, off-brand. Excluded from search results by default. |
| `expired` | License term ended or asset removed from source. Do not use. |

---

## Programmatic API (ESM import)

```js
import { search, register, markUsed, stats } from './lib/asset-library.mjs'

// Search
const photos = await search({
  geo: ['bend'],          // any-match against geo_tags
  type: 'photo',
  limit: 20,
  unusedOnly: true,       // exclude assets used in last 30 days
})

// Register a newly downloaded file
const asset = await register('/abs/path/to/file.jpg', {
  type: 'photo',
  source: 'shutterstock',
  source_id: '123456789',
  license: 'shutterstock',
  license_metadata: { license_required: true, preview_only: true },
  creator: 'Jane Smith',
  geo: ['bend', 'central-oregon'],
  subject: ['mountain', 'snow'],
  search_query: 'mount bachelor oregon',
  width: 1920, height: 1080,
  approval: 'intake',
})

// Record usage in a render
await markUsed(asset.id, {
  render_path: 'out/bend/market-report.mp4',
  scene_id: 'img_3',
  render_type: 'market-report',
})

// Library-wide stats
const s = await stats()
// { total_assets, by_type, by_source, by_license, total_usages, total_license_cost_usd }
```

---

## CLI

```bash
# Search by city + type
node lib/asset-library.mjs search --geo bend --type photo --tags "smith-rock"

# Search unused-only (for diversity-safe render)
node lib/asset-library.mjs search --geo bend --type photo --unused-only

# Register a file
node lib/asset-library.mjs register public/asset-library/photos/pexels/12345.jpg \
  --type photo --source pexels --source-id 12345 --license pexels \
  --geo "bend,central-oregon" --subject "mountain,river" \
  --search-query "bend oregon landscape" --creator "Jane Doe" \
  --width 4000 --height 6000

# Mark used in a render
node lib/asset-library.mjs mark-used <asset-id> \
  --render out/bend/market-report.mp4 --scene img_3 --render-type market-report

# Library stats
node lib/asset-library.mjs stats

# List recent additions
node lib/asset-library.mjs list --recent 20 --type photo
```

---

## Asset-library-FIRST sourcing principle

Every video, blog post, or ad build MUST query the asset library before calling
any external API. This saves API quota, avoids re-licensing the same Shutterstock
image twice, and prevents photo repeats within a render.

**Decision order:**
1. `search({ geo: [city], type: 'photo', unusedOnly: true, limit: 50 })`  
   If ≥ N unused approved photos found → use them, skip external fetch.
2. Otherwise → run `scripts/fetch-photos.mjs <city>` which fans out to:  
   Shutterstock (previews, `intake`) → Pexels (free, `approved`) → Unsplash (free, `approved`)
3. Re-query the library → now has new arrivals → pick top N.

The orchestrator for this is `video/market-report/scripts/fetch-photos.mjs`.

---

## How fetched photos reach a render

1. `fetch-shutterstock.mjs` / `fetch-pexels.mjs` / `fetch-unsplash.mjs` each
   download files to `public/asset-library/photos/<source>/` and call
   `register()` with full metadata.
2. `fetch-photos.mjs` (the orchestrator) calls `search()`, copies the top N
   files to `video/market-report/public/<slug>/img_1.jpg ... img_N.jpg` (the
   naming convention `build-cities.mjs` expects), and calls `markUsed()`.
3. `build-cities.mjs` calls `assignPhotoSlots()` which enforces the no-repeat
   rule via a `Set` diversity assertion — throws rather than silently duping.

---

## How rendered MP4s get registered

After a Remotion render is approved and moved from `out/` to
`public/v5_library/`, the finalization step registers the output:

```js
await register('public/v5_library/bend-market-report-may-2026.mp4', {
  type: 'render',
  source: 'render',
  license: 'proprietary',
  geo: ['bend'],
  subject: ['market-report'],
  approval: 'approved',
})
```

This lets the pipeline find rendered outputs for repurposing (thumbnail
extraction, YouTube upload, clip trimming) without scanning the filesystem.

---

## Cost tracking

Shutterstock assets carry `license_metadata.license_cost_usd` once licensed.
`stats()` returns `total_license_cost_usd` — the running total across all
licensed assets. This feeds the monthly media cost report.

Pexels and Unsplash are free; their records carry `license_required: false`.

Shutterstock preview fetches (`approval: 'intake'`) are NOT production-usable
until licensed via the Shutterstock `/v2/images/licenses` endpoint and the
record is updated to `approval: 'approved'` with the license ID.

---

## Cross-references

- `media-sourcing/SKILL.md` §1.5 — asset-library is the canonical first lookup
  before any external source in every sourcing decision.
- `market-data-video/SKILL.md` §20 — photo diversity rule (no repeats per
  render) enforced by `assignPhotoSlots()` which reads image slots from library.
- `market-data-video/SKILL.md` §21 — Shutterstock integration roadmap
  (Matt's go/no-go on production licensing pending).
- `video/market-report/scripts/fetch-photos.mjs` — the asset-library-FIRST
  orchestrator for market-report photo pipelines.
