"""
build_store.py — the store's digital twin (brief §6, 3D-3, §9.4).

Two settings from the same plan (store.config.json: "setting"):
  shophouse    a corner unit on a five-foot way (store.config.json)
  mall         a unit on a shopping-mall concourse (store.mall.json): polished
               floor, neighbouring tenants, a deep bulkhead for the sign, and a
               service corridor down the side for the private entrance

The shophouse:

  street       five-foot way (covered walkway) with pavers, plaster columns,
               kerb and road; the upper floor's façade above
  storefront   travertine portal and fascia, bronze-framed glazing, a glass
               pivot door standing open, halo-lit bronze letters, the brass
               price plate on the pier beside the door (§6.1), a window that
               shows one table, one lamp and a section of the apothecary
  reception    a walnut slab on two travertine pedestals, not a counter (§6.2);
               cold towels on a bronze tray
  wall         fluted walnut along the left wall, grazed by a concealed LED
  brief table  a long walnut table for this month's market brief
  Lounge       curved bouclé sofa, two linen lounge chairs, travertine drum
               table, wool rug, washi floor lantern, the apothecary wall (§4.3),
               a Pulse Roof relief on the wall
  pantry       walnut and travertine, espresso machine, brass kopi kettle,
               towel chiller — where every serve starts (§4)
  consult      two rooms behind arched openings with reeded-glass doors, round
               tables (§6.2), linen chairs, the analysis screen, opal pendant
  booth        1 m² fluted-walnut acoustic booth for urgent video calls
  private      a walnut door from the side lane straight into consult room B
  light        2700 K practicals, 3000 K downlights, a cove in the Lounge
               ceiling; daylight and render settings live in look.py

Exports:
    brand/3d/store.glb        light-weight version for reel R7 and the website
    blender/out/store.blend   full detail, for the 3D artist to refine

    python blender/build_store.py [--config …] [--render out.jpg --view lounge]
    blender -b -P blender/build_store.py -- [same options]

Scanned materials and props come from fetch_assets.py (CC0); without them the
scripts fall back to procedural stand-ins.
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
import kit  # noqa: E402
import look  # noqa: E402
import materials  # noqa: E402
from common import ROOT, export_glb, reset_scene, save_blend, script_args, text  # noqa: E402
from kit import CUT, area, collection, cushion, lathe, point, prism, rbox, spot, wall  # noqa: E402

WALL = 0.15  # exterior walls
PART = 0.12  # partitions
GLASS = 0.012
PIER = 0.45  # travertine piers either side of the storefront
SOFFIT = 0.3  # the five-foot way ceiling sits this far above the shop ceiling
WALKWAY = 2.3  # depth of the five-foot way

# A mall unit sits under a taller concourse ceiling; its signage band (bulkhead) is deeper.
MALL_CEILING = 4.6
MALL_BULKHEAD = 1.0


def setting(cfg: dict) -> str:
    """"shophouse" (a corner unit on a five-foot way) or "mall" (a unit on a mall concourse)."""
    return cfg.get("setting", "shophouse")


def frontage_top(cfg: dict) -> float:
    """Top of the storefront portal: the five-foot-way soffit, or the mall bulkhead."""
    return cfg["height"] + (MALL_BULKHEAD if setting(cfg) == "mall" else SOFFIT)


# Heights the animation (build_layout_plan.py) puts props on.
COFFEE_TOP = 0.40
COUNTER_TOP = 0.92
RECEPTION_TOP = 0.76


def plan(cfg: dict) -> dict[str, tuple[float, float]]:
    """
    Named points of the floor plan (metres, Blender coordinates: street along
    y = 0, back wall at y = depth). Furniture is placed from these, and
    build_layout_plan.py walks people between them, so the two never drift.

        back-left:  urgent booth, pantry (kopi, cold towels)
        back-right: consult room A, consult room B (private entrance)
        front-left: entrance, reception table
        front-right: Lounge, apothecary wall
    """
    W, D = cfg["width"], cfg["depth"]
    rw, rd = cfg["consultRoomWidth"], cfg["consultRoomDepth"]
    n = cfg["consultRooms"]
    x0 = W - n * rw
    ex = cfg["entrance"]["x"] + cfg["entrance"]["width"] / 2
    ty = D - rd / 2 - 0.1
    p: dict[str, tuple[float, float]] = {
        "street": (ex, -3.0),
        "door_out": (ex, -0.5),
        "door_in": (ex, 0.6),
        "reception": (ex + 1.6, 1.6),
        "reception_guest": (ex + 1.4, 0.95),
        "reception_host": (ex + 1.6, 2.25),
        "brief_table": (ex + 2.4, 3.6),
        "lounge": (W - 3.2, 1.9),
        "lounge_sofa": (W - 3.2, 0.9),
        "lounge_chair_1": (W - 4.0, 2.9),
        "lounge_chair_2": (W - 2.4, 2.9),
        # Between the two lounge chairs, facing the guest.
        "lounge_serve": (W - 3.2, 2.8),
        "apothecary": (W, 2.3),
        "pantry": (x0 - 3.0, D - 0.4),
        "pantry_staff": (x0 - 3.0, D - 0.95),
        "booth": (0.65, D - 0.55),
        "private_street": (W + 1.2, D - 1.3),
        "private_door": (W - 0.1, D - 1.3),
    }
    for i in range(n):
        tag = "AB"[i] if i < 2 else str(i + 1)
        cx = x0 + i * rw + rw / 2
        p[f"room_{tag}"] = (cx, ty)
        p[f"room_{tag}_door_out"] = (cx, D - rd - 0.45)
        p[f"room_{tag}_door_in"] = (cx, D - rd + 0.45)
        for k in range(3):
            a = math.pi / 2 + k * 2 * math.pi / 3
            p[f"room_{tag}_seat_{k}"] = (cx + math.cos(a) * 0.9, ty + math.sin(a) * 0.9)
    return p


# --------------------------------------------------------------------------- furniture pieces


def chair(name, xy, m, col, *, rot_z: float = 0.0) -> bpy.types.Object:
    """Dining-height chair: tapered walnut legs, linen seat and a curved walnut back. Sitter faces −y."""
    parts = []
    for i, (dx, dy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        leg = lathe(f"{name}-leg{i}", [(0, 0), (0.012, 0), (0.016, 0.42), (0, 0.42)], (dx * 0.19, dy * 0.18, 0), m["walnut"], col, segments=12)
        leg.rotation_euler = (math.radians(-4 * dy), math.radians(4 * dx), 0)
        parts.append(leg)
    parts.append(rbox(f"{name}-rail", (0.44, 0.42, 0.03), (0, 0, 0.41), m["walnut"], col, bevel=0.004))
    parts.append(cushion(f"{name}-seat", (0.46, 0.44, 0.06), (0, -0.01, 0.455), m["linen"], col, radius=0.025))
    parts.append(kit.sector(f"{name}-back", 0.42, 0.445, math.radians(55), math.radians(125), 0.62, 0.8, (0, -0.2, 0), m["walnut"], col, segments=16))
    for dx in (-1, 1):
        parts.append(rbox(f"{name}-post{dx:+d}", (0.025, 0.025, 0.36), (dx * 0.2, 0.19, 0.6), m["walnut"], col, bevel=0.004))
    return kit.group(name, parts, (xy[0], xy[1], 0), rot_z, col)


def lounge_chair(name, xy, m, col, *, rot_z: float = 0.0) -> bpy.types.Object:
    """Low lounge chair: walnut sled frame, deep linen cushions. Sitter faces −y."""
    parts = []
    for dx in (-1, 1):
        parts.append(rbox(f"{name}-runner{dx:+d}", (0.04, 0.78, 0.035), (dx * 0.36, 0, 0.0175), m["walnut"], col, bevel=0.008))
        parts.append(rbox(f"{name}-arm{dx:+d}", (0.06, 0.72, 0.04), (dx * 0.36, 0.0, 0.56), m["walnut"], col, bevel=0.012))
        for dy in (-1, 1):
            parts.append(rbox(f"{name}-upright{dx:+d}{dy:+d}", (0.04, 0.04, 0.54), (dx * 0.36, dy * 0.31, 0.29), m["walnut"], col, bevel=0.008))
    parts.append(rbox(f"{name}-deck", (0.68, 0.7, 0.03), (0, 0, 0.22), m["walnut"], col, bevel=0.005))
    parts.append(cushion(f"{name}-seat", (0.66, 0.66, 0.15), (0, -0.02, 0.31), m["oat"], col, radius=0.06))
    parts.append(cushion(f"{name}-back", (0.64, 0.16, 0.5), (0, 0.28, 0.6), m["oat"], col, radius=0.06, tilt=math.radians(-12)))
    return kit.group(name, parts, (xy[0], xy[1], 0), rot_z, col)


def curved_sofa(name, xy, m, col, *, radius: float = 2.6, length: float = 2.4) -> bpy.types.Object:
    """A gently curved bouclé sofa, back to the window (−y), its curve embracing the coffee table."""
    span = length / radius
    a0, a1 = -math.pi / 2 - span / 2, -math.pi / 2 + span / 2
    c = (xy[0], xy[1] + radius, 0)
    parts = [
        kit.sector(f"{name}-plinth", radius - 0.38, radius + 0.38, a0 + 0.02, a1 - 0.02, 0.0, 0.09, c, m["walnut"], col, segments=28),
        kit.sector(f"{name}-base", radius - 0.46, radius + 0.46, a0, a1, 0.09, 0.3, c, m["boucle"], col, segments=36, soft=0.04),
        kit.sector(f"{name}-seat", radius - 0.46, radius + 0.24, a0 + 0.01, a1 - 0.01, 0.3, 0.43, c, m["boucle"], col, segments=36, soft=0.06),
        kit.sector(f"{name}-back", radius + 0.22, radius + 0.46, a0, a1, 0.3, 0.76, c, m["boucle"], col, segments=36, soft=0.09),
    ]
    root = kit.group(name, parts, (0, 0, 0), 0.0, col)
    # Two lumbar cushions in linen, angled along the curve.
    for i, t in enumerate((-0.28, 0.28)):
        a = -math.pi / 2 + t * span
        px, py = c[0] + math.cos(a) * (radius + 0.12), c[1] + math.sin(a) * (radius + 0.12)
        cushion(f"{name}-pillow{i}", (0.48, 0.14, 0.36), (px, py, 0.6), m["linen"], col, radius=0.06,
                rot_z=a + math.pi / 2, tilt=math.radians(-10))
    return root


def pendant_dome(name, xy, z, m, col, *, radius: float = 0.17, ceiling: float = 3.2, watts: float = 35) -> None:
    """Brushed-bronze dome pendant with a warm diffuser and its 2700 K light."""
    x, y = xy
    kit.tube(f"{name}-cord", [(x, y, z + 0.12), (x, y, ceiling)], 0.003, m["ink"], collection("Lighting"))
    lathe(f"{name}-canopy", [(0, 0), (0.05, 0), (0.05, 0.02), (0, 0.02)], (x, y, ceiling - 0.02), m["bronze"], collection("Lighting"))
    shade = [(radius * 0.06, 0.12), (radius * 0.22, 0.115), (radius * 0.62, 0.085), (radius * 0.9, 0.035), (radius, 0.0),
             (radius * 0.97, 0.0), (radius * 0.86, 0.033), (radius * 0.58, 0.075), (radius * 0.2, 0.1), (radius * 0.05, 0.105)]
    lathe(f"{name}-shade", [(0, 0.12)] + shade + [(0, 0.105)], (x, y, z), m["bronze"], collection("Lighting"), segments=64)
    lathe(f"{name}-diffuser", [(0, 0.03), (radius * 0.55, 0.03), (radius * 0.5, 0.04), (0, 0.045)], (x, y, z), m["led_soft"], collection("Lighting"))
    spot(f"{name}-light", (x, y, z + 0.02), watts, kelvin=2900, angle=110, blend=0.9, radius=0.08, col=collection("Lights"))


def globe_pendant(name, xy, z, m, col, *, ceiling: float = 3.2) -> None:
    """Opal glass globe on a bronze stem: a soft all-round glow for the consult rooms."""
    x, y = xy
    lc = collection("Lighting")
    kit.tube(f"{name}-stem", [(x, y, z + 0.17), (x, y, ceiling)], 0.006, m["bronze"], lc)
    lathe(f"{name}-canopy", [(0, 0), (0.06, 0), (0.06, 0.015), (0, 0.015)], (x, y, ceiling - 0.015), m["bronze"], lc)
    lathe(f"{name}-collar", [(0, 0), (0.035, 0), (0.035, 0.03), (0, 0.03)], (x, y, z + 0.15), m["bronze"], lc)
    r = 0.16
    lathe(f"{name}-globe", [(0, -r)] + [(r * math.sin(math.pi * i / 16), -r * math.cos(math.pi * i / 16)) for i in range(1, 16)] + [(0, r)],
          (x, y, z), m["washi"], lc, segments=48)
    point(f"{name}-light", (x, y, z), 60, kelvin=2900, radius=0.12)


def washi_lantern(name, xy, m, col, *, height: float = 1.25) -> None:
    """A floor lantern in washi paper on a slim bronze stand (after the Akari lamps)."""
    x, y = xy
    lc = collection("Lighting")
    lathe(f"{name}-foot", [(0, 0), (0.16, 0), (0.16, 0.012), (0, 0.016)], (x, y, 0), m["bronze_dark"], lc)
    kit.tube(f"{name}-stem", [(x, y, 0.01), (x, y, height - 0.45)], 0.008, m["bronze_dark"], lc)
    r, h = 0.26, 0.62
    prof = [(0, 0)] + [(r * (0.55 + 0.45 * math.sin(math.pi * i / 12)), h * i / 12) for i in range(0, 13)] + [(0, h)]
    lathe(f"{name}-shade", prof, (x, y, height - h), m["washi"], lc, segments=40)
    for k in range(1, 12):  # bamboo ribs show as faint rings
        rr = r * (0.55 + 0.45 * math.sin(math.pi * k / 12)) + 0.002
        lathe(f"{name}-rib{k}", [(rr - 0.002, 0), (rr, 0), (rr, 0.003), (rr - 0.002, 0.003)], (x, y, height - h + h * k / 12), m["paper"], lc, segments=40)
    point(f"{name}-light", (x, y, height - h / 2), 22, kelvin=2600, radius=0.15)


def book_stack(name, center, m, col, *, n: int = 3, rot_z: float = 0.0) -> None:
    """A short stack of clothbound books (the market briefs, back issues)."""
    covers = ["#8C6A43", "#D9CFBF", "#4A4239", "#B5A58C", "#6F6557"]
    z = center[2]
    for i in range(n):
        w, d, t = 0.24 - 0.015 * i, 0.17 - 0.01 * i, 0.022 + 0.006 * (i % 2)
        mat = materials.flat(f"cloth-{covers[i % len(covers)]}", covers[i % len(covers)], roughness=0.85, sheen=0.3)
        rbox(f"{name}-{i}", (w, d, t), (center[0], center[1], z + t / 2), mat, col, bevel=0.003, rot_z=rot_z + 0.08 * i)
        rbox(f"{name}-{i}-pages", (w - 0.012, d - 0.006, t - 0.006), (center[0] + 0.004, center[1], z + t / 2), m["paper"], col, bevel=0, rot_z=rot_z + 0.08 * i)
        z += t


def cup(name, center, m, col, *, saucer: bool = True) -> list[bpy.types.Object]:
    """A kopitiam cup and saucer, in plain stoneware."""
    x, y, z = center
    parts = []
    if saucer:
        parts.append(lathe(f"{name}-saucer", [(0, 0), (0.05, 0), (0.07, 0.012), (0.068, 0.014), (0.05, 0.004), (0, 0.004)], (x, y, z), m["ceramic"], col, segments=32))
        z += 0.004
    parts.append(lathe(f"{name}-cup", [(0, 0), (0.024, 0), (0.035, 0.01), (0.04, 0.06), (0.041, 0.075), (0.037, 0.075), (0.036, 0.065), (0.031, 0.012), (0, 0.012)], (x, y, z), m["ceramic"], col, segments=32))
    parts.append(lathe(f"{name}-kopi", [(0, 0), (0.035, 0), (0.0355, 0.004), (0, 0.004)], (x, y, z + 0.058), materials.flat("kopi", "#2B1A10", roughness=0.15, coat=0.6), col, segments=24))
    return parts


# --------------------------------------------------------------------------- zones


def build_shell(cfg: dict, m: dict) -> None:
    col = collection("Shell")
    W, D, H = cfg["width"], cfg["depth"], cfg["height"]
    rbox("floor", (W, D, 0.04), (W / 2, D / 2, -0.02), m["floor"], col, bevel=0)
    wall("wall-back", (W + 2 * WALL, WALL, H), (W / 2, D + WALL / 2, H / 2), m["limewash"], col)
    wall("wall-left", (WALL, D, H), (-WALL / 2, D / 2, H / 2), m["limewash"], col)

    # Right wall: the private entrance from the side lane opens straight into consult room B (§6.2).
    if cfg.get("privateEntrance"):
        py, pw, ph = plan(cfg)["private_door"][1], 1.0, 2.35
        y0, y1 = py - pw / 2, py + pw / 2
        wall("wall-right-front", (WALL, y0, H), (W + WALL / 2, y0 / 2, H / 2), m["limewash"], col)
        wall("wall-right-back", (WALL, D - y1, H), (W + WALL / 2, (D + y1) / 2, H / 2), m["limewash"], col)
        wall("wall-right-head", (WALL, pw, H - ph), (W + WALL / 2, py, ph + (H - ph) / 2), m["limewash"], col)
        # Walnut door standing open into room B, bronze pull, a plaque and sconce outside.
        leaf = [rbox("private-door-leaf", (pw - 0.02, 0.045, ph - 0.01), ((pw - 0.02) / 2, 0, (ph - 0.01) / 2), m["walnut"], col, bevel=0.003)]
        leaf.append(rbox("private-door-pull", (0.02, 0.03, 0.5), (pw - 0.12, -0.05, 1.05), m["bronze"], col, bevel=0.004))
        kit.group("private-door", leaf, (W + 0.02, y1 - 0.01, 0), math.pi, col)
        rbox("private-plaque", (0.18, 0.01, 0.24), (W + WALL + 0.006, y0 - 0.35, 1.5), m["brass"], col, bevel=0.002)
        text("private-plaque-text", "BY APPOINTMENT", 0.016, (W + WALL + 0.012, y0 - 0.35, 1.52), m["ink"], col,
             rotation=(math.pi / 2, 0, math.pi / 2), align="CENTER")
        lathe("private-sconce", [(0, 0), (0.06, 0), (0.06, 0.16), (0, 0.16)], (W + WALL + 0.07, y1 + 0.35, 2.2), m["bronze"], col)
        point("private-sconce-light", (W + WALL + 0.07, y1 + 0.35, 2.15), 12, kelvin=2700, radius=0.05)
    else:
        wall("wall-right", (WALL, D, H), (W + WALL / 2, D / 2, H / 2), m["limewash"], col)

    # Shadow-gap skirting: a dark 20 mm reveal where the walls meet the travertine.
    for name, size, c in (("skirt-left", (0.006, D, 0.02), (0.003, D / 2, 0.01)),
                          ("skirt-back", (W, 0.006, 0.02), (W / 2, D - 0.003, 0.01))):
        rbox(name, size, c, m["ink_matte"], col, bevel=0)

    # Ceiling, with a floating plaster panel over the front of house and an LED cove around it.
    ac = kit.above_cut()
    wall("ceiling", (W + 2 * WALL, D + WALL, 0.12), (W / 2, (D + WALL) / 2, H + 0.06), m["limewash"], ac, caps=False)
    rd = cfg["consultRoomDepth"]
    px0, px1, py0, py1 = 0.5, W - 0.5, 0.45, D - rd - 0.45
    wall("ceiling-panel", (px1 - px0, py1 - py0, 0.06), ((px0 + px1) / 2, (py0 + py1) / 2, H - 0.13), m["limewash"], ac, caps=False)
    for name, size, c in (("cove-front", (px1 - px0 - 0.1, 0.02, 0.01), ((px0 + px1) / 2, py0 + 0.06, H - 0.095)),
                          ("cove-back", (px1 - px0 - 0.1, 0.02, 0.01), ((px0 + px1) / 2, py1 - 0.06, H - 0.095)),
                          ("cove-left", (0.02, py1 - py0 - 0.1, 0.01), (px0 + 0.06, (py0 + py1) / 2, H - 0.095)),
                          ("cove-right", (0.02, py1 - py0 - 0.1, 0.01), (px1 - 0.06, (py0 + py1) / 2, H - 0.095))):
        rbox(name, size, c, m["led"], ac, bevel=0)


def build_street(cfg: dict, m: dict) -> None:
    """The five-foot way, kerb, road and the side lane: the store as a passer-by meets it."""
    col = collection("Street")
    W, D, H = cfg["width"], cfg["depth"], cfg["height"]
    Hs = H + SOFFIT
    # Walkway pavers, kerb, road, the side lane to the private door.
    rbox("walkway", (W + 2 * WALL + 4.0, WALKWAY, 0.06), (W / 2 + 0.5, -WALKWAY / 2 - WALL, -0.03), m["pavers"], col, bevel=0)
    rbox("lane", (2.6, D + WALL + 0.2, 0.06), (W + WALL + 1.3, D / 2, -0.03), m["pavers"], col, bevel=0)
    rbox("kerb", (W + 2 * WALL + 6.0, 0.18, 0.2), (W / 2 + 1.0, -WALKWAY - WALL - 0.09, -0.1), m["travertine"], col, bevel=0.01)
    rbox("road", (W + 40, 12, 0.05), (W / 2, -WALKWAY - WALL - 6.18, -0.2), m["asphalt"], col, bevel=0)
    # A pale ground so the store reads as a model in the overview shots.
    rbox("ground", (W + 60, D + 60, 0.02), (W / 2, D / 2, -0.27), materials.flat("ground", "#E2DCD1", roughness=1.0), col, bevel=0)

    # Plaster columns of the five-foot way, the soffit above with downlights.
    for i, x in enumerate((-0.1, W + 0.1)):
        wall(f"column-{i}", (0.42, 0.42, Hs), (x, -WALKWAY - WALL + 0.21, Hs / 2), m["limewash_warm"], col)
    ac = kit.above_cut()
    wall("soffit", (W + 2 * WALL + 1.0, WALKWAY, 0.25), (W / 2, -WALKWAY / 2 - WALL, Hs + 0.125), m["limewash_warm"], ac, caps=False)
    for i, x in enumerate((1.6, W / 2, W - 1.6)):
        spot(f"walkway-downlight-{i}", (x, -1.2, Hs - 0.01), 20, kelvin=2700, angle=60, col=collection("Lights"))
    # Upper floor façade: limewash with two tall timber-framed windows (a nod to the shophouse).
    wall("upper-facade", (W + 2 * WALL + 1.0, 0.25, 3.2), (W / 2, -WALKWAY - WALL + 0.125, Hs + 0.25 + 1.6), m["limewash_warm"], ac, caps=False)
    for i, x in enumerate((W * 0.3, W * 0.7)):
        wall(f"upper-window-{i}", (1.3, 0.05, 2.0), (x, -WALKWAY - WALL - 0.01, Hs + 1.75), materials.flat("window-dark", "#2C2A27", roughness=0.1, coat=1.0), ac, caps=False)
        wall(f"upper-window-frame-{i}", (1.42, 0.04, 2.12), (x, -WALKWAY - WALL + 0.005, Hs + 1.75), m["walnut"], ac, caps=False)
    # Across the road: a row of two-storey shophouses in faded pastel plaster, their
    # shopfronts lit at dusk. Seen through the glazing and in the street view, softly out of focus.
    across = -WALKWAY - WALL - 12.4 - 2.6
    rbox("across-walkway", (W + 40, 2.6, 0.06), (W / 2, across + 1.3, -0.03), m["pavers"], col, bevel=0)
    tones = ["#D8CBB1", "#B9C2AE", "#D9B9A6", "#CDBB95", "#C8C3B6", "#B7A99A", "#D3C7AE"]
    xs = -12.0
    i = 0
    while xs < W + 14:
        w = (5.2, 4.8, 6.0, 5.4)[i % 4]
        cx = xs + w / 2
        plaster = materials.flat(f"plaster-{tones[i % len(tones)]}", tones[i % len(tones)], roughness=0.9)
        rbox(f"across-{i}-facade", (w - 0.05, 0.3, 4.2), (cx, across - 2.45, 3.4 + 2.1), plaster, col, bevel=0.01)
        rbox(f"across-{i}-cornice", (w, 0.45, 0.25), (cx, across - 2.4, 7.6), plaster, col, bevel=0.01)
        rbox(f"across-{i}-soffit", (w - 0.05, 2.6, 0.2), (cx, across - 1.3, 3.4), plaster, col, bevel=0)
        rbox(f"across-{i}-column", (0.38, 0.38, 3.3), (xs + 0.2, across - 0.2, 1.65), plaster, col, bevel=0.01)
        shop = materials.emitter(f"across-shop-{i % 3}", (0.35, 0.6, 0.15)[i % 3], materials.blackbody((2900, 3500, 4200)[i % 3]))
        rbox(f"across-{i}-shopfront", (w - 0.9, 0.05, 2.6), (cx, across - 2.6, 1.4), shop, col, bevel=0)
        rbox(f"across-{i}-shopfront-frame", (w - 0.8, 0.06, 2.7), (cx, across - 2.62, 1.4), materials.flat("frame-dark", "#2B2926", roughness=0.4), col, bevel=0)
        for k in (-1, 1):
            rbox(f"across-{i}-win{k}", (1.0, 0.06, 1.7), (cx + k * w * 0.24, across - 2.28, 5.3), materials.flat("window-dark", "#2C2A27", roughness=0.1, coat=1.0), col, bevel=0)
            rbox(f"across-{i}-shutter{k}", (0.06, 0.08, 1.75), (cx + k * w * 0.24 - 0.55, across - 2.27, 5.3), m["walnut"], col, bevel=0)
        xs += w
        i += 1

    # The neighbour on the left: a party wall pier and a quiet shuttered front.
    wall("neighbour-front", (4.0, 0.2, Hs), (-2.3, -WALL - 0.1, Hs / 2), m["limewash_warm"], col)
    wall("neighbour-shutter", (3.0, 0.03, 2.6), (-2.3, -WALL - 0.215, 1.3), materials.flat("shutter", "#5D574F", roughness=0.6), col, caps=False)


def tenant_front(name: str, x0: float, x1: float, y: float, facing: float, m: dict, col, *, tone: int, top: float) -> None:
    """A neighbouring tenant on the concourse: a lit shop behind glass, a pale bulkhead, nothing branded."""
    w = x1 - x0
    cx = (x0 + x1) / 2
    k = 1 if facing > 0 else -1  # +1: the shopfront faces +y (across the concourse from us)
    depth = 4.0
    back = y - k * depth
    glow = materials.emitter(f"tenant-glow-{tone % 3}", (1.1, 0.8, 1.4)[tone % 3], materials.blackbody((3500, 3000, 4000)[tone % 3]))
    pale = materials.flat("mall-bulkhead", "#E4E0D8", roughness=0.6)
    wall(f"{name}-back", (w, 0.1, top), (cx, back, top / 2), glow, col, caps=False)
    for side, xs in (("l", x0), ("r", x1)):
        wall(f"{name}-side-{side}", (0.12, depth, top), (xs, y - k * depth / 2, top / 2), pale, col)
    wall(f"{name}-floor", (w, depth, 0.02), (cx, y - k * depth / 2, 0.01), materials.flat("tenant-floor", "#CFC9BE", roughness=0.4), col, caps=False)
    wall(f"{name}-glass", (w - 0.2, GLASS, 3.0), (cx, y, 1.5), m["glass"], col, caps=False)
    wall(f"{name}-bulkhead", (w, 0.3, top - 3.0), (cx, y + k * 0.1, 3.0 + (top - 3.0) / 2), pale, col)
    # A few anonymous displays inside: plinths and shelving blocks.
    for i in range(3):
        bx = x0 + w * (i + 1) / 4
        rbox(f"{name}-display-{i}", (0.7, 0.5, 0.9 + 0.3 * (i % 2)), (bx, y - k * (1.6 + 0.4 * i), (0.9 + 0.3 * (i % 2)) / 2),
             materials.flat(f"display-{(tone + i) % 3}", ("#C9C2B5", "#8F8A82", "#D8D1C3")[(tone + i) % 3], roughness=0.5), col, bevel=0.01)
    area(f"{name}-light", (cx, y - k * depth / 2, top - 0.3), 160, w - 0.6, size_y=depth - 0.6, kelvin=(3500, 3000, 4000)[tone % 3])


def build_mall(cfg: dict, m: dict) -> None:
    """
    The same unit in a shopping mall: a polished concourse in front, neighbouring
    tenants either side and across, a tall ceiling with linear light slots, and a
    back-of-house service corridor down the right side, which is where the VIP's
    private entrance opens (malls route discreet access through service corridors).
    """
    col = collection("Mall")
    W, D, H = cfg["width"], cfg["depth"], cfg["height"]
    C = MALL_CEILING
    top = frontage_top(cfg)
    concourse = 7.5
    floor = materials.polished_tiles("mall-floor", (1.2, 1.2))
    rbox("concourse", (W + 34, concourse, 0.04), (W / 2, -WALL - concourse / 2, -0.02), floor, col, bevel=0)
    rbox("ground", (W + 60, D + 60, 0.02), (W / 2, D / 2, -0.27), materials.flat("ground", "#E2DCD1", roughness=1.0), col, bevel=0)
    pale = materials.flat("mall-bulkhead", "#E4E0D8", roughness=0.6)
    ac = kit.above_cut()
    # Our bulkhead continues up to the mall ceiling above the portal.
    wall("mall-bulkhead-ours", (W + 2 * WALL, 0.3, C - top), (W / 2, -WALL - 0.05, top + (C - top) / 2), pale, ac, caps=False)
    # Concourse ceiling with linear light slots, and the light they give.
    wall("mall-ceiling", (W + 34, concourse, 0.15), (W / 2, -WALL - concourse / 2, C + 0.075), pale, ac, caps=False)
    for i, yy in enumerate((-2.3, -5.2)):
        wall(f"mall-slot-{i}", (W + 30, 0.12, 0.02), (W / 2, yy, C - 0.01), materials.emitter("mall-slot", 3.0, materials.blackbody(4000)), ac, caps=False)
        area(f"mall-slot-light-{i}", (W / 2, yy, C - 0.05), 700, W + 26, size_y=0.3, kelvin=4000, spread=120)
    for i, x in enumerate((1.5, W / 2, W - 1.5)):
        spot(f"mall-downlight-{i}", (x, -1.2, C - 0.02), 30, kelvin=3500, angle=50)

    # Left neighbour; the service corridor and the right neighbour beyond it.
    tenant_front("tenant-left", -9.0, -WALL, -WALL, -1, m, col, tone=0, top=C)
    lane = 2.6
    xs = W + WALL
    wall("service-floor", (lane, D + WALL + 1.0, 0.02), (xs + lane / 2, D / 2, 0.01), materials.flat("service-floor", "#B8B2A8", roughness=0.7), col, caps=False)
    wall("service-wall-far", (0.15, D + WALL, C), (xs + lane + 0.075, D / 2, C / 2), pale, col)
    wall("service-wall-back", (lane + 0.15, 0.15, C), (xs + lane / 2, D + WALL + 0.075, C / 2), pale, col)
    wall("service-front-l", (0.5, 0.2, C), (xs + 0.25, -WALL - 0.1, C / 2), pale, col)
    wall("service-front-r", (0.6, 0.2, C), (xs + lane - 0.3, -WALL - 0.1, C / 2), pale, col)
    wall("service-front-head", (lane - 1.1, 0.2, C - 2.3), (xs + 0.5 + (lane - 1.1) / 2, -WALL - 0.1, 2.3 + (C - 2.3) / 2), pale, col)
    leaf = [rbox("service-door-leaf", (lane - 1.12, 0.045, 2.28), ((lane - 1.12) / 2, 0, 1.14), materials.flat("service-door", "#D9D4CB", roughness=0.5), col, bevel=0.003)]
    kit.group("service-door", leaf, (xs + 0.5, -WALL - 0.1, 0), 0.0, col)
    wall("service-ceiling", (lane, D + WALL, 0.1), (xs + lane / 2, D / 2, H + 0.05), pale, ac, caps=False)
    for i, yy in enumerate((1.5, 4.5, 7.0)):
        area(f"service-light-{i}", (xs + lane / 2, yy, H - 0.05), 80, 1.2, size_y=0.2, kelvin=4000)
    tenant_front("tenant-right", xs + lane + 0.15, xs + lane + 9.0, -WALL, -1, m, col, tone=1, top=C)

    # Across the concourse: a row of tenants facing us.
    xa = -12.0
    i = 0
    while xa < W + 12:
        w = (7.0, 6.0, 8.0)[i % 3]
        tenant_front(f"tenant-across-{i}", xa, xa + w, -WALL - concourse, 1, m, col, tone=i + 2, top=C)
        xa += w
        i += 1
    # A bench and planter in the concourse, as malls have.
    rbox("concourse-bench", (2.2, 0.55, 0.45), (W * 0.62, -WALL - concourse / 2 - 0.6, 0.225), m["travertine"], col, bevel=0.01)
    plant = kit.model("plant_tall", (W * 0.62 + 1.6, -WALL - concourse / 2 - 0.6, 0), height=1.5, col=col)
    if plant is None:
        lathe("concourse-planter", [(0, 0), (0.3, 0), (0.3, 0.5), (0, 0.5)], (W * 0.62 + 1.6, -WALL - concourse / 2 - 0.6, 0), m["stoneware"], col)


def build_storefront(cfg: dict, m: dict) -> None:
    col = collection("Storefront")
    W, H = cfg["width"], cfg["height"]
    Hs = frontage_top(cfg)
    ex, ew = cfg["entrance"]["x"], cfg["entrance"]["width"]
    fascia_h = 0.55
    gh = H - fascia_h  # glazing height
    y = -WALL / 2
    # Travertine portal: piers either side, a pier beside the door for the price plate, the fascia.
    wall("pier-left", (PIER + WALL, WALL + 0.12, Hs), (-WALL + (PIER + WALL) / 2, y - 0.06, Hs / 2), m["travertine"], col)
    wall("pier-right", (PIER + WALL, WALL + 0.12, Hs), (W + WALL - (PIER + WALL) / 2, y - 0.06, Hs / 2), m["travertine"], col)
    door_pier = 0.5
    wall("pier-door", (door_pier, WALL + 0.06, gh), (ex - door_pier / 2, y - 0.03, gh / 2), m["travertine"], col)
    wall("fascia", (W - 2 * PIER, WALL + 0.25, Hs - gh), (W / 2, y - 0.125, gh + (Hs - gh) / 2), m["travertine"], col)

    # Bronze-framed glazing: sill, head, mullions; panes in between.
    frame = m["bronze_dark"]
    bays = [(PIER, ex - door_pier)]  # left window
    right0, right1 = ex + ew, W - PIER
    n = 3
    for i in range(n):
        bays.append((right0 + (right1 - right0) * i / n, right0 + (right1 - right0) * (i + 1) / n))
    for i, (x0, x1) in enumerate(bays):
        wall(f"glass-{i}", (x1 - x0, GLASS, gh - 0.14), ((x0 + x1) / 2, y, 0.08 + (gh - 0.14) / 2), m["glass"], col, caps=False)
        wall(f"sill-{i}", (x1 - x0, 0.09, 0.08), ((x0 + x1) / 2, y, 0.04), frame, col)
        wall(f"head-{i}", (x1 - x0, 0.09, 0.06), ((x0 + x1) / 2, y, gh - 0.03), frame, col)
        for xm in (x0, x1):
            wall(f"mullion-{i}-{xm:.2f}", (0.05, 0.1, gh), (xm, y, gh / 2), frame, col)
    # Entrance: frame, transom, and a glass pivot door standing open into the store.
    wall("door-head", (ew, 0.1, 0.06), (ex + ew / 2, y, gh - 0.03), frame, col)
    leaf_h = gh - 0.1
    leaf = [
        rbox("door-glass", (ew - 0.08, GLASS, leaf_h - 0.08), ((ew - 0.02) / 2, 0, leaf_h / 2), m["glass"], col, bevel=0),
        rbox("door-stile-l", (0.04, 0.05, leaf_h), (0.02, 0, leaf_h / 2), frame, col, bevel=0.002),
        rbox("door-stile-r", (0.04, 0.05, leaf_h), (ew - 0.04, 0, leaf_h / 2), frame, col, bevel=0.002),
        rbox("door-rail-b", (ew - 0.02, 0.05, 0.08), ((ew - 0.02) / 2, 0, 0.04), frame, col, bevel=0.002),
        rbox("door-rail-t", (ew - 0.02, 0.05, 0.05), ((ew - 0.02) / 2, 0, leaf_h - 0.025), frame, col, bevel=0.002),
        kit.tube("door-pull", [(ew - 0.16, -0.07, 0.5), (ew - 0.16, -0.07, 1.9)], 0.014, m["bronze"], col),
    ]
    kit.group("entrance-door", leaf, (ex + 0.02, y, 0.0), math.radians(72), col)

    # Halo-lit bronze letters on the fascia (§6.1): light behind the letters, onto the stone.
    fy = y - 0.125 - (WALL + 0.25) / 2  # front face of the fascia
    letters_z = gh + (Hs - gh) / 2 - 0.1
    sign = text("signage", cfg.get("signage", "DR. PROP"), 0.27, (W / 2, fy - 0.03, letters_z), m["bronze"], kit.above_cut(),
                extrude=0.01, align="CENTER")
    sign["drprop_role"] = "signage"
    # The halo: the same letters as a thin emissive layer between the letters and the stone,
    # so the light falls on the travertine in the letters' own outline.
    halo = text("signage-halo", cfg.get("signage", "DR. PROP"), 0.27, (W / 2, fy - 0.008, letters_z), m["halo"], kit.above_cut(), align="CENTER")
    halo.visible_camera = False

    # Brass price plate on the door pier: the fees are public (§3.2, §6.1).
    plate_x = ex - door_pier / 2
    rbox("price-plate", (0.3, 0.008, 0.4), (plate_x, y - 0.065, 1.35), m["brass"], col, bevel=0.002)
    text("price-plate-title", "CONSULTATION FEES", 0.017, (plate_x, y - 0.0705, 1.5), m["ink"], col, align="CENTER")
    for i in range(6):  # engraved fee lines (the real table is set in brand/pricing.ts)
        rbox(f"price-plate-line-{i}", (0.2, 0.002, 0.004), (plate_x, y - 0.07, 1.44 - i * 0.045), m["ink"], col, bevel=0)

    # The window (§6.1): one table, one lamp, a section of the apothecary.
    wx = (PIER + ex - door_pier) / 2
    rbox("window-table", (0.9, 0.42, 0.03), (wx - 0.15, 0.45, 0.74), m["walnut"], col, bevel=0.004)
    for dx in (-0.4, 0.1):
        rbox(f"window-table-leg{dx}", (0.03, 0.36, 0.725), (wx - 0.15 + dx + 0.15, 0.45, 0.3625), m["walnut"], col, bevel=0.003)
    lathe("window-lamp-base", [(0, 0), (0.07, 0), (0.07, 0.01), (0.012, 0.02), (0.01, 0.34), (0, 0.34)], (wx - 0.4, 0.45, 0.755), m["bronze"], col)
    lathe("window-lamp-shade", [(0, 0), (0.15, 0), (0.15, 0.003), (0.1, 0.13), (0, 0.13)], (wx - 0.4, 0.45, 1.05), m["washi"], col, segments=40)
    point("window-lamp-light", (wx - 0.4, 0.45, 1.08), 10, kelvin=2700, radius=0.05)
    book_stack("window-books", (wx + 0.05, 0.43, 0.755), m, col, n=2, rot_z=0.2)
    build_apothecary.build(origin=(wx + 0.12, 1.25, 0), rows=2, cols=2, shelves=1, m=m, name="window-apothecary")


def build_reception(cfg: dict, m: dict) -> None:
    col = collection("Reception")
    P = plan(cfg)
    x, y = P["reception"]
    H = cfg["height"]
    # A walnut slab on two travertine pedestals: a table to stand beside, not a counter to stand behind.
    top = RECEPTION_TOP
    rbox("reception-top", (2.4, 0.85, 0.06), (x, y, top - 0.03), m["walnut"], col, bevel=0.012, segments=3)
    for dx in (-0.78, 0.78):
        rbox(f"reception-pedestal{dx:+.1f}", (0.32, 0.62, top - 0.06), (x + dx, y, (top - 0.06) / 2), m["travertine_veined"], col, bevel=0.006)
    # Cold towels, rolled, on a bronze tray (§6.2); the guest's towel is the story's prop.
    rbox("towel-tray", (0.4, 0.26, 0.012), (x - 0.6, y, top + 0.006), m["bronze"], col, bevel=0.003)
    for i in range(3):
        t = kit.lathe(f"towel-{i}", [(0, -0.1), (0.032, -0.1), (0.034, 0.1), (0, 0.1)], (x - 0.72 + i * 0.075, y + 0.02, top + 0.046), m["terry"], col, segments=20)
        t.rotation_euler = (math.pi / 2, 0, 0)
    vase = kit.model("vase_tall", (x + 0.85, y + 0.12, top), height=0.36, col=col)
    if vase is None:
        lathe("reception-vase", [(0, 0), (0.06, 0), (0.08, 0.15), (0.03, 0.32), (0.035, 0.36), (0, 0.36)], (x + 0.85, y + 0.12, top), m["stoneware"], col)
    rbox("guest-folio", (0.3, 0.22, 0.018), (x + 0.25, y - 0.1, top + 0.009), materials.flat("folio", "#3A332B", roughness=0.7), col, bevel=0.004, rot_z=-0.08)
    # A long bronze bar pendant: a line of light along the slab.
    lc = collection("Lighting")
    rbox("reception-bar", (1.7, 0.05, 0.035), (x, y, 2.2), m["bronze"], lc, bevel=0.006)
    rbox("reception-bar-lens", (1.66, 0.02, 0.004), (x, y, 2.18), m["led_soft"], lc, bevel=0)
    for dx in (-0.75, 0.75):
        kit.tube(f"reception-bar-wire{dx:+.2f}", [(x + dx, y, 2.22), (x + dx, y, H)], 0.0015, m["ink"], lc)
    area("reception-bar-light", (x, y, 2.17), 70, 1.6, size_y=0.04, kelvin=3000)

    # Fluted walnut along the left wall, grazed from a ceiling slot (Above cut).
    D = cfg["depth"]
    y0, y1 = 0.4, D - cfg["consultRoomDepth"] + 0.2
    panel_h = CUT - 0.02
    kit.fluted("fluted-wall", y1 - y0, panel_h, (0.0, (y0 + y1) / 2, 0.0), m["walnut"], col, flute=0.045, relief=0.016, rot_z=math.pi / 2)
    rbox("fluted-cap", (0.03, y1 - y0, 0.012), (0.015, (y0 + y1) / 2, panel_h + 0.006), m["bronze"], col, bevel=0.002)
    area("fluted-graze", (0.12, (y0 + y1) / 2, H - 0.06), 160, y1 - y0, size_y=0.04, kelvin=3000, aim=(-0.18, 0, -1), spread=60)
    # A long travertine bench against the flutes, for whoever is waiting.
    by = 3.25
    rbox("bench-top", (0.42, 2.2, 0.08), (0.36, by, 0.42), m["travertine"], col, bevel=0.008)
    for dy in (-0.85, 0.85):
        rbox(f"bench-foot{dy:+.2f}", (0.36, 0.12, 0.38), (0.36, by + dy, 0.19), m["travertine"], col, bevel=0.006)
    cushion("bench-cushion", (0.38, 0.9, 0.06), (0.36, by - 0.35, 0.49), m["linen"], col, radius=0.025)
    plant = kit.model("plant_tall", (0.48, 1.72, 0), height=1.3, col=col)
    if plant is None:
        lathe("plant-pot", [(0, 0), (0.18, 0), (0.22, 0.4), (0, 0.4)], (0.48, 1.72, 0), m["stoneware"], col)


def build_brief_table(cfg: dict, m: dict) -> None:
    """A long table with this month's market brief (§6.2)."""
    col = collection("Brief table")
    bx, by = plan(cfg)["brief_table"]
    rbox("brief-top", (2.6, 1.0, 0.055), (bx, by, 0.7475), m["walnut"], col, bevel=0.01, segments=3)
    for dx in (-0.95, 0.95):
        rbox(f"brief-leg{dx:+.2f}", (0.07, 0.78, 0.72), (bx + dx, by, 0.36), m["walnut"], col, bevel=0.008)
    rbox("brief-stretcher", (1.9, 0.06, 0.05), (bx, by, 0.18), m["walnut"], col, bevel=0.006)
    # The brief itself: three booklets, a newspaper-style broadsheet, a bronze stand.
    for i in range(3):
        rbox(f"brief-booklet-{i}", (0.21, 0.297, 0.006), (bx - 0.75 + i * 0.32, by - 0.08, 0.778), m["paper"], col, bevel=0.0015, rot_z=0.06 * (i - 1))
        for k in range(5):
            rbox(f"brief-booklet-{i}-line{k}", (0.15, 0.004, 0.0005), (bx - 0.75 + i * 0.32, by - 0.03 - k * 0.025, 0.7813), m["ink"], col, bevel=0, rot_z=0.06 * (i - 1))
        rbox(f"brief-booklet-{i}-chart", (0.15, 0.06, 0.0005), (bx - 0.75 + i * 0.32, by - 0.18, 0.7813), m["bronze"], col, bevel=0, rot_z=0.06 * (i - 1))
    rbox("brief-stand-back", (0.26, 0.012, 0.2), (bx + 0.55, by + 0.2, 0.86), m["bronze"], col, bevel=0.002)
    rbox("brief-stand-sheet", (0.21, 0.004, 0.28), (bx + 0.55, by + 0.185, 0.91), m["paper"], col, bevel=0)
    jug = kit.model("vase_jug", (bx + 1.05, by + 0.2, 0.775), height=0.3, col=col)
    if jug is None:
        lathe("brief-jug", [(0, 0), (0.07, 0), (0.08, 0.15), (0.03, 0.28), (0, 0.28)], (bx + 1.05, by + 0.2, 0.775), m["ceramic"], col)
    book_stack("brief-books", (bx + 0.05, by + 0.28, 0.775), m, col, n=4, rot_z=-0.1)
    # A bench on the far side.
    rbox("brief-bench", (2.0, 0.38, 0.04), (bx, by + 0.85, 0.44), m["walnut"], col, bevel=0.006)
    for dx in (-0.85, 0.85):
        rbox(f"brief-bench-leg{dx:+.2f}", (0.05, 0.32, 0.42), (bx + dx, by + 0.85, 0.21), m["walnut"], col, bevel=0.005)
    cushion("brief-bench-cushion", (1.9, 0.36, 0.05), (bx, by + 0.85, 0.485), m["oat"], col, radius=0.02)
    for dx in (-0.65, 0.65):
        pendant_dome(f"brief-pendant{dx:+.2f}", (bx + dx, by), 1.95, m, col, radius=0.19, ceiling=cfg["height"] - 0.13)


