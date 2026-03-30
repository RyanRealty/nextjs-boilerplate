# Task Handoff Template

This template defines the format for task specifications that AI agents consume when picking up work from the orchestrator.

The `npx tsx scripts/orchestrate.ts next` command generates output in this format automatically.

---

## Template

```markdown
# Task: [ID] [Title]

## Context
- **Location**: [phase or backlog]
- **Owner**: [workstream: engagement/reporting/monetization/admin/shared]
- **Requirement**: [R1-R10 reference if applicable]
- **Priority**: [high/medium/low]
- **Category**: [feature/bug/tech-debt/improvement]

## Why This Task Matters
[Brief explanation of business value and what this connects to]

## Scope
[Exactly what to change, which files, which functions]

## Files to Modify
- `path/to/file.ts` — [what to change]
- `path/to/other.ts` — [what to change]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Quality Gates
- [ ] `npm run build` passes
- [ ] `npm run test` passes
- [ ] No new lint errors on edited files
- [ ] `npm run lint:design-tokens` passes (if UI changed)
- [ ] `npm run lint:seo-routes` passes (if routes changed)

## Dependencies
- **Requires**: [task IDs that must be complete first]
- **Blocks**: [task IDs that depend on this]

## File Ownership
- **Owner**: [workstream]
- **Cross-cutting**: [list any files from other workstreams that need careful coordination]

## Implementation Notes
[Any technical guidance, gotchas, or references to existing patterns]

## Completion Workflow
1. `npx tsx scripts/orchestrate.ts start [ID]`
2. Implement the changes
3. Run quality gates: `npm run quality:full`
4. `npx tsx scripts/orchestrate.ts validate [ID]`
5. `npx tsx scripts/orchestrate.ts complete [ID]`
6. `git add -A && git commit -m "type: description" && git push`
```

---

## Example

```markdown
# Task: BL-001 Duplicate listing detail routes consolidation

## Context
- **Location**: backlog
- **Owner**: engagement
- **Priority**: high
- **Category**: tech-debt

## Why This Task Matters
Two listing detail pages exist (/listing/ and /listings/) with divergent implementations.
This causes SEO issues (duplicate content), confuses crawlers, and makes maintenance harder.

## Scope
Consolidate to a single canonical listing detail route at /listing/[listingKey].
The /listings/[listingKey] route should 301 redirect to the canonical form.

## Files to Modify
- `next.config.ts` — Add redirect rule: /listings/:key → /listing/:key (permanent)
- `app/listings/[listingKey]/page.tsx` — Remove (or replace with redirect)
- `app/sitemap.ts` — Remove /listings/ URLs, keep only /listing/
- `components/SimilarListings.tsx` — Update any /listings/ hrefs to /listing/

## Acceptance Criteria
- [ ] /listings/[key] redirects to /listing/[key] with 301
- [ ] Only one listing detail route implementation exists
- [ ] All internal links use /listing/ path
- [ ] Sitemap only contains /listing/ URLs
- [ ] npm run build passes

## Quality Gates
- [ ] `npm run build` passes
- [ ] `npm run lint:seo-routes` passes
- [ ] `npm run test` passes

## Dependencies
- **Requires**: none
- **Blocks**: none

## File Ownership
- **Owner**: engagement
- **Cross-cutting**: sitemap.ts (monetization may also modify for filter pages)

## Completion Workflow
1. `npx tsx scripts/orchestrate.ts start BL-001`
2. Implement the redirect and route consolidation
3. `npm run quality:full`
4. `npx tsx scripts/orchestrate.ts validate BL-001`
5. `npx tsx scripts/orchestrate.ts complete BL-001`
6. `git add -A && git commit -m "refactor: consolidate duplicate listing detail routes" && git push`
```
