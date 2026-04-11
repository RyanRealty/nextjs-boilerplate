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

## Wide tables (four or more dense columns)

1. **Do not rely on portrait** for nine column grids. Word shrinks text until it is unreadable.
2. Use a **second section** with `createPageSize({ orientation: PageOrientation.LANDSCAPE, width: sectionPageSizeDefaults.WIDTH, height: sectionPageSizeDefaults.HEIGHT })` and slightly **tighter margins** (for example 720 twips per side) for the tabular appendix.
3. Keep **cover letter, summary, and glossary** in a **portrait** first section so narrative stays comfortable.

## Table mechanics

- Set `layout: TableLayoutType.FIXED` and **percentage widths that sum to 100** so Word stops auto shrinking unpredictably.
- Put **`verticalAlign: VerticalAlign.TOP`** on every `TableCell` so multi line cells align predictably.
- Avoid a **merged header row** (`columnSpan`) above many narrow columns; Word often miscomputes widths. Prefer **one real header row** with short labels.
- **Trim** long strings before they enter cells (`slice` or a small `trimCell` helper). Prefer **separate columns** over stuffing unrelated fields into one cell.

## Content density

- Long filenames and pipeline strings belong in cells only after truncation; full text can live in a separate appendix or source system.
- If a row still wraps excessively, **drop a column** or **stack a second table** (identity vs analysis) keyed by row order rather than forcing one ultra wide grid.

## Checklist before shipping a generator

- [ ] Portrait vs landscape split matches how reviewers read (narrative vs grid).
- [ ] Table body font at least 13 pt equivalent; headers larger.
- [ ] FIXED layout, TOP vertical align, width percentages sum to 100.
- [ ] No fragile colspan over the full grid width.
- [ ] Open the output in **Microsoft Word** (not only VS Code binary preview) before calling it done.

## Reference implementation

`scripts/skyslope-forms-principal-brief-docx.mjs` (principal broker SkySlope brief).