def build_lounge(cfg: dict, m: dict) -> None:
    col = collection("Lounge")
    P = plan(cfg)
    lx, ly = P["lounge"]
    W = cfg["width"]
    # Wool rug with a tonal border.
    rbox("lounge-rug", (3.7, 2.9, 0.012), (lx, ly + 0.05, 0.006), m["oat"], col, bevel=0.004)
    rbox("lounge-rug-field", (3.3, 2.5, 0.0125), (lx, ly + 0.05, 0.0065), m["linen"], col, bevel=0.002)
    curved_sofa("lounge-sofa", P["lounge_sofa"], m, col)
    lounge_chair("lounge-chair-1", P["lounge_chair_1"], m, col)
    lounge_chair("lounge-chair-2", P["lounge_chair_2"], m, col)
    # Travertine drum table: a coffee table cut from one block.
    lathe("lounge-drum", [(0, 0), (0.42, 0), (0.42, COFFEE_TOP - 0.01), (0.415, COFFEE_TOP), (0, COFFEE_TOP)], (lx, ly + 0.05, 0), m["travertine_veined"], col, segments=64)
    bowl = kit.model("bowl", (lx + 0.2, ly + 0.15, COFFEE_TOP), height=0.07, col=col)
    if bowl is None:
        lathe("lounge-bowl", [(0, 0), (0.08, 0), (0.12, 0.06), (0.11, 0.065), (0, 0.02)], (lx + 0.2, ly + 0.15, COFFEE_TOP), m["walnut"], col)
    book_stack("lounge-books", (lx - 0.18, ly - 0.12, COFFEE_TOP), m, col, n=2, rot_z=0.35)
    # Side table and washi lantern either side of the sofa.
    sx = P["lounge_sofa"][0]
    lathe("side-table", [(0, 0), (0.12, 0), (0.12, 0.012), (0.03, 0.02), (0.025, 0.5), (0.22, 0.5), (0.22, 0.525), (0, 0.525)], (sx - 1.55, 0.75, 0), m["bronze_dark"], col)
    pachira = kit.model("plant_succulent", (sx - 1.55, 0.75, 0.525), height=0.28, col=col)
    if pachira is None:
        lathe("side-plant", [(0, 0), (0.07, 0), (0.08, 0.12), (0, 0.12)], (sx - 1.55, 0.75, 0.525), m["ceramic"], col)
    washi_lantern("lounge-lantern", (sx + 1.6, 0.7), m, col)
    plant = kit.model("plant_tall", (W - 0.55, 0.55, 0), height=1.45, col=col)
    if plant is None:
        lathe("lounge-plant-pot", [(0, 0), (0.2, 0), (0.24, 0.45), (0, 0.45)], (W - 0.55, 0.55, 0), m["stoneware"], col)

    # The apothecary snack wall on the right wall (§4.3), its back on the wall.
    ax, ay = P["apothecary"]
    build_apothecary.build(origin=(ax, ay, 0), rotation_z=-math.pi / 2, rows=cfg["apothecary"]["rows"],
                           cols=cfg["apothecary"]["cols"], m=m)

    # Pulse Roof relief: a linen canvas with the brand line in bronze, between the consult doors.
    rd = cfg["consultRoomDepth"]
    wy = cfg["depth"] - rd - PART / 2 - 0.03
    cx = (P["room_A"][0] + P["room_B"][0]) / 2
    rbox("art-canvas", (1.5, 0.04, 1.0), (cx, wy, 1.55), m["linen"], col, bevel=0.004)
    rbox("art-frame", (1.54, 0.03, 1.04), (cx, wy + 0.012, 1.55), m["walnut"], col, bevel=0.003)
    pts = pulse_roof_points(1.2, 0.5)
    kit.tube("art-pulse", [(cx + px, wy - 0.025, 1.3 + pz) for px, pz in pts], 0.006, m["bronze"], col)
    spot("art-light", (cx, wy - 0.9, cfg["height"] - 0.14), 18, kelvin=2700, angle=32, blend=0.5, aim=(0, 0.65, -1))


