#!/usr/bin/env python3
"""
Gate 1 — pull the full Schoolhouse Rd photo library, build thumbnails, emit manifest.

Sources:
  Drive folder `images-for-web-or-mls`         id 1-K9eJBQ6WnXhWmXjNpV9UtYgBZ1j29HT  (89 photos, ~500KB each, 1920px long edge)
  Drive folder `Snowdrift / Vandevert / Photo` id 19R3YwbL-3Hrx3lpqBLY5MSPKO824CYSx  (2 area-guide JPGs)
  Local       listing_video_v4/public/images/historic/  (13 family + 1 architect)

Output:
  listing_video_v4/public/v5_library/modern/<N>-web-or-mls-<src>.jpg
  listing_video_v4/public/v5_library/snowdrift/<file>.jpg
  listing_video_v4/public/v5_library/historic/<file>.jpg     (copied from existing historic/)
  listing_video_v4/public/v5_library/thumbs/<key>.jpg        (480px long edge JPEG)
  listing_video_v4/public/v5_library/manifest.json
"""

import io, json, os, re, shutil, sys
from pathlib import Path

ROOT = Path("/Users/matthewryan/RyanRealty/listing_video_v4")
OUT = ROOT / "public" / "v5_library"
THUMBS = OUT / "thumbs"
MODERN = OUT / "modern"
SNOW = OUT / "snowdrift"
HIST = OUT / "historic"
for d in (MODERN, SNOW, HIST, THUMBS):
    d.mkdir(parents=True, exist_ok=True)

WEB_FOLDER_ID = "1-K9eJBQ6WnXhWmXjNpV9UtYgBZ1j29HT"
SNOW_FOLDER_ID = "19R3YwbL-3Hrx3lpqBLY5MSPKO824CYSx"

# -----------------------------------------------------------------------------
# env
def load_env(path: Path):
    env = {}
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip().strip('"').strip("'")
        env[k.strip()] = v
    return env

# -----------------------------------------------------------------------------
# auth — use viewer@ service account from gcloud legacy_credentials (the SA in
# .env.local is ga4-data-api@ which is GA4-only). viewer@ has DWD per
# reference_google_drive_sync.md and impersonates matt@ for full Drive access.
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

SA_KEY = Path("/Users/matthewryan/.config/gcloud/legacy_credentials/viewer@ryanrealty.iam.gserviceaccount.com/adc.json")
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
creds = service_account.Credentials.from_service_account_file(str(SA_KEY), scopes=SCOPES)
delegated = creds.with_subject("matt@ryan-realty.com")  # DWD impersonation
drive = build("drive", "v3", credentials=delegated, cache_discovery=False)

# -----------------------------------------------------------------------------
def list_folder(folder_id):
    files, page = [], None
    while True:
        resp = drive.files().list(
            q=f"'{folder_id}' in parents and trashed=false",
            fields="nextPageToken, files(id, name, size, mimeType)",
            pageSize=200,
            pageToken=page,
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
        ).execute()
        files.extend(resp.get("files", []))
        page = resp.get("nextPageToken")
        if not page:
            break
    return files

def download(file_id, out_path):
    if out_path.exists() and out_path.stat().st_size > 1024:
        return False  # already there
    req = drive.files().get_media(fileId=file_id)
    buf = io.BytesIO()
    dl = MediaIoBaseDownload(buf, req)
    done = False
    while not done:
        _, done = dl.next_chunk()
    out_path.write_bytes(buf.getvalue())
    return True

# -----------------------------------------------------------------------------
from PIL import Image

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

# -----------------------------------------------------------------------------
manifest = {"groups": {}, "stats": {}}

def num_from_web_name(name: str):
    m = re.match(r"^(\d+)-web-or-mls-", name)
    return int(m.group(1)) if m else 9999

def is_drone(name: str):
    return "DJI_" in name

# 1. Modern listing photos from Drive (89)
print("==> Listing web-or-mls folder", file=sys.stderr)
web_files = list_folder(WEB_FOLDER_ID)
print(f"   {len(web_files)} files", file=sys.stderr)

