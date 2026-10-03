"""
materials.py — the store's material library (brief §6.3: travertine, walnut,
linen, brushed bronze, limewash; no marble-and-gold, no white tile).

Image-based where the CC0 scans from fetch_assets.py are cached, procedural
otherwise, so every script still runs on a clean checkout. Textures are
box-projected in object space (metres), so procedurally built meshes need no
UV unwrapping; relief comes from height maps through a Bump node, which stays
correct under box projection.

Every material sets `diffuse_color` to its average colour: the viewport, the
glTF export (brand/3d/store.glb) and the layout diagram all fall back to it.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy

from common import WARM_2700K, hex_rgba

ASSETS = Path(__file__).resolve().parent / "assets"

# Average colours (sRGB hex), also the procedural fallbacks.
COLORS = {
    "travertine": "#D8CCB8",
    "travertine_veined": "#CDBEA6",
    "limewash": "#E6DFD2",
    "walnut": "#4A3423",
    "walnut_light": "#7A5A3E",
    "linen": "#D9CFBF",
    "oat": "#C9BBA5",
    "boucle": "#E7E0D3",
    "bronze": "#8C6A43",
    "ink": "#1C1B19",
    "paper": "#F4F1EA",
    "terry": "#F6F3EC",
    "ceramic": "#EFEBE3",
    "stoneware": "#A99C89",
    "pavers": "#9A9389",
    "asphalt": "#3B3A38",
    "felt": "#5B5146",
    "clay": "#EDE6DA",
}


def _nodes(mat: bpy.types.Material):
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (900, 0)
    return nt, out


def _new(name: str, avg: str) -> tuple[bpy.types.Material, bool]:
    """(material, created). Reuses an existing material of the same name."""
    if name in bpy.data.materials:
        return bpy.data.materials[name], False
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = hex_rgba(avg)
    return mat, True


def _bsdf(nt, **values) -> bpy.types.Node:
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.location = (500, 0)
    for k, v in values.items():
        if k in b.inputs:
            b.inputs[k].default_value = v
    return b


def _object_mapping(nt, scale: float, rotation: float = 0.0, offset=(0.0, 0.0, 0.0)):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-1100, 0)
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.location = (-900, 0)
    mp.inputs["Scale"].default_value = (1 / scale, 1 / scale, 1 / scale)
    mp.inputs["Rotation"].default_value = (0, 0, rotation)
    mp.inputs["Location"].default_value = offset
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    return mp


def _image(nt, path: Path, vector, colorspace: str, y: float):
    t = nt.nodes.new("ShaderNodeTexImage")
    t.location = (-650, y)
    t.image = bpy.data.images.load(str(path), check_existing=True)
    t.image.colorspace_settings.name = colorspace
    t.projection = "BOX"
    t.projection_blend = 0.25
    nt.links.new(vector, t.inputs["Vector"])
    return t


def textured(
    name: str,
    key: str,
    *,
    scale: float = 1.0,
    rotation: float = 0.0,
    tint: str | None = None,
    desaturate: bool = False,
    gain: float = 1.0,
    rough: tuple[float, float] = (0.35, 0.85),
    bump: float = 0.15,
    sheen: float = 0.0,
    coat: float = 0.0,
    subsurface: float = 0.0,
) -> bpy.types.Material:
    """A scanned material, box-projected in object space; `scale` = metres per texture tile."""
    avg = tint or COLORS.get(key, "#BBBBBB")
    mat, created = _new(name, avg)
    if not created:
        return mat
    folder = ASSETS / "textures" / key
    if not (folder / "diff.jpg").exists():
        return _procedural_fallback(mat, key, avg, rough, sheen, coat)
    nt, out = _nodes(mat)
    mp = _object_mapping(nt, scale, rotation)
    vec = mp.outputs["Vector"]
    if desaturate and (folder / "disp.jpg").exists():
        # Woven goods: the scan's colour (and its pattern) is dropped; the weave's height
        # modulates the tint instead, so bouclé and linen read as texture, not print.
        weave = _image(nt, folder / "disp.jpg", vec, "Non-Color", 300)
        lift = nt.nodes.new("ShaderNodeMapRange")
        lift.location = (-350, 300)
        lift.inputs["To Min"].default_value, lift.inputs["To Max"].default_value = 0.42, 0.56
        nt.links.new(weave.outputs["Color"], lift.inputs["Value"])
        color = lift.outputs["Result"]
        desaturate = False
        gain *= 2.0
    else:
        color = _image(nt, folder / "diff.jpg", vec, "sRGB", 300).outputs["Color"]
    if desaturate:
        hsv = nt.nodes.new("ShaderNodeHueSaturation")
        hsv.location = (-350, 300)
        hsv.inputs["Saturation"].default_value = 0.0
        nt.links.new(color, hsv.inputs["Color"])
        color = hsv.outputs["Color"]
    if tint or gain != 1.0:
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.location = (-150, 300)
        mix.inputs["Factor"].default_value = 1.0
        r, g, b, _ = hex_rgba(avg) if tint else (1, 1, 1, 1)
        # A grey scan multiplied by tint/0.5 keeps the scan's light–dark variation around the tint.
        k = gain * (2.0 if desaturate else 1.0)
        nt.links.new(color, mix.inputs[6])
        mix.inputs[7].default_value = (min(r * k, 4), min(g * k, 4), min(b * k, 4), 1)
        color = mix.outputs[2]
    b = _bsdf(nt, **{"Sheen Weight": sheen, "Coat Weight": coat, "Coat Roughness": 0.25,
                     "Subsurface Weight": subsurface, "Subsurface Radius": (0.4, 0.3, 0.2), "Subsurface Scale": 0.01})
    nt.links.new(color, b.inputs["Base Color"])
    if (folder / "rough.jpg").exists():
        rt = _image(nt, folder / "rough.jpg", vec, "Non-Color", 0)
        mr = nt.nodes.new("ShaderNodeMapRange")
        mr.location = (-150, 0)
        mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = rough
        nt.links.new(rt.outputs["Color"], mr.inputs["Value"])
        nt.links.new(mr.outputs["Result"], b.inputs["Roughness"])
    else:
        b.inputs["Roughness"].default_value = sum(rough) / 2
    height = folder / "disp.jpg"
    if bump and height.exists():
        ht = _image(nt, height, vec, "Non-Color", -300)
        bp = nt.nodes.new("ShaderNodeBump")
        bp.location = (250, -300)
        bp.inputs["Strength"].default_value = bump
        bp.inputs["Distance"].default_value = 0.002 * scale
        nt.links.new(ht.outputs["Color"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return mat


def _procedural_fallback(mat, key, avg, rough, sheen, coat):
    """Noise-varied colour when the scan is not cached (wood gets a stretched grain)."""
    nt, out = _nodes(mat)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 6.0
    noise.inputs["Detail"].default_value = 8.0
    if key.startswith("walnut"):
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (1.0, 40.0, 1.0)
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])
    else:
        nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    base = hex_rgba(avg)
    ramp.color_ramp.elements[0].color = tuple(c * 0.82 for c in base[:3]) + (1,)
    ramp.color_ramp.elements[1].color = tuple(min(1, c * 1.12) for c in base[:3]) + (1,)
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    b = _bsdf(nt, Roughness=sum(rough) / 2, **{"Sheen Weight": sheen, "Coat Weight": coat})
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return mat


def flat(name: str, color: str, *, roughness: float = 0.6, metallic: float = 0.0, coat: float = 0.0,
         sheen: float = 0.0, emission: float = 0.0, emission_color: tuple | None = None,
         subsurface: float = 0.0) -> bpy.types.Material:
    mat, created = _new(name, color)
    if not created:
        return mat
    nt, out = _nodes(mat)
    b = _bsdf(nt, **{"Base Color": hex_rgba(color), "Roughness": roughness, "Metallic": metallic,
                     "Coat Weight": coat, "Coat Roughness": 0.15, "Sheen Weight": sheen,
                     "Subsurface Weight": subsurface, "Subsurface Radius": (0.5, 0.35, 0.25), "Subsurface Scale": 0.02})
    if emission:
        b.inputs["Emission Color"].default_value = emission_color or hex_rgba(color)
        b.inputs["Emission Strength"].default_value = emission
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return mat


def travertine_tiles(name: str = "travertine-floor", tile: tuple[float, float] = (1.2, 0.6)) -> bpy.types.Material:
    """Honed travertine in large-format tiles, staggered, 2 mm joints; each tile slightly different in tone."""
    mat, created = _new(name, COLORS["travertine"])
    if not created:
        return mat
    nt, out = _nodes(mat)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-1300, 0)
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.location = (-700, -350)
    brick.offset = 0.5
    brick.inputs["Scale"].default_value = 1.0
    brick.inputs["Brick Width"].default_value = tile[0]
    brick.inputs["Row Height"].default_value = tile[1]
    brick.inputs["Mortar Size"].default_value = 0.002
    brick.inputs["Mortar Smooth"].default_value = 0.4
    brick.inputs["Bias"].default_value = 0.0
    brick.inputs["Color1"].default_value = (0.93, 0.93, 0.93, 1)
    brick.inputs["Color2"].default_value = (1.06, 1.05, 1.03, 1)
    brick.inputs["Mortar"].default_value = (0.0, 0.0, 0.0, 1)
    nt.links.new(tc.outputs["Object"], brick.inputs["Vector"])

    folder = ASSETS / "textures" / "travertine"
    if (folder / "diff.jpg").exists():
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.location = (-1100, 300)
        mp.inputs["Scale"].default_value = (1 / 1.2, 1 / 1.2, 1 / 1.2)
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        stone = _image(nt, folder / "diff.jpg", mp.outputs["Vector"], "sRGB", 300).outputs["Color"]
        rtex = _image(nt, folder / "rough.jpg", mp.outputs["Vector"], "Non-Color", 0).outputs["Color"]
        htex = _image(nt, folder / "disp.jpg", mp.outputs["Vector"], "Non-Color", -650).outputs["Color"]
    else:
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = 3
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (1, 12, 1)
        nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = hex_rgba("#C9BCA6")
        ramp.color_ramp.elements[1].color = hex_rgba("#E6DCCB")
        nt.links.new(n.outputs["Fac"], ramp.inputs["Fac"])
        stone, rtex, htex = ramp.outputs["Color"], n.outputs["Fac"], n.outputs["Fac"]

    # Tile tone variation × stone, then the joints in a darker grout.
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type, mul.blend_type = "RGBA", "MULTIPLY"
    mul.location = (-300, 300)
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(stone, mul.inputs[6])
    nt.links.new(brick.outputs["Color"], mul.inputs[7])
    grout = nt.nodes.new("ShaderNodeMix")
    grout.data_type = "RGBA"
    grout.location = (-100, 300)
    grout.inputs[7].default_value = hex_rgba("#A39885")
    nt.links.new(brick.outputs["Fac"], grout.inputs["Factor"])
    nt.links.new(mul.outputs[2], grout.inputs[6])

    b = _bsdf(nt, **{"Coat Weight": 0.0})
    nt.links.new(grout.outputs[2], b.inputs["Base Color"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.location = (-100, 0)
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = 0.32, 0.6  # honed, a soft sheen
    nt.links.new(rtex, mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], b.inputs["Roughness"])
    # Height: stone pores + the recessed joints.
    sub = nt.nodes.new("ShaderNodeMath")
    sub.operation = "SUBTRACT"
    sub.location = (-100, -400)
    nt.links.new(htex, sub.inputs[0])
    nt.links.new(brick.outputs["Fac"], sub.inputs[1])
    bp = nt.nodes.new("ShaderNodeBump")
    bp.location = (250, -300)
    bp.inputs["Strength"].default_value = 0.25
    bp.inputs["Distance"].default_value = 0.002
    nt.links.new(sub.outputs[0], bp.inputs["Height"])
    nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return mat


def polished_tiles(name: str, tile: tuple[float, float], color: str = "#D6D2CA") -> bpy.types.Material:
    """Large-format polished porcelain, the usual mall concourse: faint cloud, tight joints, a soft reflection."""
    mat, created = _new(name, color)
    if not created:
        return mat
    nt, out = _nodes(mat)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.offset = 0.0
    brick.inputs["Scale"].default_value = 1.0
    brick.inputs["Brick Width"].default_value = tile[0]
    brick.inputs["Row Height"].default_value = tile[1]
    brick.inputs["Mortar Size"].default_value = 0.003
    base = hex_rgba(color)
    brick.inputs["Color1"].default_value = base
    brick.inputs["Color2"].default_value = tuple(c * 0.96 for c in base[:3]) + (1,)
    brick.inputs["Mortar"].default_value = hex_rgba("#A9A49B")
    nt.links.new(tc.outputs["Object"], brick.inputs["Vector"])
    cloud = nt.nodes.new("ShaderNodeTexNoise")
    cloud.inputs["Scale"].default_value = 1.5
    cloud.inputs["Detail"].default_value = 6
    nt.links.new(tc.outputs["Object"], cloud.inputs["Vector"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type, mul.blend_type = "RGBA", "OVERLAY"
    mul.inputs["Factor"].default_value = 0.12
    nt.links.new(brick.outputs["Color"], mul.inputs[6])
    nt.links.new(cloud.outputs["Color"], mul.inputs[7])
    b = _bsdf(nt, Roughness=0.12, **{"Coat Weight": 0.3, "Coat Roughness": 0.05})
    nt.links.new(mul.outputs[2], b.inputs["Base Color"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return mat


def limewash(name: str = "limewash", color: str | None = None) -> bpy.types.Material:
    """Limewash: a matte, cloudy wall — the scan's relief plus a broad mottling in tone."""
    avg = color or COLORS["limewash"]
    mat, created = _new(name, avg)
    if not created:
        return mat
    nt, out = _nodes(mat)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    tc.location = (-1200, 0)
    cloud = nt.nodes.new("ShaderNodeTexNoise")
    cloud.location = (-800, 300)
    cloud.inputs["Scale"].default_value = 0.9
    cloud.inputs["Detail"].default_value = 6.0
    cloud.inputs["Roughness"].default_value = 0.62
    nt.links.new(tc.outputs["Object"], cloud.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.location = (-550, 300)
    base = hex_rgba(avg)
    ramp.color_ramp.elements[0].position = 0.3
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[0].color = tuple(c * 0.9 for c in base[:3]) + (1,)
    ramp.color_ramp.elements[1].color = tuple(min(1, c * 1.04) for c in base[:3]) + (1,)
    nt.links.new(cloud.outputs["Fac"], ramp.inputs["Fac"])
    b = _bsdf(nt, Roughness=0.92)
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    folder = ASSETS / "textures" / "plaster"
    if (folder / "disp.jpg").exists():
        mp = _object_mapping(nt, 1.5)
        ht = _image(nt, folder / "disp.jpg", mp.outputs["Vector"], "Non-Color", -300)
        bp = nt.nodes.new("ShaderNodeBump")
        bp.location = (250, -300)
        bp.inputs["Strength"].default_value = 0.12
        bp.inputs["Distance"].default_value = 0.003
        nt.links.new(ht.outputs["Color"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return mat


def brushed_bronze(name: str = "bronze", color: str = "#9A7650", roughness: float = 0.32) -> bpy.types.Material:
    """Brushed bronze: anisotropic metal, the brushing as fine stretched noise in the roughness."""
    mat, created = _new(name, COLORS["bronze"])
    if not created:
        return mat
    nt, out = _nodes(mat)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 1.0, 400.0)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 30.0
    noise.inputs["Detail"].default_value = 4.0
    nt.links.new(mp.outputs["Vector"], noise.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = roughness - 0.08
    mr.inputs["To Max"].default_value = roughness + 0.08
    nt.links.new(noise.outputs["Fac"], mr.inputs["Value"])
    tangent = nt.nodes.new("ShaderNodeTangent")
    tangent.direction_type = "RADIAL"
    tangent.axis = "Z"
    b = _bsdf(nt, **{"Base Color": hex_rgba(color), "Metallic": 1.0, "Anisotropic": 0.55})
    nt.links.new(mr.outputs["Result"], b.inputs["Roughness"])
    nt.links.new(tangent.outputs["Tangent"], b.inputs["Tangent"])
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    return mat


def glass(name: str = "glass", *, reeded: bool = False, frosted: float = 0.0, tint: str = "#F2F6F4") -> bpy.types.Material:
    """
    Architectural glass. Shadow rays pass straight through (the usual archviz
    trick), so daylight reaches the interior without caustic noise. `reeded`
    adds vertical 18 mm flutes (consult room doors: privacy without blinds).
    """
    mat, created = _new(name, tint)
    if not created:
        return mat
    nt, out = _nodes(mat)
    b = _bsdf(nt, **{"Base Color": hex_rgba(tint), "Roughness": frosted, "IOR": 1.5, "Transmission Weight": 1.0})
    if reeded:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        wave = nt.nodes.new("ShaderNodeTexWave")
        wave.wave_type = "BANDS"
        wave.bands_direction = "X"
        wave.wave_profile = "SIN"
        wave.inputs["Scale"].default_value = 17.5  # bands repeat every 2π/20/scale ≈ 18 mm
        nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
        bp = nt.nodes.new("ShaderNodeBump")
        bp.inputs["Strength"].default_value = 0.9
        bp.inputs["Distance"].default_value = 0.004
        nt.links.new(wave.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    lp = nt.nodes.new("ShaderNodeLightPath")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (0.92, 0.94, 0.93, 1) if not reeded else (0.7, 0.7, 0.68, 1)
    mix = nt.nodes.new("ShaderNodeMixShader")
    mix.location = (720, 0)
    nt.links.new(lp.outputs["Is Shadow Ray"], mix.inputs["Fac"])
    nt.links.new(b.outputs["BSDF"], mix.inputs[1])
    nt.links.new(tr.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    mat.blend_method = "BLEND"
    return mat


def paper_lantern(name: str = "washi") -> bpy.types.Material:
    """Washi paper for a lantern: lit from inside, it glows warm through the shade."""
    mat, created = _new(name, "#F3EBDD")
    if not created:
        return mat
    nt, out = _nodes(mat)
    tr = nt.nodes.new("ShaderNodeBsdfTranslucent")
    tr.inputs["Color"].default_value = hex_rgba("#F6E7CF")
    df = nt.nodes.new("ShaderNodeBsdfDiffuse")
    df.inputs["Color"].default_value = hex_rgba("#F3EBDD")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = WARM_2700K + (1,)
    em.inputs["Strength"].default_value = 1.2
    m1 = nt.nodes.new("ShaderNodeMixShader")
    m1.inputs["Fac"].default_value = 0.55
    nt.links.new(df.outputs[0], m1.inputs[1])
    nt.links.new(tr.outputs[0], m1.inputs[2])
    add = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(m1.outputs[0], add.inputs[0])
    nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs["Surface"])
    return mat


def emitter(name: str, strength: float, color: tuple | None = None) -> bpy.types.Material:
    """A light source surface (LED strip, lamp diffuser) at 3000 K by default."""
    color = color or blackbody(3000)
    mat, created = _new(name, "#FFE7C4")
    if not created:
        return mat
    nt, out = _nodes(mat)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = tuple(color[:3]) + (1,)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return mat


def screen(name: str = "screen") -> bpy.types.Material:
    """A switched-on display: near-black glass with a faint glow."""
    return flat(name, "#121211", roughness=0.08, coat=0.6, emission=0.15, emission_color=hex_rgba("#2A2724"))


def library() -> dict[str, bpy.types.Material]:
    """Every named material the store uses."""
    return {
        "floor": travertine_tiles(),
        "travertine": textured("travertine", "travertine", scale=1.2, rough=(0.3, 0.55), bump=0.2),
        "travertine_veined": textured("travertine-veined", "travertine_veined", scale=0.9, rough=(0.25, 0.5), bump=0.2),
        "limewash": limewash(),
        "limewash_warm": limewash("limewash-warm", "#DCCFBC"),
        "walnut": textured("walnut", "walnut", scale=1.4, rough=(0.38, 0.6), bump=0.05, coat=0.15, tint="#6E5038", gain=1.0),
        "walnut_end": textured("walnut-end", "walnut", scale=0.6, rough=(0.45, 0.7), bump=0.05, tint="#5E4430"),
        "linen": textured("linen", "linen", scale=0.25, tint=COLORS["linen"], desaturate=True, rough=(0.8, 1.0), bump=0.3, sheen=0.6),
        "oat": textured("oat-linen", "linen", scale=0.25, tint=COLORS["oat"], desaturate=True, rough=(0.8, 1.0), bump=0.3, sheen=0.6),
        "boucle": textured("boucle", "boucle", scale=0.18, tint=COLORS["boucle"], desaturate=True, rough=(0.85, 1.0), bump=0.6, sheen=0.8),
        "terry": textured("terry", "terry", scale=0.12, tint=COLORS["terry"], desaturate=True, rough=(0.9, 1.0), bump=0.6, sheen=0.4),
        "pavers": textured("pavers", "pavers", scale=1.6, rough=(0.6, 0.95), bump=0.4),
        "asphalt": textured("asphalt", "asphalt", scale=3.0, tint="#4A4846", desaturate=True, rough=(0.7, 0.95), bump=0.3),
        "bronze": brushed_bronze(),
        "bronze_dark": brushed_bronze("bronze-dark", "#5E4A35", 0.38),
        "brass": brushed_bronze("brass", "#B8955F", 0.25),
        "ink": flat("ink", COLORS["ink"], roughness=0.45),
        "ink_matte": flat("ink-matte", "#24221F", roughness=0.85),
        "paper": flat("paper", COLORS["paper"], roughness=0.9),
        "ceramic": flat("ceramic", COLORS["ceramic"], roughness=0.22, coat=0.3),
        "stoneware": flat("stoneware", COLORS["stoneware"], roughness=0.55),
        "felt": flat("felt", COLORS["felt"], roughness=1.0, sheen=0.5),
        "glass": glass(),
        "reeded": glass("glass-reeded", reeded=True, frosted=0.05),
        "frosted": glass("glass-frosted", frosted=0.35),
        "washi": paper_lantern(),
        "screen": screen(),
        "led": emitter("led-2700k", 12.0),
        "led_soft": emitter("led-2700k-soft", 4.0),
        "halo": emitter("halo-2700k", 14.0, blackbody(2700)),
        "clay": flat("maquette-clay", COLORS["clay"], roughness=0.75, subsurface=0.1),
        "sky_glow": emitter("street-glow", 1.0, (1.0, 0.97, 0.92)),
    }


def blackbody(kelvin: float) -> tuple[float, float, float]:
    """Approximate RGB of a black body (Tanner Helland's fit), normalised so the max channel is 1."""
    t = kelvin / 100
    r = 255 if t <= 66 else 329.698727446 * (t - 60) ** -0.1332047592
    g = 99.4708025861 * math.log(t) - 161.1195681661 if t <= 66 else 288.1221695283 * (t - 60) ** -0.0755148492
    b = 255 if t >= 66 else (0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307)
    rgb = [max(0.0, min(255.0, c)) / 255 for c in (r, g, b)]
    m = max(rgb)
    return (rgb[0] / m, rgb[1] / m, rgb[2] / m)
