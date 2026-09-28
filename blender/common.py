"""
Shared helpers for the Dr Prop Blender scripts (brief §9.4, pipeline B).

Works both inside Blender (blender -b -P script.py -- args) and with the `bpy`
Python module (python script.py args). Blender 4.2 LTS or newer.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bmesh
import bpy

ROOT = Path(__file__).resolve().parent.parent

# Brand palette (brief §5.2) and store materials (§6.3), linear-ish sRGB hex.
PALETTE = {
    "bone": "#F4F1EA",
    "ink": "#1C1B19",
    "stone": "#8A857C",
    "travertine": "#D9CFBF",
    "bronze": "#8C6A43",
    "limewash": "#E9E3D7",
    "walnut": "#46321F",
    "linen": "#DCD3C3",
    "brass": "#B08D57",
    "paper": "#F4F1EA",
}

# 2700 K, as RGB (brief §6.2: warm light).
WARM_2700K = (1.0, 0.655, 0.341)


def script_args() -> list[str]:
    """Arguments after `--` when run by Blender, or after the script name with bpy."""
    if "--" in sys.argv:
        return sys.argv[sys.argv.index("--") + 1 :]
    return sys.argv[1:]


def hex_rgba(hex_color: str) -> tuple[float, float, float, float]:
    """sRGB hex → linear RGBA, which is what Principled BSDF expects."""
    h = hex_color.lstrip("#")
    srgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (lin[0], lin[1], lin[2], 1.0)


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _set(bsdf, name: str, value) -> None:
    if name in bsdf.inputs:
        bsdf.inputs[name].default_value = value


def material(
    name: str,
    color: str,
    *,
    roughness: float = 0.8,
    metallic: float = 0.0,
    transmission: float = 0.0,
    emission: float = 0.0,
    sheen: float = 0.0,
) -> bpy.types.Material:
    """One Principled BSDF material, reused by name."""
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    rgba = hex_rgba(color)
    mat.diffuse_color = rgba
    _set(bsdf, "Base Color", rgba)
    _set(bsdf, "Roughness", roughness)
    _set(bsdf, "Metallic", metallic)
    _set(bsdf, "Transmission Weight", transmission)
    _set(bsdf, "Sheen Weight", sheen)
    if emission:
        _set(bsdf, "Emission Color", rgba)
        _set(bsdf, "Emission Strength", emission)
    return mat


def store_materials() -> dict[str, bpy.types.Material]:
    return {
        "travertine": material("travertine", PALETTE["travertine"], roughness=0.85),
        "limewash": material("limewash", PALETTE["limewash"], roughness=0.95),
        "walnut": material("walnut", PALETTE["walnut"], roughness=0.6),
        "linen": material("linen", PALETTE["linen"], roughness=1.0, sheen=0.4),
        "bronze": material("bronze", PALETTE["bronze"], roughness=0.38, metallic=1.0),
        "brass": material("brass", PALETTE["brass"], roughness=0.3, metallic=1.0),
        "paper": material("paper", PALETTE["paper"], roughness=0.9),
        "glass": material("glass-clear", "#F4F7F6", roughness=0.02, transmission=1.0),
        "frosted": material("glass-frosted", "#F1F1EC", roughness=0.35, transmission=1.0),
        "screen": material("screen", "#141412", roughness=0.2, emission=0.3),
        "ink": material("ink", PALETTE["ink"], roughness=0.5),
    }


def collection(name: str) -> bpy.types.Collection:
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    return col


def _link(obj: bpy.types.Object, col: bpy.types.Collection | None) -> bpy.types.Object:
    (col or bpy.context.scene.collection).objects.link(obj)
    return obj


def box(
    name: str,
    size: tuple[float, float, float],
    center: tuple[float, float, float],
    mat: bpy.types.Material,
    col: bpy.types.Collection | None = None,
) -> bpy.types.Object:
    """Axis-aligned box. size = (x, y, z) metres; center = world position (Z up)."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = center
    return _link(obj, col)


def cylinder(
    name: str,
    radius: float,
    height: float,
    center: tuple[float, float, float],
    mat: bpy.types.Material,
    col: bpy.types.Collection | None = None,
    segments: int = 48,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=segments, radius1=radius, radius2=radius, depth=height
    )
    bm.to_mesh(mesh)
    bm.free()
    for poly in mesh.polygons:
        poly.use_smooth = True
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    obj.location = center
    return _link(obj, col)


def brand_font() -> bpy.types.VectorFont | None:
    """Instrument Serif (OFL) from the repo's node_modules, if installed."""
    path = ROOT / "node_modules/@expo-google-fonts/instrument-serif/400Regular/InstrumentSerif_400Regular.ttf"
    if path.exists():
        return bpy.data.fonts.load(str(path), check_existing=True)
    return None


def text(
    name: str,
    body: str,
    size: float,
    location: tuple[float, float, float],
    mat: bpy.types.Material,
    col: bpy.types.Collection | None = None,
    *,
    extrude: float = 0.0,
    rotation: tuple[float, float, float] = (math.pi / 2, 0.0, 0.0),
    align: str = "LEFT",
) -> bpy.types.Object:
    """Text as a mesh (converted, so it exports to glTF). Upright facing −Y by default."""
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.size = size
    curve.extrude = extrude
    curve.align_x = align
    # Low curve resolution: labels stay crisp at store scale and the glb stays small.
    curve.resolution_u = 2
    font = brand_font()
    if font:
        curve.font = font
    obj = bpy.data.objects.new(name, curve)
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    _link(obj, col)
    # Convert to mesh via the evaluated depsgraph (no operator context needed).
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))
    mesh_obj = bpy.data.objects.new(name, mesh)
    mesh_obj.matrix_world = obj.matrix_world
    _link(mesh_obj, col)
    bpy.data.objects.remove(obj)
    curve_data = bpy.data.curves.get(name)
    if curve_data and curve_data.users == 0:
        bpy.data.curves.remove(curve_data)
    return mesh_obj


def point_light(
    name: str,
    location: tuple[float, float, float],
    watts: float,
    col: bpy.types.Collection | None = None,
    radius: float = 0.2,
) -> bpy.types.Object:
    light = bpy.data.lights.new(name, "POINT")
    light.energy = watts
    light.color = WARM_2700K
    light.shadow_soft_size = radius
    obj = bpy.data.objects.new(name, light)
    obj.location = location
    return _link(obj, col)


def export_glb(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        export_apply=True,
        export_lights=True,
        export_cameras=True,
        export_yup=True,
    )


def save_blend(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(path))
