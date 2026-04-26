"""
generate_synthetic_depth.py — Synthetic 3-layer depth substitute when MiDaS is unavailable.

Creates bg/mid/fg RGBA layers for DepthParallaxBeat using vertical-band or radial
alpha masks. The component's per-layer translate/scale multipliers still produce
visible parallax even without true depth segmentation.

Usage:
    python generate_synthetic_depth.py --input photo.jpg --output-dir out/ [--mode vertical|radial]

Vertical (default): bg=top half, mid=middle band, fg=bottom half. Best for
aerial/exterior shots and any photo where vertical position correlates with depth.

Radial: bg=outer ring, mid=middle ring, fg=center. Useful for interior shots
where the camera sits in the middle of a room.
"""

import argparse
import json
import os
import sys
from PIL import Image
import numpy as np


def make_vertical_masks(h: int, w: int):
    """Vertical-band alpha masks. Each is a 2D uint8 array, 0-255."""
    y = np.linspace(0, 1, h).reshape(-1, 1)
    y = np.broadcast_to(y, (h, w))

    def smoothstep(x, lo, hi):
        t = np.clip((x - lo) / (hi - lo + 1e-8), 0, 1)
        return t * t * (3 - 2 * t)

    bg_alpha = (1.0 - smoothstep(y, 0.45, 0.75)) * 255.0
    mid_alpha = (smoothstep(y, 0.15, 0.40) * (1.0 - smoothstep(y, 0.60, 0.85))) * 255.0
    fg_alpha = smoothstep(y, 0.50, 0.80) * 255.0

    return [
        ("bg", bg_alpha.astype(np.uint8)),
        ("mid", mid_alpha.astype(np.uint8)),
        ("fg", fg_alpha.astype(np.uint8)),
    ]


def make_radial_masks(h: int, w: int):
    """Radial alpha masks. center=fg, ring=mid, outer=bg."""
    cy, cx = h / 2.0, w / 2.0
    y, x = np.mgrid[0:h, 0:w]
    dy = (y - cy) / (h / 2.0)
    dx = (x - cx) / (w / 2.0)
    r = np.sqrt(dx * dx + dy * dy)

    def smoothstep(x, lo, hi):
        t = np.clip((x - lo) / (hi - lo + 1e-8), 0, 1)
        return t * t * (3 - 2 * t)

    fg_alpha = (1.0 - smoothstep(r, 0.30, 0.60)) * 255.0
    mid_alpha = (smoothstep(r, 0.20, 0.45) * (1.0 - smoothstep(r, 0.65, 0.95))) * 255.0
    bg_alpha = smoothstep(r, 0.55, 0.95) * 255.0

    return [
        ("bg", bg_alpha.astype(np.uint8)),
        ("mid", mid_alpha.astype(np.uint8)),
        ("fg", fg_alpha.astype(np.uint8)),
    ]


def run(input_path: str, output_dir: str, mode: str) -> None:
    os.makedirs(output_dir, exist_ok=True)

    orig = Image.open(input_path).convert("RGB")
    rgb = np.array(orig)
    h, w = rgb.shape[:2]

    masks = make_vertical_masks(h, w) if mode == "vertical" else make_radial_masks(h, w)

    layer_records = []
    for name, alpha in masks:
        rgba = np.dstack([rgb, alpha])
        out_path = os.path.join(output_dir, f"{name}.png")
        Image.fromarray(rgba, mode="RGBA").save(out_path, optimize=True)
        layer_records.append({"name": name, "file": f"{name}.png"})
        print(f"[synth-depth] wrote {out_path}", file=sys.stderr)

    manifest = {
        "source": os.path.abspath(input_path),
        "mode": mode,
        "synthetic": True,
        "layers": layer_records,
        "image_size": [w, h],
    }
    with open(os.path.join(output_dir, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--output-dir", required=True)
    p.add_argument("--mode", choices=["vertical", "radial"], default="vertical")
    args = p.parse_args()

    if not os.path.isfile(args.input):
        print(f"[synth-depth] not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    run(args.input, args.output_dir, args.mode)


if __name__ == "__main__":
    main()
