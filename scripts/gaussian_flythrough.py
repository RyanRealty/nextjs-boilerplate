#!/usr/bin/env python3
"""
gaussian_flythrough.py — Gaussian splat flythrough wrapper for Ryan Realty listing videos.

Orchestrates 4 stages:
  1. Prepare inputs  — extract frames from .mp4 or copy/symlink photos
  2. COLMAP          — feature extraction + matching + sparse reconstruction
  3. Train splat     — ns-train splatfacto (or print cloud GPU instructions)
  4. Render          — generate camera path JSON + ns-render to MP4

Usage:
  python scripts/gaussian_flythrough.py --photos ./path/to/photos --output ./flythrough.mp4
  python scripts/gaussian_flythrough.py --photos ./walkthrough.mp4 --output ./flythrough.mp4 --cloud-gpu
  python scripts/gaussian_flythrough.py --help

See video_production_skills/gaussian_splat/SKILL.md for full documentation.
"""

import argparse
import json
import math
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time

# ---------------------------------------------------------------------------
# Pre-flight: verify required tools on PATH
# ---------------------------------------------------------------------------

INSTALL_HINTS = {
    "colmap": "  brew install colmap   (Mac)\n  See: https://colmap.github.io/install.html",
    "ns-train": (
        "  conda activate nerfstudio && pip install nerfstudio\n"
        "  Full install: https://docs.nerf.studio/quickstart/installation.html\n"
        "  Note: on Apple Silicon, ns-train training is slow — use --cloud-gpu instead."
    ),
    "ns-render": (
        "  ns-render is part of the nerfstudio package.\n"
        "  conda activate nerfstudio && pip install nerfstudio"
    ),
}


def check_tool(name: str) -> bool:
    return shutil.which(name) is not None


def preflight_check(skip_nerfstudio: bool = False) -> None:
    """Verify required CLI tools are available. Exits with instructions if not."""
    missing = []
    tools = ["colmap"]
    if not skip_nerfstudio:
        tools += ["ns-train", "ns-render"]

    for tool in tools:
        if not check_tool(tool):
            missing.append(tool)

    if missing:
        print("\n[preflight] Missing required tools:")
        for t in missing:
            hint = INSTALL_HINTS.get(t, "  (no install hint available)")
            print(f"\n  {t} — not found on PATH\n{hint}")
        print(
            "\nInstall the missing tools, activate the correct conda env if needed,\n"
            "then re-run this script.\n"
        )
        sys.exit(1)


# ---------------------------------------------------------------------------
# Camera path generation
# ---------------------------------------------------------------------------

def _look_at_matrix(eye: list, target: list, up: list) -> list:
    """Return a 4×4 row-major camera-to-world matrix (nerfstudio convention)."""
    ex, ey, ez = eye
    tx, ty, tz = target
    ux, uy, uz = up

    # Forward (z-axis of camera, pointing AWAY from target in camera space)
    fx, fy, fz = tx - ex, ty - ey, tz - ez
    fn = math.sqrt(fx**2 + fy**2 + fz**2) or 1e-9
    fx, fy, fz = fx / fn, fy / fn, fz / fn

    # Right (x-axis)
    rx = fy * uz - fz * uy
    ry = fz * ux - fx * uz
    rz = fx * uy - fy * ux
    rn = math.sqrt(rx**2 + ry**2 + rz**2) or 1e-9
    rx, ry, rz = rx / rn, ry / rn, rz / rn

    # True up (y-axis)
    ux2 = ry * fz - rz * fy
    uy2 = rz * fx - rx * fz
    uz2 = rx * fy - ry * fx

    # 4×4 row-major c2w: columns are right, up, -forward, position
    return [
        rx, ux2, -fx, ex,
        ry, uy2, -fy, ey,
        rz, uz2, -fz, ez,
        0.0, 0.0, 0.0, 1.0,
    ]


