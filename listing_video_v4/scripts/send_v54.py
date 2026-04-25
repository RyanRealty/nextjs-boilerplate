#!/usr/bin/env python3
"""Email v5.4 to Matt with the v5.3 → v5.4 change log."""
import json, urllib.request
from pathlib import Path


def load_env(path):
    env = {}
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


env = load_env(Path("/Users/matthewryan/RyanRealty/.env.local"))
URL = "https://raw.githubusercontent.com/RyanRealty/RyanRealty/main/public/v5_library/schoolhouse_v54.mp4"

html = f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a1714;color:#F2EBDD;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55;">
<div style="max-width:600px;margin:0 auto;padding:24px 20px;">
<h1 style="font-family:Georgia,serif;font-weight:normal;color:#F2EBDD;font-size:26px;margin:0 0 8px;">Schoolhouse v5.4</h1>
<p style="color:#C8A864;font-size:13px;margin:0 0 24px;text-transform:uppercase;letter-spacing:0.06em;">Blurred vignette, looking glass line, smoother flame, fixed framing</p>

<p style="font-size:15px;margin:0 0 20px;">Every item from your v5.3 note.</p>

<div style="margin:24px 0;text-align:center;">
<a href="{URL}" style="display:inline-block;background:#C8A864;color:#1a1714;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:6px;font-size:16px;letter-spacing:0.02em;">Watch v5.4</a>
</div>
<p style="font-size:12px;color:#A39684;margin:0 0 24px;text-align:center;word-break:break-all;">{URL}</p>

<h2 style="font-family:Georgia,serif;color:#C8A864;font-size:18px;margin:24px 0 12px;font-weight:normal;">Open frame</h2>
<p style="font-size:14px;margin:0 0 10px;"><strong style="color:#C8A864;">Blurred vignette in place of the black bars.</strong> The dead space above and below the satellite tile is now a heavily blurred, dark version of the same map. The map bleeds out into the rest of the frame instead of stopping at a hard line.</p>
<p style="font-size:14px;margin:0 0 10px;"><strong style="color:#C8A864;">REPRESENTED BY RYAN REALTY removed.</strong> Open ends on the boundary glow alone, brokerage tag now lives on the closing reveal only.</p>

<h2 style="font-family:Georgia,serif;color:#C8A864;font-size:18px;margin:24px 0 12px;font-weight:normal;">Hero exterior</h2>
<p style="font-size:14px;margin:0 0 10px;">Same blurred-vignette treatment. The whole horizontal house is sharp in the middle, the dead space top and bottom is the photo itself, blurred and dark.</p>

<h2 style="font-family:Georgia,serif;color:#C8A864;font-size:18px;margin:24px 0 12px;font-weight:normal;">Voice over</h2>
<p style="font-size:14px;margin:0 0 10px;"><strong style="color:#C8A864;">Century anchored to 1892, not 1970.</strong> Beat 5 now ends with "And the children kept their days at the river." No 1970 reference. Beat 6 is "A century after they came, twenty homes share four hundred acres." The math now lines up with the homesteading.</p>
<p style="font-size:14px;margin:0 0 10px;"><strong style="color:#C8A864;">Looking glass line.</strong> New line on the view-doors hero shot at Beat 14: "The home itself is a looking glass on the West." Frames the home as the immersion-into-landscape thesis, on the money shot.</p>
<p style="font-size:14px;margin:0 0 10px;"><strong style="color:#C8A864;">Deschutes phonetic re-spelled.</strong> Was "duh-shoots", now "Dish Shoots" so the synth lands the short ih vowel correctly.</p>
<p style="font-size:14px;margin:0 0 10px;"><strong style="color:#C8A864;">New ending.</strong> Replaced "Some places are kept" (which contradicted the just-sold reveal) with: "A house like this changes hands once a generation." Reads timeless and matches the off-market-rare-estate register.</p>

<h2 style="font-family:Georgia,serif;color:#C8A864;font-size:18px;margin:24px 0 12px;font-weight:normal;">Fire patio</h2>
<p style="font-size:14px;margin:0 0 10px;"><strong style="color:#C8A864;">Reframed so you actually see the fireplace.</strong> Fireplace lives at the right edge of the source photo. v5.3 cropped it out. Pushed the cover crop hard right (objectPosition 88 percent) so the fireplace is in frame.</p>
<p style="font-size:14px;margin:0 0 10px;"><strong style="color:#C8A864;">Flame motion smoothed.</strong> The cinemagraph flame_flicker was running at a 4-frame period which read as jerky. Slowed it down to 22 to 44 frame periods so the flicker reads as warmth, not seizure.</p>

<h2 style="font-family:Georgia,serif;color:#C8A864;font-size:18px;margin:24px 0 12px;font-weight:normal;">Elk on the river</h2>
<p style="font-size:14px;margin:0 0 10px;">The herd is on the left side of the source photo and v5.3 cropped most of it. Switched the beat to a gimbal walk that pans the camera from herd-side to lone-elk-side over the duration. The cinemagraph water flow on the river surface still plays underneath.</p>

<h2 style="font-family:Georgia,serif;color:#C8A864;font-size:18px;margin:24px 0 12px;font-weight:normal;">Runtime</h2>
<p style="font-size:14px;margin:0 0 10px;">122.5 seconds. Same as v5.3. Inside the 110 to 130 cinematic short film window.</p>

<div style="background:#102742;color:#F2EBDD;padding:16px 20px;margin-top:32px;border-radius:6px;text-align:center;">
<div style="font-family:Georgia,serif;font-size:18px;letter-spacing:0.04em;">Ryan Realty</div>
<div style="font-size:13px;color:#C8A864;margin-top:4px;">541.213.6706 &middot; matt@ryan-realty.com</div>
</div>
</div>
</body></html>"""

req = urllib.request.Request(
    "https://api.resend.com/emails",
    data=json.dumps({
        "from": "Ryan Realty <onboarding@resend.dev>",
        "to": ["matt@ryan-realty.com"],
        "subject": "Schoolhouse v5.4 — blurred vignette, looking glass, smoother flame",
        "html": html,
    }).encode(),
    headers={
        "Authorization": f"Bearer {env['RESEND_API_KEY']}",
        "Content-Type": "application/json",
        "User-Agent": "curl/8.4",
    },
)
print(json.loads(urllib.request.urlopen(req).read()))