def pulse_roof_points(width: float, height: float) -> list[tuple[float, float]]:
    """The brand line (flat → heartbeat → roof → flat), as a polyline in x/z."""
    w, h = width, height
    return [(-w / 2, 0.1 * h), (-0.22 * w, 0.1 * h), (-0.17 * w, 0.0), (-0.12 * w, 0.55 * h), (-0.08 * w, 0.1 * h),
            (-0.04 * w, 0.1 * h), (0.0, 0.1 * h), (0.0, 0.62 * h), (0.16 * w, h), (0.32 * w, 0.62 * h), (0.32 * w, 0.1 * h), (w / 2, 0.1 * h)]


def build_pantry(cfg: dict, m: dict) -> None:
    """Where kopi and cold towels are prepared: the start of every serve (§4)."""
    col = collection("Pantry")
    P = plan(cfg)
    x = P["pantry"][0]
    D, H = cfg["depth"], cfg["height"]
    L, d = 3.0, 0.62
    y = D - d / 2
    # Walnut base cabinets on a recessed plinth, travertine top and splashback.
    rbox("pantry-plinth", (L - 0.04, d - 0.08, 0.1), (x, y + 0.03, 0.05), m["ink_matte"], col, bevel=0)
    n = 5
    for i in range(n):
        w = L / n
        rbox(f"pantry-door-{i}", (w - 0.006, 0.02, COUNTER_TOP - 0.13), (x - L / 2 + w * (i + 0.5), D - d + 0.01, 0.1 + (COUNTER_TOP - 0.13) / 2), m["walnut"], col, bevel=0.003)
        rbox(f"pantry-pull-{i}", (w * 0.5, 0.012, 0.012), (x - L / 2 + w * (i + 0.5), D - d - 0.002, COUNTER_TOP - 0.06), m["bronze"], col, bevel=0.002)
    rbox("pantry-carcass", (L, d - 0.04, COUNTER_TOP - 0.13), (x, y + 0.02, 0.1 + (COUNTER_TOP - 0.13) / 2), m["walnut"], col, bevel=0)
    rbox("pantry-top", (L + 0.02, d + 0.02, 0.03), (x, y - 0.01, COUNTER_TOP - 0.015), m["travertine_veined"], col, bevel=0.003)
    rbox("pantry-splash", (L, 0.02, 0.62), (x, D - 0.01, COUNTER_TOP + 0.31), m["travertine_veined"], col, bevel=0.002)
    # Open walnut shelf with a concealed LED, cups and jars on it.
    rbox("pantry-shelf", (L * 0.7, 0.26, 0.035), (x + 0.3, D - 0.13, 1.62), m["walnut"], col, bevel=0.003)
    rbox("pantry-shelf-led", (L * 0.68, 0.008, 0.004), (x + 0.3, D - 0.22, 1.6), m["led"], col, bevel=0)
    for i in range(6):
        cup(f"shelf-cup-{i}", (x - 0.55 + i * 0.12, D - 0.13, 1.6375), m, col, saucer=False)
    for i in range(3):
        build_apothecary.jar(f"pantry-jar-{i}", (x + 0.45 + i * 0.16, D - 0.13, 1.6375), 0.05, 0.2 + 0.03 * (i % 2), build_apothecary.JAR_FILL[i], m, col)
    # Espresso machine (bronze body, two group heads), a brass kopi kettle, cups on a tray.
    ex_ = x - 0.8
    rbox("espresso-body", (0.62, 0.44, 0.42), (ex_, D - 0.3, COUNTER_TOP + 0.21), m["bronze"], col, bevel=0.03, segments=4)
    rbox("espresso-drip", (0.56, 0.18, 0.02), (ex_, D - 0.56, COUNTER_TOP + 0.01), m["ink"], col, bevel=0.003)
    for dx in (-0.14, 0.14):
        lathe(f"espresso-group{dx:+.2f}", [(0, 0), (0.04, 0), (0.045, 0.06), (0.03, 0.08), (0, 0.08)], (ex_ + dx, D - 0.55, COUNTER_TOP + 0.18), m["brass"], col)
        kit.tube(f"espresso-handle{dx:+.2f}", [(ex_ + dx, D - 0.6, COUNTER_TOP + 0.19), (ex_ + dx, D - 0.75, COUNTER_TOP + 0.2)], 0.012, m["ink"], col)
    kettle_x = x
    lathe("kopi-kettle", [(0, 0), (0.08, 0), (0.09, 0.03), (0.085, 0.16), (0.05, 0.2), (0.04, 0.22), (0, 0.23)], (kettle_x, D - 0.32, COUNTER_TOP), m["brass"], col)
    kit.tube("kopi-kettle-spout", [(kettle_x + 0.07, D - 0.32, COUNTER_TOP + 0.05), (kettle_x + 0.17, D - 0.32, COUNTER_TOP + 0.2), (kettle_x + 0.22, D - 0.32, COUNTER_TOP + 0.24)], 0.008, m["brass"], col)
    kit.tube("kopi-kettle-handle", [(kettle_x - 0.08, D - 0.32, COUNTER_TOP + 0.04), (kettle_x - 0.14, D - 0.32, COUNTER_TOP + 0.12), (kettle_x - 0.06, D - 0.32, COUNTER_TOP + 0.2)], 0.01, m["walnut"], col)
    rbox("cup-tray", (0.36, 0.26, 0.01), (x + 0.45, D - 0.38, COUNTER_TOP + 0.005), m["walnut"], col, bevel=0.003)
    for i, (dx, dy) in enumerate(((-0.08, -0.05), (0.08, -0.05), (0.08, 0.06))):
        cup(f"tray-cup-{i}", (x + 0.45 + dx, D - 0.38 + dy, COUNTER_TOP + 0.01), m, col)
    # Towel chiller: glass-fronted walnut cabinet, lit, rolled towels stacked inside.
    cx_ = x + 1.15
    rbox("chiller-case", (0.5, 0.42, 0.5), (cx_, D - 0.29, COUNTER_TOP + 0.25), m["walnut"], col, bevel=0.006)
    rbox("chiller-inside", (0.44, 0.36, 0.44), (cx_, D - 0.31, COUNTER_TOP + 0.25), m["paper"], col, bevel=0)
    rbox("chiller-glass", (0.44, 0.008, 0.44), (cx_, D - 0.505, COUNTER_TOP + 0.25), m["glass"], col, bevel=0)
    rbox("chiller-led", (0.4, 0.01, 0.004), (cx_, D - 0.45, COUNTER_TOP + 0.465), m["led"], col, bevel=0)
    for r in range(3):
        for k in range(4):
            t = lathe(f"chiller-towel-{r}-{k}", [(0, -0.15), (0.03, -0.15), (0.03, 0.15), (0, 0.15)], (cx_ - 0.15 + k * 0.1, D - 0.32, COUNTER_TOP + 0.06 + r * 0.065), m["terry"], col, segments=16)
            t.rotation_euler = (math.pi / 2, 0, 0)
    spot("pantry-downlight", (x, D - 0.6, H - 0.01), 22, kelvin=3000, angle=50)


