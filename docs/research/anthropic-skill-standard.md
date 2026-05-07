# Anthropic SKILL.md Standard (Verified 2026-05-06)

Sources verified live:
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- https://code.claude.com/docs/en/skills (Claude Code-specific extensions)
- `anthropic-skills:skill-creator` plugin (locally installed, version verified)
- Anthropic bundled skills: `docx`, `pdf`, `pptx`, `xlsx`, `algorithmic-art`, etc. (local install)

---

## Canonical Frontmatter Fields

### Required vs Recommended vs Optional

The platform.claude.com spec says:

> "Required fields: `name` and `description`"

The code.claude.com spec (Claude Code-specific) says:

> "All fields are optional. Only `description` is recommended so Claude knows when to use the skill."

**Reconciliation:** In the Claude API / claude.ai context, `name` and `description` are required. In Claude Code specifically, `name` defaults to the directory name if omitted, so technically only `description` is required. For our repo (Claude Code + Cursor), treat `name` + `description` as **required** for clarity and cross-surface compatibility.

---

## Complete Frontmatter Field Reference

### Claude Code frontmatter (canonical as of 2026-05-06)

| Field | Required | Type | Constraints |
|---|---|---|---|
| `name` | Recommended | string | Max 64 chars. Lowercase letters, numbers, hyphens only. Cannot contain "anthropic" or "claude". If omitted, uses directory name. |
| `description` | Required | string | Max 1,024 chars (platform API). In Claude Code: combined `description` + `when_to_use` capped at 1,536 chars in the skill listing. Cannot contain XML tags. |
| `when_to_use` | No | string | Additional trigger phrases appended to `description` in the listing. Counts toward the 1,536-char cap. Put here what doesn't fit in `description`. |
| `disable-model-invocation` | No | boolean | `true` = only user can invoke (slash command). Removes skill from Claude's context entirely. Default: `false`. |
| `user-invocable` | No | boolean | `false` = hides from `/` menu but Claude can still auto-invoke. Default: `true`. |
| `allowed-tools` | No | string or list | Space-separated tool names Claude can use without approval when this skill is active. Example: `Read Grep Bash(git *)`. Claude Code only — not honored via API (use `allowedTools` in query config instead). |
| `argument-hint` | No | string | Autocomplete hint. Example: `[issue-number]` |
| `arguments` | No | string or list | Named positional args for `$name` substitution. Maps names to positions. |
| `model` | No | string | Model override for duration of turn. Values same as `/model` command. `inherit` = keep session model. |
| `effort` | No | string | Effort level override. Options: `low`, `medium`, `high`, `xhigh`, `max`. |
| `context` | No | string | `fork` = run in a forked subagent. Skill content becomes the subagent's prompt. |
| `agent` | No | string | Which subagent type when `context: fork`. Options: `Explore`, `Plan`, `general-purpose`, or any custom `.claude/agents/` subagent name. |
| `hooks` | No | object | Lifecycle hooks scoped to this skill. See hooks docs. |
| `paths` | No | string or list | Glob patterns. When set, Claude only auto-activates this skill when working with matching files. |
| `shell` | No | string | `bash` (default) or `powershell` for `` !`command` `` injection blocks. |
| `license` | No | string | Non-functional. Used by Anthropic's own bundled skills for attribution (e.g., `Proprietary. LICENSE.txt has complete terms`). No harness behavior — informational only. |

**Fields seen in Cursor skills (not in Claude Code spec):**
- `disable-model-invocation: true` is shared between Cursor and Claude Code — same behavior.
- Cursor's `create-skill` doc also references this field with identical semantics.

**Fields NOT in spec (do not invent):**
- `compatibility` — appears in some third-party guides but is NOT in the official Anthropic docs. Do not use.
- `version` — not in spec.
- `tags` — not in spec.
- `author` — not in spec.

---

## Description: The Triggering Mechanism

This is the most important field for token efficiency and correct invocation.

### How the harness uses it

1. **At startup:** Only `name` + `description` (+ `when_to_use` if present) load into the system prompt — approximately 100 tokens per skill. The skill body does NOT load.
2. **On trigger:** When user input semantically matches the description, Claude reads SKILL.md from the filesystem via bash. Only then does the body enter context.
3. **Description cap:** `description` + `when_to_use` combined are truncated at **1,536 characters** in the skill listing. Put the most important trigger phrase first.
4. **Budget:** Total skill description budget scales at 1% of the context window (fallback: 8,000 chars across all skills). High-skill-count sessions can cut descriptions short. This is why `when_to_use` exists — split overflow there.

### Writing rules (from Anthropic)

- Write in **third person** (injected into system prompt — inconsistent POV breaks discovery)
  - Good: "Generates market report videos for Ryan Realty"
  - Bad: "I can help you generate a market report video"
