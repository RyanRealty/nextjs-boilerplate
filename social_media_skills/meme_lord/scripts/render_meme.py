"""
meme_lord renderer — composites text onto real meme template images.

Classic meme style: Impact font, all caps, white fill, black stroke.
Slot text comes from a human-written brief. No AI text generation in this script.

Usage:
  python3 render_meme.py --template drake --slots slots.json --platform ig_square --out render.png

Templates and their slot schemas live in templates/registry.json.
Base images live in templates/base_images/.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SCRIPT_DIR = Path(__file__).parent
SKILL_DIR = SCRIPT_DIR.parent
TEMPLATES_DIR = SKILL_DIR / "templates"
BASE_IMAGES_DIR = TEMPLATES_DIR / "base_images"

with open(TEMPLATES_DIR / "brand_tokens.json") as f:
    BRAND = json.load(f)

with open(TEMPLATES_DIR / "registry.json") as f:
    REGISTRY = json.load(f)

NAVY = BRAND["colors"]["navy"]
GOLD = BRAND["colors"]["gold"]
WHITE = BRAND["colors"]["white"]
BLACK = "#000000"

IMPACT_PATHS = [
    "/System/Library/Fonts/Supplemental/Impact.ttf",
    "/Library/Fonts/Impact.ttf",
    "/usr/share/fonts/truetype/msttcorefonts/Impact.ttf",
]

ARIAL_BOLD_PATHS = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
]

HANDWRITING_PATHS = [
    "/System/Library/Fonts/Supplemental/Comic Sans MS.ttf",
    "/Library/Fonts/Comic Sans MS.ttf",
    "/System/Library/Fonts/Supplemental/Bradley Hand.ttc",
]


def load_font(font_paths: list[str], size: int) -> ImageFont.FreeTypeFont:
    for p in font_paths:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def impact(size: int) -> ImageFont.FreeTypeFont:
    return load_font(IMPACT_PATHS, size)


def arial_bold(size: int) -> ImageFont.FreeTypeFont:
    return load_font(ARIAL_BOLD_PATHS, size)


def handwriting(size: int) -> ImageFont.FreeTypeFont:
    return load_font(HANDWRITING_PATHS, size)


def fit_to_platform(base: Image.Image, platform_w: int, platform_h: int, bg: str = "#000000") -> Image.Image:
    """Scale base to fill platform canvas, padding with bg if aspect differs."""
    bw, bh = base.size
    scale = min(platform_w / bw, platform_h / bh)
    new_w = int(bw * scale)
    new_h = int(bh * scale)
    scaled = base.resize((new_w, new_h), Image.LANCZOS)
    canvas = Image.new("RGB", (platform_w, platform_h), bg)
    canvas.paste(scaled, ((platform_w - new_w) // 2, (platform_h - new_h) // 2))
    return canvas, ((platform_w - new_w) // 2, (platform_h - new_h) // 2, new_w, new_h)


def wrap_to_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    words = text.split()
    if not words:
        return []
    lines, cur = [], []
    for w in words:
        trial = " ".join(cur + [w])
        bbox = draw.textbbox((0, 0), trial, font=font)
        if bbox[2] - bbox[0] <= max_w:
            cur.append(w)
        else:
            if cur:
                lines.append(" ".join(cur))
            cur = [w]
    if cur:
        lines.append(" ".join(cur))
    return lines


def fit_text_in_box(
    draw: ImageDraw.ImageDraw,
    text: str,
    font_loader,
    box_w: int,
    box_h: int,
    max_size: int,
    min_size: int = 18,
    line_spacing: float = 1.05,
) -> tuple[ImageFont.FreeTypeFont, list[str]]:
    """Find the largest font size where text wraps to box_w and fits in box_h."""
    for size in range(max_size, min_size - 1, -2):
        font = font_loader(size)
        lines = wrap_to_width(draw, text, font, box_w)
        if not lines:
            return font, []
        line_h = font.getbbox("Mg")[3] - font.getbbox("Mg")[1]
        total_h = int(line_h * line_spacing * len(lines))
        if total_h <= box_h:
            return font, lines
    font = font_loader(min_size)
    return font, wrap_to_width(draw, text, font, box_w)


def draw_impact_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    box: tuple[int, int, int, int],
    max_size: int = 90,
    min_size: int = 22,
    align: str = "center",
    valign: str = "center",
    upper: bool = True,
    fill: str = WHITE,
    stroke: str = BLACK,
    stroke_ratio: float = 0.07,
    font_loader=impact,
) -> None:
    """Classic meme caption: Impact, white fill, black stroke, all caps, fitted to box."""
    x0, y0, x1, y1 = box
    box_w, box_h = x1 - x0, y1 - y0
    rendered = text.upper() if upper else text
    font, lines = fit_text_in_box(draw, rendered, font_loader, box_w, box_h, max_size, min_size)
    if not lines:
        return
    line_h = font.getbbox("Mg")[3] - font.getbbox("Mg")[1]
    spacing = 1.05
    total_h = int(line_h * spacing * len(lines))
    if valign == "center":
        y = y0 + max(0, (box_h - total_h) // 2)
    elif valign == "bottom":
        y = y1 - total_h
    else:
        y = y0
    stroke_w = max(2, int(font.size * stroke_ratio))
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_w = bbox[2] - bbox[0]
        if align == "center":
            x = x0 + (box_w - line_w) // 2
        elif align == "right":
            x = x1 - line_w
        else:
            x = x0
        draw.text(
            (x, y),
            line,
            font=font,
            fill=fill,
            stroke_width=stroke_w,
            stroke_fill=stroke,
        )
        y += int(line_h * spacing)


def draw_label_box(
    draw: ImageDraw.ImageDraw,
    text: str,
    cx: int,
    cy: int,
    max_w: int,
    max_size: int = 56,
    bg: str = "#FFFFFF",
    fg: str = "#000000",
    pad: int = 14,
    font_loader=arial_bold,
) -> None:
    """White rounded box with bold black text — used for figure labels on memes like distracted boyfriend."""
    rendered = text
    for size in range(max_size, 14, -2):
        font = font_loader(size)
        lines = wrap_to_width(draw, rendered, font, max_w - pad * 2)
        if not lines:
            return
        line_h = font.getbbox("Mg")[3] - font.getbbox("Mg")[1]
        total_h = int(line_h * 1.15 * len(lines))
        max_line_w = max(draw.textbbox((0, 0), ln, font=font)[2] for ln in lines)
        if max_line_w + pad * 2 <= max_w and total_h + pad * 2 <= int(max_w * 0.9):
            break
    box_w = max_line_w + pad * 2
    box_h = total_h + pad * 2
    x0 = cx - box_w // 2
    y0 = cy - box_h // 2
    draw.rounded_rectangle([(x0, y0), (x0 + box_w, y0 + box_h)], radius=8, fill=bg)
    y = y0 + pad
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        draw.text((x0 + (box_w - lw) // 2, y), line, font=font, fill=fg)
        y += int(line_h * 1.15)


# Canonical brand logo path per VIDEO_PRODUCTION_SKILL.md §3 and Matt's direct instruction.
# Use ONLY this file for branding. Do not redesign or substitute.
LOGO_PATH = SKILL_DIR.parent.parent / "listing_video_v4" / "public" / "brand" / "stacked_logo_white.png"


def add_watermark(img: Image.Image) -> Image.Image:
    """Bottom-right watermark using the canonical white stacked Ryan Realty logo.
    Subtle plate keeps the logo legible over any base image; the meme reads as a meme,
    not as a corporate ad, while still carrying the brand."""
    if not LOGO_PATH.exists():
        raise FileNotFoundError(
            f"Canonical logo missing at {LOGO_PATH}. "
            "Per VIDEO_PRODUCTION_SKILL.md, this is the only allowed branding asset for image memes."
        )
    w, h = img.size
    logo = Image.open(LOGO_PATH).convert("RGBA")
    target_w = int(w * 0.18)
    ratio = target_w / logo.size[0]
    target_h = int(logo.size[1] * ratio)
    logo = logo.resize((target_w, target_h), Image.LANCZOS)
    pad = int(h * 0.020)
    px = w - target_w - pad
    py = h - target_h - pad
    plate_pad_x = int(target_w * 0.06)
    plate_pad_y = int(target_h * 0.30)
    plate = Image.new(
        "RGBA",
        (target_w + plate_pad_x * 2, target_h + plate_pad_y * 2),
        (0, 0, 0, 130),
    )
    img_rgba = img.convert("RGBA")
    img_rgba.alpha_composite(plate, dest=(px - plate_pad_x, py - plate_pad_y))
    img_rgba.alpha_composite(logo, dest=(px, py))
    return img_rgba.convert("RGB")


# ============================================================================
# Per-template renderers. Each takes slots + platform dict + out path.
# Slot positions are normalized to the BASE template image, then mapped onto
# whatever canvas the platform uses.
# ============================================================================


def _open_base(name: str) -> Image.Image:
    p = BASE_IMAGES_DIR / name
    if not p.exists():
        raise FileNotFoundError(f"Base image missing: {p}")
    return Image.open(p).convert("RGB")


def _render_with_overlay(
    base_name: str,
    slots: dict,
    platform: dict,
    out_path: Path,
    overlay_fn,
) -> None:
    base = _open_base(base_name)
    canvas, (ox, oy, scaled_w, scaled_h) = fit_to_platform(base, platform["width"], platform["height"])
    draw = ImageDraw.Draw(canvas)

    pw, ph = platform["width"], platform["height"]

    def to_canvas(nx, ny, nw, nh):
        return (
            ox + int(nx * scaled_w),
            oy + int(ny * scaled_h),
            ox + int((nx + nw) * scaled_w),
            oy + int((ny + nh) * scaled_h),
        )

    def to_canvas_abs(nx, ny, nw, nh):
        return (
            int(nx * pw),
            int(ny * ph),
            int((nx + nw) * pw),
            int((ny + nh) * ph),
        )

    overlay_fn(draw, slots, to_canvas, scaled_w, scaled_h, ox, oy, canvas, to_canvas_abs)
    final = add_watermark(canvas)
    final.save(out_path, "PNG", optimize=True)


def render_drake(slots, platform, out_path):
    def overlay(draw, slots, to_canvas, sw, sh, ox, oy, canvas, to_abs):
        top_box = to_canvas(0.50, 0.05, 0.48, 0.40)
        bot_box = to_canvas(0.50, 0.55, 0.48, 0.40)
        draw_impact_text(draw, slots["top"], top_box, max_size=int(sh * 0.058), min_size=18)
        draw_impact_text(draw, slots["bottom"], bot_box, max_size=int(sh * 0.058), min_size=18)
    _render_with_overlay("drake.jpg", slots, platform, out_path, overlay)


def render_distracted_boyfriend(slots, platform, out_path):
    def overlay(draw, slots, to_canvas, sw, sh, ox, oy, canvas, to_abs):
        gx = ox + int(0.78 * sw)
        gy = oy + int(0.20 * sh)
        bx = ox + int(0.50 * sw)
        by = oy + int(0.18 * sh)
        ox2 = ox + int(0.20 * sw)
        oy2 = oy + int(0.62 * sh)
        max_w = int(sw * 0.34)
        draw_label_box(draw, slots["other_woman"], gx, gy, max_w, max_size=int(sh * 0.045))
        draw_label_box(draw, slots["boyfriend"], bx, by, max_w, max_size=int(sh * 0.045))
        draw_label_box(draw, slots["girlfriend"], ox2, oy2, max_w, max_size=int(sh * 0.045))
    _render_with_overlay("distracted_boyfriend.jpg", slots, platform, out_path, overlay)


def render_this_is_fine(slots, platform, out_path):
    """This Is Fine — text in canvas-relative bands above and below the comic.
    The base comic is wide-and-short; we use the letterbox space for caption text."""
    def overlay(draw, slots, to_canvas, sw, sh, ox, oy, canvas, to_abs):
        pw, ph = canvas.size
        # Top band: from canvas top to top of scaled comic
        top_band = (40, 20, pw - 40, max(60, oy - 20))
        bot_band = (40, oy + sh + 20, pw - 40, ph - 20)
        draw_impact_text(draw, slots["top"], top_band, max_size=int(ph * 0.065), min_size=24, valign="center")
        draw_impact_text(draw, slots["bottom"], bot_band, max_size=int(ph * 0.075), min_size=28, valign="center")
    _render_with_overlay("this_is_fine.jpg", slots, platform, out_path, overlay)


def render_expanding_brain(slots, platform, out_path):
    """Expanding Brain — text on LEFT side (brains are on right in this template)."""
    def overlay(draw, slots, to_canvas, sw, sh, ox, oy, canvas, to_abs):
        for i, key in enumerate(["panel_1", "panel_2", "panel_3", "panel_4"]):
            y_start = 0.03 + i * 0.245
            box = to_canvas(0.02, y_start + 0.02, 0.43, 0.21)
            draw_impact_text(
                draw,
                slots[key],
                box,
                max_size=int(sh * 0.040),
                min_size=14,
                upper=False,
                fill=BLACK,
                stroke=WHITE,
                stroke_ratio=0.0,
                font_loader=arial_bold,
            )
    _render_with_overlay("expanding_brain.jpg", slots, platform, out_path, overlay)


def render_woman_yelling_cat(slots, platform, out_path):
    def overlay(draw, slots, to_canvas, sw, sh, ox, oy, canvas, to_abs):
        left_box = to_canvas(0.02, 0.02, 0.46, 0.18)
        right_box = to_canvas(0.52, 0.02, 0.46, 0.18)
        draw_impact_text(draw, slots["woman"], left_box, max_size=int(sh * 0.06), min_size=14)
        draw_impact_text(draw, slots["cat"], right_box, max_size=int(sh * 0.06), min_size=14)
    _render_with_overlay("woman_yelling_cat.jpg", slots, platform, out_path, overlay)


def render_change_my_mind(slots, platform, out_path):
    """The sign occupies roughly the center of the lower half. Text goes in the upper portion of the sign,
    above the existing 'CHANGE MY MIND' text."""
    def overlay(draw, slots, to_canvas, sw, sh, ox, oy, canvas, to_abs):
        # Sign is at x:0.32-0.85, y:0.62-0.97. Hot take goes in upper sign area, above "CHANGE MY MIND".
        sign_box = to_canvas(0.34, 0.65, 0.49, 0.22)
        draw_impact_text(
            draw,
            slots["sign"],
            sign_box,
            max_size=int(sh * 0.045),
            min_size=12,
            upper=False,
            fill=BLACK,
            stroke=WHITE,
            stroke_ratio=0.0,
            font_loader=arial_bold,
        )
    _render_with_overlay("change_my_mind.jpg", slots, platform, out_path, overlay)


def render_epic_handshake(slots, platform, out_path):
    """Epic Handshake — two arms agreeing on something. Top label = the agreement.
    Left/right labels go on the sleeves."""
    def overlay(draw, slots, to_canvas, sw, sh, ox, oy, canvas, to_abs):
        pw, ph = canvas.size
        # Top caption in the canvas band above the handshake
        top_band = (40, max(20, oy - 80), pw - 40, max(60, oy + int(sh * 0.08)))
        draw_impact_text(draw, slots["top"], top_band, max_size=int(ph * 0.055), min_size=20, valign="center")
        # Left arm/sleeve
        left_box = to_canvas(0.0, 0.55, 0.30, 0.20)
        draw_impact_text(draw, slots["left"], left_box, max_size=int(sh * 0.05), min_size=14)
        # Right arm/sleeve
        right_box = to_canvas(0.70, 0.55, 0.30, 0.20)
        draw_impact_text(draw, slots["right"], right_box, max_size=int(sh * 0.05), min_size=14)
    _render_with_overlay("same_picture.jpg", slots, platform, out_path, overlay)


def render_grus_plan(slots, platform, out_path):
    """Gru's Plan — paint a white rectangle at the top of each panel and write text on it."""
    def overlay(draw, slots, to_canvas, sw, sh, ox, oy, canvas, to_abs):
        # Each panel's top sliver. Paint white rectangle, then text.
        panel_specs = [
            (0.00, 0.00, 0.50, 0.13),
            (0.50, 0.00, 0.50, 0.13),
            (0.00, 0.50, 0.50, 0.13),
            (0.50, 0.50, 0.50, 0.13),
        ]
        for i, key in enumerate(["panel_1", "panel_2", "panel_3", "panel_4"]):
            x0, y0, x1, y1 = to_canvas(*panel_specs[i])
            pad = 8
            draw.rectangle([(x0 + pad, y0 + pad), (x1 - pad, y1 - pad)], fill=WHITE, outline=BLACK, width=2)
            box = (x0 + pad + 8, y0 + pad + 4, x1 - pad - 8, y1 - pad - 4)
            draw_impact_text(
                draw, slots[key], box,
                max_size=int(sh * 0.038), min_size=10,
                upper=False, fill=BLACK, stroke=WHITE, stroke_ratio=0.0,
                font_loader=arial_bold,
            )
    _render_with_overlay("grus_plan.jpg", slots, platform, out_path, overlay)