def build_consult_rooms(cfg: dict, m: dict) -> None:
    col = collection("Consult rooms")
    W, D, H = cfg["width"], cfg["depth"], cfg["height"]
    rw, rd = cfg["consultRoomWidth"], cfg["consultRoomDepth"]
    n = cfg["consultRooms"]
    x0 = W - n * rw
    front_y = D - rd
    P = plan(cfg)
    door_w, spring = 0.95, 2.0
    # Front wall with arched openings (cut from both the lower and the upper part).
    parts = wall("consult-front", (n * rw + PART / 2, PART, H), (x0 + n * rw / 2 - PART / 4, front_y, H / 2), m["limewash"], col)
    for i in range(n):
        cx = x0 + i * rw + rw / 2
        for p in parts:  # lower, upper and the cap, so the poché follows the opening
            cutter = prism(f"arch-cutter-{i}-{p.name}", kit.arch_outline(door_w, spring, bottom=-0.2), PART + 0.4, (cx, front_y, 0), None, col)
            kit.cut(p, [cutter])
    for i in range(n):
        x_left = x0 + i * rw
        cx = x_left + rw / 2
        tag = "AB"[i] if i < 2 else str(i + 1)
        name = f"consult-{tag}"
        wall(f"{name}-side", (PART, rd, H), (x_left, D - rd / 2, H / 2), m["limewash"], col)
        # Arched reeded-glass door in a slim bronze frame, standing open into the room.
        outer = kit.arch_outline(door_w - 0.02, spring, segments=24)
        leaf = prism(f"{name}-door-glass", [(x + (door_w - 0.02) / 2, z) for x, z in outer], 0.02, (0, 0, 0), m["reeded"], col)
        frame = prism(f"{name}-door-frame", [(x + (door_w - 0.02) / 2, z) for x, z in outer], 0.035, (0, 0, 0), m["bronze_dark"], col)
        inner = kit.arch_outline(door_w - 0.1, spring, bottom=0.04, segments=24)
        hole = prism(f"{name}-door-hole", [(x + (door_w - 0.02) / 2, z) for x, z in inner], 0.1, (0, 0, 0), None, col)
        kit.cut(frame, [hole])
        pull = kit.tube(f"{name}-door-pull", [(door_w - 0.12, -0.05, 0.85), (door_w - 0.12, -0.05, 1.25)], 0.01, m["bronze"], col)
        kit.group(f"{name}-door", [leaf, frame, pull], (cx - door_w / 2 + 0.01, front_y + PART / 2 + 0.02, 0), math.pi / 2, col)
        # Round walnut table on a tulip base (§6.2: round, not a negotiating table).
        tx, ty = P[f"room_{tag}"]
        lathe(f"{name}-table-top", [(0, 0.72), (0.54, 0.72), (0.55, 0.735), (0.545, 0.755), (0, 0.755)], (tx, ty, 0), m["walnut"], col, segments=72)
        lathe(f"{name}-table-base", [(0, 0), (0.3, 0), (0.3, 0.015), (0.1, 0.06), (0.05, 0.3), (0.06, 0.66), (0.14, 0.72), (0, 0.72)], (tx, ty, 0), m["walnut"], col, segments=48)
        lathe(f"{name}-rug", [(0, 0), (1.45, 0), (1.45, 0.01), (0, 0.01)], (tx, ty, 0.0), m["oat"], col, segments=72)
        for k in range(3):
            a = math.pi / 2 + k * 2 * math.pi / 3
            sx, sy = P[f"room_{tag}_seat_{k}"]
            chair(f"{name}-chair-{k}", (sx, sy), m, col, rot_z=a - math.pi / 2)
        for k, (dx, dy) in enumerate(((0.2, -0.12), (-0.18, 0.1))):
            rbox(f"{name}-notes-{k}", (0.21, 0.297, 0.004), (tx + dx, ty + dy, 0.757), m["paper"], col, bevel=0.001, rot_z=0.3 * (k - 0.5))
        # The analysis screen: the Pulse Roof line glowing on a dark display.
        rbox(f"{name}-screen", (1.5, 0.035, 0.86), (cx, D - 0.02, 1.45), m["screen"], col, bevel=0.004)
        pts = pulse_roof_points(1.1, 0.42)
        kit.tube(f"{name}-screen-line", [(cx + px, D - 0.045, 1.22 + pz) for px, pz in pts], 0.004,
                 materials.emitter("screen-line", 6.0, (0.9, 0.62, 0.36)), col)
        # The credenza sits on the left, keeping the right side free as the way round the table
        # (and, in room B, clear of the private entrance).
        left_x, right_x = x_left + PART / 2, x_left + rw - (PART / 2 if i < n - 1 else 0)
        private = i == n - 1 and cfg.get("privateEntrance")
        cred_x = left_x + 0.23
        if not private:
            cushion(f"{name}-acoustic", (0.05, 1.8, 1.0), (right_x - 0.03, ty, 1.5), m["linen"], col, radius=0.02)
        rbox(f"{name}-credenza", (0.42, 1.3, 0.6), (cred_x, ty, 0.3), m["walnut"], col, bevel=0.006)
        vase = kit.model("vase_round", (cred_x, ty + 0.35, 0.6), height=0.28, col=col)
        if vase is None:
            lathe(f"{name}-vase", [(0, 0), (0.08, 0), (0.1, 0.14), (0.05, 0.28), (0, 0.28)], (cred_x, ty + 0.35, 0.6), m["ceramic"], col)
        book_stack(f"{name}-books", (cred_x, ty - 0.3, 0.6), m, col, n=3, rot_z=math.pi / 2)
        globe_pendant(f"{name}-pendant", (tx, ty), 1.95, m, col, ceiling=H)
        spot(f"{name}-wallwash", (cx, D - 0.7, H - 0.01), 28, kelvin=3000, angle=60, aim=(0, 0.6, -1))
        spot(f"{name}-table-light", (tx + 0.45, ty - 0.6, H - 0.01), 20, kelvin=3000, angle=45, aim=(-0.25, 0.35, -1))