- **Be specific, include key terms** — Claude matches semantically, but specific nouns and action verbs help
- Include both **WHAT** the skill does and **WHEN** to use it
- Lead with the primary use case — truncation hits from the end
- The skill-creator skill explicitly says to make descriptions **"a little bit pushy"** to combat Claude's tendency to undertrigger: instead of "Helps with X", write "Use when the user mentions X, Y, or Z, or asks to do anything involving..."
- **Negative constraints** in the description help disambiguation: `NOT for listing-specific videos (use listing_reveal)`

### Token cost of description (why this matters)

Every skill's description is in context for the ENTIRE session. 20 skills × 200 chars = 4,000 chars of perpetual context. Keep descriptions tight but trigger-complete. The `when_to_use` field is a safety valve for overflow without inflating the primary description.

---

## Three-Level Loading System

```
Level 1: Metadata (always in context, ~100 tokens/skill)
  name + description + when_to_use

Level 2: SKILL.md body (loads on trigger, stays in context for session)
  Main instructions — keep under 500 lines
  After compaction: reattached at up to 5,000 tokens/skill,
  shared budget of 25,000 tokens across all invoked skills

Level 3: Supporting files (loaded on demand, zero cost until accessed)
  reference.md, examples.md, scripts/, assets/
  Scripts EXECUTE via bash — their source never enters context, only output
```

**Critical implication:** Once a skill triggers, its full body stays in context for the entire session (and survives compaction at up to 5,000 tokens). Every token in the body is a **recurring cost per turn** until compaction. Short bodies are not just polite — they are material savings across long sessions.

---

## Recommended Body Structure

Based on the official spec, skill-creator guidance, and pattern analysis of Anthropic's own bundled skills:

```markdown
---
name: skill-name
description: What it does + when to use it. Include key trigger phrases. NOT for X (use Y instead). Keep under ~300 chars to leave room for when_to_use.
when_to_use: Additional trigger phrases, example user requests, edge cases. Appended to description in the listing.
---

# Skill Name

## What it is (1-3 sentences)
Brief context: what task this handles, what the output is, what tool chain it uses.

## When to invoke / When NOT to invoke (optional but recommended)
Short bullet list. "Not for X" saves wasted triggering.

## Hard constraints (required first if compliance rules apply)
Non-negotiable rules. Forbidden actions. Format locks. Reference external spec files
rather than duplicating them.

## Procedure
Numbered steps. Decision branches as needed (conditional workflow pattern).
Keep each step tight — one command or one decision.

## Outputs / Deliverables
What gets produced, where it lands, what format it's in.

## Supporting files (if skill has directory structure)
- `reference.md` — detailed API docs, read when [condition]
- `scripts/validate.py` — run to verify output after each step
- `examples/` — sample outputs showing expected format

## Error handling / Failure modes
What to do when step N fails. Common failure patterns and their fixes.

## See also
Links to sibling skills that chain with this one or handle adjacent cases.
```

### What to leave out (token discipline)

- Background knowledge Claude already has (what a PDF is, how JSON works, etc.)
- History of why decisions were made — keep that in reference files, not the body
- Content that belongs in sibling docs — use `See [reference.md](reference.md)`
- Redundant constraints already in CLAUDE.md — skills load ON TOP of CLAUDE.md, not instead of it

---

## Directory Structure

```
skill-name/
├── SKILL.md               # Required. Main instructions + frontmatter.
├── reference.md           # Optional. Detailed API docs, loaded on demand.
├── examples.md            # Optional. Input/output examples, loaded on demand.
├── examples/
│   └── sample-output.md   # Concrete example files
├── scripts/
│   └── validate.py        # Executed via bash. Source NEVER enters context.
└── assets/
    └── template.json      # Data files, templates, etc.
```

**One level deep:** Reference files must link directly from SKILL.md. Nested references (SKILL.md → advanced.md → details.md) cause partial reads.

**Scripts vs instructions:** If an operation is fragile, repetitive, or deterministic — write a script. Running `python scripts/validate.py` costs only the output tokens, not the script source.

---

## Skill Locations in Claude Code

| Level | Path | Scope |
|---|---|---|
| Enterprise | Managed settings | All org users |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where plugin is enabled |

Precedence: Enterprise > Personal > Project. Plugin skills use `plugin-name:skill-name` namespace and cannot conflict.

---

## Dynamic Context Injection (Claude Code only)

Run shell commands before the skill body reaches Claude:

```yaml
---
name: pr-summary
description: Summarize current pull request changes
---

## Current diff
!`gh pr diff`

## Instructions
Summarize the above...
```

`` !`command` `` is replaced with command output before Claude sees the skill. Fenced block form for multiline:

````markdown
```!
git status --short
npm test 2>&1 | tail -20
```
````

