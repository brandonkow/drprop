"""
build_promo.py — the shots for the hero film (reels/src/compositions/ProductFilm.tsx).

Shot like a product launch: every subject is a precise object in a dark studio,
lit by large soft sources, cool rim lights and a moving strip light for the
glints, filmed with long lenses, slow moves and shallow focus.

  model      the store as a scale model. The sign lights up, the interior
             comes on, the camera pulls back to the whole store floating in
             the dark; then the walls above 2.4 m lift away and each zone
             rises apart (exploded view). Callout anchors are projected for
             every frame to brand/renders/promo/model-callouts.json.
  bronze     macro: halo-lit bronze letters on travertine, a light sweep
  materials  macro: walnut slab, travertine pedestal, cold towels on bronze
  drawer     macro: an apothecary drawer slides open
  consult    the consult table as a set piece; the screen draws the Pulse line
  phone      a phone turns to show the booking flow (real app screens)
  card       the member card turns under a light sweep
  lounge     the Lounge as a set piece in warm light
  dusk       the real place: the shophouse at dusk, a slow push-in

Each shot is built into blender/out/promo/<shot>.blend, rendered every n-th
frame (resumable, in time-boxed sessions), then motion-interpolated to 30 fps
and encoded to brand/renders/promo/<shot>.mp4 for the film.

    python blender/build_promo.py --build all
    python blender/build_promo.py --preview card --at 0,0.5,1
    python blender/build_promo.py --render model bronze … --budget 24
    python blender/build_promo.py --status

The app screens on the phone are in blender/promo/screens (English, captured
from the app's web build).
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402  (first: it puts bmesh and mathutils on the path)
import bmesh  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Vector  # noqa: E402

import build_apothecary  # noqa: E402
import build_store  # noqa: E402
import kit  # noqa: E402
import look  # noqa: E402
import materials  # noqa: E402
from common import ROOT, hex_rgba, reset_scene, save_blend, script_args, text  # noqa: E402

FPS = 30
SIZE = (1920, 1080)
OUT = ROOT / "blender/out/promo"
PLATES = ROOT / "brand/renders/promo"
SCREENS = ROOT / "blender/promo/screens"
# Darker than the film's --night (#141412): the film lays each plate over --night with a
# "lighten" blend, so the studio void becomes exactly the brand colour.
VOID = (0.0016, 0.0016, 0.0015)


@dataclass
class Shot:
    frames: int  # length on the 30 fps timeline, including a few frames of handle
    step: int  # render every n-th frame; ffmpeg interpolates the rest
    samples: int
    build: Callable[[], None]
    exposure: float = 0.0


# --------------------------------------------------------------------------- studio


def studio(samples: int, exposure: float = 0.0) -> None:
    """Dark void, Cycles on the CPU, AgX, a little glow: the same look for every plate."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new("void")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*VOID, 1)
    bg.inputs["Strength"].default_value = 1.0
    r = scene.render
    r.engine = "CYCLES"
    r.resolution_x, r.resolution_y = SIZE
    r.resolution_percentage = 100
    r.fps = FPS
    r.use_persistent_data = True
    r.film_transparent = False
    c = scene.cycles
    c.device = "CPU"
    c.samples = samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.02
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    c.denoising_prefilter = "ACCURATE"
    c.max_bounces, c.diffuse_bounces, c.glossy_bounces = 8, 3, 4
    c.transmission_bounces, c.transparent_max_bounces = 6, 8
    c.caustics_reflective = c.caustics_refractive = False
    c.blur_glossy = 0.5
    c.sample_clamp_indirect = 5.0
    view = scene.view_settings
    view.view_transform = "AgX"
    try:
        view.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    view.exposure = exposure
    look.compositor(glow=0.16)
    r.image_settings.file_format = "PNG"
    r.image_settings.color_depth = "8"


def studio_light(name, location, watts, size, *, size_y=None, kelvin=5200, aim_at=(0, 0, 0), spread=180):
    """A studio softbox / strip aimed at a point (lights are invisible to the camera)."""
    aim = Vector(aim_at) - Vector(location)
    return kit.area(name, location, watts, size, size_y=size_y, kelvin=kelvin, aim=tuple(aim), spread=spread,
                    col=kit.collection("Studio"))


def plinth(name, size, top_z=0.0, *, round_r: float | None = None, mat=None):
    """The object's base: a dark lacquered slab whose eased edges catch the rim light."""
    mat = mat or materials.flat("plinth", "#1B1A18", roughness=0.32, coat=0.5)
    col = kit.collection("Set")
    if round_r:
        o = kit.lathe(name, [(0, 0), (round_r, 0), (round_r + 0.01, 0.01), (round_r + 0.01, size[2] - 0.01),
                             (round_r, size[2]), (0, size[2])], (0, 0, top_z - size[2]), mat, col, segments=96)
        return o
    return kit.rbox(name, size, (0, 0, top_z - size[2] / 2), mat, col, bevel=0.012, segments=3)


def rig(name: str, keys, *, lens: float = 50, fstop: float | None = None, focus=None) -> bpy.types.Object:
    """
    A camera that looks at a moving target. `keys` = [(frame, eye, look), …];
    `lens` and `fstop` can be numbers or [(frame, value), …].
    """
    scene = bpy.context.scene
    data = bpy.data.cameras.new(name)
    data.sensor_width = 36
    data.clip_start = 0.005
    data.clip_end = 400
    cam = kit.link(bpy.data.objects.new(name, data), kit.collection("Cameras"))
    target = kit.empty(f"{name}-look", col=kit.collection("Cameras"))
    tc = cam.constraints.new("TRACK_TO")
    tc.target = target
    tc.track_axis = "TRACK_NEGATIVE_Z"
    tc.up_axis = "UP_Y"
    for f, eye, at in keys:
        cam.location = eye
        cam.keyframe_insert("location", frame=f)
        target.location = at
        target.keyframe_insert("location", frame=f)
    for value, attr, holder in ((lens, "lens", data), (fstop, "aperture_fstop", data.dof)):
        if value is None:
            continue
        for f, v in (value if isinstance(value, list) else [(keys[0][0], value)]):
            setattr(holder, attr, v)
            holder.keyframe_insert(attr, frame=f)
    if fstop is not None:
        data.dof.use_dof = True
        data.dof.aperture_blades = 9
        data.dof.focus_object = focus or target
    scene.camera = cam
    smooth(cam, target, data)
    return cam