def build_booth(cfg: dict, m: dict) -> None:
    if not cfg.get("urgentBooth"):
        return
    col = collection("Urgent booth")
    x, y = plan(cfg)["booth"]
    D = cfg["depth"]
    s = 1.1
    hgt = 2.3
    # Fluted walnut outside, felt inside, a reeded glass door; 1 m² for urgent video calls.
    x1 = x + s / 2
    y0 = D - s
    kit.fluted("booth-side-flutes", s, hgt, (x1 + 0.03, y0 + s / 2, 0), m["walnut"], col, flute=0.04, relief=0.014, rot_z=math.pi / 2)
    rbox("booth-side", (0.05, s, hgt), (x1, y0 + s / 2, hgt / 2), m["walnut"], col, bevel=0.003)
    rbox("booth-felt-back", (s - 0.05, 0.02, hgt - 0.06), (x - 0.025, D - 0.01, hgt / 2), m["felt"], col, bevel=0)
    rbox("booth-felt-left", (0.02, s, hgt - 0.06), (0.01, y0 + s / 2, hgt / 2), m["felt"], col, bevel=0)
    rbox("booth-roof", (s + 0.05, s, 0.06), (x, y0 + s / 2, hgt + 0.03), m["walnut"], col, bevel=0.004)
    rbox("booth-light-panel", (0.6, 0.6, 0.004), (x - 0.05, y0 + s / 2, hgt - 0.002), m["led_soft"], col, bevel=0)
    area("booth-light", (x - 0.05, y0 + s / 2, hgt - 0.01), 18, 0.6, kelvin=3000)
    door = [rbox("booth-door-glass", (s - 0.12, 0.012, hgt - 0.1), ((s - 0.08) / 2, 0, hgt / 2), m["reeded"], col, bevel=0)]
    for dx in (0.02, s - 0.1):
        door.append(rbox(f"booth-door-stile{dx:.2f}", (0.035, 0.04, hgt - 0.02), (dx, 0, hgt / 2), m["walnut"], col, bevel=0.003))
    kit.group("booth-door", door, (x - s / 2 + 0.02, y0, 0), 0.0, col)
    # Desk shelf, a screen for the video call, a stool.
    rbox("booth-desk", (s - 0.1, 0.36, 0.03), (x - 0.03, D - 0.2, 0.74), m["walnut"], col, bevel=0.003)
    rbox("booth-screen", (0.55, 0.02, 0.34), (x - 0.03, D - 0.06, 1.12), m["screen"], col, bevel=0.003)
    rbox("booth-screen-glow", (0.5, 0.004, 0.29), (x - 0.03, D - 0.072, 1.12), materials.emitter("call-glow", 1.2, (0.95, 0.9, 0.82)), col, bevel=0)
    lathe("booth-stool", [(0, 0), (0.16, 0), (0.16, 0.012), (0.03, 0.02), (0.03, 0.42), (0.18, 0.42), (0.18, 0.47), (0, 0.47)], (x - 0.03, D - 0.58, 0), m["bronze_dark"], col)


