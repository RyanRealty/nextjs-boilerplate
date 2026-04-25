#!/usr/bin/env python3
"""Build Schoolhouse v5 photo contact sheet — two copies with different thumb path prefixes."""
import json
from pathlib import Path

MANIFEST = Path("/Users/matthewryan/RyanRealty/listing_video_v4/public/v5_library/manifest.json")
OUT_VERCEL = Path("/Users/matthewryan/RyanRealty/public/photo-review-v5.html")
OUT_LOCAL  = Path("/Users/matthewryan/RyanRealty/listing_video_v4/photo_contact_sheet_v5.html")

data = json.loads(MANIFEST.read_text())
groups_raw = data["groups"]

# Category display order from the brief
CAT_ORDER = [
    "Modern Drone Aerial",
    "Modern Listing Photo",
    "Place Context (Snowdrift area guide)",
    "Vandevert Family (historic)",
    "Vandevert Ranch Life (historic)",
    "The Schoolhouse / Harper School (historic)",
    "Architect — Jerry Locati",
]

# Resolve "Vandevert Family" vs "Vandevert Family (historic)" — manifest uses short name
def normalize_cat(cat):
    if cat == "Vandevert Family":
        return "Vandevert Family (historic)"
    if cat == "Vandevert Ranch Life":
        return "Vandevert Ranch Life (historic)"
    return cat

# Rebuild groups in canonical order, normalizing category names
groups = {}
for cat in CAT_ORDER:
    groups[cat] = []

for cat_key, photos in groups_raw.items():
    norm = normalize_cat(cat_key)
    if norm in groups:
        groups[norm].extend(photos)

total = sum(len(v) for v in groups.values())
print(f"Total photos: {total}")
for cat, photos in groups.items():
    print(f"  {cat}: {len(photos)}")

# Determine if a photo is "numeric" (modern) or "filename" (historic/snowdrift)
def is_modern(photo):
    return photo.get("number") is not None

def pick_label(photo):
    """The label used in the Copy picks output."""
    if is_modern(photo):
        return str(photo["number"])
    return photo["filename"]

def aspect_label(photo):
    w, h = photo["width"], photo["height"]
    r = w / h
    return f'{w}x{h} · {r:.2f}:1 · {photo["orient"]}'

def card_html(photo, thumb_prefix):
    key = photo["key"].replace("'", "\\'").replace('"', '&quot;')
    thumb_path = f'{thumb_prefix}{photo["key"]}'
    label = pick_label(photo)
    cat = normalize_cat(photo.get("category", ""))
    desc = photo.get("description", "")
    fname = photo["filename"]
    asp = aspect_label(photo)

    desc_html = f'<div class="card-desc">{desc}</div>' if desc else ""

    return f"""<div class="card" data-key="{key}" data-label="{label}" data-cat="{cat}" onclick="toggle(this)">
  <div class="check-badge">&#10003;</div>
  <img loading="lazy" src="{thumb_path}" alt="{fname}" class="thumb">
  <div class="card-info">
    <div class="card-fname">{fname}</div>
    <div class="card-meta">{asp}</div>
    {desc_html}
  </div>
</div>"""

def section_html(cat, photos, thumb_prefix):
    count = len(photos)
    cards = "\n".join(card_html(p, thumb_prefix) for p in photos)
    safe_id = cat.lower().replace(" ", "-").replace("(", "").replace(")", "").replace("—", "").replace("·", "").strip("-")
    return f"""<section id="{safe_id}">
  <h2 class="section-heading">{cat} <span class="section-count">({count})</span></h2>
  <div class="grid">
{cards}
  </div>
</section>"""

