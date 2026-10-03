"""
build_layout_plan.py — the store as an animated 3D layout plan.

Builds the detailed store (build_store.py), then the people and the service:

  people      articulated figures (hips, knees, shoulders) with a walk cycle
              driven by the distance they cover, and a real sitting pose;
              muted clothes by role, clay skin, like an architect's model
  service     on the timeline (30 fps, a marker for each beat):
      walk-in customer   street → reception (cold towel) → Lounge chair →
                         kopi served by the consultant → consult room A → leaves
      consultant A       room A → pantry (makes kopi) → serves in the Lounge →
                         walks the customer to room A → consult → farewell
      VIP customer       private entrance → straight into consult room B
      consultant B       waits in room B, greets, consults
      advisor            urgent video call in the booth
      front desk         welcomes, hands over the towel
  trails      each walk draws itself on the floor as it happens
  plan        zone labels, overall dimensions, a legend (cutaway shots only)
  cameras     street, entrance, Lounge, consult room, pantry (eye level, shift
              lens), axonometric cutaway and plan; the video cuts between them

Open blender/out/store_layout.blend and press Space; the timeline markers
switch cameras as the story moves.

    python blender/build_layout_plan.py [--stills brand/renders] [--video blender/out/layout-flow.mp4]
    blender -b -P blender/build_layout_plan.py -- [same options]

Stills (--stills DIR) are taken at story moments: store-street (dusk, the
customer arriving), store-entrance (the welcome), store-lounge (kopi served),
store-pantry, store-consult, store-reception (golden hour), layout-axo and
layout-plan. The video renders frame by frame and resumes where it stopped.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import build_store  # noqa: E402
import kit  # noqa: E402
import look  # noqa: E402
import materials  # noqa: E402
from build_store import COFFEE_TOP, COUNTER_TOP, RECEPTION_TOP  # noqa: E402
from common import ROOT, reset_scene, save_blend, script_args, text  # noqa: E402

FPS = 30
WALK = 1.2  # m/s, an unhurried walk
STRIDE = 1.35  # m per full gait cycle (two steps)
HIP = 0.9  # standing hip height (a 1.72 m figure)
THIGH, SHIN = 0.44, 0.42

ROLES = {
    # key: (label, top, trousers, trail)
    "customer": ("Walk-in customer", "#A88462", "#5B4A3A", "#8C6A43"),
    "host": ("Front desk", "#CFC6B6", "#3C3833", "#8A857C"),
    "consultant_a": ("Consultant A", "#2A2825", "#1E1D1B", "#1C1B19"),
    "vip": ("VIP customer", "#7D8A84", "#3F4643", "#5E6B66"),
    "consultant_b": ("Consultant B", "#3B3833", "#24221F", "#4A4640"),
    "advisor": ("Urgent advisor", "#4E4A44", "#2A2825", "#6F6557"),
}


# --------------------------------------------------------------------------- figures


@dataclass
class Rig:
    root: bpy.types.Object
    hips: bpy.types.Object
    thigh: dict[str, bpy.types.Object]
    knee: dict[str, bpy.types.Object]
    arm: dict[str, bpy.types.Object]


def figure(key: str) -> Rig:
    """An architect's-model figure, jointed at hips, knees and shoulders. Faces +y."""
    label, top, trousers, trail = ROLES[key]
    col = kit.collection("People")
    cloth = materials.flat(f"clothes-{key}", top, roughness=0.85, sheen=0.3)
    legs = materials.flat(f"trousers-{key}", trousers, roughness=0.8, sheen=0.2)
    skin = materials.flat("figure-skin", "#E3D6C4", roughness=0.6, subsurface=0.15)
    shoes = materials.flat("figure-shoes", "#2A2622", roughness=0.4, coat=0.3)
    root = kit.empty(key, col=col)
    root["role"] = label
    hips = kit.empty(f"{key}-hips", (0, 0, HIP), col=col)
    hips.parent = root
    torso = kit.lathe(f"{key}-torso", [(0, -0.04), (0.16, -0.04), (0.17, 0.06), (0.155, 0.22), (0.185, 0.4), (0.19, 0.48),
                                      (0.15, 0.55), (0.07, 0.58), (0.05, 0.6), (0.048, 0.65), (0, 0.65)], (0, 0, 0), cloth, col, segments=28)
    torso.scale = (1.0, 0.6, 1.0)
    torso.parent = hips
    head = kit.lathe(f"{key}-head", [(0, -0.115)] + [(0.1 * math.sin(math.pi * i / 12), -0.115 * math.cos(math.pi * i / 12)) for i in range(1, 12)] + [(0, 0.115)],
                     (0, 0.01, 0.74), skin, col, segments=24)
    head.scale = (0.9, 1.0, 1.0)
    head.parent = hips
    thigh, knee, arm = {}, {}, {}
    for side, sx in (("l", -1), ("r", 1)):
        t = kit.empty(f"{key}-hip-{side}", (sx * 0.09, 0, 0), col=col)
        t.parent = hips
        m = kit.lathe(f"{key}-thigh-{side}", [(0, 0.03), (0.082, 0.0), (0.075, -0.2), (0.06, -THIGH), (0, -THIGH - 0.03)], (0, 0, 0), legs, col, segments=16)
        m.parent = t
        k = kit.empty(f"{key}-knee-{side}", (0, 0, -THIGH), col=col)
        k.parent = t
        s = kit.lathe(f"{key}-shin-{side}", [(0, 0.03), (0.062, 0.0), (0.056, -0.18), (0.044, -SHIN + 0.02), (0, -SHIN)], (0, 0, 0), legs, col, segments=16)
        s.parent = k
        f = kit.rbox(f"{key}-foot-{side}", (0.095, 0.25, 0.07), (0, 0.06, -SHIN - 0.03), shoes, col, bevel=0.028, segments=3)
        f.parent = k
        a = kit.empty(f"{key}-shoulder-{side}", (sx * 0.215, 0, 0.5), col=col)
        a.parent = hips
        am = kit.lathe(f"{key}-arm-{side}", [(0, 0.05), (0.058, 0.0), (0.048, -0.28), (0.038, -0.54), (0, -0.56)], (0, 0, 0), cloth, col, segments=14)
        am.parent = a
        hand = kit.lathe(f"{key}-hand-{side}", [(0, 0), (0.035, 0.02), (0.04, 0.07), (0.022, 0.1), (0, 0.105)], (0, 0, -0.64), skin, col, segments=12)
        hand.parent = a
        thigh[side], knee[side], arm[side] = t, k, a
    # A thin ring in the role colour marks each person in the overview shots.
    ring = kit.lathe(f"{key}-ring", [(0.26, 0.0), (0.3, 0.0), (0.3, 0.004), (0.26, 0.004)], (0, 0, 0.022),
                     materials.flat(f"ring-{key}", trail, roughness=0.5), kit.collection("Plan annotations"), segments=40)
    ring.parent = root
    return Rig(root, hips, thigh, knee, arm)


