"""
export_twin.py — the data behind the interactive store twin (twin/).

Builds the store from a config and writes, per setting:

  twin/src/data/store-<setting>.glb   the store, light: flat colours, nothing above the
                                      2.4 m cut, no ceiling or lights. Every object carries
                                      its zone and, for walls, a "cut" flag (glTF extras),
                                      so the twin can highlight a zone and lower the walls
                                      that face the camera.
  twin/src/data/plan-<setting>.json   plan points, zone outlines, the walking network
                                      (aisle points and the links between them), seats and
                                      standing spots, plants.

The twin routes every visitor over the walking network itself, so a new kind of
customer needs no re-export. The network is built here from plan(), like the
furniture, so the two never drift apart. A minute per setting on a laptop.

    python blender/export_twin.py                                  # both settings
    python blender/export_twin.py --config blender/store.mall.json # one
"""

from __future__ import annotations

import argparse
import math
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import build_store  # noqa: E402
import kit  # noqa: E402
from common import ROOT, reset_scene, script_args  # noqa: E402

OUT = ROOT / "twin/src/data"

# Collection → zone key. Consult rooms are split into a, b, … by x.
ZONES = {
    "Reception": "reception",
    "Brief table": "brief",
    "Lounge": "lounge",
    "Apothecary": "apothecary",
    "Pantry": "pantry",
    "Urgent booth": "booth",
    "Shell": "shell",
    "Storefront": "storefront",
    "Street": "context",
    "Mall": "context",
}
# Vertical pieces that may be cut lower than 2.4 m when they face the camera.
WALL_COLLECTIONS = {"Shell", "Storefront", "Consult rooms", "Urgent booth", "Street", "Mall"}


def world_box(o: bpy.types.Object) -> tuple[Vector, Vector] | None:
    if o.type not in {"MESH", "CURVE", "FONT"} or not o.bound_box:
        return None
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
            Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))


def home(o: bpy.types.Object) -> str | None:
    """The collection an object belongs to, by the first zone-ish collection it is in."""
    for c in o.users_collection:
        if c.name in ZONES or c.name in ("Consult rooms", "Above cut", "Section caps", "Props", "People",
                                         "Props in hand", "Plan annotations", "Lights", "Lighting", "Cameras"):
            return c.name
    return o.users_collection[0].name if o.users_collection else None


def asset_root(o: bpy.types.Object) -> bpy.types.Object | None:
    while o is not None:
        if o.get("drprop_asset"):
            return o
        o = o.parent
    return None


