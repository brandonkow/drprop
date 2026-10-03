"""
Shared helpers for the Dr Prop Blender scripts (brief §9.4, pipeline B).

Works both inside Blender (blender -b -P script.py -- args) and with the `bpy`
Python module (python script.py args). Blender 4.2 LTS or newer.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parent.parent

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


def _link(obj: bpy.types.Object, col: bpy.types.Collection | None) -> bpy.types.Object:
    (col or bpy.context.scene.collection).objects.link(obj)
    return obj


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
