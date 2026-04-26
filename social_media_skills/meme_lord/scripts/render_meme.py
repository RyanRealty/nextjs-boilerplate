"""
meme_lord renderer — produces image memes from templates + filled slots.

Usage:
  python3 render_meme.py --template <template_id> --slots <slots.json> --platform <platform_id> --out <path>

Reads brand_tokens.json for colors and fonts. Reads templates/registry.json for slot schemas.
Falls back to system fonts if brand fonts are missing (logs a warning, does not fail in dev mode).

This renderer has no AI text generation. Slot text comes from a human-written brief.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SCRIPT_DIR = Path(__file__).parent
SKILL_DIR = SCRIPT_DIR.parent
TEMPLATES_DIR = SKILL_DIR / "templates"

with open(TEMPLATES_DIR / "brand_tokens.json") as f:
    BRAND = json.load(f)

with open(TEMPLATES_DIR / "registry.json") as f:
    REGISTRY = json.load(f)

NAVY = BRAND["colors"]["navy"]
GOLD = BRAND["colors"]["gold"]
WHITE = BRAND["colors"]["white"]
CHARCOAL = BRAND["colors"]["charcoal"]
CREAM = BRAND["colors"]["cream"]
IMESSAGE_BLUE = BRAND["colors"]["imessage_blue"]
IMESSAGE_GRAY = BRAND["colors"]["imessage_gray"]


def load_font(family: str, size: int) -> ImageFont.FreeTypeFont:
    """Load a brand font with system fallback."""
    spec = BRAND["fonts"].get(family, {})
    for path_str in spec.get("fallback_search_paths", []):
        candidate = (SKILL_DIR / path_str).resolve()
        if candidate.exists():
            try:
                return ImageFont.truetype(str(candidate), size)
            except Exception:
                continue
    sys_fallback = spec.get("system_fallback", "Helvetica")
    for sys_path in (
        f"/System/Library/Fonts/Supplemental/{sys_fallback}.ttf",
        f"/System/Library/Fonts/{sys_fallback}.ttc",
        f"/Library/Fonts/{sys_fallback}.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ):
        if Path(sys_path).exists():
            try:
                return ImageFont.truetype(sys_path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def wrap_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        trial = " ".join(current + [word])
        bbox = draw.textbbox((0, 0), trial, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current.append(word)
        else:
            if current:
                lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines


def draw_text_block(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    color: str,
    box: tuple[int, int, int, int],
    align: str = "center",
    line_spacing: float = 1.15,
) -> None:
    x0, y0, x1, y1 = box
    max_width = x1 - x0
    lines = wrap_text(draw, text, font, max_width)
    line_heights = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_heights.append(bbox[3] - bbox[1])
    total_height = sum(line_heights) + int(sum(line_heights) * (line_spacing - 1) * (len(lines) - 1))
    y = y0 + max(0, ((y1 - y0) - total_height) // 2)
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        line_w = bbox[2] - bbox[0]
        if align == "center":
            x = x0 + (max_width - line_w) // 2
        elif align == "right":
            x = x1 - line_w
        else:
            x = x0
        draw.text((x, y), line, fill=color, font=font)
        y += int(line_heights[i] * line_spacing)


def add_brand_footer(
    img: Image.Image,
    bg_color: str = NAVY,
    text_color: str = WHITE,
    height_ratio: float = 0.07,
) -> Image.Image:
    """Add a small navy footer with the brand wordmark + handle."""
    w, h = img.size
    footer_h = int(h * height_ratio)
    new_img = Image.new("RGB", (w, h + footer_h), bg_color)
    new_img.paste(img, (0, 0))
    draw = ImageDraw.Draw(new_img)
    font = load_font("headline", int(footer_h * 0.45))
    handle_font = load_font("body", int(footer_h * 0.32))
    draw.text((int(w * 0.04), h + int(footer_h * 0.18)), "RYAN REALTY", fill=text_color, font=font)
    bbox = draw.textbbox((0, 0), "@ryanrealty  •  Bend, OR", font=handle_font)
    handle_w = bbox[2] - bbox[0]
    draw.text(
        (w - handle_w - int(w * 0.04), h + int(footer_h * 0.27)),
        "@ryanrealty  •  Bend, OR",
        fill=text_color,
        font=handle_font,
    )
    gold_line_y = h + 2
    draw.rectangle([(0, gold_line_y), (w, gold_line_y + 3)], fill=GOLD)
    return new_img


def render_pull_quote_card(
    slots: dict, platform: dict, out_path: Path
) -> None:
    """Pull-quote card: cream bg, navy serif quote, gold attribution line."""
    w, h = platform["width"], platform["height"]
    img = Image.new("RGB", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    margin = int(w * 0.10)
    quote = '"' + slots["quote_text"] + '"'
    quote_font = load_font("headline", int(h * 0.07))
    box = (margin, int(h * 0.18), w - margin, int(h * 0.72))
    draw_text_block(draw, quote, quote_font, NAVY, box, align="center", line_spacing=1.2)
    attr_font = load_font("body", int(h * 0.028))
    attr = "— " + slots.get("attribution", "Matt Ryan, Principal Broker")
    bbox = draw.textbbox((0, 0), attr, font=attr_font)
    aw = bbox[2] - bbox[0]
    draw.text(((w - aw) // 2, int(h * 0.78)), attr, fill=CHARCOAL, font=attr_font)
    line_y = int(h * 0.85)
    draw.rectangle(
        [(int(w * 0.42), line_y), (int(w * 0.58), line_y + 4)], fill=GOLD
    )
    final = add_brand_footer(img)
    final.save(out_path, "PNG", optimize=True)


def render_drake_yes_no(slots: dict, platform: dict, out_path: Path) -> None:
    """Drake yes/no — two stacked panels. Left = brand color block + label, right = text."""
    w, h = platform["width"], platform["height"]
    img = Image.new("RGB", (w, h), WHITE)
    draw = ImageDraw.Draw(img)
    panel_h = h // 2
    draw.rectangle([(0, 0), (w // 2, panel_h)], fill="#8B0000")
    draw.rectangle([(0, panel_h), (w // 2, h)], fill="#0B5C2E")
    icon_font = load_font("headline", int(panel_h * 0.30))
    no_text = "NOPE"
    yes_text = "YES"
    bbox = draw.textbbox((0, 0), no_text, font=icon_font)
    nw = bbox[2] - bbox[0]
    nh = bbox[3] - bbox[1]
    draw.text(((w // 2 - nw) // 2, (panel_h - nh) // 2 - 10), no_text, fill=WHITE, font=icon_font)
    bbox = draw.textbbox((0, 0), yes_text, font=icon_font)
    yw = bbox[2] - bbox[0]
    yh = bbox[3] - bbox[1]
    draw.text(((w // 2 - yw) // 2, panel_h + (panel_h - yh) // 2 - 10), yes_text, fill=WHITE, font=icon_font)
    text_font = load_font("body", int(h * 0.045))
    margin = int(w * 0.04)
    top_box = (w // 2 + margin, int(panel_h * 0.10), w - margin, panel_h - int(panel_h * 0.10))
    bottom_box = (w // 2 + margin, panel_h + int(panel_h * 0.10), w - margin, h - int(panel_h * 0.10))
    draw_text_block(draw, slots["top_panel_text"], text_font, CHARCOAL, top_box, align="left", line_spacing=1.25)
    draw_text_block(draw, slots["bottom_panel_text"], text_font, CHARCOAL, bottom_box, align="left", line_spacing=1.25)
    draw.line([(0, panel_h), (w, panel_h)], fill=CHARCOAL, width=3)
    draw.line([(w // 2, 0), (w // 2, h)], fill=CHARCOAL, width=3)
    final = add_brand_footer(img)
    final.save(out_path, "PNG", optimize=True)


def render_pov_youre_a(slots: dict, platform: dict, out_path: Path) -> None:
    """POV: you're a... — top text on a navy gradient background with subtle texture."""
    w, h = platform["width"], platform["height"]
    img = Image.new("RGB", (w, h), NAVY)
    grad = Image.new("L", (1, h))
    for y in range(h):
        grad.putpixel((0, y), int(20 + (y / h) * 60))
    grad = grad.resize((w, h))
    overlay = Image.new("RGB", (w, h), CHARCOAL)
    img = Image.composite(overlay, img, grad)
    draw = ImageDraw.Draw(img)
    line_y = int(h * 0.18)
    draw.rectangle([(int(w * 0.20), line_y), (int(w * 0.80), line_y + 4)], fill=GOLD)
    label_font = load_font("body", int(h * 0.028))
    label = "POV"
    bbox = draw.textbbox((0, 0), label, font=label_font)
    lw = bbox[2] - bbox[0]
    draw.text(((w - lw) // 2, int(h * 0.10)), label, fill=GOLD, font=label_font)
    body_font = load_font("headline", int(h * 0.060))
    box = (int(w * 0.08), int(h * 0.30), int(w * 0.92), int(h * 0.78))
    draw_text_block(draw, slots["pov_line"], body_font, WHITE, box, align="center", line_spacing=1.25)
    sub_font = load_font("body", int(h * 0.024))
    sub = "Bend market data updates every Friday"
    bbox = draw.textbbox((0, 0), sub, font=sub_font)
    sw = bbox[2] - bbox[0]
    draw.text(((w - sw) // 2, int(h * 0.86)), sub, fill="#888899", font=sub_font)
    final = add_brand_footer(img, bg_color=CHARCOAL)
    final.save(out_path, "PNG", optimize=True)


def render_imessage_screenshot(slots: dict, platform: dict, out_path: Path) -> None:
    """Fake iMessage screenshot. Composite contact name. Alternating bubbles."""
    w, h = platform["width"], platform["height"]
    img = Image.new("RGB", (w, h), WHITE)
    draw = ImageDraw.Draw(img)
    header_h = int(h * 0.10)
    draw.rectangle([(0, 0), (w, header_h)], fill="#F4F4F4")
    name_font = load_font("body", int(header_h * 0.32))
    contact = slots.get("contact_name", "Buyer #4")
    bbox = draw.textbbox((0, 0), contact, font=name_font)
    cw = bbox[2] - bbox[0]
    draw.text(((w - cw) // 2, int(header_h * 0.28)), contact, fill=CHARCOAL, font=name_font)
    sub_font = load_font("body", int(header_h * 0.18))
    sub = "Composite. Not a real conversation."
    bbox = draw.textbbox((0, 0), sub, font=sub_font)
    sw = bbox[2] - bbox[0]
    draw.text(((w - sw) // 2, int(header_h * 0.65)), sub, fill="#888888", font=sub_font)
    draw.line([(0, header_h), (w, header_h)], fill="#DDDDDD", width=2)
    bubble_font = load_font("body", int(h * 0.030))
    y = header_h + int(h * 0.04)
    margin = int(w * 0.05)
    max_bubble_w = int(w * 0.65)
    for i, msg in enumerate(slots.get("messages", [])):
        if isinstance(msg, dict):
            text = msg.get("text", "")
            is_buyer = msg.get("from", "buyer") == "buyer"
        else:
            text = msg
            is_buyer = i % 2 == 0
        color = IMESSAGE_GRAY if is_buyer else IMESSAGE_BLUE
        text_color = CHARCOAL if is_buyer else WHITE
        lines = wrap_text(draw, text, bubble_font, max_bubble_w - 60)
        line_heights = [draw.textbbox((0, 0), ln, font=bubble_font)[3] for ln in lines]
        bubble_text_h = sum(line_heights) + int(sum(line_heights) * 0.2 * (len(lines) - 1))
        bubble_h = bubble_text_h + 40
        max_line_w = max(draw.textbbox((0, 0), ln, font=bubble_font)[2] for ln in lines) if lines else 0
        bubble_w = min(max_bubble_w, max_line_w + 50)
        if is_buyer:
            x0 = margin
        else:
            x0 = w - margin - bubble_w
        draw.rounded_rectangle(
            [(x0, y), (x0 + bubble_w, y + bubble_h)],
            radius=24,
            fill=color,
        )
        text_y = y + 20
        for j, line in enumerate(lines):
            draw.text((x0 + 25, text_y), line, fill=text_color, font=bubble_font)
            text_y += int(line_heights[j] * 1.2)
        y += bubble_h + 30
    final = add_brand_footer(img)
    final.save(out_path, "PNG", optimize=True)


def render_tell_me_without(slots: dict, platform: dict, out_path: Path) -> None:
    """Tell me you're a [thing] without telling me."""
    w, h = platform["width"], platform["height"]
    img = Image.new("RGB", (w, h), CREAM)
    draw = ImageDraw.Draw(img)
    label_font = load_font("body", int(h * 0.025))
    label = "tell me without telling me"
    bbox = draw.textbbox((0, 0), label, font=label_font)
    lw = bbox[2] - bbox[0]
    draw.text(((w - lw) // 2, int(h * 0.08)), label, fill="#88775F", font=label_font)
    body_font = load_font("headline", int(h * 0.055))
    box = (int(w * 0.07), int(h * 0.18), int(w * 0.93), int(h * 0.78))
    draw_text_block(draw, slots["tell_line"], body_font, NAVY, box, align="left", line_spacing=1.30)
    line_y = int(h * 0.83)
    draw.rectangle([(int(w * 0.07), line_y), (int(w * 0.20), line_y + 4)], fill=GOLD)
    sig_font = load_font("body", int(h * 0.022))
    draw.text((int(w * 0.07), line_y + 16), "Matt Ryan, Principal Broker, Bend OR", fill=CHARCOAL, font=sig_font)
    final = add_brand_footer(img, bg_color=NAVY)
    final.save(out_path, "PNG", optimize=True)


def render_nobody_me(slots: dict, platform: dict, out_path: Path) -> None:
    """Nobody / Me at 3am."""
    w, h = platform["width"], platform["height"]
    img = Image.new("RGB", (w, h), WHITE)
    draw = ImageDraw.Draw(img)
    nobody_font = load_font("headline", int(h * 0.055))
    me_font = load_font("headline", int(h * 0.050))
    nb_text = slots.get("nobody_line", "Nobody:")
    bbox = draw.textbbox((0, 0), nb_text, font=nobody_font)
    nbw = bbox[2] - bbox[0]
    draw.text(((w - nbw) // 2, int(h * 0.18)), nb_text, fill=CHARCOAL, font=nobody_font)
    draw.line([(int(w * 0.30), int(h * 0.32)), (int(w * 0.70), int(h * 0.32))], fill=GOLD, width=3)
    me_box = (int(w * 0.08), int(h * 0.40), int(w * 0.92), int(h * 0.82))
    draw_text_block(draw, slots["me_line"], me_font, NAVY, me_box, align="center", line_spacing=1.30)
    final = add_brand_footer(img)
    final.save(out_path, "PNG", optimize=True)


RENDERERS = {
    "pull_quote_card": render_pull_quote_card,
    "drake_yes_no": render_drake_yes_no,
    "pov_youre_a": render_pov_youre_a,
    "imessage_screenshot": render_imessage_screenshot,
    "tell_me_without_telling_me": render_tell_me_without,
    "nobody_me_at_3am": render_nobody_me,
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--template", required=True)
    ap.add_argument("--slots", required=True, help="Path to slots JSON")
    ap.add_argument("--platform", default="ig_square")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    if args.template not in RENDERERS:
        print(f"Unknown template: {args.template}", file=sys.stderr)
        print(f"Available: {list(RENDERERS.keys())}", file=sys.stderr)
        return 1
    if args.platform not in BRAND["platforms"]:
        print(f"Unknown platform: {args.platform}", file=sys.stderr)
        return 1
    with open(args.slots) as f:
        slots = json.load(f)
    platform = BRAND["platforms"][args.platform]
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    RENDERERS[args.template](slots, platform, out_path)
    print(f"Rendered {args.template} ({args.platform}) → {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
