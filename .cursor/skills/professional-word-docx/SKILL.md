---
name: professional-word-docx
description: >-
  Use when generating or refactoring Word (.docx) output with the docx npm
  package so tables, sections, and typography stay readable in Word and in
  print. Applies to compliance briefs, data appendices, and long tabular
  reports.
---

# Professional Word documents (docx npm)

## When this applies

Any script that builds `Document` from `docx` for human review, especially multi column tables and mixed narrative plus data.

## Typography

- `TextRun` **size** is in **half points** (Word `w:sz`). 24 = 12 pt, 28 = 14 pt. Body tables should be at least **26 half pt (13 pt)**; headers **28 to 32 half pt**.
- Prefer **Calibri** or another common system font in `styles.default.document.run.font`.
- Set paragraph **line spacing** in tables (`spacing.line` ~ 276, `lineRule: LineRuleType.AUTO`) so wrapped cells do not look cramped.

## Many fields per record (default pattern)

**Prefer stacked label and value tables over wide grids.** One record equals one two column table (narrow label column about 22 to 28 percent, wide value column). Repeat for each file or row. Humans read this reliably in portrait. Nine column spreadsheets inside Word almost always become unreadable even in landscape.

If you truly need a matrix, cap columns at **four or five** or accept a dedicated landscape appendix and still test in Word.

## Table mechanics

- Set `layout: TableLayoutType.FIXED` and **percentage widths that sum to 100**.
- Put **`verticalAlign: VerticalAlign.TOP`** on every `TableCell`.
- Avoid **colspan** header rows spanning the whole grid.
- **Trim** very long strings in value cells but give notes and pipeline enough room (thousands of characters in one wide cell beats hundreds split across nine columns).

## Checklist before shipping a generator

- [ ] Each logical record is readable without zooming in portrait.
- [ ] Table body font at least 13 pt equivalent in value cells.
- [ ] FIXED layout, TOP vertical align, width percentages sum to 100.
- [ ] Open the output in **Microsoft Word** (not only VS Code binary preview) before calling it done.

## Reference implementation

`scripts/skyslope-forms-principal-brief-docx.mjs` (principal broker SkySlope brief).