def smooth(*ids) -> None:
    """Bezier keys with eased ends: the moves glide in and settle."""
    for idb in ids:
        ad = idb.animation_data
        if not ad or not ad.action:
            continue
        for fc in ad.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"
                kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
            fc.update()


def keys(obj, path: str, points, *, index: int = -1, ease: str = "BEZIER") -> None:
    """Keyframe `obj.path` at [(frame, value), …]."""
    for f, v in points:
        target, attr = (obj, path)
        if "." in path:
            head, attr = path.rsplit(".", 1)
            target = obj.path_resolve(head)
        setattr(target, attr, v)
        target.keyframe_insert(attr, frame=f, index=index)
    ad = obj.animation_data if not isinstance(obj, bpy.types.bpy_struct) or hasattr(obj, "animation_data") else None
    if ad and ad.action:
        for fc in ad.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = ease


def strength_input(mat: bpy.types.Material):
    """The emission strength socket of an emitter() / washi / halo material."""
    for n in mat.node_tree.nodes:
        if n.type == "EMISSION":
            return n.inputs["Strength"]
        if n.type == "BSDF_PRINCIPLED" and n.inputs["Emission Strength"].default_value > 0:
            return n.inputs["Emission Strength"]
    return None


def fade_emission(mat: bpy.types.Material, points) -> None:
    sock = strength_input(mat)
    if sock is None:
        return
    for f, v in points:
        sock.default_value = v
        sock.keyframe_insert("default_value", frame=f)


def rounded_rect(w: float, h: float, r: float, segs: int = 12) -> list[tuple[float, float]]:
    """Outline of a rounded rectangle centred on the origin, counter-clockwise."""
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(segs + 1):
            a = math.radians(a0 + 90 * i / segs)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def slab(name, w, h, depth, r, mat, col, *, bevel=0.0, uv=False):
    """A rounded-rectangle slab in the XZ plane (faces ±y), `depth` thick along y, centred on the origin."""
    bm = bmesh.new()
    outline = rounded_rect(w, h, r)
    front = [bm.verts.new((x, -depth / 2, z)) for x, z in outline]
    face = bm.faces.new(front)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, depth, 0), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if uv:
        layer = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            for loop in f.loops:
                x, _, z = loop.vert.co
                loop[layer].uv = (x / w + 0.5, z / h + 0.5)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    mesh.set_sharp_from_angle(angle=math.radians(30))
    mesh.materials.append(mat)
    obj = kit.link(bpy.data.objects.new(name, mesh), col)
    if bevel:
        b = obj.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = 4
        b.limit_method = "ANGLE"
        b.harden_normals = True
    return obj


