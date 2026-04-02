## What Changed

- 

## Why

- 

## Validation

- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] If UI changed, `npm run lint:design-tokens`
- [ ] If route UX changed, quality checks (Lighthouse + a11y) run nightly — trigger manually via Actions > "Quality checks" if needed before merge

## UX Heuristics Checklist

- [ ] Visibility of system status: loading/saving/error states are explicit
- [ ] Match between system and real world: labels and chart units are plain-language
- [ ] User control and freedom: clear cancel/back/close paths are present
- [ ] Consistency and standards: uses `@/components/ui/*` and semantic tokens only
- [ ] Error prevention: destructive actions confirm, forms validate before submit
- [ ] Recognition over recall: controls are discoverable without memorization
- [ ] Flexibility and efficiency: keyboard support exists for key interactions
- [ ] Aesthetic and minimalist design: no redundant elements or duplicate CTAs
- [ ] Help users recover from errors: next-step guidance appears with errors
- [ ] Help and documentation: complex controls include supporting text/tooltip

## UI State Coverage

- [ ] Loading state included
- [ ] Empty state included
- [ ] Error state included
- [ ] Success state included (when applicable)

## Charts and Data Visualization

- [ ] Chart title explains what changed and for what time range
- [ ] Axes and units are labeled
- [ ] Color is not the only way to convey meaning
- [ ] Data is understandable on mobile (legend, labels, touch targets)
- [ ] Non-visual fallback is available (table/text summary/aria context)

## Performance Guardrails

- [ ] Added code-splitting for heavy UI (maps/charts/editors) when applicable
- [ ] Avoided new waterfall fetches
- [ ] Large data requests are paginated, capped, or cached
- [ ] Images use correct `sizes` and avoid unnecessary `priority`
