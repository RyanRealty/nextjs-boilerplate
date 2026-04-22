# Cross-agent handoff (Cursor ↔ Claude Cowork / Claude Code)

**Purpose:** The other agent cannot read your chat. Anything not in `git` + this file + `task-registry.json` is invisible. Update this document **before you stop** or when switching tools, so pickup is fast and safe.

**Convention:** Keep the **Current** section accurate. After each handoff, you may move the previous "Current" block under **History** (newest history first) or delete stale bullets—do not let this file become a novel.

---

## Current (replace this block each time you hand off)

| Field | Value |
|--------|--------|
| **Surface** | Cursor / Claude Code (which one?) |
| **Stopped at (UTC)** | YYYY-MM-DD HH:MM |
| **`main` @ commit** | `git rev-parse HEAD` short SHA after push |
| **Task focus** | e.g. BL-011, or describe the thread |

### Done this session

- 

### Next agent should

- 

### Blockers / env / secrets

- (e.g. needs `CRON_SECRET`, Supabase MCP not linked—only facts the next agent needs)

### Skills actually read (paths)

- (list `SKILL.md` paths you loaded—helps the next agent avoid redundant context)

---

## History (optional; newest first)

_(Paste prior "Current" blocks here when you rotate, or leave empty.)_