def unwrap(prev: float, yaw: float) -> float:
    """The equivalent angle closest to `prev`, so figures never spin round."""
    while yaw - prev > math.pi:
        yaw -= 2 * math.pi
    while yaw - prev < -math.pi:
        yaw += 2 * math.pi
    return yaw


def heading(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.atan2(-(b[0] - a[0]), b[1] - a[1])


@dataclass
class Actor:
    rig: Rig
    frame: int = 1
    xy: tuple[float, float] = (0.0, 0.0)
    yaw: float = 0.0
    seated: float = 0.0
    seat_h: float = 0.46
    keys: list[tuple[int, float, float, float, float, float]] = field(default_factory=list)
    trail: list[tuple[int, float, float]] = field(default_factory=list)
    carry: list[tuple[int, int]] = field(default_factory=list)

    @property
    def obj(self) -> bpy.types.Object:
        return self.rig.root

    def key(self) -> None:
        o = self.rig.root
        o.location = (self.xy[0], self.xy[1], 0)
        o.rotation_euler = (0, 0, self.yaw)
        o.keyframe_insert("location", frame=self.frame)
        o.keyframe_insert("rotation_euler", frame=self.frame)
        self.keys.append((self.frame, self.xy[0], self.xy[1], self.yaw, self.seated, self.seat_h))

    def place(self, xy, yaw: float, frame: int = 1) -> "Actor":
        self.frame, self.xy, self.yaw = frame, xy, yaw
        self.trail.append((frame, *xy))
        self.key()
        return self

    def turn(self, yaw: float, seconds: float = 0.5) -> "Actor":
        self.frame += round(seconds * FPS)
        self.yaw = unwrap(self.yaw, yaw)
        self.key()
        return self

    def face(self, target, seconds: float = 0.5) -> "Actor":
        return self.turn(heading(self.xy, target), seconds)

    def walk(self, *points) -> "Actor":
        for p in points:
            yaw = heading(self.xy, p)
            if abs(unwrap(self.yaw, yaw) - self.yaw) > 0.2:
                self.turn(yaw, 0.35)
            self.frame += max(1, round(math.dist(self.xy, p) / WALK * FPS))
            self.xy = p
            self.trail.append((self.frame, *p))
            self.key()
        return self

    def wait(self, seconds: float) -> "Actor":
        self.frame += round(seconds * FPS)
        self.key()
        return self

    def until(self, frame: int) -> "Actor":
        if frame > self.frame:
            self.frame = frame
            self.key()
        return self

    def sit(self, facing, seat: float = 0.46) -> "Actor":
        yaw = facing if isinstance(facing, float) else heading(self.xy, facing)
        self.turn(yaw, 0.4)
        self.seat_h = seat
        self.frame += round(0.9 * FPS)
        self.seated = 1.0
        self.key()
        return self

    def stand(self) -> "Actor":
        self.frame += round(0.9 * FPS)
        self.seated = 0.0
        self.key()
        return self

    def state(self, f: float) -> tuple[float, float, float, float, float]:
        """(x, y, yaw, seated, seat height) at frame f, linear between keys."""
        ks = self.keys
        if f <= ks[0][0]:
            return ks[0][1:]
        for a, b in zip(ks, ks[1:]):
            if a[0] <= f <= b[0]:
                t = 0 if b[0] == a[0] else (f - a[0]) / (b[0] - a[0])
                return tuple(av + (bv - av) * t for av, bv in zip(a[1:], b[1:]))
        return ks[-1][1:]


def bake_gait(actor: Actor, end: int, step: int = 1) -> None:
    """Leg and arm swing from the distance covered; the sitting pose from the seated factor."""
    r = actor.rig
    phase = 0.0
    prev = actor.state(1)
    for f in range(1, end + 1, step):
        x, y, yaw, seated, seat_h = actor.state(f)
        dist = math.dist((x, y), prev[:2])
        prev = (x, y)
        speed = dist / step * FPS
        phase += dist / STRIDE * 2 * math.pi
        amp = min(1.0, speed / WALK) * (1 - seated)
        sw = math.sin(phase)
        carrying = any(a <= f <= b for a, b in actor.carry)
        for side, sgn in (("l", 1), ("r", -1)):
            thigh = sgn * 0.42 * amp * sw + seated * math.radians(88)
            # The knee bends in the swing (leg moving forward), never backwards.
            swing = max(0.0, sgn * math.cos(phase))
            knee = -(0.75 * amp * swing + 0.08 * amp) - seated * math.radians(88)
            arm = -sgn * 0.38 * amp * sw + seated * 0.55
            if carrying and side == "r":
                arm = 0.55
            r.thigh[side].rotation_euler = (thigh, 0, 0)
            r.knee[side].rotation_euler = (knee, 0, 0)
            r.arm[side].rotation_euler = (arm, 0, 0)
            for o in (r.thigh[side], r.knee[side], r.arm[side]):
                o.keyframe_insert("rotation_euler", index=0, frame=f)
        bob = 0.018 * amp * abs(math.cos(phase))
        hip_z = HIP + bob - seated * (HIP - (seat_h + 0.06))
        r.hips.location = (0, -0.14 * seated, hip_z)
        r.hips.rotation_euler = (math.radians(-4) * seated, 0, 0.06 * amp * sw)
        r.hips.keyframe_insert("location", frame=f)
        r.hips.keyframe_insert("rotation_euler", frame=f)


def follow(obj: bpy.types.Object, actor: Actor, start: int, end: int, forward: float = 0.3, height: float = 0.98) -> None:
    """Keyframe `obj` so it is carried in the right hand between two frames."""
    actor.carry.append((start, end))
    for f in range(start, end + 1, 2):
        x, y, yaw, _, _ = actor.state(f)
        side = 0.2  # the right hand
        obj.location = (x - math.sin(yaw) * forward + math.cos(yaw) * side, y + math.cos(yaw) * forward + math.sin(yaw) * side, height)
        obj.rotation_euler = (0, 0, yaw)
        obj.keyframe_insert("location", frame=f)
        obj.keyframe_insert("rotation_euler", frame=f)


def set_down(obj: bpy.types.Object, frame: int, where: tuple[float, float, float]) -> None:
    obj.location = where
    obj.keyframe_insert("location", frame=frame)


def linearise(obj: bpy.types.Object) -> None:
    ad = obj.animation_data
    if ad and ad.action:
        for fc in ad.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"


# --------------------------------------------------------------------------- story


def story(cfg: dict, m: dict) -> tuple[dict[str, Actor], dict[str, int]]:
    P = build_store.plan(cfg)
    D = cfg["depth"]
    ax, ay = P["room_A"]
    bx, by = P["room_B"]
    actors = {k: Actor(figure(k)) for k in ROLES}
    c, h, a, v, b, u = (actors[k] for k in ("customer", "host", "consultant_a", "vip", "consultant_b", "advisor"))
    beats: dict[str, int] = {}

    props = kit.collection("Props in hand")
    towel = kit.lathe("cold-towel", [(0, -0.1), (0.032, -0.1), (0.034, 0.1), (0, 0.1)], (0, 0, 0), m["terry"], props, segments=20)
    towel_tilt = kit.empty("cold-towel-carrier", col=props)
    towel.rotation_euler = (math.pi / 2, 0, 0)
    towel.parent = towel_tilt
    cup_parts = build_store.cup("kopi", (0, 0, 0), m, props)
    cup = kit.empty("kopi-carrier", col=props)
    for p in cup_parts:
        p.parent = cup
    rx, ry = P["reception"]
    lx, ly = P["lounge"]
    tray = (P["pantry"][0] + 0.53, D - 0.43, COUNTER_TOP + 0.014)
    set_down(towel_tilt, 1, (rx - 0.6 + 0.15, ry + 0.02, RECEPTION_TOP + 0.04))
    set_down(cup, 1, tray)

    # Everyone in place at the start.
    h.place(P["reception_host"], math.pi)  # facing the door (−y)
    a.place(P["room_A_seat_0"], math.pi).sit(P["room_A"], seat=0.485)
    b.place(P["room_B_seat_0"], math.pi)
    u.place(P["booth"], 0.0).sit(0.0, seat=0.47)  # facing the call screen

    # Walk-in customer: along the five-foot way → door → reception.
    ex = P["door_out"][0]
    c.place((ex - 7.0, -1.35), -math.pi / 2, frame=1)
    beats["arrive"] = c.frame
    c.walk((ex - 0.6, -1.35), P["door_out"], P["door_in"], P["reception_guest"]).face(P["reception_host"])
    beats["welcome"] = c.frame
    h.until(c.frame - FPS).wait(0.5)
    h.face(P["reception_guest"])
    c.wait(4)
    h.until(c.frame)

    # To the Lounge, towel in hand; sits facing the drum table.
    leave_desk = c.frame
    c.walk((P["reception_guest"][0] + 0.6, 0.8), (P["reception"][0] + 1.6, 1.2), (P["lounge_chair_1"][0], P["lounge_chair_1"][1] - 0.6), P["lounge_chair_1"])
    follow(towel_tilt, c, leave_desk, c.frame, forward=0.34, height=0.93)
    c.sit(math.pi, seat=0.39)
    set_down(towel_tilt, c.frame, (lx - 0.22, ly - 0.02, COFFEE_TOP + 0.034))
    beats["seated"] = c.frame
    seated = c.frame

    # Consultant A: stands, makes kopi in the pantry, brings it to the Lounge.
    aisle_back = (ax + 1.25, ay + 0.55)  # behind the table, room A (the credenza is on the far side)
    aisle_side = (ax + 1.25, ay - 0.75)  # beside the chairs, room A
    behind_brief = (P["brief_table"][0] + 1.6, P["brief_table"][1] + 1.15)
    lounge_gap = (P["lounge_serve"][0], P["lounge_serve"][1] + 1.0)
    pantry_aisle = (P["pantry"][0], D - 2.2)
    a.until(seated - 7 * FPS).stand()
    a.walk(aisle_back, aisle_side, P["room_A_door_in"], P["room_A_door_out"], pantry_aisle, P["pantry_staff"]).face((P["pantry"][0], D))
    beats["kopi"] = a.frame
    a.wait(5)
    pick = a.frame
    a.walk(pantry_aisle, behind_brief, lounge_gap, P["lounge_serve"])
    follow(cup, a, pick, a.frame, forward=0.34, height=0.9)
    a.face(P["lounge_chair_1"])
    set_down(cup, a.frame + 15, (lx - 0.02, ly + 0.2, COFFEE_TOP))
    beats["served"] = a.frame
    a.wait(5)
    c.until(a.frame).stand()

    # Together to consult room A.
    beats["to_room"] = c.frame
    c.walk((P["lounge_chair_1"][0] - 0.6, P["lounge_chair_1"][1] - 0.3), (P["lounge_chair_1"][0] - 0.9, 4.0), P["room_A_door_out"], P["room_A_door_in"], P["room_A_seat_1"])
    a.until(c.frame - 3 * FPS)
    a.walk(lounge_gap, P["room_A_door_out"], P["room_A_door_in"], aisle_side, aisle_back, P["room_A_seat_0"])
    c.sit(P["room_A"], seat=0.485)
    a.until(c.frame - 10).sit(P["room_A"], seat=0.485)
    beats["consult"] = max(c.frame, a.frame)
    consult_end = beats["consult"] + 14 * FPS

    # Farewell: both stand, the consultant walks the customer out.
    c.until(consult_end).stand()
    a.until(consult_end).stand()
    beats["farewell"] = c.frame
    out_mid = (P["room_A_door_out"][0] - 0.7, 2.4)
    out_front = (P["reception"][0] + 1.6, 0.7)
    c.walk(P["room_A_door_in"], P["room_A_door_out"], out_mid, out_front, P["door_in"], P["door_out"], (ex + 0.6, -1.35), (ex + 8.0, -1.35))
    a.walk(aisle_back, aisle_side, P["room_A_door_in"], P["room_A_door_out"], out_mid, (out_front[0], out_front[1] + 0.3))
    a.face(P["door_in"]).wait(3)
    h.until(c.frame - 6 * FPS).face(P["door_in"])
    a.walk(out_mid, P["room_A_door_out"], P["room_A_door_in"], aisle_side, aisle_back, P["room_A_seat_0"]).sit(P["room_A"], seat=0.485)

    # VIP: private entrance straight into consult room B, while the Lounge is busy.
    v.place(P["private_street"], math.pi / 2, frame=seated + 2 * FPS)
    beats["vip"] = v.frame
    v.walk(P["private_door"], (bx + 0.9, by - 0.1), P["room_B_seat_2"])
    b.until(v.frame - 2 * FPS).face(P["room_B_seat_2"])
    v.face(P["room_B_seat_0"]).wait(2)
    b.wait(2)
    v.sit(P["room_B"], seat=0.485)
    b.sit(P["room_B"], seat=0.485)
    beats["vip_consult"] = v.frame
    v_out = max(c.frame - 6 * FPS, v.frame + 25 * FPS)
    v.until(v_out).stand().walk((bx + 0.9, by - 0.1), P["private_door"], P["private_street"])
    b.until(v_out).stand().face(P["private_door"]).wait(3)

    end = max(x.frame for x in actors.values()) + 2 * FPS
    for x in actors.values():
        x.until(end)
        linearise(x.obj)
        bake_gait(x, end)
    for o in (towel_tilt, cup):
        linearise(o)
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = end
    beats["end"] = end
    return actors, beats


LABELS = {
    "arrive": "Arrives from the street",
    "welcome": "Welcome and cold towel",
    "seated": "Seated in the Lounge",
    "kopi": "Kopi made in the pantry",
    "served": "Kopi served, consultant greets",
    "vip": "VIP by the private entrance",
    "to_room": "To consult room A",
    "vip_consult": "Consult in room B",
    "consult": "Consult in room A (30 min, compressed)",
    "farewell": "Farewell",
}


# --------------------------------------------------------------------------- plan graphics


def trails(actors: dict[str, Actor]) -> None:
    """Each walk as a line on the floor that draws itself while the person walks it."""
    col = kit.collection("Plan annotations")
    for key, actor in actors.items():
        pts = actor.trail
        if len(pts) < 2:
            continue
        curve = bpy.data.curves.new(f"path-{key}", "CURVE")
        curve.dimensions = "3D"
        curve.bevel_depth = 0.014
        curve.bevel_resolution = 2
        curve.bevel_factor_mapping_end = "SPLINE"
        sp = curve.splines.new("POLY")
        sp.points.add(len(pts) - 1)
        for i, (_, x, y) in enumerate(pts):
            sp.points[i].co = (x, y, 0.024, 1)
        curve.materials.append(materials.flat(f"trail-{key}", ROLES[key][3], roughness=0.4, emission=0.6))
        obj = kit.link(bpy.data.objects.new(f"path-{key}", curve), col)
        # bevel_factor_end runs 0–1 along the spline by point index ("SPLINE" mapping).
        n = len(pts) - 1
        last = -1
        for i, (f, _, _) in enumerate(pts):
            if f == last:
                continue
            curve.bevel_factor_end = i / n
            curve.keyframe_insert("bevel_factor_end", frame=f)
            last = f
        if curve.animation_data and curve.animation_data.action:
            for fc in curve.animation_data.action.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = "LINEAR"


def annotations(cfg: dict) -> None:
    col = kit.collection("Plan annotations")
    ink = materials.flat("annotation-ink", "#1C1B19", roughness=0.6)
    P = build_store.plan(cfg)
    W, D = cfg["width"], cfg["depth"]
    flat = (0.0, 0.0, 0.0)
    z = 0.026
    labels = {
        "ENTRANCE": (P["door_in"][0], 0.25),
        "RECEPTION": (P["reception"][0], P["reception"][1] + 0.62),
        "MARKET BRIEF": (P["brief_table"][0], P["brief_table"][1] - 0.7),
        "LOUNGE": (P["lounge"][0], P["lounge"][1] + 1.62),
        "APOTHECARY": (W - 0.95, P["apothecary"][1] - 1.0),
        "PANTRY": (P["pantry"][0], P["pantry"][1] - 1.05),
        "BOOTH": (P["booth"][0] + 0.1, P["booth"][1] - 0.9),
        "CONSULT A": (P["room_A"][0], P["room_A"][1] - 1.15),
        "CONSULT B": (P["room_B"][0], P["room_B"][1] - 1.15),
        "PRIVATE ENTRANCE": (W + 1.35, P["private_door"][1] + 0.75),
        "FIVE-FOOT WAY": (W * 0.62, -1.3),
    }
    for name, (x, y) in labels.items():
        text(f"label-{name.lower()}", name, 0.17, (x, y, z), ink, col, rotation=flat, align="CENTER")
    # Overall dimensions, outside the walls.
    for name, size, c in (("dim-width", (W, 0.012, 0.004), (W / 2, D + 0.75, z)),
                          ("dim-depth", (0.012, D, 0.004), (-0.75, D / 2, z))):
        kit.rbox(name, size, c, ink, col, bevel=0)
    for x in (0.0, W):
        kit.rbox(f"dim-tick-x{x}", (0.012, 0.22, 0.004), (x, D + 0.75, z), ink, col, bevel=0)
    for y in (0.0, D):
        kit.rbox(f"dim-tick-y{y}", (0.22, 0.012, 0.004), (-0.75, y, z), ink, col, bevel=0)
    text("dim-width-label", f"{W:g} m", 0.2, (W / 2, D + 0.95, z), ink, col, rotation=flat, align="CENTER")
    text("dim-depth-label", f"{D:g} m", 0.2, (-0.95, D / 2, z), ink, col, rotation=(0, 0, math.pi / 2), align="CENTER")
    text("title", f"DR. PROP · STORE LAYOUT · {W * D:.0f} m²", 0.3, (-0.75, D + 1.6, z), ink, col, rotation=flat)
    # Legend: who is who.
    for i, (key, (label, _, _, trail)) in enumerate(ROLES.items()):
        lx, ly = W + 0.9, D + 1.6 - i * 0.42
        kit.lathe(f"legend-dot-{key}", [(0, 0), (0.1, 0), (0.1, 0.004), (0, 0.004)], (lx, ly + 0.06, z - 0.002),
                  materials.flat(f"ring-{key}", trail, roughness=0.5), col, segments=24)
        text(f"legend-{key}", label, 0.15, (lx + 0.22, ly, z), ink, col, rotation=flat)


# --------------------------------------------------------------------------- shots


@dataclass
class Shot:
    start: int
    view: str
    move: tuple[tuple[float, float, float], tuple[float, float, float]] | None = None  # eye delta over the shot


def shots(beats: dict[str, int]) -> list[Shot]:
    """The edit: eye-level moments, the cutaway for the flow between them."""
    edit = [
        Shot(1, "street", ((0, 0, 0), (0, 2.8, 0))),
        Shot(beats["welcome"] - 2 * FPS, "entrance"),
        Shot(beats["welcome"] + 5 * FPS, "axo"),
        Shot(beats["kopi"] - 1 * FPS, "pantry"),
        Shot(beats["kopi"] + 5 * FPS, "axo"),
        Shot(beats["served"] - 2 * FPS, "lounge"),
        Shot(beats["served"] + 5 * FPS, "axo"),
        Shot(beats["consult"] + 1 * FPS, "consult"),
        Shot(beats["consult"] + 12 * FPS, "axo"),
    ]
    edit.sort(key=lambda sh: sh.start)
    return [sh for i, sh in enumerate(edit) if i == 0 or sh.start > edit[i - 1].start]


def shot_at(edit: list[Shot], f: int) -> tuple[Shot, int, int]:
    for s, nxt in zip(edit, edit[1:] + [None]):
        end = nxt.start if nxt else 10**9
        if s.start <= f < end:
            return s, s.start, end
    return edit[-1], edit[-1].start, 10**9


def bind_cameras(cfg: dict, edit: list[Shot], end: int) -> None:
    """Timeline markers that switch cameras, so playback in Blender follows the edit."""
    scene = bpy.context.scene
    vs = look.views(cfg)
    for s in edit:
        cam = look.camera(f"view-{s.view}", vs[s.view])
        mk = scene.timeline_markers.new(f"cam · {s.view}", frame=s.start)
        mk.camera = cam


def apply_shot(cfg: dict, edit: list[Shot], f: int) -> None:
    """Camera, cutaway and overlays for frame f (the renderer's view of bind_cameras)."""
    s, start, end = shot_at(edit, f)
    v = look.views(cfg)[s.view]
    if s.move:
        t = min(1.0, (f - start) / max(1, min(end, bpy.context.scene.frame_end) - start))
        t = t * t * (3 - 2 * t)
        d0, d1 = Vector(s.move[0]), Vector(s.move[1])
        eye = Vector(v.eye) + d0.lerp(d1, t)
        v = look.View(tuple(eye), v.target, v.lens, v.fstop, v.cut, v.ortho, v.light)
    bpy.context.scene.camera = look.camera(f"view-{s.view}", v)
    look.set_cut(v.cut)
    overlays(v.cut)


def overlays(on: bool) -> None:
    col = bpy.data.collections.get("Plan annotations")
    if col:
        col.hide_render = not on
        col.hide_viewport = not on


# --------------------------------------------------------------------------- render


def render_frame_still(cfg: dict, view: str, frame: int, path: Path, size, samples: int, light: str | None = None,
                       overlay: bool | None = None) -> None:
    scene = bpy.context.scene
    scene.frame_set(frame)
    v = look.views(cfg)[view]
    overlays(v.cut if overlay is None else overlay)
    look.render_view(view, path, size, samples, light=light)


def ffmpeg_bin() -> tuple[str | None, dict | None]:
    found = shutil.which("ffmpeg")
    if found:
        return found, None
    for p in (ROOT / "node_modules/@remotion").glob("compositor-*/ffmpeg"):
        return str(p), {**os.environ, "LD_LIBRARY_PATH": str(p.parent)}
    return None, None


def render_video(cfg: dict, edit: list[Shot], path: Path, step: int, size, samples: int, light: str,
                 end: int | None = None) -> None:
    """
    Every `step`-th frame as PNG (resumable: frames already on disk are kept),
    then motion-interpolated back to 30 fps by ffmpeg. Video frames trade bounces
    for time; a little exposure makes up the indirect light.
    """
    scene = bpy.context.scene
    look.setup(light)
    scene.view_settings.exposure += 0.3
    c = scene.cycles
    scene.render.resolution_x, scene.render.resolution_y = size
    c.samples = samples
    c.adaptive_threshold = 0.05
    c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces = 6, 2, 2, 4
    c.transparent_max_bounces = 8
    c.denoising_prefilter = "FAST"
    frames_dir = path.parent / f"{path.stem}-frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    scene.render.image_settings.file_format = "PNG"
    todo = list(range(scene.frame_start, min(end or scene.frame_end, scene.frame_end) + 1, step))
    for i, f in enumerate(todo):
        out = frames_dir / f"{i:05d}.png"
        if out.exists() and out.stat().st_size > 0:
            continue
        scene.frame_set(f)
        apply_shot(cfg, edit, f)
        scene.render.filepath = str(out)
        bpy.ops.render.render(write_still=True)
        print(f"video frame {i + 1}/{len(todo)}", flush=True)
    ffmpeg, env = ffmpeg_bin()
    if not ffmpeg:
        print(f"frames in {frames_dir} (no ffmpeg found to encode)")
        return
    subprocess.run([ffmpeg, "-v", "error", "-y", "-framerate", str(FPS / step), "-i", str(frames_dir / "%05d.png"),
                    "-vf", f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff" if step > 1 else "null",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "19", "-movflags", "+faststart", str(path)],
                   check=True, env=env)
    shutil.rmtree(frames_dir, ignore_errors=True)


# --------------------------------------------------------------------------- main


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the animated Dr Prop store layout plan.")
    parser.add_argument("--config", type=Path, default=ROOT / "blender/store.config.json")
    parser.add_argument("--out", type=Path, default=ROOT / "blender/out")
    parser.add_argument("--stills", type=Path, help="render the story stills into this folder")
    parser.add_argument("--only", nargs="*", help="limit --stills to these names, e.g. shophouse-lounge mall-plan")
    parser.add_argument("--size", default="1920x1280", help="still size")
    parser.add_argument("--samples", type=int, default=192)
    parser.add_argument("--video", type=Path, help="render the edit to an MP4")
    parser.add_argument("--video-size", default="960x540")
    parser.add_argument("--video-step", type=int, default=3, help="render every n-th frame; interpolated back to 30 fps")
    parser.add_argument("--video-samples", type=int, default=10)
    parser.add_argument("--video-end", type=float, help="stop the video after this many seconds")
    parser.add_argument("--video-light", choices=list(look.LIGHTING), help="default: day (shophouse), mall (mall)")
    args = parser.parse_args(script_args())

    cfg = json.loads(args.config.read_text())
    place = build_store.setting(cfg)
    suffix = "" if place == "shophouse" else f"-{place}"
    reset_scene()
    m = build_store.build(cfg)
    look.setup("day")
    look.add_views(cfg)
    actors, beats = story(cfg, m)
    trails(actors)
    annotations(cfg)
    edit = shots(beats)
    bind_cameras(cfg, edit, beats["end"])
    for k, label in LABELS.items():
        bpy.context.scene.timeline_markers.new(label, frame=beats[k])
    overlays(False)
    look.set_cut(False)
    save_blend(args.out / f"store_layout{suffix}.blend")
    # The saved file keeps the camera markers for playback; renders set the camera themselves,
    # so unbind them here or the markers would override every still.
    for mk in bpy.context.scene.timeline_markers:
        mk.camera = None

    scene = bpy.context.scene
    print(f"layout plan ({place}): {len(actors)} people, {scene.frame_end / FPS:.0f} s of flow → {args.out / f'store_layout{suffix}.blend'}")
    for k in sorted(LABELS, key=lambda k: beats[k]):
        print(f"  {beats[k] / FPS:5.1f}s  {LABELS[k]}")

    if args.stills:
        w, h = (int(x) for x in args.size.split("x"))
        at_door = next(f for f, x, y in actors["customer"].trail if y > -1.0)
        mall = place == "mall"
        stills = {
            # name: (view, frame, light, overlays); None = the view's own light
            "street" if not mall else "concourse": ("street", max(1, at_door - 20), None, False),
            "entrance": ("entrance", beats["welcome"] + FPS, None if mall else "day", False),
            "lounge": ("lounge", beats["served"] + 2 * FPS, None if mall else "golden", False),
            "pantry": ("pantry", beats["kopi"] + 2 * FPS, None if mall else "day", False),
            "consult": ("consult", beats["consult"] + 4 * FPS, None if mall else "day", False),
            "reception": ("reception", beats["vip"] + 3 * FPS, None if mall else "golden", False),
            "axo": ("axo", beats["served"] + 3 * FPS, "overcast", True),
            "plan": ("plan", beats["end"], "overcast", True),
        }
        stills = {f"{place}-{k}": v for k, v in stills.items()}
        for name, (view, frame, light, ov) in stills.items():
            if args.only and name not in args.only:
                continue
            path = args.stills / f"{name}.jpg"
            render_frame_still(cfg, view, frame, path, (w, h) if view != "plan" else (w, round(w * 0.78)), args.samples, light, ov)
            print(f"still {name} → {path}")
    if args.video:
        w, h = (int(x) for x in args.video_size.split("x"))
        light = args.video_light or ("mall" if place == "mall" else "day")
        end = round(args.video_end * FPS) if args.video_end else None
        render_video(cfg, edit, args.video, args.video_step, (w, h), args.video_samples, light, end)
        print(f"flow video → {args.video}")


if __name__ == "__main__":
    main()
