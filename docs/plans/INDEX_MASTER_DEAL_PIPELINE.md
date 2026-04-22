# INDEX Master Deal File pipeline (recovered from Cowork)

The **INDEX** Cowork session (`keen-pensive-bohr`, transcript `f3ffe3e2-3147-43ce-a244-e8d867217429`) built v20/v21 using **`build_manifest.py` → `manifest.json` → `build_docx.js`**, not the simplified canonical-only script that briefly lived in this repo.

## On-disk recovery (Matt’s Mac)

Source files were **extracted from the session JSONL** (last `Write` per path) into:

`Documents/Claude/Projects/TRANSACTION COORDINATOR/INDEX_cowork_recovery/`

- `build_v20/build_manifest.py` — Matt’s section order, thumbnails, canonical `transactions.v3.json`
- `build_v20/build_docx.js` — v17 navy/gold card layout, thumbnails, commission bar, ETR copy
- `send_v20.py`, `send_v21.py`, Drive upload helpers, `merge_patches.py` — same as INDEX used

Paths inside `build_manifest.py` / `build_docx.js` are patched to use **`TC_ROOT`** (default: that `TRANSACTION COORDINATOR` folder) and **`BUILD_V20`** / `MANIFEST_OUT` / `OUT_PATH` overrides as needed.

## Regenerate the Master Deal File (same logic as INDEX)

```bash
export TC_ROOT="$HOME/Documents/Claude/Projects/TRANSACTION COORDINATOR"
export BUILD_V20="$TC_ROOT/INDEX_cowork_recovery/build_v20"

python3 "$BUILD_V20/build_manifest.py"

export NODE_PATH="$HOME/RyanRealty/node_modules"   # or path to this repo’s node_modules
node "$BUILD_V20/build_docx.js"
```

Default output: **`$TC_ROOT/Ryan_Realty_Master_Deal_File_v22_INDEX_pipeline.docx`**

Override output path:

```bash
OUT_PATH="$TC_ROOT/Ryan_Realty_Master_Deal_File_v23.docx" node "$BUILD_V20/build_docx.js"
```

## If you update recovery scripts

Re-extract from transcript only when necessary; otherwise edit the copies under `INDEX_cowork_recovery/` and keep **`docs/plans/CROSS_AGENT_HANDOFF.md`** current when switching tools.

## Transcript location (audit)

`~/Library/Application Support/Claude/local-agent-mode-sessions/f3aea35d-324b-4df4-a3ca-a265239c30ad/e399b1dc-7d6a-418b-8a3c-c124774e5958/local_ae6b5dc7-2bc8-4a56-8efb-37e56e23f364/.claude/projects/-sessions-keen-pensive-bohr/f3ffe3e2-3147-43ce-a244-e8d867217429.jsonl`
