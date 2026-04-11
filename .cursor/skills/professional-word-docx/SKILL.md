---
name: professional-word-docx
description: >-
  Use when generating or refactoring Word (.docx) output with the docx npm
  package so layout, sections, and typography stay readable in Word and in
  print. Applies to compliance briefs, data appendices, and long narrative
  reports.
---

# Professional Word documents (docx npm)

## When this applies

Any script that builds `Document` from `docx` for human review, especially mixed narrative plus many labeled fields per record.

## Typography

- `TextRun` **size** is in **half points** (Word `w:sz`). 24 = 12 pt, 26 = 13 pt, 28 = 14 pt. Body text should stay at least **24 half pt (12 pt)** for long passages; use **26 half pt** when a value is a long paragraph.
- Prefer **Calibri** or another common system font in `styles.default.document.run.font`.
- Set paragraph **line spacing** (`spacing.line` ~ 300 to 360, `lineRule: LineRuleType.AUTO`) so wrapped blocks do not look cramped.

## Many fields per record (default pattern for narrative briefs)

**Prefer stacked paragraphs over Word tables.** For each field emit a small **bold label** on its own line, then the **value on the next line** at the full page width. Repeat for each file or row. Word wraps normally; nothing is locked in grid cells or grey table bands.

Use **two column label or value tables** only when the audience truly needs scanable rows and columns (for example a short run summary with a handful of uniform rows). Never use wide multi column matrices inside Word for principal broker style briefs. Nine column spreadsheets inside Word almost always become unreadable even in landscape.

If you truly need a matrix, cap columns at **four or five** or accept a dedicated landscape appendix and still test in Word.

## When you still use tables

- Set `layout: TableLayoutType.FIXED` and **percentage widths that sum to 100**.
- Put **`verticalAlign: VerticalAlign.TOP`** on every `TableCell`.
- Avoid **colspan** header rows spanning the whole grid.
- **Trim** very long strings in value cells but give notes and pipeline enough room in one wide cell.

## Checklist before shipping a generator

- [ ] Each logical record is readable without zooming in portrait.
- [ ] Long values use full page width (paragraphs or one wide value column), not squeezed cells.
- [ ] If tables are used, body font at least 12 pt equivalent, FIXED layout, TOP vertical align, width percentages sum to 100.
- [ ] Open the output in **Microsoft Word** (not only VS Code binary preview) before calling it done.

## Reference implementation

`scripts/skyslope-forms-principal-brief-docx.mjs` (principal broker SkySlope brief, paragraph stacked fields, no body tables).