Controlled by `disableSkillShellExecution` in settings (enterprise lockdown).

---

## String Substitutions Available in Body

| Variable | Expands to |
|---|---|
| `$ARGUMENTS` | All args passed when invoking |
| `$ARGUMENTS[N]` | Specific arg by 0-based index |
| `$0`, `$1`, ... | Shorthand for `$ARGUMENTS[N]` |
| `$name` | Named arg declared in `arguments:` frontmatter |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_EFFORT}` | Current effort level |
| `${CLAUDE_SKILL_DIR}` | Absolute path to this skill's directory |

`${CLAUDE_SKILL_DIR}` is particularly useful for referencing bundled scripts regardless of where the skill is installed.

---

## Token Budget Summary

| What | Cost | Notes |
|---|---|---|
| Description in context | ~100 tokens/skill, always | Truncated at 1,536 chars/skill |
| SKILL.md body | Loaded on trigger, stays in session | Keep under 500 lines |
| Body after compaction | Up to 5,000 tokens/skill reattached | Shared budget: 25,000 tokens across all invoked skills |
| Supporting files | Zero until read | Then full file enters context |
| Script source | Zero — never in context | Only output enters context |

---

## Key Differences: Claude Code vs Platform API

| Feature | Claude Code | Platform API |
|---|---|---|
| `name` required? | No (defaults to dir name) | Yes |
| `description` required? | Recommended | Yes |
| `allowed-tools` | Supported in frontmatter | Not honored — use `allowedTools` in query config |
| `disable-model-invocation` | Supported | N/A |
| `user-invocable` | Supported | N/A |
| `context: fork` | Supported | N/A |
| `model` override | Supported | N/A |
| Shell injection `!` | Supported | N/A |
| Skill locations | `~/.claude/skills/`, `.claude/skills/`, plugins | Upload via API |
| Skill sharing | Project (commit to repo) or personal | Workspace-wide |

---

## Checklist: Before Committing a Skill

```
[ ] name: kebab-case, max 64 chars, no "anthropic" or "claude"
[ ] description: third person, specific, includes trigger phrases, under ~300 chars if using when_to_use
[ ] when_to_use: additional triggers if description is getting long
[ ] Combined description + when_to_use under 1,536 chars
[ ] Body under 500 lines
[ ] Hard constraints listed before procedure
[ ] No content Claude already knows (background knowledge)
[ ] Supporting files linked from SKILL.md body (one level deep only)
[ ] No content duplicated from CLAUDE.md or another skill
[ ] If skill produces output, output spec is clear (paths, formats)
[ ] If skill chains to another skill, handoff section names the next skill
[ ] If using scripts, they execute cleanly from ${CLAUDE_SKILL_DIR}
[ ] allowed-tools populated if skill needs specific tools without per-use approval
[ ] disable-model-invocation: true if this should only be manually invoked
```

---

## Our Existing Skills vs This Standard

### Confirmed conforming
- `automation_skills/triggers/listing_trigger/SKILL.md` — correct frontmatter (`name`, `description`), progressive structure, See Also section
- `automation_skills/automation/post_scheduler/SKILL.md` — correct frontmatter, detailed procedure, error handling

### Gaps in our existing skills
1. **No `when_to_use` field used anywhere** — we have long descriptions that would benefit from being split, especially `skills/youtube-market-reports/SKILL.md` (description is 1,200+ chars, close to the 1,536 combined cap)
2. **`video_production_skills/listing_reveal/SKILL.md` description is 47 chars** — almost certainly undertriggering; the trigger phrases are buried in the body rather than the description
3. **`listing_reveal/SKILL.md` missing `when_to_use`** — trigger examples ("new listing", "listing reveal video", "reel for listing") belong in the frontmatter
4. **No skills use `disable-model-invocation: true`** — skills with side effects (render, publish) should consider this
5. **Body line counts not audited** — the 500-line recommendation is a firm guidance; `post_scheduler/SKILL.md` is ~490 lines (fine), but some video skills are longer

### Note on `license` field
Anthropic's own bundled skills use `license:` (e.g., `license: Proprietary. LICENSE.txt has complete terms`). This is informational only — the harness ignores it. It is fine to include for our own attribution purposes but has no functional effect.

---

## Anthropic's Open Skills Repo

The public repo is `github.com/anthropics/skills`. No `spec/agent-skills-spec.md` file exists at that path (returns 404 via API). The spec lives entirely in the platform docs. The repo contains reference implementation skills including `skill-creator`, `claude-api`, and others.

The locally installed `anthropic-skills:skill-creator` plugin (at `/Users/matthewryan/Library/Application Support/Claude/local-agent-mode-sessions/skills-plugin/.../skills/skill-creator/`) is the canonical reference implementation for the skill-creation workflow and eval loop.
