"""
kit.py — geometry and light helpers for the detailed store (build_store.py).

  rbox        box with a small bevel and hardened normals (joinery, stone)
  cushion     soft upholstered block (bevel + subdivision)
  lathe       turned solid from a (radius, z) profile (vases, lamps, cups, table bases)
  prism       polygon in the XZ plane extruded along Y (arches, frames, cutters)
  sector      curved block, a ring sector (curved sofa)
  fluted      fluted panel, one flute arrayed (walnut wall, booth)
  wall        wall slab in world coordinates, split at the section cut
  cut         boolean difference, baked into the mesh
  tube        polyline tube (cords, rails)
  area/spot/point   lights; colour by Kelvin
  model       a CC0 glTF prop from blender/assets/, scaled to a height

Everything is in metres, Z up. The section cut (CUT) splits tall elements into
a lower part and an "Above cut" part, so one scene serves both the eye-level
renders and the cutaway plan and axonometric (hide "Above cut", show
"Section caps").
"""

from __future__ import annotations

import math
import bmesh
import bpy
from mathutils import Vector

from materials import ASSETS, blackbody

CUT = 2.4  # m, section height of the cutaway views


def collection(name: str, parent: bpy.types.Collection | None = None) -> bpy.types.Collection:
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    parent = parent or bpy.context.scene.collection
    if col.name not in parent.children and col.name not in bpy.context.scene.collection.children:
        parent.children.link(col)
    return col


def link(obj: bpy.types.Object, col: bpy.types.Collection | None) -> bpy.types.Object:
    (col or bpy.context.scene.collection).objects.link(obj)
    return obj


def _obj(name: str, bm: bmesh.types.BMesh, mat, col, *, smooth: bool = False, sharp_angle: float | None = 30) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    if smooth:
        for p in mesh.polygons:
            p.use_smooth = True
        if sharp_angle is not None:
            mesh.set_sharp_from_angle(angle=math.radians(sharp_angle))
    if mat is not None:
        for m in (mat if isinstance(mat, (list, tuple)) else [mat]):
            mesh.materials.append(m)
    obj = bpy.data.objects.new(name, mesh)
    return link(obj, col)


def empty(name: str, location=(0, 0, 0), rot_z: float = 0.0, col=None) -> bpy.types.Object:
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.2
    e.location = location
    e.rotation_euler = (0, 0, rot_z)
    return link(e, col)


def group(name: str, parts: list[bpy.types.Object], location=(0, 0, 0), rot_z: float = 0.0, col=None) -> bpy.types.Object:
    """Parents `parts` (built around the origin) to an empty placed at `location`."""
    root = empty(name, location, rot_z, col)
    for p in parts:
        p.parent = root
    return root


# --------------------------------------------------------------------------- solids


def rbox(name, size, center=(0, 0, 0), mat=None, col=None, *, bevel: float = 0.004, segments: int = 2,
         rot_z: float = 0.0) -> bpy.types.Object:
    """A box with eased edges: nothing in good joinery or stonework has a razor edge."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    obj = _obj(name, bm, mat, col, smooth=bevel > 0)
    obj.location = center
    obj.rotation_euler = (0, 0, rot_z)
    if bevel > 0:
        m = obj.modifiers.new("bevel", "BEVEL")
        m.width = min(bevel, min(size) * 0.45)
        m.segments = segments
        m.limit_method = "ANGLE"
        m.harden_normals = True
    return obj


def cushion(name, size, center=(0, 0, 0), mat=None, col=None, *, radius: float = 0.05, rot_z: float = 0.0,
            tilt: float = 0.0) -> bpy.types.Object:
    """An upholstered block: generous radius, subdivided so it reads soft and filled."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    obj = _obj(name, bm, mat, col, smooth=True, sharp_angle=None)
    obj.location = center
    obj.rotation_euler = (tilt, 0, rot_z)
    b = obj.modifiers.new("bevel", "BEVEL")
    b.width = min(radius, min(size) * 0.48)
    b.segments = 4
    s = obj.modifiers.new("soft", "SUBSURF")
    s.levels = s.render_levels = 1
    return obj