def orbit_camera_path(
    num_keyframes: int = 30,
    radius: float = 2.0,
    height: float = 0.5,
    fps: int = 30,
    duration_s: float = 8.0,
) -> dict:
    """360° orbit around the scene centroid (lazy-susan, 8s default)."""
    keyframes = []
    for i in range(num_keyframes):
        t = i / max(num_keyframes - 1, 1)
        angle = t * 2 * math.pi
        eye = [radius * math.cos(angle), height, radius * math.sin(angle)]
        matrix = _look_at_matrix(eye, [0.0, 0.0, 0.0], [0.0, 1.0, 0.0])
        keyframes.append({
            "matrix": matrix,
            "fov": 60,
            "aspect": 9 / 16,
            "render_time": t * duration_s,
        })
    return {
        "camera_path": keyframes,
        "render_height": 1920,
        "render_width": 1080,
        "fps": fps,
        "seconds": duration_s,
        "smoothness_value": 0.5,
    }


def flythrough_camera_path(
    num_keyframes: int = 24,
    fps: int = 30,
    duration_s: float = 6.0,
) -> dict:
    """Forward-motion flythrough entering one space and drifting toward another (6s)."""
    keyframes = []
    # Travel along the Z axis from -2.0 to +2.0 with a slight upward arc
    for i in range(num_keyframes):
        t = i / max(num_keyframes - 1, 1)
        z = -2.0 + t * 4.0
        y = 0.3 + 0.4 * math.sin(t * math.pi)  # gentle vertical arc
        eye = [0.0, y, z]
        # Look slightly ahead and slightly down as camera moves forward
        look_target = [0.0, y - 0.1, z + 1.5]
        matrix = _look_at_matrix(eye, look_target, [0.0, 1.0, 0.0])
        keyframes.append({
            "matrix": matrix,
            "fov": 65,
            "aspect": 9 / 16,
            "render_time": t * duration_s,
        })
    return {
        "camera_path": keyframes,
        "render_height": 1920,
        "render_width": 1080,
        "fps": fps,
        "seconds": duration_s,
        "smoothness_value": 0.6,
    }


def dolly_camera_path(
    num_keyframes: int = 20,
    fps: int = 30,
    duration_s: float = 5.0,
) -> dict:
    """Lateral dolly slide while looking at the property (5s)."""
    keyframes = []
    # Slide from left to right at a fixed distance from the scene
    for i in range(num_keyframes):
        t = i / max(num_keyframes - 1, 1)
        x = -1.5 + t * 3.0  # slide from x=-1.5 to x=+1.5
        eye = [x, 0.4, 2.5]
        look_target = [0.0, 0.0, 0.0]
        matrix = _look_at_matrix(eye, look_target, [0.0, 1.0, 0.0])
        keyframes.append({
            "matrix": matrix,
            "fov": 55,
            "aspect": 9 / 16,
            "render_time": t * duration_s,
        })
    return {
        "camera_path": keyframes,
        "render_height": 1920,
        "render_width": 1080,
        "fps": fps,
        "seconds": duration_s,
        "smoothness_value": 0.5,
    }


CAMERA_PATH_BUILDERS = {
    "orbit": orbit_camera_path,
    "flythrough": flythrough_camera_path,
    "dolly": dolly_camera_path,
}

CAMERA_PATH_DURATIONS = {
    "orbit": 8.0,
    "flythrough": 6.0,
    "dolly": 5.0,
}


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def run(cmd: list, verbose: bool = False, check: bool = True) -> subprocess.CompletedProcess:
    """Run a subprocess, optionally showing stdout. Raises on non-zero if check=True."""
    if verbose:
        print(f"  $ {' '.join(str(c) for c in cmd)}")
    result = subprocess.run(
        cmd,
        stdout=None if verbose else subprocess.PIPE,
        stderr=subprocess.STDOUT if verbose else subprocess.PIPE,
        text=True,
    )
    if check and result.returncode != 0:
        if not verbose and result.stdout:
            print(result.stdout[-2000:])  # show tail on failure
        raise RuntimeError(
            f"Command failed (exit {result.returncode}): {' '.join(str(c) for c in cmd)}"
        )
    return result


def banner(msg: str) -> None:
    width = 72
    print(f"\n{'=' * width}")
    print(f"  {msg}")
    print(f"{'=' * width}")


# ---------------------------------------------------------------------------
# Stage 1: Prepare inputs
# ---------------------------------------------------------------------------

SUPPORTED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}
SUPPORTED_VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv"}