def build_html(thumb_prefix):
    sections = "\n".join(
        section_html(cat, photos, thumb_prefix)
        for cat, photos in groups.items()
        if photos
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>56111 School House Rd v5 Photo Selection</title>
<style>
/* ===== RESET & BASE ===== */
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
html {{ scroll-behavior: smooth; }}
body {{
  background: #1a1714;
  color: #F2EBDD;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  min-height: 100vh;
  padding-bottom: 80px;
}}

/* ===== STICKY HEADER ===== */
.sticky-header {{
  position: sticky;
  top: 0;
  z-index: 100;
  background: #1a1714;
  border-bottom: 2px solid #C8A864;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}}
.sticky-header h1 {{
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(13px, 3vw, 18px);
  font-weight: 400;
  color: #F2EBDD;
  letter-spacing: 0.02em;
}}
.counter {{
  font-size: clamp(13px, 3vw, 16px);
  color: #C8A864;
  font-weight: 700;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}}

/* ===== PAGE INTRO ===== */
.intro {{
  max-width: 900px;
  margin: 24px auto 8px;
  padding: 0 16px;
}}
.intro h2 {{
  font-family: Georgia, serif;
  font-size: clamp(15px, 4vw, 22px);
  font-weight: 400;
  color: #C8A864;
  margin-bottom: 10px;
}}
.intro p {{
  color: #c4b89a;
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 12px;
}}
.prior-links {{
  background: #26221e;
  border-left: 3px solid #C8A864;
  border-radius: 4px;
  padding: 12px 16px;
  margin: 12px 0 8px;
}}
.prior-links p {{
  font-size: 12px;
  color: #8a7a62;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}}
.prior-links a {{
  display: block;
  color: #C8A864;
  font-size: 13px;
  text-decoration: none;
  padding: 3px 0;
  transition: color 0.15s;
}}
.prior-links a:hover {{ color: #e0c880; text-decoration: underline; }}

/* ===== SECTIONS ===== */
.sections-wrap {{
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 12px;
}}
section {{
  margin: 28px 0;
}}
.section-heading {{
  font-family: Georgia, serif;
  font-size: clamp(15px, 3.5vw, 21px);
  font-weight: 400;
  color: #F2EBDD;
  border-bottom: 1px solid #3a3328;
  padding-bottom: 8px;
  margin-bottom: 14px;
}}
.section-count {{
  color: #8a7a62;
  font-size: 0.85em;
}}

/* ===== GRID ===== */
.grid {{
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}}
@media (min-width: 481px) {{
  .grid {{ grid-template-columns: repeat(3, 1fr); gap: 10px; }}
}}
@media (min-width: 901px) {{
  .grid {{ grid-template-columns: repeat(4, 1fr); gap: 12px; }}
}}

/* ===== CARD ===== */
.card {{
  background: #F2EBDD;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  border: 3px solid transparent;
  transition: border-color 0.15s, box-shadow 0.15s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}}
.card:active {{ opacity: 0.85; }}
.card.picked {{
  border-color: #C8A864;
  box-shadow: 0 0 0 1px #C8A864, 0 2px 8px rgba(200,168,100,0.3);
}}
.card.picked .thumb {{
  filter: brightness(0.75);
}}

/* ===== CHECK BADGE ===== */
.check-badge {{
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #C8A864;
  color: #1a1714;
  font-size: 14px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.15s, transform 0.15s;
  z-index: 2;
  line-height: 1;
}}
.card.picked .check-badge {{
  opacity: 1;
  transform: scale(1);
}}

/* ===== THUMB ===== */
.thumb {{
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 3/2;
  object-fit: cover;
  transition: filter 0.15s;
  background: #2a2520;
}}

/* ===== CARD INFO ===== */
.card-info {{
  padding: 6px 7px 7px;
}}
.card-fname {{
  font-family: 'Courier New', Courier, monospace;
  font-size: 10px;
  color: #3a2c1f;
  word-break: break-all;
  line-height: 1.3;
  margin-bottom: 3px;
}}
.card-meta {{
  font-size: 9px;
  color: #7a6a50;
  letter-spacing: 0.02em;
}}
.card-desc {{
  font-size: 9px;
  color: #5a4630;
  margin-top: 3px;
  line-height: 1.4;
  font-style: italic;
}}

/* ===== STICKY BOTTOM BAR ===== */
.bottom-bar {{
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #1a1714;
  border-top: 2px solid #C8A864;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}}
.copy-btn {{
  background: #C8A864;
  color: #1a1714;
  border: none;
  border-radius: 6px;
  padding: 12px 20px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  min-height: 44px;
  letter-spacing: 0.03em;
  transition: background 0.15s, transform 0.1s;
  flex: 1;
  max-width: 320px;
}}
.copy-btn:active {{ transform: scale(0.97); }}
.copy-btn:hover {{ background: #ddbf78; }}
.clear-btn {{
  background: transparent;
  color: #8a7a62;
  border: 1px solid #3a3328;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  cursor: pointer;
  min-height: 44px;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}}
.clear-btn:hover {{ color: #C8A864; border-color: #C8A864; }}

/* ===== TOAST ===== */
.toast {{
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  background: #C8A864;
  color: #1a1714;
  font-weight: 700;
  font-size: 14px;
  padding: 10px 22px;
  border-radius: 30px;
  z-index: 200;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
}}
.toast.show {{
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}}

/* ===== NOTES FOOTER ===== */
.notes-footer {{
  max-width: 900px;
  margin: 40px auto 20px;
  padding: 0 16px;
  border-top: 1px solid #3a3328;
  padding-top: 24px;
}}
.notes-footer h3 {{
  font-family: Georgia, serif;
  font-size: 16px;
  font-weight: 400;
  color: #C8A864;
  margin-bottom: 10px;
}}
.notes-footer p {{
  color: #8a7a62;
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: 10px;
}}
.notes-footer .verify-note {{
  background: #26221e;
  border-left: 3px solid #e87c2a;
  border-radius: 4px;
  padding: 12px 16px;
  color: #c87a3a;
  font-size: 13px;
  margin-top: 12px;
}}

/* ===== HIDDEN TEXTAREA ===== */
.copy-textarea {{
  position: absolute;
  left: -9999px;
  top: 0;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
}}
</style>
</head>
<body>

<!-- TOAST -->
<div class="toast" id="toast">Copied!</div>

<!-- STICKY HEADER -->
<div class="sticky-header">
  <h1 style="font-family:Georgia,serif;">56111 School House Rd &middot; Vandevert Ranch &mdash; v5 photo selection</h1>
  <div class="counter" id="counter">Picked: 0 / {total}</div>
</div>

<!-- INTRO -->
<div class="intro">
  <p>Pick the photos you want in the v5 cinematic short film. Tap a card to toggle it. Hit <strong>Copy picks</strong> at the bottom and paste back to Claude when done. Aim for 18 to 26 picks total. Interiors need at least 3.5 seconds on screen, historic people at least 5 seconds, so a 110 to 130 second film lands roughly 18 to 26 picks. Skip anything that does not fit 9:16 cleanly. Better 12 strong than 30 mixed.</p>
  <div class="prior-links">
    <p>Prior video references (open locally)</p>
    <a href="../video/listing-tour-output/56111_SchoolHouse_v1.mp4">v1 (1:28) &mdash; 56111_SchoolHouse_v1.mp4</a>
    <a href="../video/listing-tour-output/56111_SchoolHouse_v2.mp4">v2 (1:50) &mdash; 56111_SchoolHouse_v2.mp4</a>
    <a href="#">v4b reel &mdash; delivered via Resend (ID 676f9859-00bb-4b5e-ac9e-0e52759be4e1)</a>
  </div>
</div>

<!-- SECTIONS -->
<div class="sections-wrap">
{sections}
</div>

<!-- NOTES FOOTER -->
<div class="notes-footer">
  <h3>Property notes for confirmation</h3>
  <p>Horse property. Deschutes River frontage. Cascade mountain views from living room. 2.28 acres. Jerry Locati design. Sunridge build, 2017. 4 bed, 4.5 bath. Vandevert Ranch community (20 homes, 400 acres).</p>
  <div class="verify-note">
    NOTE: Verify $3,025,000 against SkySlope before Gate 4 render. Do not burn this number into closing card until confirmed.
  </div>
</div>

<!-- STICKY BOTTOM BAR -->
<div class="bottom-bar">
  <button class="copy-btn" id="copyBtn" onclick="copyPicks()">Copy picks to clipboard</button>
  <button class="clear-btn" onclick="clearAll()">Clear all</button>
</div>

<!-- FALLBACK TEXTAREA -->
<textarea class="copy-textarea" id="copyFallback" readonly></textarea>

<script>
// State: set of picked card keys
const picked = new Set();
const TOTAL = {total};

function updateCounter() {{
  document.getElementById('counter').textContent = 'Picked: ' + picked.size + ' / ' + TOTAL;
}}

function toggle(card) {{
  const key = card.dataset.key;
  if (picked.has(key)) {{
    picked.delete(key);
    card.classList.remove('picked');
  }} else {{
    picked.add(key);
    card.classList.add('picked');
  }}
  updateCounter();
}}

function clearAll() {{
  picked.clear();
  document.querySelectorAll('.card.picked').forEach(c => c.classList.remove('picked'));
  updateCounter();
}}

function buildPicksText() {{
  // Group picks by category, in the canonical order
  const CAT_ORDER = [
    "Modern Drone Aerial",
    "Modern Listing Photo",
    "Place Context (Snowdrift area guide)",
    "Vandevert Family (historic)",
    "Vandevert Ranch Life (historic)",
    "Architect \\u2014 Jerry Locati"
  ];

  const byCat = {{}};
  CAT_ORDER.forEach(c => byCat[c] = []);

  document.querySelectorAll('.card.picked').forEach(card => {{
    const cat = card.dataset.cat;
    const label = card.dataset.label;
    if (byCat[cat] !== undefined) {{
      byCat[cat].push(label);
    }}
  }});

  const lines = ['Schoolhouse v5 photo picks (' + picked.size + ' of ' + TOTAL + '):'];
  CAT_ORDER.forEach(cat => {{
    if (byCat[cat] && byCat[cat].length > 0) {{
      lines.push(cat + ': ' + byCat[cat].join(', '));
    }}
  }});

  return lines.join('\\n');
}}

function showToast(msg) {{
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}}

function copyPicks() {{
  if (picked.size === 0) {{
    showToast('No photos picked yet!');
    return;
  }}
  const text = buildPicksText();

  if (navigator.clipboard && navigator.clipboard.writeText) {{
    navigator.clipboard.writeText(text).then(() => {{
      showToast('Copied! (' + picked.size + ' picks)');
    }}).catch(() => {{
      fallbackCopy(text);
    }});
  }} else {{
    fallbackCopy(text);
  }}
}}

function fallbackCopy(text) {{
  const ta = document.getElementById('copyFallback');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '0';
  ta.style.top = '0';
  ta.style.width = '100%';
  ta.style.height = '100px';
  ta.style.opacity = '1';
  ta.select();
  try {{
    document.execCommand('copy');
    showToast('Copied! (' + picked.size + ' picks)');
  }} catch (e) {{
    showToast('Copy failed. Select the text above manually.');
    ta.style.pointerEvents = 'auto';
  }}
  setTimeout(() => {{
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    ta.style.opacity = '0';
    ta.style.width = '1px';
    ta.style.height = '1px';
    ta.style.pointerEvents = 'none';
  }}, 3000);
}}
</script>
</body>
</html>
"""

VERCEL_THUMB_PREFIX = "/v5_library/thumbs/"
LOCAL_THUMB_PREFIX  = "public/v5_library/thumbs/"

vercel_html = build_html(VERCEL_THUMB_PREFIX)
local_html  = build_html(LOCAL_THUMB_PREFIX)

# Write Vercel copy
OUT_VERCEL.parent.mkdir(parents=True, exist_ok=True)
OUT_VERCEL.write_text(vercel_html, encoding="utf-8")
print(f"Wrote Vercel copy: {OUT_VERCEL} ({OUT_VERCEL.stat().st_size:,} bytes)")

# Write local copy
OUT_LOCAL.write_text(local_html, encoding="utf-8")
print(f"Wrote local copy: {OUT_LOCAL} ({OUT_LOCAL.stat().st_size:,} bytes)")