def lathe(name, profile, center=(0, 0, 0), mat=None, col=None, *, segments: int = 48,
          smooth: bool = True) -> bpy.types.Object:
    """
    A turned solid. `profile` is [(radius, z), …] from bottom to top; start and
    end at radius 0 for a closed solid. Sharp profile corners stay sharp.
    """
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r <= 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
            continue
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z))
                      for a in (2 * math.pi * i / segments for i in range(segments))])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for i in range(segments):
                bm.faces.new((a[0], b[i], b[(i + 1) % segments]))
        elif len(b) == 1:
            for i in range(segments):
                bm.faces.new((a[i], b[0], a[(i + 1) % segments]))
        else:
            for i in range(segments):
                bm.faces.new((a[i], a[(i + 1) % segments], b[(i + 1) % segments], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = _obj(name, bm, mat, col, smooth=smooth, sharp_angle=40)
    obj.location = center
    return obj


def prism(name, pts, depth, center=(0, 0, 0), mat=None, col=None, *, rot_z: float = 0.0,
          bevel: float = 0.0) -> bpy.types.Object:
    """Polygon `pts` [(x, z), …] in the XZ plane, extruded `depth` along Y (centred)."""
    bm = bmesh.new()
    front = [bm.verts.new((x, -depth / 2, z)) for x, z in pts]
    face = bm.faces.new(front)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, depth, 0), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = _obj(name, bm, mat, col, smooth=bevel > 0)
    obj.location = center
    obj.rotation_euler = (0, 0, rot_z)
    if bevel > 0:
        m = obj.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = 2
        m.limit_method = "ANGLE"
        m.harden_normals = True
    return obj


def arch_outline(width: float, spring: float, *, bottom: float = 0.0, segments: int = 24) -> list[tuple[float, float]]:
    """An opening with a semicircular head: straight jambs to `spring`, then the arc."""
    r = width / 2
    pts = [(-r, bottom), (-r, spring)]
    pts += [(-r * math.cos(math.pi * i / segments), spring + r * math.sin(math.pi * i / segments)) for i in range(1, segments)]
    pts += [(r, spring), (r, bottom)]
    return pts


def sector(name, r_in, r_out, a0, a1, z0, z1, center=(0, 0, 0), mat=None, col=None, *, segments: int = 24,
           soft: float = 0.0) -> bpy.types.Object:
    """A ring sector between angles a0..a1 (radians), heights z0..z1, around `center`."""
    bm = bmesh.new()
    rows = []
    for i in range(segments + 1):
        a = a0 + (a1 - a0) * i / segments
        c, s = math.cos(a), math.sin(a)
        rows.append([bm.verts.new((r * c, r * s, z)) for r, z in ((r_in, z0), (r_out, z0), (r_out, z1), (r_in, z1))])
    for a, b in zip(rows, rows[1:]):
        for k in range(4):
            bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]))
    bm.faces.new(list(reversed(rows[0])))
    bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = _obj(name, bm, mat, col, smooth=True, sharp_angle=None if soft else 30)
    obj.location = center
    if soft:
        b = obj.modifiers.new("bevel", "BEVEL")
        b.width = soft
        b.segments = 4
        b.limit_method = "ANGLE"
        s = obj.modifiers.new("soft", "SUBSURF")
        s.levels = s.render_levels = 1
    return obj


def fluted(name, width, height, center=(0, 0, 0), mat=None, col=None, *, flute: float = 0.04,
           relief: float = 0.014, rot_z: float = 0.0) -> bpy.types.Object:
    """Vertical half-round flutes across `width`, facing −Y before `rot_z`; the back is at y = 0."""
    n = max(1, round(width / flute))
    flute = width / n
    bm = bmesh.new()
    seg = 10
    pts = [(-flute / 2 + flute * (1 - math.cos(math.pi * i / seg)) / 2, -relief * math.sin(math.pi * i / seg)) for i in range(seg + 1)]
    bottom = [bm.verts.new((x, y, 0)) for x, y in pts]
    top = [bm.verts.new((x, y, height)) for x, y in pts]
    for i in range(seg):
        bm.faces.new((bottom[i], bottom[i + 1], top[i + 1], top[i]))
    bm.faces.new(list(reversed(top)))
    bm.faces.new(bottom)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    obj = _obj(name, bm, mat, col, smooth=True, sharp_angle=50)
    arr = obj.modifiers.new("flutes", "ARRAY")
    arr.count = n
    arr.use_relative_offset = False
    arr.use_constant_offset = True
    arr.constant_offset_displace = (flute, 0, 0)
    obj.location = (center[0] - width / 2 + flute / 2, center[1], center[2])
    if rot_z:
        # Rotate about the panel centre, not the first flute.
        pivot = empty(f"{name}-pivot", center, rot_z, col)
        obj.location = (-width / 2 + flute / 2, 0, 0)
        obj.parent = pivot
    return obj


def tube(name, points, radius, mat=None, col=None, *, bevel_res: int = 4) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = bevel_res
    curve.use_fill_caps = True
    sp = curve.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for i, p in enumerate(points):
        sp.points[i].co = (*p, 1)
    if mat:
        curve.materials.append(mat)
    return link(bpy.data.objects.new(name, curve), col)


# --------------------------------------------------------------------------- walls and cuts


def _world_box(name, x0, y0, z0, x1, y1, z1, mat, col) -> bpy.types.Object:
    """Mesh in world coordinates (object at the origin), so textures run on across split parts."""
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
                                   (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))]
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        bm.faces.new([v[i] for i in f])
    return _obj(name, bm, mat, col)