def build_downlights(cfg: dict, m: dict) -> None:
    """Recessed 3000 K downlights: pools of light on the travertine along the walks."""
    W, D, H = cfg["width"], cfg["depth"], cfg["height"]
    rd = cfg["consultRoomDepth"]
    spots = [(1.4, 0.9), (3.0, 0.9), (1.4, 3.4), (3.0, 4.0), (6.8, 1.2), (6.8, 4.2), (8.2, 4.3), (10.4, 4.3),
             (8.3, 1.25), (10.3, 1.25), (2.0, D - 1.2), (4.6, D - 1.4)]
    ac = kit.above_cut()
    for i, (x, y) in enumerate(spots):
        z = H - 0.13 - 0.03 if (0.5 < x < W - 0.5 and 0.45 < y < D - rd - 0.45) else H - 0.001
        lathe(f"downlight-trim-{i}", [(0, 0), (0.045, 0), (0.045, 0.006), (0, 0.006)], (x, y, z - 0.006), m["ink_matte"], ac, segments=24)
        lathe(f"downlight-lens-{i}", [(0, 0), (0.03, 0), (0.03, 0.001), (0, 0.001)], (x, y, z - 0.0065), m["led"], ac, segments=24)
        spot(f"downlight-{i}", (x, y, z - 0.01), 22, kelvin=3300, angle=38, blend=0.55)
    # The Lounge cove: concealed strips above the floating panel wash the ceiling.
    px0, px1, py0, py1 = 0.5, W - 0.5, 0.45, D - rd - 0.45
    for name, (x, y, sx, sy) in {
        "cove-light-front": ((px0 + px1) / 2, py0 + 0.06, px1 - px0, 0.04),
        "cove-light-back": ((px0 + px1) / 2, py1 - 0.06, px1 - px0, 0.04),
    }.items():
        area(name, (x, y, H - 0.09), 140, sx, size_y=sy, kelvin=3000, aim=(0, 0, 1), spread=160)