def stage_prepare_inputs(photos_path: pathlib.Path, workdir: pathlib.Path, verbose: bool) -> pathlib.Path:
    """
    Prepare the images/ subfolder inside workdir.

    - If photos_path is a video file: extract frames every 0.5s with opencv.
    - If photos_path is a directory containing exactly one video: same.
    - If photos_path is a directory of images: symlink them.

    Returns the path to the images/ directory (nerfstudio expects this).
    Idempotent: skips if images/ already contains files.
    """
    images_dir = workdir / "images"
    if images_dir.exists() and any(images_dir.iterdir()):
        print(f"[stage 1] images/ already populated ({sum(1 for _ in images_dir.iterdir())} files) — skipping")
        return images_dir

    images_dir.mkdir(parents=True, exist_ok=True)

    # Determine source type
    if photos_path.is_file() and photos_path.suffix.lower() in SUPPORTED_VIDEO_EXTS:
        _extract_frames(photos_path, images_dir, verbose)
    elif photos_path.is_dir():
        # Check for a single video file in the directory
        video_files = [f for f in photos_path.iterdir() if f.suffix.lower() in SUPPORTED_VIDEO_EXTS]
        image_files = [f for f in photos_path.iterdir() if f.suffix.lower() in SUPPORTED_IMAGE_EXTS]
        if len(video_files) == 1 and not image_files:
            _extract_frames(video_files[0], images_dir, verbose)
        elif image_files:
            _link_images(image_files, images_dir, verbose)
        else:
            print(f"[error] No supported images or video found in {photos_path}")
            sys.exit(1)
    else:
        print(f"[error] --photos must be a directory of images or a video file. Got: {photos_path}")
        sys.exit(1)

    count = sum(1 for _ in images_dir.iterdir())
    if count < 25:
        print(
            f"\n[warning] Only {count} frames/images found. Gaussian splatting works best with 30+.\n"
            "          Results may be low quality. Consider adding more photos before continuing.\n"
        )
    else:
        print(f"[stage 1] Prepared {count} images in {images_dir}")

    return images_dir


