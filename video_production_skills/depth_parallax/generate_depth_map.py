"""
generate_depth_map.py — MiDaS depth estimation for 3D parallax layer generation.

Loads a listing photo, runs MiDaS depth estimation, writes a normalized 8-bit
grayscale depth map, then delegates to layer_separator.py to produce the
bg/mid/fg alpha-cut layers and manifest.json.

Usage:
    python generate_depth_map.py --input photo.jpg --output-dir public/images/v5_library/depth/photo/
    python generate_depth_map.py --input photo.jpg --output-dir out/ --model large
"""

import argparse
import os
import sys
import time


MODEL_MAP = {
    "small": "MiDaS_small",
    "large": "DPT_Large",
}

TRANSFORM_MAP = {
    "small": "small_transform",
    "large": "dpt_transform",
}


def _pick_device():
    import torch
    if torch.backends.mps.is_available() and torch.backends.mps.is_built():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def run(input_path: str, output_dir: str, model_key: str) -> None:
    import cv2
    import numpy as np
    import torch
    from PIL import Image
    from layer_separator import separate_layers

    t0 = time.time()
    os.makedirs(output_dir, exist_ok=True)

    hub_model_name = MODEL_MAP[model_key]
    transform_attr = TRANSFORM_MAP[model_key]

    device = _pick_device()
    print(f"[depth] device={device}", file=sys.stderr)
    print(f"[depth] loading model={hub_model_name} …", file=sys.stderr)

    midas = torch.hub.load("intel-isl/MiDaS", hub_model_name)
    midas.to(device)
    midas.eval()

    transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
    transform = getattr(transforms, transform_attr)

    print(f"[depth] running inference on {input_path} …", file=sys.stderr)

    # Read with OpenCV (BGR), convert to RGB for MiDaS
    bgr = cv2.imread(input_path)
    if bgr is None:
        raise FileNotFoundError(f"Cannot open image: {input_path}")
    img_rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    input_batch = transform(img_rgb).to(device)

    with torch.no_grad():
        prediction = midas(input_batch)
        prediction = torch.nn.functional.interpolate(
            prediction.unsqueeze(1),
            size=bgr.shape[:2],
            mode="bicubic",
            align_corners=False,
        ).squeeze()

    depth = prediction.cpu().numpy()
    d_min = float(depth.min())
    d_max = float(depth.max())
    print(f"[depth] raw depth range: min={d_min:.4f} max={d_max:.4f}", file=sys.stderr)

    # Normalize to 0–255 uint8
    depth_norm = (
        (depth - d_min) / (d_max - d_min + 1e-8) * 255
    ).astype(np.uint8)

    depth_out = os.path.join(output_dir, "depth.png")
    Image.fromarray(depth_norm, mode="L").save(depth_out)
    print(f"[depth] wrote {depth_out}", file=sys.stderr)

    # Delegate layer separation
    separate_layers(input_path, depth_out, output_dir)

    elapsed = time.time() - t0
    print(f"[depth] done in {elapsed:.1f}s", file=sys.stderr)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run MiDaS depth estimation and generate parallax layer PNGs."
    )
    parser.add_argument(
        "--input",
        required=True,
        metavar="PATH",
        help="Source photo (JPEG or PNG)",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        metavar="DIR",
        help="Directory to write depth.png, bg.png, mid.png, fg.png, manifest.json",
    )
    parser.add_argument(
        "--model",
        choices=["small", "large"],
        default="small",
        help="MiDaS model variant: 'small' (fast, default) or 'large' (DPT_Large, sharper)",
    )
    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"[depth] error: input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    run(args.input, args.output_dir, args.model)


if __name__ == "__main__":
    main()
