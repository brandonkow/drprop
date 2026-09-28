"""
build_layout_plan.py — the store as an animated 3D layout plan.

Builds the store from store.config.json (same geometry as build_store.py),
then adds what a layout review needs:

  - zone labels and overall dimensions on the floor
  - simple figures for customers, the front-desk host and consultants
  - a service flow on the timeline (30 fps, markers for each beat):
      walk-in customer   street → reception (cold towel) → Lounge chair →
                         kopi served by the consultant → consult room A → leaves
      consultant A       room A → pantry (makes kopi) → serves in the Lounge →
                         walks the customer to room A → consult → farewell
      VIP customer       private entrance → straight into consult room B
      consultant B       waits in room B, greets, consults
      advisor            urgent video call in the booth
  - coloured path trails on the floor for every walk
  - cameras: plan (top, orthographic), axonometric, customer point of view,
    consult room A

Open blender/out/store_layout.blend, press Space to play; Numpad 0 looks
through the active camera (Ctrl+Numpad 0 makes the selected camera active).

    python blender/build_layout_plan.py [--config …] [--out blender/out]
        [--plan brand/renders/layout-plan.jpg] [--axo brand/renders/layout-axo.jpg]
        [--video blender/out/layout-flow.mp4 --video-step 6]
    blender -b -P blender/build_layout_plan.py -- [same options]

Renders use Cycles on the CPU so they work on any machine; for a quick
viewport look, just open the .blend.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402

import build_store  # noqa: E402
from common import ROOT, box, collection, cylinder, material, reset_scene, save_blend, script_args, text  # noqa: E402

FPS = 30
WALK = 1.15  # m/s, an unhurried walk
SIT_DROP = 0.42  # how far the figure lowers when seated

ROLES = {
    # name: (label, clothes colour, trail colour)
    "customer": ("Walk-in customer", "#8C6A43", "#8C6A43"),
    "host": ("Front desk", "#8A857C", "#8A857C"),
    "consultant_a": ("Consultant A", "#1C1B19", "#1C1B19"),
    "vip": ("VIP customer", "#A89A84", "#6F6557"),
    "consultant_b": ("Consultant B", "#3A3833", "#3A3833"),
    "advisor": ("Urgent advisor", "#3A3833", "#3A3833"),
}


# --------------------------------------------------------------------------- figures


def figure(key: str) -> bpy.types.Object:
    """A calm mannequin: legs, torso, head, a floor disc and a heading marker (+y is forward)."""
    label, clothes, trail = ROLES[key]
    col = collection("People")
    body = material(f"clothes-{key}", clothes, roughness=0.8)
    skin = material("skin", "#C9AA8C", roughness=0.7)
    disc = material(f"disc-{key}", trail, roughness=0.6)
    root = bpy.data.objects.new(key, None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.3
    root["role"] = label
    col.objects.link(root)
    parts = [
        cylinder(f"{key}-leg-l", 0.07, 0.86, (-0.1, 0, 0.43), body, col, segments=16),
        cylinder(f"{key}-leg-r", 0.07, 0.86, (0.1, 0, 0.43), body, col, segments=16),
        cylinder(f"{key}-torso", 0.2, 0.62, (0, 0, 1.17), body, col, segments=24),
        cylinder(f"{key}-head", 0.105, 0.22, (0, 0, 1.62), skin, col, segments=24),
        box(f"{key}-heading", (0.08, 0.18, 0.02), (0, 0.3, 0.012), disc, col),
    ]
    parts[2].scale = (1.0, 0.62, 1.0)
    floor = cylinder(f"{key}-disc", 0.3, 0.008, (0, 0, 0.005), disc, col, segments=32)
    parts.append(floor)
    for p in parts:
        p.parent = root
    return root


def unwrap(prev: float, yaw: float) -> float:
    """Pick the equivalent angle closest to `prev`, so figures never spin round."""
    while yaw - prev > math.pi:
        yaw -= 2 * math.pi
    while yaw - prev < -math.pi:
        yaw += 2 * math.pi
    return yaw


def heading(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.atan2(-(b[0] - a[0]), b[1] - a[1])


@dataclass
class Actor:
    obj: bpy.types.Object
    frame: int = 1
    xy: tuple[float, float] = (0.0, 0.0)
    yaw: float = 0.0
    z: float = 0.0
    keys: list[tuple[int, float, float, float, float]] = field(default_factory=list)
    trail: list[tuple[float, float]] = field(default_factory=list)

    def key(self) -> None:
        self.obj.location = (self.xy[0], self.xy[1], self.z)
        self.obj.rotation_euler = (0, 0, self.yaw)
        self.obj.keyframe_insert("location", frame=self.frame)
        self.obj.keyframe_insert("rotation_euler", frame=self.frame)
        self.keys.append((self.frame, self.xy[0], self.xy[1], self.yaw, self.z))

    def place(self, xy: tuple[float, float], yaw: float, frame: int = 1) -> "Actor":
        self.frame, self.xy, self.yaw = frame, xy, yaw
        self.trail.append(xy)
        self.key()
        return self

    def turn(self, yaw: float, seconds: float = 0.5) -> "Actor":
        self.frame += round(seconds * FPS)
        self.yaw = unwrap(self.yaw, yaw)
        self.key()
        return self

    def face(self, target: tuple[float, float], seconds: float = 0.5) -> "Actor":
        return self.turn(heading(self.xy, target), seconds)

    def walk(self, *points: tuple[float, float]) -> "Actor":
        for p in points:
            yaw = heading(self.xy, p)
            if abs(unwrap(self.yaw, yaw) - self.yaw) > 0.2:
                self.turn(yaw, 0.35)
            dist = math.dist(self.xy, p)
            self.frame += max(1, round(dist / WALK * FPS))
            self.xy = p
            self.trail.append(p)
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

    def sit(self, facing: tuple[float, float] | float) -> "Actor":
        yaw = facing if isinstance(facing, float) else heading(self.xy, facing)
        self.turn(yaw, 0.4)
        self.frame += round(0.7 * FPS)
        self.z = -SIT_DROP
        self.key()
        return self

    def stand(self) -> "Actor":
        self.frame += round(0.7 * FPS)
        self.z = 0.0
        self.key()
        return self


def follow(obj: bpy.types.Object, actor: Actor, start: int, end: int, forward: float = 0.28, height: float = 1.0) -> None:
    """Keyframe `obj` so it is carried in front of `actor` between two frames."""
    for f, x, y, yaw, z in actor.keys:
        if start <= f <= end:
            obj.location = (x - math.sin(yaw) * forward, y + math.cos(yaw) * forward, z + height)
            obj.keyframe_insert("location", frame=f)


def set_down(obj: bpy.types.Object, frame: int, where: tuple[float, float, float]) -> None:
    obj.location = where
    obj.keyframe_insert("location", frame=frame)


def linearise(obj: bpy.types.Object) -> None:
    ad = obj.animation_data
    if not ad or not ad.action:
        return
    for fc in ad.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"


# --------------------------------------------------------------------------- story


def story(cfg: dict) -> tuple[dict[str, Actor], list[tuple[int, str]]]:
    P = build_store.plan(cfg)
    D = cfg["depth"]
    ax, ay = P["room_A"]
    bx, by = P["room_B"]
    actors = {k: Actor(figure(k)) for k in ROLES}
    c, h, a, v, b, u = (actors[k] for k in ("customer", "host", "consultant_a", "vip", "consultant_b", "advisor"))
    marks: list[tuple[int, str]] = []

    towel = cylinder("cold-towel", 0.05, 0.2, (0, 0, 0), material("towel", "#FBFAF7", roughness=0.9), collection("Props"))
    towel.rotation_euler = (0, math.pi / 2, 0)
    cup = cylinder("kopi-cup", 0.045, 0.09, (0, 0, 0), material("cup", "#FBFAF7", roughness=0.3), collection("Props"))
    rx, ry = P["reception"]
    lx, ly = P["lounge"]
    px, py = P["pantry"]
    set_down(towel, 1, (rx - 0.6, ry, 0.82))
    set_down(cup, 1, (px - 0.8, py - 0.1, 0.97))

    # Everyone in place at the start.
    h.place(P["reception_host"], math.pi)  # facing the door (−y)
    a.place(P["room_A_seat_0"], math.pi).sit(P["room_A"])
    b.place(P["room_B_seat_0"], math.pi)
    u.place(P["booth"], 0.0).sit(math.pi)

    # Walk-in customer: street → door → reception.
    c.place(P["street"], 0.0)
    marks.append((c.frame, "Arrives from the street"))
    c.walk(P["door_out"], P["door_in"], P["reception_guest"]).face(P["reception_host"])
    marks.append((c.frame, "Welcome and cold towel"))
    h.until(c.frame - FPS).wait(0.5)
    handoff = c.frame + FPS
    set_down(towel, handoff - 10, (rx - 0.6, ry, 0.82))
    c.wait(4)
    h.until(c.frame)

    # To the Lounge; carries the towel; sits facing the coffee table.
    leave_desk = c.frame
    c.walk((P["reception_guest"][0] + 1.6, 1.3), (P["lounge_chair_1"][0], P["lounge_chair_1"][1] - 0.55), P["lounge_chair_1"])
    follow(towel, c, leave_desk, c.frame, forward=0.2, height=0.95)
    c.sit(math.pi)
    set_down(towel, c.frame, (lx - 0.2, ly - 0.05, 0.46))
    marks.append((c.frame, "Seated in the Lounge"))
    seated = c.frame

    # Consultant A: stands, makes kopi in the pantry, brings it to the Lounge.
    # Aisles that keep walks clear of furniture.
    aisle_back = (ax + 1.25, ay + 0.55)  # behind the table, room A
    aisle_side = (ax + 1.25, ay - 0.65)  # beside the chairs, room A
    behind_brief = (P["brief_table"][0] + 1.6, P["brief_table"][1] + 0.9)
    lounge_gap = (P["lounge_serve"][0], P["lounge_serve"][1] + 1.0)
    a.until(seated - 6 * FPS).stand()
    a.walk(aisle_back, aisle_side, P["room_A_door_in"], P["room_A_door_out"], (px, D - 2.2), P["pantry_staff"]).face((px, py))
    marks.append((a.frame, "Kopi prepared in the pantry"))
    a.wait(5)
    pick = a.frame
    a.walk((px, D - 2.2), behind_brief, lounge_gap, P["lounge_serve"])
    follow(cup, a, pick, a.frame)
    a.face(P["lounge_chair_1"])
    set_down(cup, a.frame + 15, (lx - 0.05, ly + 0.15, 0.49))
    marks.append((a.frame, "Kopi served, consultant greets"))
    a.wait(4)
    c.until(a.frame).stand()

    # Together to consult room A.
    marks.append((c.frame, "Walk to consult room A"))
    c.walk((P["lounge_chair_1"][0] - 0.4, 3.9), P["room_A_door_out"], P["room_A_door_in"], P["room_A_seat_1"])
    a.until(c.frame - 3 * FPS)
    a.walk(lounge_gap, P["room_A_door_out"], P["room_A_door_in"], aisle_side, aisle_back, P["room_A_seat_0"])
    c.sit(P["room_A"])
    a.until(c.frame - 10).sit(P["room_A"])
    marks.append((max(c.frame, a.frame), "Consult in room A (30 min, compressed)"))
    consult_end = max(c.frame, a.frame) + 18 * FPS

    # Farewell: both stand, consultant walks the customer out.
    c.until(consult_end).stand()
    a.until(consult_end).stand()
    marks.append((c.frame, "Farewell"))
    # Out past the Lounge side and in front of the reception table, never through furniture.
    out_mid = (P["room_A_door_out"][0] - 0.7, 2.4)
    out_front = (P["reception"][0] + 1.6, 0.7)
    c.walk(P["room_A_door_in"], P["room_A_door_out"], out_mid, out_front, P["door_in"], P["door_out"], P["street"])
    a.walk(aisle_back, aisle_side, P["room_A_door_in"], P["room_A_door_out"], out_mid, (out_front[0], out_front[1] + 0.3))
    a.face(P["door_in"]).wait(3)
    a.walk(out_mid, P["room_A_door_out"], P["room_A_door_in"], aisle_side, aisle_back, P["room_A_seat_0"]).sit(P["room_A"])

    # VIP: private entrance straight into consult room B, while the Lounge is busy.
    v.place(P["private_street"], math.pi / 2, frame=seated + 2 * FPS)
    marks.append((v.frame, "VIP arrives by the private entrance"))
    v.walk(P["private_door"], (bx + 0.9, by - 0.1), P["room_B_seat_2"])
    b.until(v.frame - 2 * FPS).face(P["room_B_seat_2"])
    v.face(P["room_B_seat_0"]).wait(2)
    b.wait(2)
    v.sit(P["room_B"])
    b.sit(P["room_B"])
    marks.append((v.frame, "Consult in room B"))
    v_out = max(c.frame, v.frame + 25 * FPS)
    v.until(v_out).stand().walk((bx + 0.9, by - 0.1), P["private_door"], P["private_street"])
    b.until(v_out).stand().face(P["private_door"]).wait(3)

    end = max(x.frame for x in actors.values()) + 2 * FPS
    for x in actors.values():
        x.until(end)
        linearise(x.obj)
    for o in (towel, cup):
        linearise(o)
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = end
    for f, label in sorted(marks):
        scene.timeline_markers.new(label, frame=f)
    return actors, sorted(marks)


# --------------------------------------------------------------------------- plan graphics


def trails(actors: dict[str, Actor]) -> None:
    col = collection("Paths")
    for key, actor in actors.items():
        pts = actor.trail
        if len(pts) < 2:
            continue
        curve = bpy.data.curves.new(f"path-{key}", "CURVE")
        curve.dimensions = "3D"
        curve.bevel_depth = 0.018
        spline = curve.splines.new("POLY")
        spline.points.add(len(pts) - 1)
        for i, (x, y) in enumerate(pts):
            spline.points[i].co = (x, y, 0.02, 1)
        curve.materials.append(material(f"trail-{key}", ROLES[key][2], roughness=0.5, emission=0.4))
        col.objects.link(bpy.data.objects.new(f"path-{key}", curve))


def annotations(cfg: dict) -> None:
    col = collection("Plan annotations")
    ink = material("annotation-ink", "#1C1B19", roughness=0.6)
    P = build_store.plan(cfg)
    W, D = cfg["width"], cfg["depth"]
    flat = (0.0, 0.0, 0.0)
    labels = {
        "ENTRANCE": (P["door_in"][0], 0.2),
        "RECEPTION": (P["reception"][0], P["reception"][1] + 0.75),
        "MARKET BRIEF": (P["brief_table"][0], P["brief_table"][1] + 0.75),
        "LOUNGE": (P["lounge"][0], P["lounge"][1] + 1.55),
        "APOTHECARY WALL": (W - 1.0, P["apothecary"][1] - 1.05),
        "PANTRY": (P["pantry"][0], P["pantry"][1] - 1.0),
        "URGENT BOOTH": (P["booth"][0] + 0.95, P["booth"][1] - 0.85),
        "CONSULT A": (P["room_A"][0], P["room_A"][1] - 0.95),
        "CONSULT B (PRIVATE)": (P["room_B"][0], P["room_B"][1] - 0.95),
        "PRIVATE ENTRANCE": (W + 1.3, P["private_door"][1] + 0.6),
        "STREET": (P["street"][0] + 2.5, -2.2),
    }
    for name, (x, y) in labels.items():
        text(f"label-{name.lower()}", name, 0.2, (x, y, 0.013), ink, col, rotation=flat, align="CENTER")
    # Overall dimensions.
    box("dim-width", (W, 0.015, 0.005), (W / 2, -1.2, 0.01), ink, col)
    box("dim-depth", (0.015, D, 0.005), (-1.2, D / 2, 0.01), ink, col)
    for x in (0.0, W):
        box(f"dim-tick-x{x}", (0.015, 0.25, 0.005), (x, -1.2, 0.01), ink, col)
    for y in (0.0, D):
        box(f"dim-tick-y{y}", (0.25, 0.015, 0.005), (-1.2, y, 0.01), ink, col)
    text("dim-width-label", f"{W:g} m", 0.22, (W / 2, -1.55, 0.013), ink, col, rotation=flat, align="CENTER")
    text("dim-depth-label", f"{D:g} m", 0.22, (-1.55, D / 2, 0.013), ink, col, rotation=(0, 0, math.pi / 2), align="CENTER")
    area = W * D
    text("title", f"DR. PROP · STORE LAYOUT · {area:.0f} m²", 0.3, (0, D + 0.8, 0.013), ink, col, rotation=flat)
    # A pale ground outside the store so trails to the street and private door read.
    box("ground", (W + 6, D + 7, 0.02), (W / 2, D / 2 - 1.5, -0.06), material("ground", "#E9E4DA", roughness=1.0), col)


def cameras(cfg: dict, actors: dict[str, Actor]) -> dict[str, bpy.types.Object]:
    W, D = cfg["width"], cfg["depth"]
    scene = bpy.context.scene
    out: dict[str, bpy.types.Object] = {}

    def cam(name: str, loc, rot, ortho: float | None = None, lens: float = 24) -> bpy.types.Object:
        data = bpy.data.cameras.new(name)
        if ortho:
            data.type = "ORTHO"
            data.ortho_scale = ortho
        else:
            data.lens = lens
        data.clip_end = 200
        obj = bpy.data.objects.new(name, data)
        obj.location = loc
        obj.rotation_euler = rot
        scene.collection.objects.link(obj)
        out[name] = obj
        return obj

    cx, cy = W / 2 + 0.3, D / 2 - 0.6
    cam("Plan (top)", (cx, cy, 40), (0, 0, 0), ortho=max(W, D) + 5.5)
    # Axonometric: steep, from the front-left corner, so the storefront fascia
    # does not hide the Lounge.
    dist = 40
    yaw, pitch = math.radians(-30), math.radians(40)
    ay0 = cy + 1.0  # aim a little behind centre: the back rooms rise higher in frame
    loc = (cx + dist * math.sin(pitch) * math.sin(-yaw) * -1, ay0 - dist * math.sin(pitch) * math.cos(yaw), dist * math.cos(pitch))
    cam("Axonometric", loc, (pitch, 0, yaw), ortho=max(W, D) + 6.5)
    pov = cam("Customer POV", (0, 0.15, 1.55), (math.radians(90), 0, 0), lens=20)
    pov.parent = actors["customer"].obj
    P = build_store.plan(cfg)
    ax, ay = P["room_A"]
    cam("Consult room A", (ax - 1.35, ay - 1.25, 2.0), (math.radians(68), 0, math.radians(-40)), lens=18)
    scene.camera = out["Axonometric"]
    return out


# --------------------------------------------------------------------------- render


def setup_render(width: int, height: int, samples: int) -> None:
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.view_settings.view_transform = "AgX"
    world = scene.world or bpy.data.worlds.new("world")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.93, 0.91, 0.86, 1)
    bg.inputs["Strength"].default_value = 1.0
    # A soft sun so the plan reads in daylight rather than only by pendants.
    if "plan-sun" not in bpy.data.objects:
        sun = bpy.data.lights.new("plan-sun", "SUN")
        sun.energy = 2.2
        sun.angle = math.radians(12)
        obj = bpy.data.objects.new("plan-sun", sun)
        obj.rotation_euler = (math.radians(35), math.radians(-20), math.radians(30))
        scene.collection.objects.link(obj)


def render_still(camera: bpy.types.Object, frame: int, path: Path, size: tuple[int, int], samples: int) -> None:
    scene = bpy.context.scene
    setup_render(*size, samples)
    scene.camera = camera
    scene.frame_set(frame)
    path.parent.mkdir(parents=True, exist_ok=True)
    scene.render.image_settings.file_format = "JPEG" if path.suffix.lower() in (".jpg", ".jpeg") else "PNG"
    scene.render.image_settings.quality = 88
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def render_video(camera: bpy.types.Object, path: Path, step: int, size: tuple[int, int], samples: int) -> None:
    """Every `step`-th frame as PNG, then encoded with ffmpeg at 30/step fps (real time)."""
    scene = bpy.context.scene
    setup_render(*size, samples)
    scene.camera = camera
    frames_dir = path.parent / f"{path.stem}-frames"
    shutil.rmtree(frames_dir, ignore_errors=True)
    frames_dir.mkdir(parents=True)
    scene.render.image_settings.file_format = "PNG"
    for i, f in enumerate(range(scene.frame_start, scene.frame_end + 1, step)):
        scene.frame_set(f)
        scene.render.filepath = str(frames_dir / f"{i:05d}.png")
        bpy.ops.render.render(write_still=True)
    ffmpeg = shutil.which("ffmpeg") or next(
        (str(p) for p in (ROOT / "node_modules/@remotion").glob("compositor-*/ffmpeg")), None
    )
    if not ffmpeg:
        print(f"frames in {frames_dir} (no ffmpeg found to encode)")
        return
    env = None
    if "compositor" in ffmpeg:
        import os

        env = {**os.environ, "LD_LIBRARY_PATH": str(Path(ffmpeg).parent)}
    subprocess.run(
        [ffmpeg, "-v", "error", "-y", "-framerate", str(FPS / step), "-i", str(frames_dir / "%05d.png"),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", str(path)],
        check=True,
        env=env,
    )
    shutil.rmtree(frames_dir, ignore_errors=True)


# --------------------------------------------------------------------------- main


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the animated Dr Prop store layout plan.")
    parser.add_argument("--config", type=Path, default=ROOT / "blender/store.config.json")
    parser.add_argument("--out", type=Path, default=ROOT / "blender/out")
    parser.add_argument("--plan", type=Path, help="render the top plan to this file")
    parser.add_argument("--axo", type=Path, help="render the axonometric view to this file")
    parser.add_argument("--at", type=float, default=0.42, help="point in the story for stills, 0–1")
    parser.add_argument("--video", type=Path, help="render the axonometric flow to an MP4")
    parser.add_argument("--video-step", type=int, default=6, help="render every n-th frame (plays back in real time)")
    parser.add_argument("--samples", type=int, default=24)
    args = parser.parse_args(script_args())

    cfg = json.loads(args.config.read_text())
    reset_scene()
    bpy.context.scene["drprop_width"] = cfg["width"]
    build_store.build(cfg)
    ceiling = bpy.data.objects["ceiling"]
    ceiling.hide_viewport = ceiling.hide_render = True  # a plan looks in from above
    actors, marks = story(cfg)
    trails(actors)
    annotations(cfg)
    cams = cameras(cfg, actors)
    save_blend(args.out / "store_layout.blend")

    scene = bpy.context.scene
    seconds = scene.frame_end / FPS
    print(f"layout plan: {len(actors)} people, {seconds:.0f} s of flow, {len(marks)} markers → {args.out / 'store_layout.blend'}")
    for f, label in marks:
        print(f"  {f / FPS:5.1f}s  {label}")
    frame = max(1, round(scene.frame_end * args.at))
    if args.plan:
        render_still(cams["Plan (top)"], frame, args.plan, (1800, 1500), args.samples)
        print(f"plan → {args.plan}")
    if args.axo:
        render_still(cams["Axonometric"], frame, args.axo, (1800, 1200), args.samples)
        print(f"axonometric → {args.axo}")
    if args.video:
        render_video(cams["Axonometric"], args.video, args.video_step, (840, 560), max(6, args.samples // 3))
        print(f"flow video → {args.video}")


if __name__ == "__main__":
    main()