def network(cfg: dict) -> dict:
    """
    The walking network: named floor points (metres, plan coordinates), the links a
    person may walk between them (clear of furniture), seats and standing spots.
    Built from plan() and the furniture sizes in build_store.py.
    """
    W, D = cfg["width"], cfg["depth"]
    P = build_store.plan(cfg)
    ex = P["door_in"][0]
    rx, ry = P["reception"]
    lx, ly = P["lounge"]
    bx, by = P["brief_table"]
    px = P["pantry"][0]
    c1, c2 = P["lounge_chair_1"], P["lounge_chair_2"]
    walk = -1.35  # the five-foot way / the concourse, in front of the shopfront
    n: dict[str, tuple[float, float]] = {
        "street_w": (ex - 6.0, walk), "street_door": (ex, walk), "street_e": (W + 1.0, walk),
        "door_out": P["door_out"], "door_in": P["door_in"],
        "reception_guest": P["reception_guest"], "reception_host": P["reception_host"],
        "front_aisle": (P["reception_guest"][0] + 0.6, 0.8), "front_mid": (rx + 1.6, 1.15),
        "host_back": (ex + 0.2, ry + 1.0), "bench_front": (1.15, 3.25),
        "brief_front": (bx + 0.2, by - 0.9), "out_mid": (P["room_A_door_out"][0] - 0.7, 2.4),
        "lounge_w": (lx - 1.9, ly), "sofa_l_front": (c1[0] - 0.1, ly - 0.05), "chair_1_front": (c1[0], c1[1] - 0.6),
        "lounge_gap": (P["lounge_serve"][0], P["lounge_serve"][1] + 1.0), "lounge_serve": P["lounge_serve"],
        "lounge_ne": (lx + 1.6, ly + 1.7), "lounge_e": (lx + 1.6, ly + 0.1),
        "chair_2_front": (c2[0], c2[1] - 0.6), "sofa_r_front": (c2[0] + 0.1, ly - 0.05),
        "apothecary_front": (W - 0.9, P["apothecary"][1]),
        "behind_brief": (bx + 1.6, by + 1.15), "brief_back": (bx, by + 1.2),
        "pantry_aisle": (px, D - 2.2), "pantry_staff": P["pantry_staff"],
        "booth_door": (P["booth"][0] + 0.9, P["booth"][1] - 0.9),
        "private_street": P["private_street"], "private_door": P["private_door"],
    }
    links = [
        ("street_w", "street_door"), ("street_door", "street_e"), ("street_door", "door_out"), ("door_out", "door_in"),
        ("door_in", "reception_guest"), ("door_in", "host_back"), ("door_in", "front_aisle"),
        ("reception_guest", "front_aisle"), ("front_aisle", "front_mid"), ("front_mid", "out_mid"),
        ("front_mid", "lounge_w"), ("reception_host", "host_back"), ("host_back", "bench_front"),
        ("host_back", "pantry_aisle"), ("out_mid", "brief_front"), ("out_mid", "lounge_w"),
        ("out_mid", "behind_brief"), ("lounge_w", "sofa_l_front"), ("lounge_w", "chair_1_front"),
        ("sofa_l_front", "chair_1_front"), ("lounge_gap", "lounge_serve"), ("lounge_gap", "lounge_ne"),
        ("lounge_gap", "behind_brief"), ("lounge_ne", "lounge_e"), ("lounge_e", "chair_2_front"),
        ("lounge_e", "sofa_r_front"), ("chair_2_front", "sofa_r_front"), ("lounge_e", "apothecary_front"),
        ("lounge_ne", "apothecary_front"), ("behind_brief", "brief_back"), ("brief_back", "pantry_aisle"),
        ("pantry_aisle", "pantry_staff"), ("pantry_aisle", "booth_door"), ("private_street", "private_door"),
    ]
    seats: dict[str, dict] = {}
    spots: dict[str, dict] = {}

    def face(a, b):
        return round(math.atan2(-(b[0] - a[0]), b[1] - a[1]), 4)

    # Lounge: two linen chairs facing the drum table, two places on the sofa facing them.
    for key, xy, front, h in (("chair_1", c1, "chair_1_front", 0.39), ("chair_2", c2, "chair_2_front", 0.39),
                              ("sofa_l", (c1[0] + 0.12, 0.98), "sofa_l_front", 0.42),
                              ("sofa_r", (c2[0] - 0.12, 0.98), "sofa_r_front", 0.42)):
        seats[f"lounge_{key}"] = {"xy": xy, "via": front, "yaw": face(xy, P["lounge"]), "h": h, "zone": "lounge"}
    # The market-brief bench, facing the table; the waiting bench on the left wall.
    for i, x in enumerate((bx - 0.5, bx + 0.5)):
        xy = (x, 4.45)
        seats[f"brief_bench_{i}"] = {"xy": xy, "via": "brief_back", "yaw": face(xy, (x, by)), "h": 0.46, "zone": "brief"}
    for i, y in enumerate((2.8, 3.7)):
        xy = (0.42, y)
        seats[f"wall_bench_{i}"] = {"xy": xy, "via": "bench_front", "yaw": face(xy, (2.0, y)), "h": 0.46, "zone": "reception"}
    # Consult rooms: the consultant's chair at the back, two client chairs facing them.
    for i in range(cfg["consultRooms"]):
        tag = "AB"[i] if i < 2 else str(i + 1)
        key = f"consult_{tag.lower()}"
        cx, cy = P[f"room_{tag}"]
        out, inn = f"room_{tag}_door_out", f"room_{tag}_door_in"
        n[out], n[inn] = P[out], P[inn]
        n[f"room_{tag}_side"] = (cx + 1.25, cy - 0.75)
        n[f"room_{tag}_back"] = (cx + 1.25, cy + 0.55)
        links += [(out, inn), (inn, f"room_{tag}_side"), (f"room_{tag}_side", f"room_{tag}_back")]
        links += [("behind_brief" if i == 0 else f"room_{'AB'[i - 1] if i - 1 < 2 else i}_door_out", out)]
        if i == 0:
            links += [(out, "lounge_gap"), (out, "out_mid")]
        else:
            links += [(out, "lounge_ne")]
        for k in range(3):
            xy = P[f"room_{tag}_seat_{k}"]
            seats[f"{key}_{k}"] = {"xy": xy, "via": f"room_{tag}_back" if k == 0 else inn, "yaw": face(xy, (cx, cy)),
                                   "h": 0.485, "zone": key, "staff": k == 0}
    # Room B has the private door.
    last = "AB"[min(cfg["consultRooms"], 2) - 1]
    n["private_in"] = (P[f"room_{last}"][0] + 0.9, P[f"room_{last}"][1] - 0.1)
    links += [("private_door", "private_in"), ("private_in", f"room_{last}_door_in")]
    # The booth: the advisor's seat, facing the call screen.
    seats["booth"] = {"xy": P["booth"], "via": "booth_door", "yaw": 0.0, "h": 0.47, "zone": "booth", "staff": True}
    # Standing spots: where people stop and what they face.
    for key, at, look, zone in (("reception_guest", "reception_guest", P["reception_host"], "reception"),
                                ("reception_host", "reception_host", P["reception_guest"], "reception"),
                                ("brief_front", "brief_front", P["brief_table"], "brief"),
                                ("apothecary_front", "apothecary_front", (W, P["apothecary"][1]), "apothecary"),
                                ("pantry_staff", "pantry_staff", (px, D), "pantry"),
                                ("lounge_serve", "lounge_serve", P["lounge"], "lounge")):
        spots[key] = {"node": at, "yaw": face(n[at], look), "zone": zone}
    r3 = lambda xy: [round(xy[0], 3), round(xy[1], 3)]  # noqa: E731
    return {
        "nodes": {k: r3(v) for k, v in n.items()},
        "links": [list(e) for e in links],
        "seats": {k: {**v, "xy": r3(v["xy"])} for k, v in seats.items()},
        "spots": spots,
        "entries": {"front": "street_w", "front_east": "street_e", "private": "private_street"},
    }