modern_drone, modern_other = [], []
for f in sorted(web_files, key=lambda x: num_from_web_name(x["name"])):
    if not f["name"].lower().endswith((".jpg", ".jpeg")):
        continue
    out = MODERN / f["name"]
    fresh = download(f["id"], out)
    w, h = real_dim(out)
    thumb = THUMBS / f"modern__{f['name']}"
    make_thumb(out, thumb)
    rec = {
        "key": f"modern__{f['name']}",
        "src": f"v5_library/modern/{f['name']}",
        "thumb": f"v5_library/thumbs/modern__{f['name']}",
        "filename": f["name"],
        "category": "Modern Drone Aerial" if is_drone(f["name"]) else "Modern Listing Photo",
        "number": num_from_web_name(f["name"]),
        "width": w, "height": h, "aspect": round(w/h, 3),
        "orient": "landscape" if w > h else ("portrait" if h > w else "square"),
        "size_bytes": out.stat().st_size,
        "drive_id": f["id"],
    }
    (modern_drone if is_drone(f["name"]) else modern_other).append(rec)
    print(f"   {'NEW' if fresh else 'OK '} {f['name']} {w}x{h}", file=sys.stderr)

manifest["groups"]["Modern Listing Photo"] = modern_other
manifest["groups"]["Modern Drone Aerial"] = modern_drone

# 2. Snowdrift area-guide stills (2)
print("==> Listing Snowdrift folder", file=sys.stderr)
snow_files = list_folder(SNOW_FOLDER_ID)
snow_records = []
for f in sorted(snow_files, key=lambda x: x["name"]):
    if not f["name"].lower().endswith((".jpg", ".jpeg")):
        continue
    out = SNOW / f["name"]
    fresh = download(f["id"], out)
    w, h = real_dim(out)
    thumb = THUMBS / f"snowdrift__{f['name']}"
    make_thumb(out, thumb)
    snow_records.append({
        "key": f"snowdrift__{f['name']}",
        "src": f"v5_library/snowdrift/{f['name']}",
        "thumb": f"v5_library/thumbs/snowdrift__{f['name']}",
        "filename": f["name"],
        "category": "Place Context (Snowdrift area guide)",
        "width": w, "height": h, "aspect": round(w/h, 3),
        "orient": "landscape" if w > h else ("portrait" if h > w else "square"),
        "size_bytes": out.stat().st_size,
        "drive_id": f["id"],
    })
    print(f"   {'NEW' if fresh else 'OK '} {f['name']} {w}x{h}", file=sys.stderr)

manifest["groups"]["Place Context (Snowdrift area guide)"] = snow_records

