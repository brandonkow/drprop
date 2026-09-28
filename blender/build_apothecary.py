"""
build_apothecary.py — the apothecary snack wall (brief §4.3, 3D-4) as a Blender
base model: walnut cabinet, brass pulls, paper labels with printed Rx names.
A 3D artist refines materials and lighting from the saved .blend (pipeline B).

    blender -b -P blender/build_apothecary.py -- [--rows 5] [--cols 4] [--out blender/out]
    python blender/build_apothecary.py [...]          # with the `bpy` module

Also imported by build_store.py to furnish the Lounge wall.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402

from common import ROOT, box, collection, cylinder, export_glb, reset_scene, save_blend, script_args, store_materials, text  # noqa: E402

LABELS = [
    "Kopi Tarik", "Kopi-O Kosong", "Teh Tarik", "Kuih Seri Muka",
    "Kuih Lapis", "Ondeh-Ondeh", "Kaya Toast", "Pandan Chiffon",
    "Tau Sar Pneah", "Barley Ais", "Milo Ais", "Pineapple Tart",
]

DRAWER_W = 0.32
DRAWER_H = 0.20
GAP = 0.012
FRAME = 0.03
PLINTH = 0.12


def cabinet_size(rows: int, cols: int) -> tuple[float, float]:
    width = cols * DRAWER_W + (cols + 1) * GAP + FRAME * 2
    height = rows * DRAWER_H + (rows + 1) * GAP + FRAME * 2 + PLINTH
    return width, height


def build(
    origin: tuple[float, float, float] = (0.0, 0.0, 0.0),
    rotation_z: float = 0.0,
    rows: int = 5,
    cols: int = 4,
    depth: float = 0.42,
    labels: bool = True,
) -> bpy.types.Object:
    """
    Builds the cabinet with its back at `origin` (floor level, centred on x),
    fronts facing −Y before `rotation_z`. Returns the parent empty.
    """
    m = store_materials()
    col = collection("Apothecary")
    root = bpy.data.objects.new("apothecary", None)
    col.objects.link(root)

    width, height = cabinet_size(rows, cols)
    body_h = height - PLINTH

    def child(obj: bpy.types.Object) -> bpy.types.Object:
        obj.parent = root
        return obj

    child(box("apothecary-carcass", (width, depth, body_h), (0, -depth / 2, PLINTH + body_h / 2), m["walnut"], col))
    child(box("apothecary-plinth", (width - 0.06, depth - 0.06, PLINTH), (0, -depth / 2, PLINTH / 2), m["walnut"], col))
    child(box("apothecary-cornice", (width + 0.04, depth + 0.03, 0.04), (0, -depth / 2, height + 0.02), m["walnut"], col))

    for r in range(rows):
        for c in range(cols):
            x = -width / 2 + FRAME + GAP + DRAWER_W / 2 + c * (DRAWER_W + GAP)
            z = height - FRAME - GAP - DRAWER_H / 2 - r * (DRAWER_H + GAP)
            front_y = -depth - 0.01
            name = f"drawer-{r}-{c}"
            child(box(f"{name}-front", (DRAWER_W, 0.02, DRAWER_H), (x, front_y, z), m["walnut"], col))
            child(box(f"{name}-label", (DRAWER_W * 0.55, 0.002, DRAWER_H * 0.28), (x, front_y - 0.011, z + DRAWER_H * 0.18), m["paper"], col))
            pull = cylinder(f"{name}-pull", 0.011, 0.025, (x, front_y - 0.022, z - DRAWER_H * 0.2), m["brass"], col, segments=24)
            pull.rotation_euler = (math.pi / 2, 0, 0)
            child(pull)
            if labels:
                label = LABELS[(r * cols + c) % len(LABELS)]
                child(
                    text(
                        f"{name}-rx",
                        f"Rx · {label}",
                        0.018,
                        (x, front_y - 0.0125, z + DRAWER_H * 0.165),
                        m["ink"],
                        col,
                        align="CENTER",
                    )
                )

    root.location = origin
    root.rotation_euler = (0, 0, rotation_z)
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