def wall(name, size, center, mat, col, *, caps: bool = True) -> list[bpy.types.Object]:
    """
    A slab (walls, piers, glass) split at the section cut: the part above CUT
    goes to "Above cut", and an ink cap marks the cut face in "Section caps".
    """
    sx, sy, sz = size
    cx, cy, cz = center
    x0, x1, y0, y1, z0, z1 = cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2
    if z1 <= CUT + 1e-4 or z0 >= CUT - 1e-4:
        target = above_cut() if z0 >= CUT - 1e-4 else col
        return [_world_box(name, x0, y0, z0, x1, y1, z1, mat, target)]
    lower = _world_box(name, x0, y0, z0, x1, y1, CUT, mat, col)
    upper = _world_box(f"{name}-upper", x0, y0, CUT, x1, y1, z1, mat, above_cut())
    parts = [lower, upper]
    if caps:
        cap = _world_box(f"{name}-cap", x0, y0, CUT, x1, y1, CUT + 0.006, poche(), section_caps())
        parts.append(cap)
    return parts


def above_cut() -> bpy.types.Collection:
    return collection("Above cut")


def section_caps() -> bpy.types.Collection:
    col = collection("Section caps")
    return col


def poche() -> bpy.types.Material:
    from materials import flat

    return flat("section-poche", "#1C1B19", roughness=0.9)


def cut(target: bpy.types.Object, cutters: list[bpy.types.Object]) -> bpy.types.Object:
    """Boolean difference, baked into `target`'s mesh; the cutters are removed."""
    for c in cutters:
        m = target.modifiers.new(f"cut-{c.name}", "BOOLEAN")
        m.operation = "DIFFERENCE"
        m.solver = "EXACT"
        m.object = c
    deps = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(target.evaluated_get(deps))
    old = target.data
    target.modifiers.clear()
    target.data = mesh
    bpy.data.meshes.remove(old)
    for c in cutters:
        bpy.data.objects.remove(c)
    return target


# --------------------------------------------------------------------------- lights


def _light(name, kind, location, watts, kelvin, col) -> bpy.types.Object:
    data = bpy.data.lights.new(name, kind)
    data.energy = watts
    data.color = blackbody(kelvin)
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    obj.visible_camera = False  # light, not a glowing card; fixtures carry their own emitters
    return link(obj, col or collection("Lights"))


def point(name, location, watts, *, kelvin: float = 2700, radius: float = 0.05, col=None) -> bpy.types.Object:
    obj = _light(name, "POINT", location, watts, kelvin, col)
    obj.data.shadow_soft_size = radius
    return obj


def spot(name, location, watts, *, kelvin: float = 3000, angle: float = 40, blend: float = 0.6,
         radius: float = 0.03, aim=(0, 0, -1), col=None) -> bpy.types.Object:
    """A downlight by default; `aim` is a world direction."""
    obj = _light(name, "SPOT", location, watts, kelvin, col)
    obj.data.spot_size = math.radians(angle)
    obj.data.spot_blend = blend
    obj.data.shadow_soft_size = radius
    obj.rotation_euler = Vector(aim).to_track_quat("-Z", "Y").to_euler()
    return obj


def area(name, location, watts, size, *, size_y: float | None = None, kelvin: float = 2700, aim=(0, 0, -1),
         spread: float = 180, col=None, portal: bool = False) -> bpy.types.Object:
    obj = _light(name, "AREA", location, watts, kelvin, col)
    d = obj.data
    if size_y is not None:
        d.shape = "RECTANGLE"
        d.size, d.size_y = size, size_y
    else:
        d.size = size
    d.spread = math.radians(spread)
    if portal:
        d.cycles.is_portal = True
    obj.rotation_euler = Vector(aim).to_track_quat("-Z", "Y").to_euler()
    return obj


# --------------------------------------------------------------------------- CC0 props


def model(key: str, location, *, rot_z: float = 0.0, height: float | None = None, col=None) -> bpy.types.Object | None:
    """
    Imports blender/assets/models/<key>/model.gltf (fetch_assets.py) under one
    empty, standing on `location`, optionally scaled to `height` metres.
    Returns None when the asset is not cached, so callers can skip or substitute.
    """
    path = ASSETS / "models" / key / "model.gltf"
    if not path.exists():
        return None
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    root = empty(f"prop-{key}", (0, 0, 0), 0.0, col)
    root["drprop_asset"] = key
    for o in new:
        for c in list(o.users_collection):
            c.objects.unlink(o)
        link(o, col or collection("Props"))
        if o.parent is None:
            o.parent = root
    # Measure, then stand the prop on the floor point and scale it.
    bpy.context.view_layer.update()
    zs, xs, ys = [], [], []
    for o in new:
        if o.type == "MESH":
            for corner in o.bound_box:
                w = o.matrix_world @ Vector(corner)
                xs.append(w.x)
                ys.append(w.y)
                zs.append(w.z)
    if zs:
        s = (height / (max(zs) - min(zs))) if height else 1.0
        root.scale = (s, s, s)
        root.location = (location[0] - (min(xs) + max(xs)) / 2 * s, location[1] - (min(ys) + max(ys)) / 2 * s,
                         location[2] - min(zs) * s)
        if rot_z:
            # Rotate about the prop's own centre.
            pivot = empty(f"prop-{key}-pivot", location, rot_z, col)
            root.location = (root.location[0] - location[0], root.location[1] - location[1], root.location[2] - location[2])
            root.parent = pivot
            return pivot
    return root


def asset_exists(key: str) -> bool:
    return (ASSETS / "models" / key / "model.gltf").exists()