def rolled_towel(name, location, length, radius, mat, col, *, turns: float = 2.6, segs: int = 40):
    """A rolled towel lying along y: an Archimedean spiral of cloth, so the ends read as a roll."""
    bm = bmesh.new()
    r0 = radius * 0.16
    pitch = (radius - r0) / turns
    t = pitch * 0.82  # the cloth's thickness; the rest is the gap between layers
    n = int(turns * segs)
    outer, inner = [], []
    for i in range(n + 1):
        a = 2 * math.pi * turns * i / n
        r = r0 + pitch * a / (2 * math.pi)
        outer.append((math.cos(a) * (r + t / 2), math.sin(a) * (r + t / 2)))
        inner.append((math.cos(a) * max(r - t / 2, 0.0005), math.sin(a) * max(r - t / 2, 0.0005)))
    outline = outer + inner[::-1]
    face = bm.faces.new([bm.verts.new((x, -length / 2, z)) for x, z in outline])
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    bmesh.ops.translate(bm, vec=(0, length, 0), verts=[v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    for poly in mesh.polygons:
        poly.use_smooth = len(poly.vertices) == 4
    mesh.materials.append(mat)
    obj = kit.link(bpy.data.objects.new(name, mesh), col)
    obj.location = location
    return obj


def delete(objs) -> None:
    for o in list(objs):
        if o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)


def objects_in(col_name: str) -> list[bpy.types.Object]:
    col = bpy.data.collections.get(col_name)
    return list(col.all_objects) if col else []


# --------------------------------------------------------------------------- the store as a model


MODEL_SPLIT = 180  # frame where the reveal hands over to the exploded view

# Callouts: (key, zone collection or None for the base, plan point, height above the floor)
ANCHORS = [
    ("reception", "Reception", "reception", 0.85),
    ("brief", "Brief table", "brief_table", 0.85),
    ("lounge", "Lounge", "lounge", 0.75),
    ("apothecary", "Apothecary", "apothecary", 1.4),
    ("consult", "Consult rooms", "room_A", 0.9),
    ("pantry", "Pantry", "pantry", 1.1),
    ("booth", "Urgent booth", "booth", 2.35),
    ("private", None, "private_door", 1.3),
]


def build_model() -> None:
    cfg = json.loads((ROOT / "blender/store.config.json").read_text())
    W, D = cfg["width"], cfg["depth"]
    P = build_store.plan(cfg)
    build_store.build(cfg)
    # A model of the store alone: no street, no ceiling, no street lights.
    delete(objects_in("Street") + objects_in("Mall"))
    delete(o for o in bpy.data.objects if o.name.startswith(("ceiling", "cove-", "downlight-trim", "downlight-lens")))
    # Nor the shophouse's upper floor and its neighbours: the lid is the store's own walls and fascia.
    delete(o for o in bpy.data.objects if o.name.startswith(("upper-", "soffit", "neighbour", "column-")))
    delete(o for o in objects_in("Lights") if not (-0.6 < o.location.x < W + 0.6 and -0.6 < o.location.y < D + 0.6))
    plinth("plinth", (W + 1.4, D + 1.2, 0.32), top_z=-0.04)
    for o in bpy.data.objects:
        if o.name == "plinth":
            o.location.x, o.location.y = W / 2, D / 2 - 0.1

    # Groups that move in the exploded view.
    def mover(name):
        return kit.empty(f"explode-{name}", col=kit.collection("Explode"))

    lid = mover("lid")
    zones = {name: mover(name) for name in ("Reception", "Brief table", "Lounge", "Apothecary", "Pantry", "Consult rooms", "Urgent booth")}
    static = ("fluted", "bench", "window-")
    for col_name, empty in [("Above cut", lid)] + list(zones.items()):
        for o in objects_in(col_name):
            if o.parent is None and not o.name.startswith(static) and o.type != "LIGHT":
                o.parent = empty
    # Window display pieces live in the Apothecary collection too: they stay with the shopfront.
    for o in objects_in("Apothecary"):
        if o.parent == zones["Apothecary"] and o.name.startswith("window-"):
            o.parent = None
    # Section caps follow their wall, and only appear once the lid lifts.
    caps = objects_in("Section caps")
    for cap in caps:
        wall = bpy.data.objects.get(cap.name[: -len("-cap")])
        home = None
        if wall is not None:
            for name, empty in zones.items():
                if wall.name in bpy.data.collections[name].all_objects:
                    home = empty
        if home is not None:
            cap.parent = home
        cap.hide_render = True
        cap.keyframe_insert("hide_render", frame=1)
        cap.hide_render = False
        cap.keyframe_insert("hide_render", frame=MODEL_SPLIT + 14)

    # The exploded view: lid up first, then the zones rise in a wave, front to back.
    s = MODEL_SPLIT
    keys(lid, "location", [(s + 12, (0, 0, 0)), (s + 70, (0, 0, 4.2))], index=2)
    for i, empty in enumerate(zones.values()):
        a = s + 40 + i * 9
        keys(empty, "location", [(a, (0, 0, 0)), (a + 46, (0, 0, 0.95))], index=2)
    smooth(lid, *zones.values())

    # Lights: the sign comes on first (a heartbeat), then the whole interior.
    m = materials.library()
    fade_emission(m["halo"], [(1, 0.0), (16, 0.0), (40, 14.0)])
    for key in ("led", "led_soft", "washi", "screen"):
        sock = strength_input(m[key])
        if sock is not None:
            full = sock.default_value
            fade_emission(m[key], [(1, 0.0), (48, 0.0), (104, full)])
    for name in ("screen-line", "call-glow"):
        mat = bpy.data.materials.get(name)
        if mat:
            sock = strength_input(mat)
            fade_emission(mat, [(1, 0.0), (48, 0.0), (104, sock.default_value if sock else 1.0)])
    for o in objects_in("Lights"):
        e = o.data.energy
        keys(o.data, "energy", [(1, 0.0), (48, 0.0), (104, e)], ease="BEZIER")

    # Studio: a big soft key high front-left, cool rims behind, a whisper of fill.
    c = (W / 2, D / 2, 0.8)
    studio_light("key", (W / 2 - 9, -9, 13), 9000, 7.0, kelvin=5000, aim_at=c)
    studio_light("rim-right", (W + 7, D + 6, 5), 7000, 5.0, size_y=1.6, kelvin=7000, aim_at=c)
    studio_light("rim-left", (-7, D + 7, 6), 5000, 5.0, size_y=1.6, kelvin=7200, aim_at=c)
    studio_light("fill", (W / 2, -14, 2.5), 900, 10.0, size_y=3.0, kelvin=4500, aim_at=c)
    sweep = studio_light("sweep", (-4, -6, 3.2), 2400, 0.25, size_y=5.0, kelvin=6000, aim_at=(W / 2, 0, 2.9))
    keys(sweep, "location", [(1, (-4, -5.5, 3.2)), (70, (W + 4, -5.5, 3.2))])

    # Camera: from the halo-lit letters, back and up until the store floats in the dark;
    # then a slow orbit as it comes apart.
    sx, sz = W / 2, 2.975
    C = Vector((W / 2, D / 2, 1.0))

    def orbit(az, el, r, lift=0.0):
        a, e = math.radians(az), math.radians(el)
        return (C.x + r * math.cos(e) * math.cos(a), C.y + r * math.cos(e) * math.sin(a), C.z + lift + r * math.sin(e))

    rig("cam-model", [
        (1, (sx - 0.75, -2.25, 2.92), (sx - 0.15, -0.43, 2.96)),
        (40, (sx - 1.05, -2.9, 2.9), (sx - 0.1, -0.43, 2.95)),
        (120, (sx - 6.5, -11.0, 4.8), (W / 2, D / 2 - 1.2, 1.5)),
        (s, orbit(232, 24, 21.0), (C.x, C.y, 1.2)),
        (s + 120, orbit(240, 33, 22.0), (C.x, C.y, 1.9)),
        (s + 218, orbit(247, 38, 22.5), (C.x, C.y, 2.2)),
    ], lens=[(1, 50), (120, 50)], fstop=[(1, 2.8), (40, 2.8), (110, 16), (s + 218, 16)])

    # Anchors for the callouts ride with their zone.
    for key, zone, point, z in ANCHORS:
        x, y = P[point]
        if key == "apothecary":
            x -= 0.35
        if key == "private":
            x += 0.4
        a = kit.empty(f"anchor-{key}", (x, y, z), col=kit.collection("Explode"))
        if zone:
            a.parent = zones[zone]


def export_callouts(shot: Shot) -> None:
    """Where each anchor lands on screen, every frame: the film draws the callouts there."""
    scene = bpy.context.scene
    cam = scene.camera
    anchors = {o.name[len("anchor-"):]: o for o in bpy.data.objects if o.name.startswith("anchor-")}
    frames = []
    for f in range(1, shot.frames + 1):
        scene.frame_set(f)
        row = {}
        for k, o in anchors.items():
            v = world_to_camera_view(scene, cam, o.matrix_world.translation)
            row[k] = [round(v.x, 4), round(1 - v.y, 4), round(v.z, 2)]
        frames.append(row)
    PLATES.mkdir(parents=True, exist_ok=True)
    out = {"fps": FPS, "width": SIZE[0], "height": SIZE[1], "split": MODEL_SPLIT, "frames": frames}
    (PLATES / "model-callouts.json").write_text(json.dumps(out, separators=(",", ":")))
    print(f"callouts → {PLATES / 'model-callouts.json'} ({len(frames)} frames)")


# --------------------------------------------------------------------------- macros


def build_bronze() -> None:
    """Halo-lit bronze letters on a travertine fascia, close enough to see the brushing."""
    m = materials.library()
    col = kit.collection("Set")
    kit.rbox("fascia", (3.4, 0.25, 1.1), (0, 0.125, 0.0), m["travertine"], col, bevel=0.006)
    text("letters", "DR. PROP", 0.27, (0, -0.03, -0.1), m["bronze"], col, extrude=0.01, align="CENTER")
    halo = text("halo", "DR. PROP", 0.27, (0, -0.008, -0.1), m["halo"], col, align="CENTER")
    halo.visible_camera = False
    fade_emission(m["halo"], [(1, 3.0), (30, 14.0)])
    # Grazing light from above brings out the stone's pores; a strip sweeps the bronze.
    studio_light("graze", (0, -0.35, 1.4), 38, 3.2, size_y=0.25, kelvin=4300, aim_at=(0, 0.0, 0.1))
    studio_light("rim", (1.6, -0.6, 0.3), 22, 0.6, size_y=0.6, kelvin=7000, aim_at=(0, 0, 0))
    sweep = studio_light("sweep", (-1.6, -0.75, 0.15), 45, 0.06, size_y=1.4, kelvin=6000, aim_at=(0, 0, -0.05))
    keys(sweep, "location", [(10, (-1.4, -0.75, 0.15)), (90, (1.2, -0.75, 0.15))])
    rig("cam-bronze", [
        (1, (-0.62, -1.05, -0.02), (-0.38, -0.03, -0.04)),
        (98, (0.36, -0.98, -0.0), (0.22, -0.03, -0.03)),
    ], lens=100, fstop=2.0)


def build_materials() -> None:
    """The reception slab's corner: walnut, travertine, cold towels rolled on bronze."""
    m = materials.library()
    col = kit.collection("Set")
    top = 0.76
    kit.rbox("slab", (2.4, 0.85, 0.06), (0.6, 0, top - 0.03), m["walnut"], col, bevel=0.012, segments=3)
    kit.rbox("pedestal", (0.32, 0.62, top - 0.06), (-0.2, 0, (top - 0.06) / 2), m["travertine_veined"], col, bevel=0.006)
    kit.rbox("tray", (0.4, 0.26, 0.012), (0.12, -0.02, top + 0.006), m["bronze"], col, bevel=0.003)
    for i in range(3):
        t = rolled_towel(f"towel-{i}", (0.0 + i * 0.075, 0.0, top + 0.046), 0.2, 0.034, m["terry"], col)
        t.rotation_euler = (0, math.radians(35 + 50 * i), 0)  # each roll's seam at a different angle
    vase = kit.model("vase_tall", (0.62, 0.14, top), height=0.36, col=col)
    if vase is None:
        kit.lathe("vase", [(0, 0), (0.06, 0), (0.08, 0.15), (0.03, 0.32), (0.035, 0.36), (0, 0.36)], (0.62, 0.14, top), m["stoneware"], col)
    plinth("floor", (6, 6, 0.04), top_z=0.0, mat=materials.travertine_tiles("floor-tiles"))
    studio_light("key", (-1.7, 0.7, 2.0), 70, 1.6, kelvin=3400, aim_at=(0.2, 0, top))
    studio_light("rim", (1.4, 1.6, 1.4), 55, 1.2, size_y=0.4, kelvin=6500, aim_at=(0.1, 0, top))
    sweep = studio_light("sweep", (-1.0, -0.9, 1.1), 40, 0.05, size_y=1.2, kelvin=5600, aim_at=(0.3, 0, top))
    keys(sweep, "location", [(1, (-1.4, -0.9, 1.1)), (98, (1.6, -0.9, 1.1))])
    rig("cam-materials", [
        (1, (-0.72, -0.88, 1.02), (0.05, 0.0, top + 0.03)),
        (98, (-0.48, -0.66, 1.04), (0.08, 0.0, top + 0.04)),
    ], lens=85, fstop=2.2, focus=bpy.data.objects["towel-1"])


def build_drawer() -> None:
    """An apothecary drawer slides out: “Rx · Kopi Tarik”."""
    m = materials.library()
    col = kit.collection("Set")
    labels = list(build_apothecary.LABELS)
    build_apothecary.LABELS[:] = labels[1:5] + ["Kopi Tarik"] + labels[5:]
    try:
        build_apothecary.build(origin=(0, 0, 0), rows=3, cols=3, shelves=1, m=m, name="apothecary")
    finally:
        build_apothecary.LABELS[:] = labels
    bpy.context.view_layer.update()
    front = bpy.data.objects["apothecary-drawer-1-1-front"]
    fx, fy, fz = front.matrix_world.translation
    mover = kit.empty("drawer-mover", col=col)
    for o in list(bpy.data.objects):
        if o.name.startswith("apothecary-drawer-1-1-"):
            mw = o.matrix_world.copy()
            o.parent = mover
            o.matrix_world = mw
    # The drawer box behind the front, and what is in it.
    dw, dd, dh = build_apothecary.DRAWER_W - 0.03, 0.36, build_apothecary.DRAWER_H - 0.04
    for name, size, off in (("side-l", (0.012, dd, dh), (-dw / 2, dd / 2, 0)), ("side-r", (0.012, dd, dh), (dw / 2, dd / 2, 0)),
                            ("bottom", (dw, dd, 0.012), (0, dd / 2, -dh / 2)), ("back", (dw, 0.012, dh), (0, dd, 0))):
        o = kit.rbox(f"drawer-{name}", size, (fx + off[0], fy + 0.01 + off[1], fz + off[2]), m["walnut"], col, bevel=0.002)
        o.parent = mover
    kraft = materials.flat("kraft", "#A9865B", roughness=0.85, sheen=0.2)
    for i in range(3):
        bag = kit.cushion(f"bag-{i}", (0.085, 0.07, dh + 0.05), (fx - dw / 2 + 0.055 + i * 0.1, fy + 0.09, fz + 0.035), kraft, col, radius=0.012)
        bag.parent = mover
        tag = kit.rbox(f"bag-{i}-label", (0.05, 0.002, 0.03), (fx - dw / 2 + 0.055 + i * 0.1, fy + 0.054, fz + 0.075), m["paper"], col, bevel=0)
        tag.parent = mover
    keys(mover, "location", [(18, (0, 0, 0)), (62, (0, -0.25, 0))])
    smooth(mover)
    plinth("floor", (4, 4, 0.04), top_z=0.0)
    studio_light("key", (-1.6, -1.8, 2.2), 110, 1.4, kelvin=3600, aim_at=(0, -0.3, fz))
    studio_light("rim", (1.4, 0.2, 1.8), 200, 1.0, size_y=0.4, kelvin=6800, aim_at=(0, -0.3, fz))
    sweep = studio_light("sweep", (-1.0, -1.1, fz + 0.2), 120, 0.05, size_y=1.4, kelvin=5600, aim_at=(0, -0.3, fz))
    keys(sweep, "location", [(30, (-1.2, -1.1, fz + 0.2)), (98, (1.2, -1.1, fz + 0.2))])
    focus = kit.empty("drawer-focus", (fx, fy - 0.04, fz + 0.02), col=col)
    focus.parent = mover
    rig("cam-drawer", [
        (1, (fx - 0.62, fy - 1.05, fz + 0.36), (fx + 0.02, fy - 0.1, fz)),
        (98, (fx - 0.5, fy - 0.86, fz + 0.3), (fx + 0.02, fy - 0.2, fz)),
    ], lens=70, fstop=2.4, focus=focus)


# --------------------------------------------------------------------------- set pieces


def build_consult() -> None:
    """The consult table as a set piece; on the screen behind it the Pulse line draws itself."""
    m = materials.library()
    col = kit.collection("Set")
    plinth("plinth", (0, 0, 0.16), top_z=0.0, round_r=2.3)
    kit.lathe("rug", [(0, 0), (1.45, 0), (1.45, 0.01), (0, 0.01)], (0, 0, 0), m["oat"], col, segments=96)
    kit.lathe("table-top", [(0, 0.72), (0.54, 0.72), (0.55, 0.735), (0.545, 0.755), (0, 0.755)], (0, 0, 0), m["walnut"], col, segments=96)
    kit.lathe("table-base", [(0, 0), (0.3, 0), (0.3, 0.015), (0.1, 0.06), (0.05, 0.3), (0.06, 0.66), (0.14, 0.72), (0, 0.72)], (0, 0, 0), m["walnut"], col, segments=64)
    for k in range(3):
        a = math.pi / 2 + k * 2 * math.pi / 3
        build_store.chair(f"chair-{k}", (math.cos(a) * 0.9, math.sin(a) * 0.9), m, col, rot_z=a - math.pi / 2)
    # The written diagnosis: a bound report with its chart, a pen.
    kit.rbox("report", (0.21, 0.297, 0.008), (0.12, -0.18, 0.759), m["paper"], col, bevel=0.0015, rot_z=0.18)
    kit.rbox("report-chart", (0.15, 0.06, 0.0006), (0.12, -0.24, 0.7635), m["bronze"], col, bevel=0, rot_z=0.18)
    for k in range(4):
        kit.rbox(f"report-line-{k}", (0.14, 0.004, 0.0006), (0.12 + 0.018 * k * math.sin(0.18), -0.14 + 0.022 * k, 0.7635), m["ink"], col, bevel=0, rot_z=0.18)
    kit.tube("pen", [(-0.05, -0.32, 0.762), (0.09, -0.36, 0.762)], 0.004, m["bronze_dark"], col)
    # A freestanding wall with the screen.
    kit.rbox("wall", (3.2, 0.14, 2.6), (0, 1.75, 1.3), m["limewash"], col, bevel=0.004)
    kit.rbox("screen", (1.5, 0.035, 0.86), (0, 1.66, 1.45), m["screen"], col, bevel=0.004)
    pts = build_store.pulse_roof_points(1.1, 0.42)
    line = kit.tube("screen-line", [(px, 1.64, 1.22 + pz) for px, pz in pts], 0.004,
                    materials.emitter("screen-line", 6.0, (0.9, 0.62, 0.36)), col)
    line.data.bevel_factor_mapping_end = "SPLINE"
    keys(line.data, "bevel_factor_end", [(8, 0.0), (80, 1.0)], ease="BEZIER")
    build_store.globe_pendant("pendant", (0, 0), 1.95, m, col, ceiling=3.6)
    build_store.book_stack("books", (-0.32, 0.12, 0.755), m, col, n=2, rot_z=0.4)
    c = (0, 0.3, 0.9)
    studio_light("key", (-3.2, -3.0, 4.2), 420, 3.0, kelvin=4200, aim_at=c)
    studio_light("rim", (3.0, 2.8, 2.6), 420, 2.4, size_y=0.6, kelvin=7000, aim_at=c)
    studio_light("wallwash", (0, 0.4, 3.4), 60, 1.6, size_y=0.3, kelvin=3000, aim_at=(0, 1.7, 1.6))
    rig("cam-consult", [
        (1, (2.55, -3.25, 1.62), (0.1, 0.35, 0.98)),
        (128, (1.55, -2.35, 1.42), (0.05, 0.75, 1.12)),
    ], lens=35, fstop=[(1, 3.2), (128, 4.0)])


def build_lounge() -> None:
    """The Lounge as a set piece in warm light: sofa, chairs, drum table, lantern, apothecary."""
    m = materials.library()
    col = kit.collection("Set")
    plinth("plinth", (6.2, 4.6, 0.16), top_z=0.0)
    kit.rbox("rug", (3.7, 2.9, 0.012), (0, 0.1, 0.006), m["oat"], col, bevel=0.004)
    kit.rbox("rug-field", (3.3, 2.5, 0.0125), (0, 0.1, 0.0065), m["linen"], col, bevel=0.002)
    build_store.curved_sofa("sofa", (0, -0.9), m, col)
    build_store.lounge_chair("chair-1", (-0.8, 1.1), m, col)
    build_store.lounge_chair("chair-2", (0.8, 1.1), m, col)
    top = build_store.COFFEE_TOP
    kit.lathe("drum", [(0, 0), (0.42, 0), (0.42, top - 0.01), (0.415, top), (0, top)], (0, 0.15, 0), m["travertine_veined"], col, segments=96)
    for i, (dx, dy) in enumerate(((-0.12, 0.05), (0.16, 0.24))):
        build_store.cup(f"cup-{i}", (dx, 0.15 + dy, top), m, col)
    bowl = kit.model("bowl", (0.2, -0.05, top), height=0.07, col=col)
    if bowl is None:
        kit.lathe("bowl", [(0, 0), (0.08, 0), (0.12, 0.06), (0.11, 0.065), (0, 0.02)], (0.2, -0.05, top), m["walnut"], col)
    build_store.book_stack("books", (-0.2, -0.1, top), m, col, n=2, rot_z=0.35)
    build_store.washi_lantern("lantern", (1.6, -1.2), m, col)
    plant = kit.model("plant_tall", (-2.45, -1.35, 0), height=1.45, col=col)
    if plant is None:
        kit.lathe("plant-pot", [(0, 0), (0.2, 0), (0.24, 0.45), (0, 0.45)], (-2.45, -1.35, 0), m["stoneware"], col)
    kit.rbox("wall", (6.2, 0.14, 2.7), (0, -2.05, 1.35), m["limewash"], col, bevel=0.004)
    build_apothecary.build(origin=(-1.55, -1.98, 0), rotation_z=math.pi, rows=5, cols=4, m=m)
    kit.rbox("art", (1.3, 0.04, 0.9), (1.75, -1.96, 1.65), m["linen"], col, bevel=0.004)
    pts = build_store.pulse_roof_points(1.05, 0.45)
    kit.tube("art-line", [(1.75 - px, -1.93, 1.4 + pz) for px, pz in pts], 0.006, m["bronze"], col)
    # Golden light raking in from the right, the lantern, a wall wash; cool rim behind.
    sun = kit.area("golden", (5.5, 2.5, 1.6), 700, 1.2, kelvin=3300, aim=(-5.5, -3.0, -1.1), col=kit.collection("Studio"))
    sun.data.spread = math.radians(25)
    studio_light("key", (-3.0, 3.5, 3.6), 210, 3.0, kelvin=3800, aim_at=(0, -0.5, 0.6))
    studio_light("rim", (-3.6, -3.6, 2.6), 260, 2.4, size_y=0.6, kelvin=6800, aim_at=(0, -0.8, 0.8))
    kit.spot("art-light", (1.75, -1.0, 2.9), 14, kelvin=2800, angle=34, aim=(0, -0.7, -1))
    kit.spot("table-light", (0.0, 0.4, 2.9), 16, kelvin=2900, angle=36, aim=(0, -0.2, -1))
    rig("cam-lounge", [
        (1, (2.8, 3.4, 1.25), (-0.3, -0.75, 0.62)),
        (128, (1.25, 3.55, 1.2), (-0.55, -0.85, 0.66)),
    ], lens=35, fstop=4.0)


# --------------------------------------------------------------------------- objects


def build_card() -> None:
    """The member card: dark brushed metal, raised logo and number, turning under a strip light."""
    path = ROOT / "brand/3d/member-card.glb"
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    root = kit.empty("card", col=kit.collection("Set"))
    body_mat = materials.brushed_bronze("card-metal", "#33302D", 0.3)
    raise_mat = materials.brushed_bronze("card-raised", "#D8CBB3", 0.2)
    for o in new:
        if o.parent is None:
            o.parent = root
        if o.type == "MESH":
            if o.name.startswith("body"):
                o.hide_render = o.hide_viewport = True
            else:
                o.data.materials.clear()
                o.data.materials.append(raise_mat)
    # ID-1 proportions with real rounded corners (×10 scale, as in brand/3d).
    body = slab("card-body", 0.856, 0.54, 0.008, 0.0318, body_mat, kit.collection("Set"), bevel=0.0012)
    body.parent = root
    keys(root, "rotation_euler", [(1, (math.radians(4), 0, math.radians(78))), (60, (math.radians(10), 0, math.radians(-18))),
                                  (158, (math.radians(6), 0, math.radians(-30)))])
    smooth(root)
    studio_light("key", (-1.6, -2.2, 2.4), 260, 1.8, kelvin=5200, aim_at=(0, 0, 0))
    studio_light("rim", (1.8, 1.2, 0.8), 260, 1.2, size_y=0.3, kelvin=7200, aim_at=(0, 0, 0))
    studio_light("bounce", (-2.3, -1.3, -0.15), 70, 1.6, size_y=0.9, kelvin=5600, aim_at=(0, 0, 0))
    sweep = studio_light("sweep", (-2.0, -1.4, 0.2), 320, 0.06, size_y=2.4, kelvin=6000, aim_at=(0, 0, 0))
    keys(sweep, "location", [(40, (-2.2, -1.6, 0.2)), (130, (2.2, -1.6, 0.2))])
    rig("cam-card", [
        (1, (0.25, -3.2, 0.32), (0, 0, 0)),
        (158, (0.05, -2.75, 0.22), (0, 0, 0)),
    ], lens=85, fstop=4.0)


def screen_material(paths: list[Path], cuts: list[tuple[int, int]]) -> bpy.types.Material:
    """The phone's display: the app screens in sequence (cross-fades at `cuts`), under glass."""
    mat = bpy.data.materials.new("phone-screen")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    uv = nt.nodes.new("ShaderNodeTexCoord")
    texs = []
    for p in paths:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(str(p), check_existing=True)
        t.interpolation = "Cubic"
        nt.links.new(uv.outputs["UV"], t.inputs["Vector"])
        texs.append(t)
    color = texs[0].outputs["Color"]
    for t, (a, b) in zip(texs[1:], cuts):
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        nt.links.new(color, mix.inputs[6])
        nt.links.new(t.outputs["Color"], mix.inputs[7])
        fac = mix.inputs["Factor"]
        for f, v in ((a, 0.0), (b, 1.0)):
            fac.default_value = v
            fac.keyframe_insert("default_value", frame=f)
        color = mix.outputs[2]
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (0.0, 0.0, 0.0, 1)
    b.inputs["Roughness"].default_value = 0.4
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Coat Roughness"].default_value = 0.03
    b.inputs["Emission Strength"].default_value = 1.0
    nt.links.new(color, b.inputs["Emission Color"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return mat


def build_phone() -> None:
    """A phone turns from its back to the booking flow: home, consult, value, time, booked."""
    col = kit.collection("Set")
    w, h, t, r = 0.0715, 0.1475, 0.008, 0.0105
    frame = materials.brushed_bronze("phone-frame", "#8A7A66", 0.24)
    back = materials.flat("phone-back", "#22201D", roughness=0.55, coat=0.9)
    black = materials.flat("phone-black", "#050505", roughness=0.05, coat=1.0)
    lens = materials.flat("phone-lens", "#0A0B0C", roughness=0.02, coat=1.0)
    root = kit.empty("phone", col=col)
    parts = [
        slab("phone-band", w, h, t * 0.7, r, frame, col, bevel=0.0008),
        slab("phone-front", w - 0.0006, h - 0.0006, t * 0.16, r - 0.0003, black, col, bevel=0.0004),
        slab("phone-rear", w - 0.0006, h - 0.0006, t * 0.16, r - 0.0003, back, col, bevel=0.0004),
    ]
    parts[1].location.y = -t * 0.42
    parts[2].location.y = t * 0.42
    names = ["s2-home", "s3-1-type", "s3-2-property", "s3-3-ready", "s3-4-success"]
    paths = [SCREENS / f"en-light-{n}.png" for n in names]
    cuts = [(66, 74), (86, 94), (106, 114), (126, 134)]
    disp = slab("phone-display", w - 0.0042, h - 0.0042, 0.0004, r - 0.0021, screen_material(paths, cuts), col, uv=True)
    disp.location.y = -t * 0.51
    parts.append(disp)
    bump = slab("phone-bump", 0.024, 0.024, 0.0016, 0.006, back, col, bevel=0.0005)
    bump.location = (0, t * 0.52 + 0.0008, h / 2 - 0.02)
    parts.append(bump)
    for i, z in enumerate((0.0058, -0.0058)):
        ring = kit.lathe(f"phone-lens-ring-{i}", [(0, 0), (0.0042, 0), (0.0042, 0.0012), (0.0034, 0.0014), (0, 0.0014)], (0, 0, 0), frame, col, segments=40)
        ring.rotation_euler = (-math.pi / 2, 0, 0)
        ring.location = (0, t * 0.52 + 0.0016, h / 2 - 0.02 + z)
        glass = kit.lathe(f"phone-lens-{i}", [(0, 0), (0.0032, 0), (0.0031, 0.0016), (0, 0.0018)], (0, 0, 0), lens, col, segments=40)
        glass.rotation_euler = (-math.pi / 2, 0, 0)
        glass.location = (0, t * 0.52 + 0.0016, h / 2 - 0.02 + z)
        parts += [ring, glass]
    for p in parts:
        p.parent = root
    keys(root, "rotation_euler", [(1, (math.radians(-6), 0, math.radians(200))), (52, (math.radians(-4), 0, math.radians(-14))),
                                  (143, (math.radians(-3), 0, math.radians(-6)))])
    smooth(root)
    studio_light("key", (-0.5, -0.7, 0.55), 22, 0.45, kelvin=5400, aim_at=(0, 0, 0))
    studio_light("rim-r", (0.45, 0.35, 0.12), 26, 0.3, size_y=0.08, kelvin=7200, aim_at=(0, 0, 0))
    studio_light("rim-l", (-0.45, 0.35, -0.05), 20, 0.3, size_y=0.08, kelvin=7200, aim_at=(0, 0, 0))
    sweep = studio_light("sweep", (-0.5, -0.45, 0.0), 30, 0.01, size_y=0.4, kelvin=6000, aim_at=(0, 0, 0))
    keys(sweep, "location", [(20, (-0.55, -0.45, 0.0)), (70, (0.55, -0.45, 0.0))])
    rig("cam-phone", [
        (1, (0.08, -0.98, 0.06), (0, 0, 0.0)),
        (143, (0.03, -0.84, 0.04), (0, 0, 0.0)),
    ], lens=85, fstop=4.0)


# --------------------------------------------------------------------------- the real place


def build_dusk() -> None:
    """The shophouse at dusk, the street in front: a slow push towards the glowing shopfront."""
    cfg = json.loads((ROOT / "blender/store.config.json").read_text())
    W = cfg["width"]
    build_store.build(cfg)
    look.setup("dusk")
    look.set_cut(False)
    scene = bpy.context.scene
    target = Vector((W * 0.46, 0.0, 2.3))
    data = bpy.data.cameras.new("cam-dusk")
    cam = kit.link(bpy.data.objects.new("cam-dusk", data), kit.collection("Cameras"))
    data.lens = 26
    data.sensor_width = 36
    scene.camera = cam
    cam.rotation_euler = (math.pi / 2, 0, 0)
    for f, eye in ((1, Vector((W * 0.42, -12.8, 1.5))), (158, Vector((W * 0.44, -8.6, 1.62)))):
        d = target - eye
        flat = Vector((d.x, d.y, 0))
        cam.location = eye
        cam.rotation_euler = (math.pi / 2, 0, math.atan2(-flat.x, flat.y))
        data.shift_y = (d.z / flat.length) * data.lens / data.sensor_width
        cam.keyframe_insert("location", frame=f)
        cam.keyframe_insert("rotation_euler", frame=f)
        data.keyframe_insert("shift_y", frame=f)
    smooth(cam, data)
    data.dof.use_dof = True
    data.dof.aperture_fstop = 8
    data.dof.focus_distance = 10.0


SHOTS: dict[str, Shot] = {
    "model": Shot(398, 3, 28, build_model),
    "bronze": Shot(98, 3, 40, build_bronze),
    "materials": Shot(98, 3, 28, build_materials),
    "drawer": Shot(98, 3, 28, build_drawer),
    "consult": Shot(128, 3, 32, build_consult, exposure=-0.4),
    "phone": Shot(143, 3, 28, build_phone),
    "card": Shot(158, 3, 28, build_card),
    "lounge": Shot(128, 3, 32, build_lounge, exposure=-0.85),
    "dusk": Shot(158, 3, 28, build_dusk, exposure=0.45),
}


# --------------------------------------------------------------------------- build, render, encode


def build(name: str) -> Path:
    shot = SHOTS[name]
    reset_scene()
    studio(shot.samples, shot.exposure)
    shot.build()
    scene = bpy.context.scene
    if name != "dusk":
        studio(shot.samples, shot.exposure)  # the shot may have pulled in the store's own look
    scene.frame_start, scene.frame_end = 1, shot.frames
    if name == "model":
        export_callouts(shot)
    path = OUT / f"{name}.blend"
    save_blend(path)
    print(f"built {name}: {shot.frames} frames → {path}")
    return path


def frame_list(shot: Shot) -> list[int]:
    fl = list(range(1, shot.frames + 1, shot.step))
    if fl[-1] != shot.frames:
        fl.append(shot.frames)
    return fl


def frames_dir(name: str) -> Path:
    return OUT / f"{name}-frames"


def done_frames(name: str) -> int:
    d = frames_dir(name)
    return len(list(d.glob("*.png"))) if d.exists() else 0


def ffmpeg_bin() -> str | None:
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError, RuntimeError):
        return None


def encode(name: str) -> Path | None:
    """The rendered frames, interpolated back to 30 fps, as a high-quality plate for the film."""
    shot = SHOTS[name]
    ffmpeg = ffmpeg_bin()
    if not ffmpeg:
        print("no ffmpeg with minterpolate: pip install imageio-ffmpeg")
        return None
    PLATES.mkdir(parents=True, exist_ok=True)
    out = PLATES / f"{name}.mp4"
    vf = "null" if shot.step == 1 else f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"
    vf += f",scale={SIZE[0]}:{SIZE[1]}:flags=lanczos"  # frames may be rendered below full size (--percent)
    subprocess.run([ffmpeg, "-v", "error", "-y", "-framerate", str(FPS / shot.step), "-i", str(frames_dir(name) / "%05d.png"),
                    "-vf", vf, "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", str(out)], check=True)
    print(f"plate {name} → {out}")
    return out


def render(names: list[str], budget_min: float, percent: int = 100) -> None:
    """Renders missing frames shot by shot until the time budget is nearly spent."""
    start = time.time()
    per_frame = 0.0
    for name in names:
        shot = SHOTS[name]
        todo = [(i, f) for i, f in enumerate(frame_list(shot)) if not (frames_dir(name) / f"{i:05d}.png").exists()]
        if not todo:
            if not (PLATES / f"{name}.mp4").exists():
                encode(name)
            continue
        blend = OUT / f"{name}.blend"
        if not blend.exists():
            build(name)
        bpy.ops.wm.open_mainfile(filepath=str(blend))
        scene = bpy.context.scene
        scene.render.resolution_percentage = percent
        scene.cycles.samples = shot.samples  # the table wins over what the .blend was built with
        frames_dir(name).mkdir(parents=True, exist_ok=True)
        for i, f in todo:
            elapsed = time.time() - start
            if per_frame and elapsed + per_frame * 1.3 > budget_min * 60:
                print(f"paused at {name} {i}/{len(frame_list(shot))} ({elapsed / 60:.1f} min)", flush=True)
                return
            t0 = time.time()
            scene.frame_set(f)
            scene.render.filepath = str(frames_dir(name) / f"{i:05d}.png")
            bpy.ops.render.render(write_still=True)
            took = time.time() - t0
            per_frame = took if not per_frame else 0.7 * per_frame + 0.3 * took
            print(f"frame {name} {i + 1}/{len(frame_list(shot))} {took:.0f}s", flush=True)
        encode(name)
    print("all requested shots rendered", flush=True)


def preview(name: str, ats: list[float], size: tuple[int, int], samples: int, out_dir: Path) -> None:
    blend = OUT / f"{name}.blend"
    if not blend.exists():
        build(name)
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.cycles.samples = samples
    out_dir.mkdir(parents=True, exist_ok=True)
    for a in ats:
        f = max(1, min(SHOTS[name].frames, round(1 + a * (SHOTS[name].frames - 1))))
        scene.frame_set(f)
        scene.render.filepath = str(out_dir / f"{name}-{f:03d}.png")
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"preview {name} frame {f} ({time.time() - t0:.0f}s) → {scene.render.filepath}", flush=True)


def status() -> None:
    for name, shot in SHOTS.items():
        n = len(frame_list(shot))
        plate = "plate ✓" if (PLATES / f"{name}.mp4").exists() else ""
        print(f"{name:10} {done_frames(name):4}/{n:<4} {plate}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build and render the hero film's shots.")
    parser.add_argument("--build", nargs="*", help="shots to build (or 'all')")
    parser.add_argument("--render", nargs="*", help="shots to render (or 'all'), resumable")
    parser.add_argument("--budget", type=float, default=24.0, help="minutes for this render session")
    parser.add_argument("--percent", type=int, default=67, help="render size, % of 1920×1080 (the plate is scaled to full size)")
    parser.add_argument("--preview", help="render a few low-res stills of one shot")
    parser.add_argument("--at", default="0,0.5,1")
    parser.add_argument("--size", default="640x360")
    parser.add_argument("--samples", type=int, default=12)
    parser.add_argument("--out", type=Path, default=OUT / "preview")
    parser.add_argument("--encode", nargs="*", help="re-encode finished shots")
    parser.add_argument("--status", action="store_true")
    args = parser.parse_args(script_args())
    pick = lambda xs: list(SHOTS) if xs == ["all"] else xs  # noqa: E731
    if args.build:
        for name in pick(args.build):
            build(name)
    if args.preview:
        w, h = (int(v) for v in args.size.split("x"))
        preview(args.preview, [float(a) for a in args.at.split(",")], (w, h), args.samples, args.out)
    if args.render:
        render(pick(args.render), args.budget, args.percent)
    if args.encode:
        for name in pick(args.encode):
            encode(name)
    if args.status:
        status()


if __name__ == "__main__":
    main()