def build(cfg: dict) -> dict:
    """The whole store. Returns the materials."""
    m = materials.library()
    build_shell(cfg, m)
    if setting(cfg) == "mall":
        build_mall(cfg, m)
    else:
        build_street(cfg, m)
    build_storefront(cfg, m)
    build_reception(cfg, m)
    build_brief_table(cfg, m)
    build_consult_rooms(cfg, m)
    build_booth(cfg, m)
    build_pantry(cfg, m)
    build_lounge(cfg, m)
    build_downlights(cfg, m)
    bpy.context.scene["drprop_width"] = cfg["width"]
    bpy.context.scene["drprop_depth"] = cfg["depth"]
    bpy.context.scene["drprop_setting"] = setting(cfg)
    return m


# --------------------------------------------------------------------------- export


def export_store_glb(path: Path) -> None:
    """
    A light version for the web and reel R7: flat materials (average colours),
    no scanned props, no subdivision or bevels, no section caps. Destructive —
    call after the .blend is saved.
    """
    for obj in list(bpy.data.objects):
        doomed = obj.get("drprop_asset") or any(c.name in ("Props", "Section caps") for c in obj.users_collection)
        anc = obj.parent
        while anc is not None and not doomed:
            doomed = bool(anc.get("drprop_asset"))
            anc = anc.parent
        if doomed:
            bpy.data.objects.remove(obj)
    for obj in bpy.data.objects:
        for mod in list(obj.modifiers):
            if mod.type in ("SUBSURF", "BEVEL"):
                obj.modifiers.remove(mod)
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        name = mat.name
        color = mat.diffuse_color
        nt = mat.node_tree
        nt.nodes.clear()
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        b = nt.nodes.new("ShaderNodeBsdfPrincipled")
        b.inputs["Base Color"].default_value = color
        metal = any(k in name for k in ("bronze", "brass"))
        b.inputs["Metallic"].default_value = 1.0 if metal else 0.0
        b.inputs["Roughness"].default_value = 0.35 if metal else 0.7
        if name.startswith("glass"):
            b.inputs["Transmission Weight"].default_value = 1.0
            b.inputs["Roughness"].default_value = 0.05 if name == "glass" else 0.3
        if name.startswith(("led", "washi", "screen-line", "call-glow")):
            b.inputs["Emission Color"].default_value = color
            b.inputs["Emission Strength"].default_value = 2.0
        nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    export_glb(path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the Dr Prop store.")
    parser.add_argument("--config", type=Path, default=ROOT / "blender/store.config.json")
    parser.add_argument("--glb", type=Path, default=ROOT / "brand/3d/store.glb")
    parser.add_argument("--no-glb", action="store_true")
    parser.add_argument("--blend", type=Path, default=ROOT / "blender/out/store.blend")
    parser.add_argument("--render", type=Path, nargs="*", help="still(s) to write; one per --view")
    parser.add_argument("--view", nargs="*", default=["lounge"], help=f"one of {', '.join(look.VIEWS)}")
    parser.add_argument("--light", default="day", choices=list(look.LIGHTING))
    parser.add_argument("--samples", type=int, default=256)
    parser.add_argument("--size", default="1920x1280")
    args = parser.parse_args(script_args())

    cfg = json.loads(args.config.read_text())
    reset_scene()
    build(cfg)
    look.setup(args.light)
    look.add_views(cfg)
    save_blend(args.blend)
    area_m2 = cfg["width"] * cfg["depth"]
    print(f"store: {cfg['width']}×{cfg['depth']} m ({area_m2:.0f} m²) → {args.blend}")
    if args.render:
        w, h = (int(v) for v in args.size.split("x"))
        for path, view in zip(args.render, args.view):
            look.render_view(view, path, (w, h), args.samples)
            print(f"render {view} → {path}")
    if not args.no_glb and setting(cfg) == "shophouse":
        export_store_glb(args.glb)
        print(f"glb → {args.glb}")


if __name__ == "__main__":
    main()