# 3. Existing historic photos (copy to v5 lib, build thumbs)
print("==> Indexing existing historic library", file=sys.stderr)
HISTORIC_SRC = ROOT / "public" / "images" / "historic"
hist_records, arch_records = [], []
HISTORIC_DESC = {
    "01_homestead_cabin.jpg":           ("Vandevert Family", "1892 homestead cabin on the original 320-acre claim"),
    "02_william_plutarch_vandevert.jpg":("Vandevert Family", "William Plutarch Vandevert, founder, Oregon's first forest ranger"),
    "02b_wpv_portrait_hdr.jpg":         ("Vandevert Family", "William P. Vandevert portrait, HDR-restored"),
    "03_william_p_with_cane.jpg":       ("Vandevert Family", "William P. Vandevert later years, with cane"),
    "04_sadie_mittye_maude_1910.jpg":   ("Vandevert Family", "Sadie with daughters Mittye and Maude, c. 1910"),
    "04b_sadie_solo_crop.jpg":          ("Vandevert Family", "Sadie Vandevert, solo crop from family photo"),
    "04c_sadie_face.jpg":               ("Vandevert Family", "Sadie Vandevert, tight face crop"),
    "05_cattle_in_snow_1920.jpg":       ("Vandevert Ranch Life", "Cattle in snow on the ranch, c. 1920"),
    "06_barn_and_homestead.jpg":        ("Vandevert Ranch Life", "Barn and homestead structures"),
    "07_sheep_with_cattle.jpg":         ("Vandevert Ranch Life", "Sheep grazing with cattle"),
    "08_people_on_porch.jpg":           ("Vandevert Family", "Family group gathered on the homestead porch"),
    "09_family_rockpile.jpg":           ("Vandevert Family", "Family at the rockpile"),
    "10_vandevert_barn_powell_butte.jpg":("Vandevert Ranch Life", "Vandevert barn at Powell Butte"),
    "11_grown_children.jpg":            ("Vandevert Family", "Vandevert children, grown"),
    "12_tippie_by_homestead.jpg":       ("Vandevert Ranch Life", "Tippie by the homestead"),
    "architect_locati.jpg":             ("Architect — Jerry Locati", "Jerry Locati, AIA, of Locati Architects (Bozeman MT)"),
}
for src in sorted(HISTORIC_SRC.glob("*.jpg")):
    dst = HIST / src.name
    if not dst.exists():
        shutil.copy2(src, dst)
    w, h = real_dim(dst)
    thumb = THUMBS / f"historic__{src.name}"
    make_thumb(dst, thumb)
    cat, desc = HISTORIC_DESC.get(src.name, ("Vandevert Family", src.name))
    rec = {
        "key": f"historic__{src.name}",
        "src": f"v5_library/historic/{src.name}",
        "thumb": f"v5_library/thumbs/historic__{src.name}",
        "filename": src.name,
        "category": cat,
        "description": desc,
        "width": w, "height": h, "aspect": round(w/h, 3),
        "orient": "landscape" if w > h else ("portrait" if h > w else "square"),
        "size_bytes": dst.stat().st_size,
    }
    (arch_records if cat.startswith("Architect") else hist_records).append(rec)

# group historic by ranch life vs family
fam = [r for r in hist_records if r["category"] == "Vandevert Family"]
life = [r for r in hist_records if r["category"] == "Vandevert Ranch Life"]
school = [r for r in hist_records if r["category"] == "The Schoolhouse / Harper School (historic)"]
manifest["groups"]["Vandevert Family (historic)"] = fam
manifest["groups"]["Vandevert Ranch Life (historic)"] = life
if school:
    manifest["groups"]["The Schoolhouse / Harper School (historic)"] = school
manifest["groups"]["Architect — Jerry Locati"] = arch_records

# 4. Extra historic — new photos from vandevertranch.org (vandevert_hoa.org)
# Source: vandevertranch.org public website (Vandevert family archive / Grace Vandevert McNellis collection)
# Usage: single property listing video, crediting ranch history. No copyright restriction on source site.
print("==> Indexing extra historic (web + drive)", file=sys.stderr)
HIST_EXTRA_WEB = OUT / "historic_extra_web"
HIST_EXTRA_DRIVE = OUT / "historic_extra_drive"