def render_two_buttons(slots, platform, out_path):
    def overlay(draw, slots, to_canvas, sw, sh, ox, oy, canvas, to_abs):
        # The buttons sit roughly: left ~ x=0.10-0.45 y=0.05-0.18, right ~ x=0.55-0.95 y=0.05-0.18
        left_btn = to_canvas(0.08, 0.04, 0.38, 0.14)
        right_btn = to_canvas(0.55, 0.04, 0.40, 0.14)
        draw_impact_text(
            draw, slots["button_left"], left_btn,
            max_size=int(sh * 0.030), min_size=10,
            upper=False, fill=BLACK, stroke=WHITE, stroke_ratio=0.0,
            font_loader=arial_bold,
        )
        draw_impact_text(
            draw, slots["button_right"], right_btn,
            max_size=int(sh * 0.030), min_size=10,
            upper=False, fill=BLACK, stroke=WHITE, stroke_ratio=0.0,
            font_loader=arial_bold,
        )
        if slots.get("caption"):
            cap = to_canvas(0.05, 0.82, 0.90, 0.16)
            draw_impact_text(draw, slots["caption"], cap, max_size=int(sh * 0.045), min_size=14)
    _render_with_overlay("two_buttons.jpg", slots, platform, out_path, overlay)


def render_always_has_been(slots, platform, out_path):
    def overlay(draw, slots, to_canvas, sw, sh, ox, oy, canvas, to_abs):
        front_box = to_canvas(0.05, 0.08, 0.55, 0.25)
        back_box = to_canvas(0.65, 0.08, 0.32, 0.25)
        draw_impact_text(draw, slots["front"], front_box, max_size=int(sh * 0.05), min_size=14)
        draw_impact_text(draw, slots["back"], back_box, max_size=int(sh * 0.05), min_size=14)
    _render_with_overlay("always_has_been.png", slots, platform, out_path, overlay)


RENDERERS = {
    "drake": render_drake,
    "distracted_boyfriend": render_distracted_boyfriend,
    "this_is_fine": render_this_is_fine,
    "expanding_brain": render_expanding_brain,
    "woman_yelling_cat": render_woman_yelling_cat,
    "change_my_mind": render_change_my_mind,
    "epic_handshake": render_epic_handshake,
    "grus_plan": render_grus_plan,
    "two_buttons": render_two_buttons,
    "always_has_been": render_always_has_been,
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--template", required=True, choices=sorted(RENDERERS.keys()))
    ap.add_argument("--slots", required=True)
    ap.add_argument("--platform", default="ig_square", choices=list(BRAND["platforms"].keys()))
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    with open(args.slots) as f:
        slots = json.load(f)
    if "slots" in slots:
        slots = slots["slots"]
    platform = BRAND["platforms"][args.platform]
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    RENDERERS[args.template](slots, platform, out_path)
    print(f"Rendered {args.template} ({args.platform}) -> {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
