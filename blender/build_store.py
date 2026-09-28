"""
build_store.py — the store's digital twin as a base model (brief §6, 3D-3, §9.4).

Generates walls, storefront, the halo-lit bronze sign, reception table, Lounge
(sofa, chairs, market-brief table, apothecary wall), consult rooms with frosted
glass doors, round tables and wall screens, the urgent video booth and the
private entrance, with 2700 K light. Exports:

    brand/3d/store.glb        used by reel R7 and the website §4 still
    blender/out/store.blend   for the 3D artist to refine (materials, light)

    blender -b -P blender/build_store.py -- [--config blender/store.config.json] [--render out.png]
    python blender/build_store.py [...]          # with the `bpy` module

--render writes a Cycles still from the doorway (the §4 image before opening).
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402

import build_apothecary  # noqa: E402
from common import (  # noqa: E402
    ROOT,
    WARM_2700K,
    box,
    collection,
    cylinder,
    export_glb,
    point_light,
    reset_scene,
    save_blend,
    script_args,
    store_materials,
    text,
)

WALL = 0.15
GLASS = 0.012


def build_shell(cfg: dict, m: dict) -> None:
    col = collection("Shell")
    W, D, H = cfg["width"], cfg["depth"], cfg["height"]
    box("floor", (W, D, 0.05), (W / 2, D / 2, -0.025), m["travertine"], col)
    ceiling = box("ceiling", (W, D, 0.05), (W / 2, D / 2, H + 0.025), m["limewash"], col)
    ceiling["drprop_hide_in_overview"] = True
    box("wall-back", (W, WALL, H), (W / 2, D + WALL / 2, H / 2), m["limewash"], col)
    box("wall-left", (WALL, D, H), (-WALL / 2, D / 2, H / 2), m["limewash"], col)

    # Right wall, with an optional private entrance near the back (§6.2).
    if cfg.get("privateEntrance"):
        door_y, door_w = D - 2.2, 1.0
        box("wall-right-front", (WALL, door_y, H), (W + WALL / 2, door_y / 2, H / 2), m["limewash"], col)
        rest = D - door_y - door_w
        box("wall-right-back", (WALL, rest, H), (W + WALL / 2, D - rest / 2, H / 2), m["limewash"], col)
        box("wall-right-lintel", (WALL, door_w, H - 2.3), (W + WALL / 2, door_y + door_w / 2, 2.3 + (H - 2.3) / 2), m["limewash"], col)
        box("private-door", (0.05, door_w, 2.3), (W + WALL / 2, door_y + door_w / 2, 1.15), m["walnut"], col)
    else:
        box("wall-right", (WALL, D, H), (W + WALL / 2, D / 2, H / 2), m["limewash"], col)

    # Storefront: stone piers, a quiet glass window, entrance door (§6.1).
    ex, ew = cfg["entrance"]["x"], cfg["entrance"]["width"]
    pier = 0.6
    box("pier-left", (pier, WALL * 2, H), (pier / 2, -WALL, H / 2), m["travertine"], col)
    box("pier-right", (pier, WALL * 2, H), (W - pier / 2, -WALL, H / 2), m["travertine"], col)
    header_h = 0.9
    box("fascia", (W, WALL * 2, header_h), (W / 2, -WALL, H - header_h / 2), m["travertine"], col)
    glass_h = H - header_h
    left_w = ex - pier
    box("window-left", (left_w, GLASS, glass_h), (pier + left_w / 2, -WALL, glass_h / 2), m["glass"], col)
    right_x = ex + ew
    right_w = W - pier - right_x
    box("window-right", (right_w, GLASS, glass_h), (right_x + right_w / 2, -WALL, glass_h / 2), m["glass"], col)
    box("entrance-door", (ew, 0.04, glass_h), (ex + ew / 2, -WALL, glass_h / 2), m["glass"], col)
    box("door-pull", (0.02, 0.05, 0.6), (ex + ew - 0.12, -WALL - 0.05, 1.05), m["bronze"], col)

    # Halo-lit bronze letters: modest, under a quarter of the frontage (§6.1).
    sign = text(
        "signage",
        cfg.get("signage", "DR. PROP"),
        0.34,
        (W / 2, -WALL * 2 - 0.035, H - header_h / 2 - 0.12),
        m["bronze"],
        col,
        extrude=0.012,
        align="CENTER",
    )
    halo = bpy.data.lights.new("signage-halo", "AREA")
    halo.energy = 40
    halo.color = WARM_2700K
    halo.size = 2.2
    halo_obj = bpy.data.objects.new("signage-halo", halo)
    halo_obj.location = (W / 2, -WALL * 2 - 0.01, H - header_h / 2)
    halo_obj.rotation_euler = (math.pi / 2, 0, 0)  # faces the wall behind the letters
    col.objects.link(halo_obj)
    sign["drprop_role"] = "signage"

    # Brass price plate beside the door: the fees are public (§3.2, §6.1).
    box("price-plate", (0.32, 0.01, 0.44), (ex + ew + 0.35, -WALL * 2 - 0.01, 1.35), m["brass"], col)


def build_reception(cfg: dict, m: dict) -> None:
    col = collection("Reception")
    # A long walnut table instead of a high counter (§6.2).
    x, y = cfg["entrance"]["x"] + 1.8, 1.6
    box("reception-top", (2.4, 0.8, 0.05), (x, y, 0.75), m["walnut"], col)
    for dx in (-1.0, 1.0):
        box(f"reception-leg-{dx:+.0f}", (0.06, 0.7, 0.72), (x + dx, y, 0.36), m["walnut"], col)
    box("towel-tray", (0.3, 0.2, 0.03), (x - 0.6, y, 0.79), m["bronze"], col)


def sofa(name: str, center: tuple[float, float], length: float, m: dict, col, rotation: float = 0.0) -> None:
    root = bpy.data.objects.new(name, None)
    col.objects.link(root)
    parts = [
        box(f"{name}-base", (length, 0.9, 0.38), (0, 0, 0.19), m["linen"], col),
        box(f"{name}-back", (length, 0.2, 0.36), (0, 0.35, 0.56), m["linen"], col),
        box(f"{name}-arm-l", (0.18, 0.9, 0.52), (-length / 2 + 0.09, 0, 0.26), m["linen"], col),
        box(f"{name}-arm-r", (0.18, 0.9, 0.52), (length / 2 - 0.09, 0, 0.26), m["linen"], col),
    ]
    for p in parts:
        p.parent = root
    root.location = (center[0], center[1], 0)
    root.rotation_euler = (0, 0, rotation)


def chair(name: str, center: tuple[float, float], m: dict, col, rotation: float = 0.0, lounge: bool = False) -> None:
    root = bpy.data.objects.new(name, None)
    col.objects.link(root)
    seat_h = 0.4 if lounge else 0.46
    w = 0.72 if lounge else 0.46
    parts = [
        box(f"{name}-seat", (w, w, 0.08 if not lounge else 0.3), (0, 0, seat_h - (0.04 if not lounge else 0.15)), m["linen"] if lounge else m["walnut"], col),
        box(f"{name}-back", (w, 0.06, 0.4), (0, w / 2 - 0.03, seat_h + 0.2), m["linen"] if lounge else m["walnut"], col),
    ]
    if not lounge:
        for i, (dx, dy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
            parts.append(box(f"{name}-leg{i}", (0.03, 0.03, seat_h - 0.08), (dx * (w / 2 - 0.03), dy * (w / 2 - 0.03), (seat_h - 0.08) / 2), m["walnut"], col))
    for p in parts:
        p.parent = root
    root.location = (center[0], center[1], 0)
    root.rotation_euler = (0, 0, rotation)


def build_lounge(cfg: dict, m: dict) -> None:
    col = collection("Lounge")
    W, D = cfg["width"], cfg["depth"]
    rooms_w = cfg["consultRooms"] * cfg["consultRoomWidth"]
    # Lounge: the front-right of the plan, in front of the consult rooms.
    sofa("lounge-sofa", (W - 2.2, 2.1), 2.2, m, col, rotation=math.pi / 2)
    chair("lounge-chair-1", (W - 4.2, 1.5), m, col, rotation=-math.pi / 2, lounge=True)
    chair("lounge-chair-2", (W - 4.2, 2.8), m, col, rotation=-math.pi / 2, lounge=True)
    cylinder("lounge-coffee-table", 0.45, 0.04, (W - 3.2, 2.15, 0.42), m["walnut"], col)
    cylinder("lounge-coffee-table-base", 0.12, 0.4, (W - 3.2, 2.15, 0.2), m["walnut"], col)

    # A large table with this month's market brief (§6.2).
    table_y = D - cfg["consultRoomDepth"] - 1.3
    box("brief-table-top", (2.6, 1.0, 0.05), (rooms_w + 2.2, table_y, 0.75), m["walnut"], col)
    for dx in (-1.1, 1.1):
        box(f"brief-table-leg{dx:+.1f}", (0.08, 0.8, 0.72), (rooms_w + 2.2 + dx, table_y, 0.36), m["walnut"], col)
    for i in range(3):
        box(f"brief-{i}", (0.21, 0.297, 0.004), (rooms_w + 1.4 + i * 0.5, table_y, 0.777), m["paper"], col)

    # Apothecary snack wall on the right wall (§4.3).
    rows, cols = cfg["apothecary"]["rows"], cfg["apothecary"]["cols"]
    build_apothecary.build(origin=(W, 3.9, 0), rotation_z=-math.pi / 2, rows=rows, cols=cols)

    for i, (x, y) in enumerate(((W - 3.0, 2.0), (rooms_w + 2.2, table_y), (3.6, 1.6))):
        point_light(f"lounge-light-{i}", (x, y, cfg["height"] - 0.35), 60, col, radius=0.3)


def build_consult_rooms(cfg: dict, m: dict) -> None:
    col = collection("Consult rooms")
    D, H = cfg["depth"], cfg["height"]
    rw, rd = cfg["consultRoomWidth"], cfg["consultRoomDepth"]
    front_y = D - rd
    for i in range(cfg["consultRooms"]):
        x0 = i * rw
        cx = x0 + rw / 2
        name = f"consult-{i + 1}"
        # Partition between rooms, and the room's front: limewash + frosted glass door.
        if i > 0:
            box(f"{name}-side", (WALL, rd, H), (x0, D - rd / 2, H / 2), m["limewash"], col)
        door_w = 0.95
        side_w = (rw - door_w) / 2
        box(f"{name}-front-l", (side_w, WALL, H), (x0 + side_w / 2, front_y, H / 2), m["limewash"], col)
        box(f"{name}-front-r", (side_w, WALL, H), (x0 + rw - side_w / 2, front_y, H / 2), m["limewash"], col)
        box(f"{name}-lintel", (door_w, WALL, H - 2.3), (cx, front_y, 2.3 + (H - 2.3) / 2), m["limewash"], col)
        box(f"{name}-door", (door_w, 0.03, 2.3), (cx, front_y, 1.15), m["frosted"], col)
        # A round table, not a negotiating table (§6.2), three chairs.
        ty = D - rd / 2 - 0.1
        cylinder(f"{name}-table", 0.55, 0.04, (cx, ty, 0.74), m["walnut"], col)
        cylinder(f"{name}-table-base", 0.1, 0.72, (cx, ty, 0.36), m["walnut"], col)
        for k in range(3):
            a = math.pi / 2 + k * 2 * math.pi / 3
            chair(f"{name}-chair-{k}", (cx + math.cos(a) * 0.9, ty + math.sin(a) * 0.9), m, col, rotation=a + math.pi / 2)
        # One wall carries the analysis screen.
        box(f"{name}-screen", (1.4, 0.04, 0.8), (cx, D - 0.03, 1.45), m["screen"], col)
        point_light(f"{name}-light", (cx, ty, H - 0.35), 45, col, radius=0.3)


def build_booth(cfg: dict, m: dict) -> None:
    if not cfg.get("urgentBooth"):
        return
    col = collection("Urgent booth")
    rooms_w = cfg["consultRooms"] * cfg["consultRoomWidth"]
    x, y = rooms_w + 0.1 + 0.55, cfg["depth"] - 0.55
    # 1 m² acoustic booth for urgent video consults.
    box("booth-back", (1.1, 0.06, 2.3), (x, y + 0.52, 1.15), m["walnut"], col)
    box("booth-left", (0.06, 1.1, 2.3), (x - 0.52, y, 1.15), m["walnut"], col)
    box("booth-right", (0.06, 1.1, 2.3), (x + 0.52, y, 1.15), m["walnut"], col)
    box("booth-roof", (1.1, 1.1, 0.06), (x, y, 2.33), m["walnut"], col)
    box("booth-door", (0.98, 0.03, 2.2), (x, y - 0.53, 1.1), m["frosted"], col)
    box("booth-shelf", (0.7, 0.3, 0.03), (x, y + 0.35, 0.95), m["walnut"], col)


def add_camera(cfg: dict) -> bpy.types.Object:
    """Eye-level view from just inside the door, toward the Lounge."""
    cam = bpy.data.cameras.new("doorway")
    cam.lens = 20
    obj = bpy.data.objects.new("doorway", cam)
    obj.location = (1.2, 0.45, 1.6)
    obj.rotation_euler = (math.radians(84), 0, math.radians(-57))
    bpy.context.scene.collection.objects.link(obj)
    bpy.context.scene.camera = obj
    return obj


def cfg_width(scene: bpy.types.Scene) -> float:
    return float(scene.get("drprop_width", 12.5))


def render_still(path: Path, samples: int) -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1200
    scene.view_settings.view_transform = "AgX"
    world = scene.world or bpy.data.worlds.new("world")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.9, 0.87, 0.8, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35
    bpy.data.objects["ceiling"].hide_render = False
    # Daylight through the storefront balances the 2700 K interior light.
    day = bpy.data.lights.new("storefront-daylight", "AREA")
    day.energy = 900
    day.color = (1.0, 0.97, 0.92)
    day.size = cfg_width(scene)
    day_obj = bpy.data.objects.new("storefront-daylight", day)
    day_obj.location = (cfg_width(scene) / 2, -1.2, 1.6)
    day_obj.rotation_euler = (math.radians(90), 0, 0)
    scene.collection.objects.link(day_obj)
    if path.suffix.lower() in (".jpg", ".jpeg"):
        scene.render.image_settings.file_format = "JPEG"
        scene.render.image_settings.quality = 88
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the Dr Prop store base model.")
    parser.add_argument("--config", type=Path, default=ROOT / "blender/store.config.json")
    parser.add_argument("--glb", type=Path, default=ROOT / "brand/3d/store.glb")
    parser.add_argument("--blend", type=Path, default=ROOT / "blender/out/store.blend")
    parser.add_argument("--render", type=Path, help="write a Cycles still from the doorway")
    parser.add_argument("--samples", type=int, default=96)
    args = parser.parse_args(script_args())

    cfg = json.loads(args.config.read_text())
    reset_scene()
    bpy.context.scene["drprop_width"] = cfg["width"]
    m = store_materials()
    build_shell(cfg, m)
    build_reception(cfg, m)
    build_consult_rooms(cfg, m)
    build_booth(cfg, m)
    build_lounge(cfg, m)
    add_camera(cfg)

    save_blend(args.blend)
    export_glb(args.glb)
    area = cfg["width"] * cfg["depth"]
    print(f"store: {cfg['width']}×{cfg['depth']} m ({area:.0f} m²) → {args.glb}")
    if args.render:
        render_still(args.render, args.samples)
        print(f"render → {args.render}")


if __name__ == "__main__":
    main()
