#!/usr/bin/env python3
"""Extend manifest.json with the historic_v2_extra/ photos, generate thumbs."""
import warnings; warnings.filterwarnings("ignore", category=FutureWarning)
import json, sys
from pathlib import Path
from PIL import Image

ROOT = Path("/Users/matthewryan/RyanRealty/listing_video_v4")
LIB = ROOT / "public" / "v5_library"
EXTRA = LIB / "historic_v2_extra"
HIST = LIB / "historic"
THUMBS = LIB / "thumbs"
MANIFEST = LIB / "manifest.json"

# Per historic_sources.md (verified) — three new photos sourced via Ted Haynes Pinterest board (book co-author, vandevertranch.org provenance)
NEW_PHOTOS = {
    "vr_barn_newberry_crater.jpg": {
        "category": "Vandevert Ranch Life (historic)",
        "description": "Vandevert Ranch barn seen from pasture with Newberry Crater on horizon (modern color photo, place-context shot of the ranch landscape).",
    },
    "vr_elk_ford_little_deschutes.jpg": {
        "category": "Vandevert Ranch Life (historic)",
        "description": "Elk herd fording the Little Deschutes River on Vandevert Ranch (modern wildlife photo by David M., shows the river endemic to the property).",
    },
    "vr_school_interior_restored.jpg": {
        "category": "The Schoolhouse / Harper School (historic)",
        "description": "Interior of the one-room Harper School (built 1925, moved to Vandevert Ranch 1929, restored 1990) — student desks, chalkboard, potbelly stove.",
    },
}

def make_thumb(src: Path, dst: Path, max_edge=480, q=82):
    if dst.exists() and dst.stat().st_size > 1024:
        return Image.open(src).size
    img = Image.open(src)
    img = img.convert("RGB") if img.mode != "RGB" else img
    w, h = img.size
    scale = max_edge / max(w, h)
    if scale < 1:
        img.thumbnail((int(w*scale), int(h*scale)), Image.LANCZOS)
    img.save(dst, "JPEG", quality=q, optimize=True, progressive=True)
    return (w, h)

def real_dim(p: Path):
    with Image.open(p) as im:
        return im.size

# Load existing manifest
manifest = json.loads(MANIFEST.read_text())

# Move files from historic_v2_extra/ to historic/ for unified location
for fname, meta in NEW_PHOTOS.items():
    src_extra = EXTRA / fname
    dst_hist = HIST / fname
    if not src_extra.exists():
        print(f"!! Missing {src_extra}", file=sys.stderr)
        continue
    if not dst_hist.exists():
        import shutil
        shutil.copy2(src_extra, dst_hist)
    w, h = real_dim(dst_hist)
    thumb = THUMBS / f"historic__{fname}"
    make_thumb(dst_hist, thumb)
    rec = {
        "key": f"historic__{fname}",
        "src": f"v5_library/historic/{fname}",
        "thumb": f"v5_library/thumbs/historic__{fname}",
        "filename": fname,
        "category": meta["category"],
        "description": meta["description"],
        "width": w, "height": h, "aspect": round(w/h, 3),
        "orient": "landscape" if w > h else ("portrait" if h > w else "square"),
        "size_bytes": dst_hist.stat().st_size,
    }
    # ensure group exists
    cat = meta["category"]
    if cat not in manifest["groups"]:
        manifest["groups"][cat] = []
    # skip if already in
    existing = {r["key"] for r in manifest["groups"][cat]}
    if rec["key"] not in existing:
        manifest["groups"][cat].append(rec)
        print(f"   ADD {fname} -> {cat} ({w}x{h})", file=sys.stderr)
    else:
        print(f"   SKIP {fname} (already in manifest)", file=sys.stderr)

# Refresh stats
total = sum(len(g) for g in manifest["groups"].values())
manifest["stats"] = {
    "total_photos": total,
    "groups": {k: len(v) for k, v in manifest["groups"].items()},
    "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
}
MANIFEST.write_text(json.dumps(manifest, indent=2))
print(f"==> Manifest now {total} photos", file=sys.stderr)
for k, n in manifest["stats"]["groups"].items():
    print(f"     {n:3d}  {k}", file=sys.stderr)
