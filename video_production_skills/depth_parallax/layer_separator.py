"""
layer_separator.py — Split a photo into bg/mid/fg alpha layers using a MiDaS depth map.

Thresholds are derived from the 33rd and 66th percentiles of the depth map so
the three layers always contain roughly equal amounts of depth information
regardless of scene contrast.

Each layer PNG is the original RGB image with an alpha channel: alpha=255 inside
the layer, alpha=0 outside, with a 4-pixel feathered edge to avoid hard cutouts.

Usage (CLI):
    python layer_separator.py --image photo.jpg --depth depth.png --output-dir out/

Usage (import):
    from layer_separator import separate_layers
    separate_layers("photo.jpg", "depth.png", "out/")
"""

import argparse
import json
import os
import sys


FEATHER_RADIUS = 4  # px — Gaussian blur radius for alpha edge softening


def _feather_mask(mask):
    """Apply Gaussian blur to soften hard alpha edges on a uint8 mask."""
    import cv2
    import numpy as np
    ksize = FEATHER_RADIUS * 2 + 1
    blurred = cv2.GaussianBlur(
        mask.astype(np.float32),
        (ksize, ksize),
        sigmaX=FEATHER_RADIUS / 2.0,
    )
    return np.clip(blurred, 0, 255).astype(np.uint8)


def separate_layers(
    image_path: str,
    depth_path: str,
    output_dir: str,
) -> None:
    import numpy as np
    from PIL import Image
    """
    Separate image into three depth layers and write PNGs + manifest.

    Args:
        image_path: Path to original RGB photo (JPEG or PNG).
        depth_path: Path to 8-bit grayscale depth map (0=far, 255=near).
        output_dir: Directory to write bg.png, mid.png, fg.png, manifest.json.
    """
    os.makedirs(output_dir, exist_ok=True)

    # Load original image as RGBA numpy array
    orig_pil = Image.open(image_path).convert("RGB")
    orig = np.array(orig_pil)  # H x W x 3, uint8

    # Load depth as grayscale
    depth_pil = Image.open(depth_path).convert("L")
    depth = np.array(depth_pil)  # H x W, uint8

    if orig.shape[:2] != depth.shape[:2]:
        # Resize depth to match image if they differ (shouldn't happen in normal flow)
        depth = np.array(
            depth_pil.resize((orig.shape[1], orig.shape[0]), Image.BILINEAR)
        )
        print(
            f"[layers] warning: depth resized to match image ({orig.shape[1]}x{orig.shape[0]})",
            file=sys.stderr,
        )

    h, w = orig.shape[:2]

    # Percentile-based thresholds for robustness across scenes
    p33 = int(np.percentile(depth, 33))
    p66 = int(np.percentile(depth, 66))

    print(
        f"[layers] image={w}x{h}  depth percentiles p33={p33} p66={p66}",
        file=sys.stderr,
    )

    layer_defs = [
        ("bg",  depth < p33,            0,    max(0, p33 - 1)),
        ("mid", (depth >= p33) & (depth < p66), p33,  max(0, p66 - 1)),
        ("fg",  depth >= p66,           p66,  255),
    ]

    layer_records = []

    for name, binary_mask, d_lo, d_hi in layer_defs:
        # Convert boolean mask to uint8 (0 or 255)
        alpha_raw = (binary_mask.astype(np.uint8)) * 255

        # Feather edges
        alpha = _feather_mask(alpha_raw)

        # Compose RGBA
        rgba = np.dstack([orig, alpha])  # H x W x 4

        out_path = os.path.join(output_dir, f"{name}.png")
        Image.fromarray(rgba, mode="RGBA").save(out_path, optimize=False)
        print(f"[layers] wrote {out_path}", file=sys.stderr)

        layer_records.append(
            {
                "name": name,
                "file": f"{name}.png",
                "depth_range": [d_lo, d_hi],
            }
        )

    manifest = {
        "source": os.path.abspath(image_path),
        "depth": os.path.abspath(depth_path),
        "layers": layer_records,
        "image_size": [w, h],
    }

    manifest_path = os.path.join(output_dir, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"[layers] wrote {manifest_path}", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Split a photo into bg/mid/fg RGBA layers using a depth map."
    )
    parser.add_argument(
        "--image",
        required=True,
        metavar="PATH",
        help="Source photo (JPEG or PNG)",
    )
    parser.add_argument(
        "--depth",
        required=True,
        metavar="PATH",
        help="8-bit grayscale depth PNG (0=far, 255=near)",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        metavar="DIR",
        help="Directory to write bg.png, mid.png, fg.png, manifest.json",
    )
    args = parser.parse_args()

    missing = [p for p in (args.image, args.depth) if not os.path.isfile(p)]
    if missing:
        for p in missing:
            print(f"[layers] error: file not found: {p}", file=sys.stderr)
        sys.exit(1)

    separate_layers(args.image, args.depth, args.output_dir)


if __name__ == "__main__":
    main()
