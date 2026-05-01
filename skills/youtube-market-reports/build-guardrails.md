# YouTube Market Report Video — Build Agent Guardrails

## 0. BEFORE ANY WORK

- [ ] Read ALL 8 skill files in `skills/youtube-market-reports/` cover to cover. Not skimming — reading.
- [ ] Read `CLAUDE.md` at repo root for project-wide rules.
- [ ] Read auto-memory files for market data rules, video production rules, and brand identity.
- [ ] Confirm you understand the full pipeline: Data → Script → Voice → Alignment → Scenes → Render → Upload.
- [ ] Do NOT start coding until you can explain the pipeline end-to-end without referencing the docs.

## 1. DATA INTEGRITY — ZERO TOLERANCE

Every query MUST include:
- `property_sub_type = 'Single Family Residence' AND "PropertyType" = 'A'` (SFR filter)
- `"ClosePrice" >= 10000` (price floor)
- `sale_to_list_ratio BETWEEN 0.5 AND 1.5` (ratio bounds) when computing SP/LP
- `("CloseDate" AT TIME ZONE 'America/Los_Angeles')::date` (timezone conversion)
- `days_to_pending` for ALL DOM metrics — NEVER `DaysOnMarket`, NEVER `CloseDate - OnMarketDate`
- MoS: `active_count / (closed_180d / 6)` with SFR filter on BOTH sides

**Verification gate:** After writing any data-fetching code, write a test that runs the query against Supabase and compares results to known benchmarks:
- Bend March 2026: ~159 SFR sales, ~$700K median, ~12 days median days_to_pending
- If your numbers are off by more than 10% from these benchmarks, STOP and investigate.

## 2. CODE QUALITY — NO SHORTCUTS

- Every new file gets a TypeScript type definition. No `any` types. No `// @ts-ignore`.
- Every component gets at least one unit test. No exceptions.
- Every function that touches Supabase data gets an integration test with real query validation.
- Import paths must be consistent with existing repo patterns. Check `tsconfig.json` paths.
- Run `pnpm tsc --noEmit` after every file creation. Fix all type errors before moving on.
- Run `pnpm vitest run` after every logical unit of work. All 271+ existing tests must still pass.

## 3. SCENE COMPONENTS — MATCH THE SPEC

Each scene component listed in `storyboard-template.md` has a specific visual spec. Follow it exactly:
- Use brand tokens from `video/market-report/brand.ts` — never hardcode colors.
- Use the font stack from `video/market-report/fonts.ts` — never use system fonts.
- Animation timing must use Remotion's `interpolate()` with proper `extrapolateLeft/Right: 'clamp'`.
- Every component must accept a `data` prop typed to the `VideoProps` schema.
- Every component must render correctly at 1920x1080 AND 1080x1920 (landscape + portrait).
- Test each component by rendering a single frame with `npx remotion still` before moving on.

## 4. VOICE & ALIGNMENT — PRECISION REQUIRED

- ElevenLabs voice ID must be Victoria (check `.env.local` for the ID).
- Script generator must enforce anti-slop rules from SKILL.md Section 1.
- Forced alignment output must produce word-level timestamps, not just sentence-level.
- CaptionBand must highlight the current word, not just show the current sentence.
- Audio file format: MP3, 44.1kHz. Verify with `ffprobe` after generation.

## 5. BUILD ORDER — DEPENDENCIES MATTER

Build in this exact order (each step depends on the previous):
1. `VideoProps` TypeScript interface (everything references this)
2. `generate-props.ts` (Supabase queries → VideoProps)
3. `generate-script.ts` (VideoProps → VO script)
4. Voice alignment helper (script → audio + timestamps)
5. Scene components (one at a time, test each)
6. CaptionBand wiring to alignment JSON
7. Inngest pipeline orchestration
8. YouTube upload function
9. Shorts compositions

**Do NOT skip ahead.** Each component must be verified working before building the next.

## 6. VERIFICATION AT EVERY STEP

After completing each component:
- [ ] TypeScript compiles clean (`pnpm tsc --noEmit`)
- [ ] All tests pass (`pnpm vitest run`)
- [ ] Component renders without errors (for visual components: `npx remotion still`)
- [ ] Code matches the spec in the skill files — diff your implementation against the spec
- [ ] No regressions on existing functionality
- [ ] Commit with a descriptive message. Do NOT batch unrelated changes.

## 7. WHAT "DONE" LOOKS LIKE

A component is NOT done until:
- It compiles
- It has tests
- It renders correctly
- It matches the skill file spec
- It integrates with the components built before it
- You have verified all of the above, not just asserted it

## 8. RED FLAGS — STOP AND ASK

If any of these occur, STOP and report to Matt before continuing:
- Supabase query returns unexpected results (count off by >10%)
- A skill file spec is ambiguous or contradictory
- An existing component breaks when integrating new code
- You need to modify existing code outside `video/market-report/` or `skills/youtube-market-reports/`
- API rate limits or quota issues
- Any test fails that you can't fix within 15 minutes
- You're tempted to skip a test or verification step

## 9. ANTI-PATTERNS — ABSOLUTELY FORBIDDEN

- No placeholder data. Every number must come from a real query.
- No "TODO: implement later" comments without a corresponding test that fails.
- No copy-paste from Stack Overflow or AI training data without understanding and adapting.
- No skipping the portrait (1080x1920) render check on scene components.
- No committing broken code "to fix later."
- No sampling or generalizing — verify exhaustively.
- No fabricating numbers to fill in gaps. If data is missing, surface it.

## 10. FINAL INTEGRATION TEST

Before declaring the pipeline complete:
- Run the full pipeline end-to-end for Bend, April 2026
- Verify: data fetch → script generation → voice synthesis → alignment → scene render → composite video → export MP4
- The output MP4 must play without errors in a video player
- Every number visible in the video must match the Supabase query results
- Caption timing must match the audio within ±200ms
