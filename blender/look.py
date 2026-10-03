"""
look.py — daylight, render settings, compositing and the camera views.

Lighting (--light):
  day      high afternoon sun through the storefront, clear sky
  golden   low warm sun raking across the travertine (≈ 6 pm in Kuala Lumpur)
  dusk     blue hour: the sky dims, the 2700 K interior carries the picture
  overcast soft, shadowless daylight for the plan and axonometric diagrams

Views are architectural cameras: horizontal, with lens shift instead of tilt,
so verticals stay vertical (two-point perspective), a little depth of field,
AgX tone mapping and a restrained glow on the light sources.
Cutaway views hide the "Above cut" collection (walls above 2.4 m, ceiling,
fascia) and show "Section caps".
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Vector

from materials import blackbody


@dataclass
class Lighting:
    sun_elevation: float  # degrees
    sun_azimuth: float  # degrees, compass-style: 0 = sun towards +y (behind the store), 180 = over the street
    sun_strength: float
    sun_kelvin: float
    sun_angle: float  # degrees, softness
    sky_strength: float
    exposure: float
    sky_tint: tuple[float, float, float] = (1.0, 1.0, 1.0)


LIGHTING = {
    # The store faces the street at −y; the sun over the street (azimuth ~200°) shines in.
    "day": Lighting(48, 205, 3.2, 5600, 1.2, 0.22, 0.6),
    "golden": Lighting(11, 228, 3.6, 3600, 1.0, 0.16, 0.7),
    "dusk": Lighting(-1.5, 250, 0.0, 3200, 1.0, 0.7, 0.9, (0.6, 0.72, 1.0)),
    "overcast": Lighting(60, 200, 1.4, 6000, 18.0, 0.3, 0.2),
    # Inside a mall: no sun, a faint sky, the concourse lights and the shop carry the picture.
    "mall": Lighting(50, 200, 0.0, 5000, 1.0, 0.02, 0.0),
}


def sun_vector(lt: Lighting) -> Vector:
    """Unit vector from the scene towards the sun."""
    el, az = math.radians(lt.sun_elevation), math.radians(lt.sun_azimuth)
    return Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))


def setup(light: str = "day") -> None:
    """World, sun, render and colour settings, compositor."""
    lt = LIGHTING[light]
    scene = bpy.context.scene
    scene["drprop_light"] = light

    # Physical sky (Nishita) without its own sun disc; a sun lamp, matched in direction, casts the shadows.
    world = bpy.data.worlds.get("sky") or bpy.data.worlds.new("sky")
    scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = "NISHITA"
    sky.sun_disc = False
    sky.sun_elevation = math.radians(max(lt.sun_elevation, -2))
    # Nishita measures rotation from +x, counter-clockwise; ours is compass-style from +y, clockwise.
    sky.sun_rotation = math.radians(90 - lt.sun_azimuth)
    sky.altitude = 60
    sky.air_density = 1.2
    sky.dust_density = 2.0
    tint = nt.nodes.new("ShaderNodeMix")
    tint.data_type, tint.blend_type = "RGBA", "MULTIPLY"
    tint.inputs["Factor"].default_value = 1.0
    tint.inputs[7].default_value = (*lt.sky_tint, 1)
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = lt.sky_strength
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(sky.outputs["Color"], tint.inputs[6])
    nt.links.new(tint.outputs[2], bg.inputs["Color"])
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    sun_obj = bpy.data.objects.get("sun")
    if sun_obj is None:
        sun_obj = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
        scene.collection.objects.link(sun_obj)
    sun = sun_obj.data
    sun.energy = lt.sun_strength
    sun.angle = math.radians(lt.sun_angle)
    sun.color = blackbody(lt.sun_kelvin)
    sun_obj.rotation_euler = (-sun_vector(lt)).to_track_quat("-Z", "Y").to_euler()
    sun_obj.hide_render = lt.sun_strength <= 0

    # Light portals in the storefront glazing help the sky into the interior with less noise.
    W = float(scene.get("drprop_width", 12.5))
    if "portal-storefront" not in bpy.data.objects:
        p = bpy.data.lights.new("portal-storefront", "AREA")
        p.shape = "RECTANGLE"
        p.size, p.size_y = W - 1.0, 2.6
        p.cycles.is_portal = True
        po = bpy.data.objects.new("portal-storefront", p)
        po.location = (W / 2, -0.02, 1.35)
        po.rotation_euler = Vector((0, 1, 0)).to_track_quat("-Z", "Y").to_euler()
        scene.collection.objects.link(po)

    r = scene.render
    r.engine = "CYCLES"
    c = scene.cycles
    c.device = "CPU"
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.012
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    c.denoising_prefilter = "ACCURATE"
    c.max_bounces = 10
    c.diffuse_bounces = 4
    c.glossy_bounces = 4
    c.transmission_bounces = 8
    c.transparent_max_bounces = 16
    c.caustics_reflective = False
    c.caustics_refractive = False
    c.blur_glossy = 1.0
    c.sample_clamp_indirect = 6.0
    r.use_persistent_data = True
    r.film_transparent = False
    view = scene.view_settings
    view.view_transform = "AgX"
    try:
        view.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    view.exposure = lt.exposure
    compositor()


def compositor(glow: float = 0.18) -> None:
    """A restrained glow on the lamps and a trace of lens dispersion; nothing that reads as a filter."""
    scene = bpy.context.scene
    scene.use_nodes = True
    nt = scene.node_tree
    nt.nodes.clear()
    rl = nt.nodes.new("CompositorNodeRLayers")
    glare = nt.nodes.new("CompositorNodeGlare")
    glare.glare_type = "FOG_GLOW"
    glare.quality = "HIGH"
    glare.threshold = 2.0
    glare.size = 8
    glare.mix = glow - 1.0  # −1 = original only
    lens = nt.nodes.new("CompositorNodeLensdist")
    lens.use_fit = True
    lens.inputs["Dispersion"].default_value = 0.004
    comp = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(rl.outputs["Image"], glare.inputs["Image"])
    nt.links.new(glare.outputs["Image"], lens.inputs["Image"])
    nt.links.new(lens.outputs["Image"], comp.inputs["Image"])


# --------------------------------------------------------------------------- cameras


@dataclass
class View:
    eye: tuple[float, float, float]
    target: tuple[float, float, float]
    lens: float = 24.0
    fstop: float = 5.6
    cut: bool = False
    ortho: float | None = None  # orthographic scale; eye/target then set the direction
    light: str | None = None  # preferred lighting


def views(cfg: dict) -> dict[str, View]:
    W, D = cfg["width"], cfg["depth"]
    vs = _views(W, D)
    if cfg.get("setting") == "mall":
        # From across the concourse; no daylight anywhere but the diagrams.
        vs["street"] = View((W * 0.4, -6.9, 1.6), (W * 0.46, 0.0, 2.45), lens=19, fstop=8, light="mall")
        for k, v in vs.items():
            if not v.cut and k != "street":
                v.light = "mall"
    return vs


def _views(W: float, D: float) -> dict[str, View]:
    return {
        # From across the road, eye level: the storefront as a passer-by sees it.
        "street": View((W * 0.4, -9.0, 1.55), (W * 0.46, 0.0, 2.3), lens=24, fstop=8, light="dusk"),
        # Just inside the door: the welcome at the reception slab, the store opening up beyond.
        "entrance": View((2.85, 0.3, 1.6), (6.2, 3.4, 1.15), lens=19, fstop=5.6),
        # The Lounge: curved sofa, chairs, drum table, apothecary wall, lantern, the relief.
        "lounge": View((7.3, 4.45, 1.4), (11.0, 1.3, 0.85), lens=22, fstop=4.5),
        # From the brief table back to the street: reception, fluted wall, window, daylight.
        "reception": View((6.6, 4.55, 1.5), (2.4, 0.4, 1.15), lens=22, fstop=5.6, light="golden"),
        # Consult room A from its door.
        "consult": View((9.05, 5.3, 1.45), (7.3, 7.6, 1.05), lens=18, fstop=4.0),
        # The pantry, where kopi and cold towels are made.
        "pantry": View((5.0, 5.2, 1.5), (2.6, 7.9, 1.15), lens=24, fstop=4.0),
        # Cutaway, high from the front-left: the whole plan with its furniture.
        "axo": View((-9.0, -12.0, 15.5), (W * 0.5, D * 0.6, 0.4), cut=True, ortho=max(W, D) + 7.0, light="overcast"),
        "plan": View((W / 2 + 0.3, D / 2 - 0.4, 40.0), (W / 2 + 0.3, D / 2 - 0.4, 0.0), cut=True, ortho=max(W, D) + 5.5, light="overcast"),
    }


VIEWS = ("street", "entrance", "lounge", "reception", "consult", "pantry", "axo", "plan")


def camera(name: str, v: View) -> bpy.types.Object:
    """An architectural camera: level, with lens shift to frame the target (two-point perspective)."""
    scene = bpy.context.scene
    data = bpy.data.cameras.get(name) or bpy.data.cameras.new(name)
    obj = bpy.data.objects.get(name) or bpy.data.objects.new(name, data)
    if obj.name not in scene.collection.objects:
        scene.collection.objects.link(obj)
    eye, tgt = Vector(v.eye), Vector(v.target)
    d = tgt - eye
    data.clip_start = 0.05
    data.clip_end = 300
    data.sensor_width = 36
    obj.location = eye
    if v.ortho:
        data.type = "ORTHO"
        data.ortho_scale = v.ortho
        obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        data.dof.use_dof = False
        return obj
    data.type = "PERSP"
    data.lens = v.lens
    flat = Vector((d.x, d.y, 0))
    yaw = math.atan2(-flat.x, flat.y)
    obj.rotation_euler = (math.pi / 2, 0, yaw)
    # Vertical shift instead of tilting, as a shift lens on a view camera.
    data.shift_x = 0.0
    data.shift_y = (d.z / flat.length) * v.lens / data.sensor_width
    data.dof.use_dof = True
    data.dof.focus_distance = d.length
    data.dof.aperture_fstop = v.fstop
    data.dof.aperture_blades = 7
    return obj


def add_views(cfg: dict) -> dict[str, bpy.types.Object]:
    cams = {name: camera(f"view-{name}", v) for name, v in views(cfg).items()}
    bpy.context.scene.camera = cams["lounge"]
    return cams


def set_cut(on: bool) -> None:
    """Cutaway on: hide everything above the section, show the poché caps."""
    for name, hidden in (("Above cut", on), ("Section caps", not on)):
        col = bpy.data.collections.get(name)
        if col:
            col.hide_render = hidden
            col.hide_viewport = hidden


def render_view(view: str, path: Path, size: tuple[int, int], samples: int, *, light: str | None = None) -> None:
    scene = bpy.context.scene
    cfg = {"width": float(scene.get("drprop_width", 12.5)), "depth": float(scene.get("drprop_depth", 8.0)),
           "setting": scene.get("drprop_setting", "shophouse")}
    v = views(cfg)[view]
    wanted = light or v.light or scene.get("drprop_light", "day")
    if wanted != scene.get("drprop_light"):
        setup(wanted)
    scene.camera = camera(f"view-{view}", v)
    set_cut(v.cut)
    scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.cycles.samples = samples
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fmt = scene.render.image_settings
    if path.suffix.lower() in (".jpg", ".jpeg"):
        fmt.file_format, fmt.quality = "JPEG", 92
    else:
        fmt.file_format = "PNG"
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
