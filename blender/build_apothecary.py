"""
build_apothecary.py — the apothecary snack wall (brief §4.3, 3D-4).

A walnut cabinet in two parts: below, a bank of drawers with bronze label
frames, printed paper labels and turned brass knobs; above, open shelves of
glass jars (kopi beans, kuih, biscuits) washed by a concealed 2700 K LED under
each shelf; a recessed plinth with a shadow gap and a slim cornice.

    blender -b -P blender/build_apothecary.py -- [--rows 5] [--cols 4] [--out blender/out]
    python blender/build_apothecary.py [...]          # with the `bpy` module

Also imported by build_store.py (Lounge wall, and a short section in the window).
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402

import kit  # noqa: E402
import materials  # noqa: E402
from common import ROOT, export_glb, reset_scene, save_blend, script_args, text  # noqa: E402

LABELS = [
    "Kopi Tarik", "Kopi-O Kosong", "Teh Tarik", "Kuih Seri Muka",
    "Kuih Lapis", "Ondeh-Ondeh", "Kaya Toast", "Pandan Chiffon",
    "Tau Sar Pneah", "Barley Ais", "Milo Ais", "Pineapple Tart",
]

DRAWER_W = 0.32
DRAWER_H = 0.20
GAP = 0.008
FRAME = 0.035
PLINTH = 0.10
SHELF_GAP = 0.34

# What is in the jars: (colour of the contents, fill height 0–1).
JAR_FILL = [("#3B2618", 0.7), ("#C99A5B", 0.55), ("#E8D7A8", 0.6), ("#6E8B3D", 0.5), ("#D9A066", 0.65), ("#F1E6CF", 0.45)]


def cabinet_size(rows: int, cols: int, shelves: int = 2) -> tuple[float, float]:
    width = cols * DRAWER_W + (cols + 1) * GAP + FRAME * 2
    height = rows * DRAWER_H + (rows + 1) * GAP + FRAME * 2 + PLINTH + shelves * SHELF_GAP + 0.05
    return width, height


def jar(name: str, center, radius: float, height: float, fill: tuple[str, float], m: dict, col) -> list[bpy.types.Object]:
    """A turned glass jar with a walnut lid and something inside."""
    r, h = radius, height
    glass_profile = [(0, 0), (r * 0.92, 0), (r, 0.01), (r, h * 0.82), (r * 0.78, h * 0.9), (r * 0.74, h * 0.94),
                     (r * 0.70, h * 0.94), (r * 0.70, h * 0.02), (0, h * 0.02)]
    parts = [kit.lathe(f"{name}-glass", glass_profile, center, m["glass"], col, segments=32)]
    c = materials.flat(f"jar-fill-{fill[0]}", fill[0], roughness=0.9)
    fh = (h * 0.82 - 0.012) * fill[1]
    parts.append(kit.lathe(f"{name}-fill", [(0, 0), (r * 0.9, 0), (r * 0.9, fh), (r * 0.6, fh + 0.008), (0, fh + 0.01)],
                           (center[0], center[1], center[2] + 0.012), c, col, segments=24))
    parts.append(kit.lathe(f"{name}-lid", [(0, 0), (r * 0.8, 0), (r * 0.82, 0.02), (r * 0.5, 0.032), (r * 0.2, 0.05), (0, 0.052)],
                           (center[0], center[1], center[2] + h * 0.94), m["walnut"], col, segments=32))
    return parts


def build(
    origin: tuple[float, float, float] = (0.0, 0.0, 0.0),
    rotation_z: float = 0.0,
    rows: int = 5,
    cols: int = 4,
    depth: float = 0.42,
    labels: bool = True,
    shelves: int = 2,
    m: dict | None = None,
    name: str = "apothecary",
) -> bpy.types.Object:
    """
    Builds the cabinet with its back at `origin` (floor level, centred on x),
    fronts facing −Y before `rotation_z`. Returns the parent empty.
    """
    m = m or materials.library()
    col = kit.collection("Apothecary")
    rnd = random.Random(7)
    width, height = cabinet_size(rows, cols, shelves)
    drawers_top = PLINTH + rows * DRAWER_H + (rows + 1) * GAP + FRAME * 2
    parts: list[bpy.types.Object] = []
    add = parts.append

    # Carcass: lower case, recessed plinth with a shadow gap, top case with open shelves.
    add(kit.rbox(f"{name}-case", (width, depth, drawers_top - PLINTH), (0, -depth / 2, PLINTH + (drawers_top - PLINTH) / 2), m["walnut"], col, bevel=0.003))
    add(kit.rbox(f"{name}-plinth", (width - 0.08, depth - 0.06, PLINTH), (0, -depth / 2 + 0.02, PLINTH / 2), m["ink_matte"], col, bevel=0))
    upper_d = depth * 0.62
    top = height
    for side in (-1, 1):
        add(kit.rbox(f"{name}-side{side:+d}", (0.025, upper_d, top - drawers_top), (side * (width / 2 - 0.0125), -upper_d / 2, (top + drawers_top) / 2), m["walnut"], col, bevel=0.002))
    add(kit.rbox(f"{name}-back", (width - 0.05, 0.012, top - drawers_top), (0, -0.006, (top + drawers_top) / 2), m["walnut"], col, bevel=0))
    add(kit.rbox(f"{name}-cornice", (width + 0.03, upper_d + 0.03, 0.035), (0, -upper_d / 2 - 0.005, top + 0.0175), m["walnut"], col, bevel=0.004))
    # Counter ledge on the drawer bank, a hand's depth of brushed bronze at the front edge.
    add(kit.rbox(f"{name}-ledge", (width + 0.02, depth + 0.02, 0.03), (0, -depth / 2 - 0.005, drawers_top + 0.015), m["walnut"], col, bevel=0.004))
    add(kit.rbox(f"{name}-ledge-edge", (width + 0.02, 0.006, 0.03), (0, -depth - 0.018, drawers_top + 0.015), m["bronze"], col, bevel=0.001))

    # Drawers.
    for r in range(rows):
        for c in range(cols):
            x = -width / 2 + FRAME + GAP + DRAWER_W / 2 + c * (DRAWER_W + GAP)
            z = drawers_top - FRAME - GAP - DRAWER_H / 2 - r * (DRAWER_H + GAP)
            front_y = -depth - 0.011
            n = f"{name}-drawer-{r}-{c}"
            add(kit.rbox(f"{n}-front", (DRAWER_W, 0.022, DRAWER_H), (x, front_y, z), m["walnut"], col, bevel=0.003))
            # Bronze label frame with a paper card.
            add(kit.rbox(f"{n}-frame", (0.12, 0.004, 0.05), (x, front_y - 0.012, z + 0.045), m["bronze"], col, bevel=0.001))
            add(kit.rbox(f"{n}-card", (0.106, 0.002, 0.038), (x, front_y - 0.0145, z + 0.045), m["paper"], col, bevel=0))
            knob = kit.lathe(f"{n}-knob", [(0, 0), (0.008, 0), (0.008, 0.012), (0.014, 0.02), (0.012, 0.028), (0, 0.03)],
                             (x, front_y - 0.011, z - 0.04), m["brass"], col, segments=20)
            knob.rotation_euler = (math.pi / 2, 0, 0)
            add(knob)
            if labels:
                label = LABELS[(r * cols + c) % len(LABELS)]
                add(text(f"{n}-rx", label, 0.0105, (x, front_y - 0.0158, z + 0.041), m["ink"], col, align="CENTER"))

    # Open shelves with jars; a concealed LED strip under each shelf washes the jars below.
    inner_w = width - 0.05
    for s in range(shelves):
        z_shelf = drawers_top + 0.03 + (s + 1) * SHELF_GAP
        if s < shelves - 1:
            add(kit.rbox(f"{name}-shelf-{s}", (inner_w, upper_d - 0.01, 0.025), (0, -upper_d / 2, z_shelf), m["walnut"], col, bevel=0.002))
        led_z = z_shelf - 0.016 if s < shelves - 1 else top - 0.002
        add(kit.rbox(f"{name}-led-{s}", (inner_w - 0.04, 0.008, 0.004), (0, -upper_d + 0.03, led_z), m["led"], col, bevel=0))
        base_z = drawers_top + 0.03 + s * SHELF_GAP + (0.0125 if s else 0.0)
        n_jars = max(3, int(inner_w / 0.13))
        for j in range(n_jars):
            jx = -inner_w / 2 + (j + 0.5) * inner_w / n_jars
            h = 0.2 + rnd.choice((0.0, 0.03, 0.06))
            rad = 0.045 + rnd.choice((0.0, 0.008))
            parts.extend(jar(f"{name}-jar-{s}-{j}", (jx, -upper_d / 2 + 0.01, base_z), rad, h, JAR_FILL[(s * 3 + j) % len(JAR_FILL)], m, col))

    root = kit.group(name, parts, origin, rotation_z, col)
    root["drprop_role"] = "apothecary"
    return root


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the Dr Prop apothecary wall.")
    parser.add_argument("--rows", type=int, default=5)
    parser.add_argument("--cols", type=int, default=4)
    parser.add_argument("--out", type=Path, default=ROOT / "blender/out")
    parser.add_argument("--glb", action="store_true", help="also export apothecary.glb next to the .blend")
    args = parser.parse_args(script_args())
    reset_scene()
    build(rows=args.rows, cols=args.cols)
    save_blend(args.out / "apothecary.blend")
    if args.glb:
        export_glb(args.out / "apothecary.glb")
    print(f"apothecary: {args.rows}×{args.cols} drawers → {args.out}")


if __name__ == "__main__":
    main()
