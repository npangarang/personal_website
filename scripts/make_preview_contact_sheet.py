#!/usr/bin/env python3
"""Compose the preview screenshots into a labelled, native-pixel contact sheet.

No resampling is performed: every screenshot is pasted at its original pixel
dimensions, and the label records the exact raw dimensions. A 2-per-row layout
keeps the output compact while preserving all screenshot pixels.

Usage:
    python3 scripts/make_preview_contact_sheet.py \
        --out artifacts/preview/contact-sheet.png \
        --image artifacts/preview/terminal-320.png \
        --image artifacts/preview/terminal-390.png \
        --image artifacts/preview/terminal-768.png \
        --image artifacts/preview/terminal-1440.png

Prints one JSON line with the output dimensions and per-image raw dimensions.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BACKGROUND = "#0a0e17"
TITLE_COLOR = "#e6f7ff"
LABEL_COLOR = "#00fff5"
MUTED_COLOR = "#8b949e"

FONT_CANDIDATES = [
    "/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Regular.ttf",
    "/usr/share/fonts/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
]
BOLD_FONT_CANDIDATES = [
    "/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSansMono-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf",
]


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = BOLD_FONT_CANDIDATES if bold else FONT_CANDIDATES
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # Pillow < 10
        return ImageFont.load_default()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, help="Output PNG path")
    parser.add_argument(
        "--image",
        action="append",
        default=[],
        dest="images",
        help="Screenshot path (repeat for each image, in order)",
    )
    parser.add_argument(
        "--title",
        default="Terminal preview — DPR 1 · viewport height 900 px",
        help="Sheet title",
    )
    parser.add_argument("--columns", type=int, default=2, help="Images per row")
    parser.add_argument("--padding", type=int, default=32, help="Outer padding in px")
    parser.add_argument("--gap", type=int, default=24, help="Gap between images in px")
    parser.add_argument("--label-height", type=int, default=32, help="Height of each label row")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.images:
        print("error: at least one --image is required", file=sys.stderr)
        return 2

    loaded = []
    for image_path in args.images:
        path = Path(image_path)
        with Image.open(path) as source:
            image = source.convert("RGB").copy()
        loaded.append((path, image))

    columns = max(1, args.columns)
    rows = [loaded[index : index + columns] for index in range(0, len(loaded), columns)]

    title_font = load_font(24, bold=True)
    label_font = load_font(18)
    muted_font = load_font(15)

    title_height = 64 if args.title else 0
    row_widths = [
        sum(image.width for _, image in row) + args.gap * (len(row) - 1)
        for row in rows
    ]
    sheet_width = max(row_widths) + args.padding * 2
    sheet_height = (
        args.padding
        + title_height
        + sum(
            args.label_height + max(image.height for _, image in row)
            for row in rows
        )
        + args.gap * (len(rows) - 1)
        + args.padding
    )

    sheet = Image.new("RGB", (sheet_width, sheet_height), BACKGROUND)
    draw = ImageDraw.Draw(sheet)

    y = args.padding
    if args.title:
        draw.text((args.padding, y), args.title, font=title_font, fill=TITLE_COLOR)
        y += 38
        draw.text(
            (args.padding, y),
            "Native pixels, no resampling · 320 / 390 / 768 / 1440 CSS px viewports",
            font=muted_font,
            fill=MUTED_COLOR,
        )
        y += title_height - 38

    image_records = []
    for row_index, row in enumerate(rows):
        x = args.padding
        row_height = max(image.height for _, image in row)
        for path, image in row:
            label = f"{path.name}  ·  {image.width} × {image.height} px"
            draw.text((x, y + 4), label, font=label_font, fill=LABEL_COLOR)
            top = y + args.label_height
            sheet.paste(image, (x, top))
            image_records.append(
                {
                    "path": str(path),
                    "width": image.width,
                    "height": image.height,
                    "sheetX": x,
                    "sheetY": top,
                }
            )
            x += image.width + args.gap
        y += args.label_height + row_height
        if row_index != len(rows) - 1:
            y += args.gap

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path, format="PNG", optimize=False)

    print(
        json.dumps(
            {
                "path": str(out_path),
                "width": sheet_width,
                "height": sheet_height,
                "columns": columns,
                "images": image_records,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