def _extract_frames(video_path: pathlib.Path, images_dir: pathlib.Path, verbose: bool) -> None:
    """Extract frames from video every 0.5s using opencv."""
    try:
        import cv2
        from tqdm import tqdm
    except ImportError:
        print("[error] opencv-python and tqdm are required for video frame extraction.")
        print("  pip install opencv-python tqdm")
        sys.exit(1)

    print(f"[stage 1] Extracting frames from {video_path.name} (every 0.5s) ...")
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[error] Could not open video: {video_path}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_interval = max(1, int(fps * 0.5))  # every 0.5 seconds

    frame_idx = 0
    saved = 0
    with tqdm(total=total_frames // frame_interval, unit="frame") as pbar:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % frame_interval == 0:
                out_path = images_dir / f"frame_{saved:05d}.jpg"
                cv2.imwrite(str(out_path), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                saved += 1
                pbar.update(1)
            frame_idx += 1
    cap.release()
    print(f"[stage 1] Extracted {saved} frames")


def _link_images(image_files: list, images_dir: pathlib.Path, verbose: bool) -> None:
    """Symlink image files into the images/ working directory."""
    print(f"[stage 1] Linking {len(image_files)} images ...")
    for src in sorted(image_files):
        dst = images_dir / src.name
        if not dst.exists():
            dst.symlink_to(src.resolve())
    print(f"[stage 1] Done")


# ---------------------------------------------------------------------------
# Stage 2: COLMAP
# ---------------------------------------------------------------------------

def stage_colmap(workdir: pathlib.Path, verbose: bool) -> None:
    """
    Run COLMAP sparse reconstruction.

    Steps:
      - feature extraction
      - exhaustive matching
      - sparse reconstruction (mapper)

    Idempotent: skips if sparse/0/ already exists.
    Expected runtime: 30–90 minutes for 50 images on Mac mini M2 Pro / M4 (CPU only).
    """
    sparse_dir = workdir / "sparse" / "0"
    if sparse_dir.exists() and any(sparse_dir.iterdir()):
        print(f"[stage 2] COLMAP sparse model already exists ({sparse_dir}) — skipping")
        return

    images_dir = workdir / "images"
    database_path = workdir / "database.db"
    colmap_sparse = workdir / "sparse"
    colmap_sparse.mkdir(parents=True, exist_ok=True)

    banner("Stage 2: COLMAP pose estimation")
    print("  Expected runtime: 30–90 min for 50 images on Mac mini M2 Pro / M4 (CPU only).")
    print("  This is normal — COLMAP is single-threaded on Apple Silicon.\n")

    t0 = time.time()

    # Feature extraction
    print("[stage 2] Running: colmap feature_extractor ...")
    run([
        "colmap", "feature_extractor",
        "--database_path", str(database_path),
        "--image_path", str(images_dir),
        "--ImageReader.single_camera", "1",
        "--SiftExtraction.use_gpu", "0",
    ], verbose=verbose)

    # Exhaustive matching
    print("[stage 2] Running: colmap exhaustive_matcher ...")
    run([
        "colmap", "exhaustive_matcher",
        "--database_path", str(database_path),
        "--SiftMatching.use_gpu", "0",
    ], verbose=verbose)

    # Sparse reconstruction (mapper)
    print("[stage 2] Running: colmap mapper ...")
    run([
        "colmap", "mapper",
        "--database_path", str(database_path),
        "--image_path", str(images_dir),
        "--output_path", str(colmap_sparse),
    ], verbose=verbose)

    elapsed = time.time() - t0
    print(f"[stage 2] COLMAP complete in {elapsed / 60:.1f} min — sparse model at {sparse_dir}")


# ---------------------------------------------------------------------------
# Stage 3: Train Gaussian splat
# ---------------------------------------------------------------------------

def stage_train_splat(workdir: pathlib.Path, cloud_gpu: bool, verbose: bool) -> None:
    """
    Train nerfstudio splatfacto.

    If cloud_gpu=True: print instructions and exit with code 2 (user bookmark).
    Otherwise: shell out to ns-train splatfacto.

    Idempotent: skips if outputs/splatfacto/ checkpoint already exists.

    Runtime on Apple Silicon (MPS): 4–10 hours (not recommended).
    Runtime on cloud 4090: 30–60 minutes (~$0.40 at $0.40/hr).
    """
    outputs_dir = workdir / "outputs" / "splatfacto"
    if outputs_dir.exists() and any(outputs_dir.rglob("*.ckpt")):
        print(f"[stage 3] Splat checkpoint already exists ({outputs_dir}) — skipping training")
        return

    banner("Stage 3: Gaussian splat training")

    if cloud_gpu:
        print("""
  --cloud-gpu flag set. Training will NOT run locally.

  Upload the COLMAP workspace to a cloud GPU and run:

    # On the cloud instance (RunPod / Lambda / vast.ai with 4090 or 3090):
    conda activate nerfstudio
    ns-train splatfacto \\
      --data {workdir} \\
      --output-dir {workdir}/outputs \\
      --pipeline.model.cull-alpha-thresh 0.005 \\
      --viewer.quit-on-train-completion True

  Then download the outputs/ folder back to:
    {workdir}/outputs/

  Cloud GPU resources:
    RunPod:  https://www.runpod.io   (~$0.40/hr for 4090)
    vast.ai: https://vast.ai          (~$0.30–0.50/hr for 3090/4090)
    Lambda:  https://lambdalabs.com

  Once the checkpoint is back locally, re-run this script WITHOUT --cloud-gpu
  and it will pick up from stage 4 (render).
""".format(workdir=workdir))
        sys.exit(2)

    # Local training (slow on Apple Silicon — user was warned in SKILL.md)
    print("[stage 3] Starting ns-train splatfacto (this will be slow on Apple Silicon) ...")
    print(f"  Workdir: {workdir}")
    print("  Expected: 4–10 hours on Mac mini M2 Pro / M4 (MPS, experimental)")
    print("  Tip: use --cloud-gpu for 30–60 min training on a cloud 4090 (~$0.40)\n")

    run([
        "ns-train", "splatfacto",
        "--data", str(workdir),
        "--output-dir", str(workdir / "outputs"),
        "--pipeline.model.cull-alpha-thresh", "0.005",
        "--viewer.quit-on-train-completion", "True",
    ], verbose=verbose)

    print(f"[stage 3] Training complete — checkpoint in {outputs_dir}")


# ---------------------------------------------------------------------------
# Stage 4: Render camera path
# ---------------------------------------------------------------------------

def _find_latest_config(outputs_dir: pathlib.Path) -> pathlib.Path:
    """Find the most recently modified config.yml under outputs/."""
    configs = list(outputs_dir.rglob("config.yml"))
    if not configs:
        raise FileNotFoundError(
            f"No config.yml found under {outputs_dir}. "
            "Did training complete successfully?"
        )
    return max(configs, key=lambda p: p.stat().st_mtime)


def stage_render_camera_path(
    workdir: pathlib.Path,
    output_mp4: pathlib.Path,
    path_preset: str,
    verbose: bool,
) -> None:
    """
    Generate a camera path JSON for the chosen preset and shell out to ns-render.

    Idempotent: skips if output_mp4 already exists.
    Note: the camera path JSON schema may need minor adjustments between nerfstudio versions.
    Refer to SKILL.md if ns-render rejects the JSON.
    """
    if output_mp4.exists():
        print(f"[stage 4] Output already exists: {output_mp4} — skipping render")
        return

    banner(f"Stage 4: Render camera path ({path_preset})")

    # Generate camera path JSON
    builder = CAMERA_PATH_BUILDERS[path_preset]
    camera_path = builder()
    camera_path_file = workdir / f"camera_path_{path_preset}.json"
    with open(camera_path_file, "w") as f:
        json.dump(camera_path, f, indent=2)
    print(f"[stage 4] Camera path written: {camera_path_file}")
    print(
        f"  Note: nerfstudio's camera path schema changes between versions.\n"
        f"  If ns-render rejects this JSON, see SKILL.md for the matrix format.\n"
    )

    # Find training config
    outputs_dir = workdir / "outputs"
    config_path = _find_latest_config(outputs_dir)
    print(f"[stage 4] Using config: {config_path}")

    output_mp4.parent.mkdir(parents=True, exist_ok=True)

    print(f"[stage 4] Running ns-render (expect 5–15 min) ...")
    run([
        "ns-render", "camera-path",
        "--load-config", str(config_path),
        "--camera-path-filename", str(camera_path_file),
        "--output-path", str(output_mp4),
        "--output-format", "video",
    ], verbose=verbose)

    print(f"[stage 4] Render complete: {output_mp4}")


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def print_summary(output_mp4: pathlib.Path) -> None:
    if not output_mp4.exists():
        print(f"\n[summary] Output file not found: {output_mp4}")
        return

    size_mb = output_mp4.stat().st_size / (1024 * 1024)

    # Try to get duration with ffprobe if available
    duration_str = "unknown"
    if check_tool("ffprobe"):
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(output_mp4),
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            try:
                secs = float(result.stdout.strip())
                duration_str = f"{secs:.1f}s"
            except ValueError:
                pass

    print(f"\n{'=' * 72}")
    print(f"  OUTPUT: {output_mp4.resolve()}")
    print(f"  Size:   {size_mb:.1f} MB    Duration: {duration_str}")
    print(f"{'=' * 72}")
    print("""
  Next steps:
    1. Copy the MP4 to listing_video_v4/public/clips/flythrough.mp4
    2. In Listing.tsx (cinematic cut only — NOT the 45s viral cut):

       import {{ OffthreadVideo, Sequence, staticFile }} from 'remotion';

       <Sequence from={{beatStartFrame}} durationInFrames={{8 * 30}}>
         <OffthreadVideo src={{staticFile('clips/flythrough.mp4')}} />
       </Sequence>

    3. See video_production_skills/gaussian_splat/SKILL.md for full integration guide.
""")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="gaussian_flythrough.py",
        description=(
            "Gaussian splat flythrough wrapper for Ryan Realty listing videos.\n"
            "Wraps COLMAP + nerfstudio splatfacto to produce a 1080×1920 MP4 flythrough\n"
            "from a folder of property photos or a phone walkthrough video.\n\n"
            "See video_production_skills/gaussian_splat/SKILL.md for full documentation."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
examples:
  # Standard run (all stages, local training):
  python scripts/gaussian_flythrough.py \\
    --photos ./photos/cascade_peaks \\
    --output ./listing_video_v4/public/clips/flythrough.mp4

  # Video input + cloud GPU training:
  python scripts/gaussian_flythrough.py \\
    --photos ./walkthrough.mp4 \\
    --output ./flythrough.mp4 \\
    --cloud-gpu

  # Dolly preset, reuse existing workdir:
  python scripts/gaussian_flythrough.py \\
    --photos ./photos/cascade_peaks \\
    --output ./flythrough_dolly.mp4 \\
    --camera-path dolly \\
    --workdir /tmp/gaussian_cascade_peaks

NOTE: This skill is for cinematic cuts ($1M+ listings, 30+ photos).
      Do NOT use flythrough clips in the 45s viral cut — beat length limit is 4s.
      See VIDEO_PRODUCTION_SKILL.md Section 1.
""",
    )
    parser.add_argument(
        "--photos",
        required=True,
        type=pathlib.Path,
        metavar="PATH",
        help="Directory of JPEG/PNG photos OR a single walkthrough .mp4 file",
    )
    parser.add_argument(
        "--output",
        required=True,
        type=pathlib.Path,
        metavar="OUTPUT.mp4",
        help="Output MP4 path (will be created; parent dirs created if needed)",
    )
    parser.add_argument(
        "--camera-path",
        default="orbit",
        choices=["orbit", "flythrough", "dolly"],
        help=(
            "Camera path preset. "
            "orbit=360° around centroid 8s, "
            "flythrough=forward motion 6s, "
            "dolly=lateral slide 5s. "
            "[default: orbit]"
        ),
    )
    parser.add_argument(
        "--cloud-gpu",
        action="store_true",
        default=False,
        help=(
            "Skip local training. Print instructions for running ns-train on a cloud GPU "
            "(RunPod / vast.ai, ~$0.40/hr on 4090) and exit. "
            "Recommended on Apple Silicon."
        ),
    )
    parser.add_argument(
        "--workdir",
        type=pathlib.Path,
        default=None,
        metavar="DIR",
        help=(
            "Reuse an existing COLMAP workspace (skips stages that already have output). "
            "If omitted, a temp directory is created automatically."
        ),
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        default=False,
        help="Show subprocess stdout (verbose mode)",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    # Resolve paths
    photos_path = args.photos.resolve()
    output_mp4 = args.output.resolve()

    if not photos_path.exists():
        print(f"[error] --photos path does not exist: {photos_path}")
        sys.exit(1)

    # Set up working directory
    _tmp_dir = None
    if args.workdir:
        workdir = args.workdir.resolve()
        workdir.mkdir(parents=True, exist_ok=True)
        print(f"[init] Using workdir: {workdir}")
    else:
        _tmp_dir = tempfile.mkdtemp(prefix="gaussian_splat_")
        workdir = pathlib.Path(_tmp_dir)
        print(f"[init] Created temp workdir: {workdir}")
        print(f"       Tip: use --workdir {workdir} to resume without re-running COLMAP")

    # Pre-flight: check tools before starting any long work
    # For cloud-gpu runs, we can skip ns-train/ns-render checks (user runs those remotely)
    skip_nerfstudio = args.cloud_gpu
    if not skip_nerfstudio:
        preflight_check(skip_nerfstudio=False)
    else:
        preflight_check(skip_nerfstudio=True)  # still need colmap

    print(f"\n[init] Input:       {photos_path}")
    print(f"[init] Output:      {output_mp4}")
    print(f"[init] Camera path: {args.camera_path} ({CAMERA_PATH_DURATIONS[args.camera_path]:.0f}s)")
    print(f"[init] Cloud GPU:   {'yes (training will print instructions + exit)' if args.cloud_gpu else 'no (training runs locally)'}")

    try:
        # Stage 1
        stage_prepare_inputs(photos_path, workdir, args.verbose)

        # Stage 2
        stage_colmap(workdir, args.verbose)

        # Stage 3 (may exit early if --cloud-gpu)
        stage_train_splat(workdir, args.cloud_gpu, args.verbose)

        # Stage 4
        stage_render_camera_path(workdir, output_mp4, args.camera_path, args.verbose)

        # Summary
        print_summary(output_mp4)

    except KeyboardInterrupt:
        print("\n[interrupted] Workdir preserved for resume:")
        print(f"  --workdir {workdir}")
        sys.exit(130)
    except Exception as e:
        print(f"\n[error] {e}")
        print(f"\nWorkdir preserved for debugging: {workdir}")
        sys.exit(1)


if __name__ == "__main__":
    main()