EXTRA_DESC = {
    # Vandevert Ranch Life (historic_v2_extra — Pinterest / Ted Haynes board / vandevertranch.org)
    "vr_elk_ford_little_deschutes.jpg":  ("Vandevert Ranch Life (historic)", "Elk herd fording the Little Deschutes River on Vandevert Ranch — wildlife endemic to the property. Photo by David M., source: vandevertranch.org via Pinterest (Ted Haynes board, 2026-04-24)"),
    "vr_barn_newberry_crater.jpg":       ("Vandevert Ranch Life (historic)", "Vandevert Ranch barn/arena seen from pasture with Newberry Crater on horizon. Source: vandevertranch.org via Pinterest (Ted Haynes board, 2026-04-24)"),
    # Schoolhouse (historic_v2_extra)
    "vr_school_interior_restored.jpg":   ("The Schoolhouse / Harper School (historic)", "Interior of the restored one-room Vandevert School (originally Harper School, built 1925, moved to ranch 1929, restored 1990) -- student desks, chalkboard, potbelly stove, wall displays. Source: vandevertranch.org via Pinterest (Ted Haynes board, 2026-04-24)"),
    # Vandevert Family
    "vr_sadie_girl.jpg":           ("Vandevert Family (historic)", "Sadie Vinceheller Vandevert, young woman, undated (pre-marriage 1880), source: vandevertranch.org/sadie_vincenheller.html"),
    "vr_sadie_one_hand.jpg":       ("Vandevert Family (historic)", "Sadie Vinceheller Vandevert, portrait, undated, source: vandevertranch.org/sadie_vincenheller.html"),
    "vr_dec31_1914.jpg":           ("Vandevert Family (historic)", "Vandevert family gathering, December 31, 1914, source: vandevertranch.org/family_photos.html"),
    "vr_family_on_porch.jpg":      ("Vandevert Family (historic)", "Vandevert family group on homestead porch, undated, source: vandevertranch.org/family_photos.html"),
    "vr_women_on_porch.jpg":       ("Vandevert Family (historic)", "Vandevert women on the homestead porch, undated, source: vandevertranch.org/family_photos.html"),
    "vr_claude_at_school_pump.jpg":("Vandevert Family (historic)", "Claude Vandevert at school water pump, undated, source: vandevertranch.org/family_photos.html"),
    "vr_charlie_dick_joshua.jpg":  ("Vandevert Family (historic)", "Vandevert family members Charlie, Dick, and Joshua, undated, source: vandevertranch.org/history_book_addendum.html"),
    "vr_claude_sr_and_jr.jpg":     ("Vandevert Family (historic)", "Claude Vandevert Sr. and Claude Vandevert Jr., undated, source: vandevertranch.org/history_book_addendum.html"),
    "vr_claude_w_barbara_danny.jpg":("Vandevert Family (historic)", "Claude Vandevert with family: Barbara, Danny, Vince, and Alan, undated, source: vandevertranch.org/history_book_addendum.html"),
    "vr_bride_groom.jpg":          ("Vandevert Family (historic)", "Vandevert family wedding portrait, undated, source: vandevertranch.org/history_book_addendum.html"),
    "vr_catlow_wedding_1.jpg":     ("Vandevert Family (historic)", "Catlow family wedding photo, c. early 1900s (Catlow family connected to Vandevert Ranch history), source: vandevertranch.org/history.html"),
    "vr_piano_family.jpg":         ("Vandevert Family (historic)", "Vandevert family gathered around the piano, undated, source: vandevertranch.org/stories.html"),
    "vr_xmas_1940.jpg":            ("Vandevert Family (historic)", "Vandevert family Christmas gathering, 1940, source: vandevertranch.org/stories.html"),
    # Vandevert Ranch Life
    "vr_garden_1941.jpg":          ("Vandevert Ranch Life (historic)", "Vandevert ranch garden, 1941, source: vandevertranch.org/history_book_addendum.html"),
    "vr_people_on_footbridge.jpg": ("Vandevert Ranch Life (historic)", "Vandevert family on footbridge over Little Deschutes River, undated, source: vandevertranch.org/history_book_addendum.html"),
    "vr_people_with_surrey.jpg":   ("Vandevert Ranch Life (historic)", "Vandevert family with horse-drawn surrey, c. 1900-1915, source: vandevertranch.org/history_book_addendum.html"),
    "vr_stagecoach.jpg":           ("Vandevert Ranch Life (historic)", "Stagecoach at Vandevert Ranch, c. 1890s-1910s -- ranch served as stagecoach stop, source: vandevertranch.org/history_book_addendum.html"),
    "vr_sheep_dip.jpg":            ("Vandevert Ranch Life (historic)", "Sheep dipping operation on Vandevert Ranch, undated, source: vandevertranch.org/stories.html"),
    "vr_sheep_bridge.jpg":         ("Vandevert Ranch Life (historic)", "Vandevert sheep crossing bridge, undated, source: vandevertranch.org/stories.html"),
    "vr_sheep_west_of_river.jpg":  ("Vandevert Ranch Life (historic)", "Vandevert sheep west of the Little Deschutes River, undated, source: vandevertranch.org/stories.html"),
    "vr_workshop_barn_looking_east.jpg": ("Vandevert Ranch Life (historic)", "Vandevert ranch workshop and barn, looking east, undated, source: vandevertranch.org/history_book_addendum.html"),
    "vr_uncle_clints_car.jpg":     ("Vandevert Ranch Life (historic)", "Uncle Clint Vandevert's automobile at the ranch, c. 1920s-30s, source: vandevertranch.org/stories.html"),
    "vr_ford_model_t_1916_claude.jpg": ("Vandevert Ranch Life (historic)", "Ford Model T, 1916, with Claude Vandevert in Oregon, source: vandevertranch.org/history_book_addendum.html"),
    "vr_franklin_model_h_1909.jpg":("Vandevert Ranch Life (historic)", "Franklin Model H automobile, 1909 or 1910, Vandevert Ranch, source: vandevertranch.org/history_book_addendum.html"),
    "vr_map_1935.jpg":             ("Vandevert Ranch Life (historic)", "Vandevert Ranch property map, 1935 -- shows original homestead layout, Little Deschutes River, roads, source: vandevertranch.org/map1935.html"),
    "vr_zane_grey_hashknife.jpg":  ("Vandevert Ranch Life (historic)", "Zane Grey portrait -- Grey wrote about the Hash Knife Outfit (Arizona cattle operation) where William Vandevert worked 1876 onward before settling Oregon, source: vandevertranch.org/hashknife_brand.html"),
    "vr_vandevert_road_sign.jpg":  ("Vandevert Ranch Life (historic)", "Vandevert Road sign -- the road named after the family that homesteaded this land in 1892, source: vandevertranch.org/history_book_addendum.html"),
    # Schoolhouse
    "vr_school_exterior_old.jpg":  ("The Schoolhouse / Harper School (historic)", "Harper School (the Schoolhouse) exterior, historic view -- one-room schoolhouse relocated to Vandevert Ranch in 1929, operated until 1950s, source: vandevertranch.org/harper_school.html"),
}