def export(cfg: dict) -> None:
    setting = build_store.setting(cfg)
    W, D = cfg["width"], cfg["depth"]
    P = build_store.plan(cfg)
    reset_scene()
    build_store.build(cfg)
    # World matrices of parented furniture are stale until the depsgraph updates.
    bpy.context.view_layer.update()

    # ---- plants: the scanned models are too heavy for the web; the twin draws its own
    plants = []
    for o in bpy.data.objects:
        if o.get("drprop_asset") and str(o["drprop_asset"]).startswith("plant"):
            box = None
            for c in o.children_recursive:
                b = world_box(c)
                if b:
                    box = b if box is None else (Vector(map(min, box[0], b[0])), Vector(map(max, box[1], b[1])))
            if box:
                plants.append([round(o.location.x, 3), round(o.location.y, 3), round(box[1].z - box[0].z, 3), str(o["drprop_asset"])])

    # ---- zone outlines (plan rectangles) from what is in each zone
    rw, rd = cfg["consultRoomWidth"], cfg["consultRoomDepth"]
    x0 = W - cfg["consultRooms"] * rw
    rects: dict[str, list[float]] = {}

    def grow(key, b):
        lo, hi = b
        r = rects.setdefault(key, [lo.x, lo.y, hi.x, hi.y])
        r[:] = [min(r[0], lo.x), min(r[1], lo.y), max(r[2], hi.x), max(r[3], hi.y)]

    def consult_key(x: float) -> str:
        i = max(0, min(cfg["consultRooms"] - 1, int((x - x0) // rw)))
        return f"consult_{'ab'[i] if i < 2 else i + 1}"

    # ---- tag, prune, flatten
    doomed = set()
    for o in bpy.data.objects:
        col = home(o)
        b = world_box(o)
        if col in ("Above cut", "Section caps", "Props", "People", "Props in hand", "Plan annotations", "Cameras") \
                or o.type in {"LIGHT", "CAMERA", "LIGHT_PROBE"} or asset_root(o) is not None:
            doomed.add(o)
            continue
        if o.name.startswith(("view-", "portal-", "sun", "ceiling", "cove-", "downlight", "across")):
            doomed.add(o)
            continue
        if b is not None:
            lo, hi = b
            # Anything hanging above head height (pendants, cords) or wholly above the cut.
            if lo.z >= kit.CUT - 0.02 or (hi.z > 2.5 and lo.z > 1.0):
                doomed.add(o)
                continue
        zone = ZONES.get(col or "", None)
        if o.name.startswith("window-"):  # the window display belongs to the shopfront
            zone = "storefront"
        elif o.name.startswith(("fluted", "bench")):  # the left wall's walnut and bench
            zone = "shell"
        elif col == "Consult rooms":
            cx = (b[0].x + b[1].x) / 2 if b else o.matrix_world.translation.x
            zone = consult_key(cx) if x0 - 0.05 <= cx <= W + 0.05 else "shell"
        o["zone"] = zone or "shell"
        if b is not None:
            lo, hi = b
            size = hi - lo
            if col in WALL_COLLECTIONS and size.z >= 1.9 and lo.z <= 0.2 and min(size.x, size.y) <= 0.42:
                o["cut"] = 1
                o["axis"] = "x" if size.x < size.y else "y"
            if zone not in (None, "shell", "storefront", "context") and size.z < 2.6:
                grow(zone, b)
    for o in doomed:
        if o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)

    # Consult rooms and the booth: the room, not just the furniture.
    for i in range(cfg["consultRooms"]):
        key = consult_key(x0 + (i + 0.5) * rw)
        rects[key] = [x0 + i * rw, D - rd, x0 + (i + 1) * rw, D]
    rects["entrance"] = [P["door_in"][0] - 0.9, 0.0, P["door_in"][0] + 0.9, 1.2]
    if "booth" in rects:
        r = rects["booth"]
        rects["booth"] = [r[0] - 0.05, r[1] - 0.05, r[2] + 0.05, r[3] + 0.05]
    rects["private"] = [W - 0.4, P["private_door"][1] - 0.6, W + 1.6, P["private_door"][1] + 0.6]

    for o in bpy.data.objects:
        for mod in list(getattr(o, "modifiers", [])):
            if mod.type in ("SUBSURF", "BEVEL"):
                o.modifiers.remove(mod)
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        name, color = mat.name, mat.diffuse_color
        nt = mat.node_tree
        nt.nodes.clear()
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        b = nt.nodes.new("ShaderNodeBsdfPrincipled")
        b.inputs["Base Color"].default_value = color
        metal = any(k in name for k in ("bronze", "brass"))
        b.inputs["Metallic"].default_value = 1.0 if metal else 0.0
        b.inputs["Roughness"].default_value = 0.38 if metal else 0.75
        if name.startswith("glass"):
            b.inputs["Alpha"].default_value = 0.22 if name == "glass" else 0.5
            mat.blend_method = "BLEND"
        if name.startswith(("led", "washi", "screen-line", "call-glow", "halo")):
            b.inputs["Emission Color"].default_value = color
            b.inputs["Emission Strength"].default_value = 1.5
        nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])

    OUT.mkdir(parents=True, exist_ok=True)
    glb = OUT / f"store-{setting}.glb"
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", export_apply=True, export_extras=True,
                              export_lights=False, export_cameras=False, export_yup=True, export_animations=False)

    zone_names = {
        "reception": "Reception", "brief": "Market brief", "lounge": "Lounge", "apothecary": "Apothecary",
        "pantry": "Pantry", "booth": "Urgent booth", "consult_a": "Consult room A", "consult_b": "Consult room B",
        "entrance": "Entrance", "private": "Private entrance",
    }
    data = {
        "setting": setting,
        "width": W,
        "depth": D,
        "height": cfg["height"],
        "cut": kit.CUT,
        "plan": {k: [round(x, 3), round(y, 3)] for k, (x, y) in P.items()},
        "zones": {k: {"name": zone_names.get(k, k), "rect": [round(v, 3) for v in rects[k]]} for k in zone_names if k in rects},
        "network": network(cfg),
        "plants": plants,
    }
    path = OUT / f"plan-{setting}.json"
    path.write_text(json.dumps(data, separators=(",", ":")))
    print(f"twin {setting}: {glb} ({glb.stat().st_size / 1e6:.1f} MB), {path} ({path.stat().st_size / 1e3:.0f} kB)", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Export the store and the story for the interactive twin.")
    parser.add_argument("--config", type=Path, nargs="*",
                        default=[ROOT / "blender/store.config.json", ROOT / "blender/store.mall.json"])
    args = parser.parse_args(script_args())
    for c in args.config:
        export(json.loads(c.read_text()))


if __name__ == "__main__":
    main()
