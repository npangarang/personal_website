#!/usr/bin/env python3
"""Generate the hand-drawn 16x16 Mario and Goomba sprite sheets.

The pixel arrays below are deliberately hand-authored (not traced or sampled
from a ROM). They use an SMB1-inspired palette and are written as ASCII grids so
the art stays reviewable in-repo. The script is deterministic: running it from
any working directory rewrites the same PNG bytes into this repository's
``public/sprites`` directory.

Outputs:
    public/sprites/mario.png   48x16  (three 16x16 walk frames, faces RIGHT)
    public/sprites/goomba.png  16x16  (single frame, faces the viewer)

The classic upside-down Goomba is produced by the renderer flipping this normal
frame with ``scaleY(-1)``; no separate flipped asset is generated.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image

FRAME = 16
TRANSPARENT = (0, 0, 0, 0)

# Familiar NES/SMB1-inspired colours. Red cap and shirt, brown hair and shoes,
# peach skin, blue overalls.
PALETTE: dict[str, tuple[int, int, int, int]] = {
    ".": TRANSPARENT,
    "R": (229, 37, 33, 255),    # red cap / shirt
    "S": (252, 188, 149, 255),  # skin
    "B": (107, 68, 35, 255),    # brown hair / shoes
    "L": (43, 78, 203, 255),    # blue overalls
    "K": (26, 26, 26, 255),     # eye
    "W": (255, 255, 255, 255),  # Goomba eye whites
    "D": (74, 42, 18, 255),     # dark brown outline / Goomba feet
}

# Shared Mario head and torso (rows 0-11). Art faces RIGHT: the eye and cap
# brim sit towards the right edge, the sideburn towards the left.
MARIO_UPPER = [
    "................",
    "......RRRRR.....",
    ".....RRRRRRR....",
    ".....RRRRRRRR...",
    ".....BBSSSKS....",
    "....BBSSSSSSS...",
    "....BBSSSSSSS...",
    ".....SSSSSSS....",
    ".....RRRRRR.....",
    "....RRRRRRRR....",
    "...SSRRLLRRSS...",
    "...SSRRLLRRSS...",
]

# Three walk frames: left stride, legs together, right stride.
MARIO_LEGS = {
    "stride_left": [
        "....LLL..LLL....",
        "....LLL..LLL....",
        "...BBBB..BBBB...",
        "..BBBBB..BBBBB..",
    ],
    "together": [
        ".....LLLLLL.....",
        ".....LLLLLL.....",
        "....BBBBBBBB....",
        "...BBBBBBBBBB...",
    ],
    "stride_right": [
        "...LLL....LLL...",
        "...LLL....LLL...",
        "..BBBB....BBBB..",
        ".BBBBB....BBBBB.",
    ],
}

MARIO_FRAMES = [
    MARIO_UPPER + MARIO_LEGS["stride_left"],
    MARIO_UPPER + MARIO_LEGS["together"],
    MARIO_UPPER + MARIO_LEGS["stride_right"],
]

# Goomba: rounded brown cap, angry brows, white eyes with black pupils and two
# dark feet. Symmetrical because the renderer only flips it upside down.
GOOMBA_FRAME = [
    "................",
    "....DDDDDDDD....",
    "..DDBBBBBBBBDD..",
    ".DBBBBBBBBBBBBD.",
    ".DBBBBBBBBBBBBD.",
    "DBBKKKBBBBKKKBBD",
    "DBBWWWBBBBWWWBBD",
    "DBBWWKBBBBKWWBBD",
    "DBBWWKBBBBKWWBBD",
    "DBBWWWBBBBWWWBBD",
    "DBBBBBBBBBBBBBBD",
    ".DBBBBBBBBBBBBD.",
    "..DDBBBBBBBBDD..",
    "...DDDDDDDDDD...",
    "..DDDDDDDDDDDD..",
    "..DDDD....DDDD..",
]


def frame_from_rows(rows: list[str], name: str) -> Image.Image:
    """Validate an ASCII pixel grid and return it as a 16x16 RGBA image."""
    if len(rows) != FRAME:
        raise SystemExit(f"{name}: expected {FRAME} rows, got {len(rows)}")

    pixels: list[tuple[int, int, int, int]] = []
    for y, row in enumerate(rows):
        if len(row) != FRAME:
            raise SystemExit(
                f"{name}: row {y} is {len(row)} chars, expected {FRAME}: {row!r}"
            )
        for x, char in enumerate(row):
            if char not in PALETTE:
                raise SystemExit(
                    f"{name}: unknown palette char {char!r} at ({x}, {y})"
                )
            pixels.append(PALETTE[char])

    image = Image.new("RGBA", (FRAME, FRAME), TRANSPARENT)
    image.putdata(pixels)
    return image


def build_sheet(frames: list[Image.Image]) -> Image.Image:
    sheet = Image.new("RGBA", (FRAME * len(frames), FRAME), TRANSPARENT)
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * FRAME, 0))
    return sheet


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # No metadata/timestamp is written, so reruns are byte-for-byte stable.
    image.save(path, format="PNG", optimize=False)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    print(f"wrote {path.name}: {image.width}x{image.height} sha256={digest}")


def validate_frame(image: Image.Image, name: str) -> None:
    if image.mode != "RGBA":
        raise SystemExit(f"{name}: expected RGBA, got {image.mode}")
    if image.size != (FRAME, FRAME):
        raise SystemExit(f"{name}: expected 16x16, got {image.size}")
    if image.getextrema()[3][0] != 0:
        raise SystemExit(f"{name}: expected transparent pixels")


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    output_dir = repo_root / "public" / "sprites"

    mario_frames = [
        frame_from_rows(rows, f"mario frame {index}")
        for index, rows in enumerate(MARIO_FRAMES)
    ]
    goomba_frame = frame_from_rows(GOOMBA_FRAME, "goomba")

    for index, image in enumerate(mario_frames):
        validate_frame(image, f"mario frame {index}")
    validate_frame(goomba_frame, "goomba")

    mario_sheet = build_sheet(mario_frames)
    if mario_sheet.size != (48, 16):
        raise SystemExit(f"mario sheet is {mario_sheet.size}, expected (48, 16)")
    if goomba_frame.size != (16, 16):
        raise SystemExit(f"goomba is {goomba_frame.size}, expected (16, 16)")

    save_png(mario_sheet, output_dir / "mario.png")
    save_png(goomba_frame, output_dir / "goomba.png")


if __name__ == "__main__":
    main()