extra_fam2, extra_life2, extra_school2 = [], [], []

HIST_EXTRA_V2 = OUT / "historic_v2_extra"

for src_dir in [HIST_EXTRA_WEB, HIST_EXTRA_DRIVE, HIST_EXTRA_V2]:
    if not src_dir.exists():
        continue
    for src in sorted(src_dir.glob("*.jpg")):
        dst = HIST / src.name
        if not dst.exists():
            shutil.copy2(src, dst)
        w, h = real_dim(dst)
        thumb = THUMBS / f"historic__{src.name}"
        make_thumb(dst, thumb)
        cat, desc = EXTRA_DESC.get(src.name, ("Vandevert Ranch Life (historic)", f"{src.name} — source: vandevertranch.org"))
        rec = {
            "key": f"historic__{src.name}",
            "src": f"v5_library/historic/{src.name}",
            "thumb": f"v5_library/thumbs/historic__{src.name}",
            "filename": src.name,
            "category": cat,
            "description": desc,
            "width": w, "height": h, "aspect": round(w/h, 3),
            "orient": "landscape" if w > h else ("portrait" if h > w else "square"),
            "size_bytes": dst.stat().st_size,
            "source": "vandevertranch.org",
        }
        if "Schoolhouse" in cat:
            extra_school2.append(rec)
        elif "Ranch Life" in cat:
            extra_life2.append(rec)
        else:
            extra_fam2.append(rec)
        print(f"   OK  {src.name} {w}x{h}", file=sys.stderr)

# Merge extra into manifest groups
manifest["groups"]["Vandevert Family (historic)"].extend(extra_fam2)
manifest["groups"]["Vandevert Ranch Life (historic)"].extend(extra_life2)
if extra_school2:
    manifest["groups"].setdefault("The Schoolhouse / Harper School (historic)", []).extend(extra_school2)

# 5. Stats
total = sum(len(g) for g in manifest["groups"].values())
manifest["stats"] = {
    "total_photos": total,
    "groups": {k: len(v) for k, v in manifest["groups"].items()},
    "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
}

(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
print(f"==> Manifest: {OUT/'manifest.json'} ({total} photos total)", file=sys.stderr)
for k, n in manifest["stats"]["groups"].items():
    print(f"     {n:3d}  {k}", file=sys.stderr)
