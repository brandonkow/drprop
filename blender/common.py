"""Original Dr Prop procedural scene helpers; Blender 5.2 / Cycles."""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]

def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def material(name, color, metallic=0, roughness=.65, grain=False):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1)
    value.use_nodes = True
    bsdf = value.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if grain:
        noise = value.node_tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 45
        bump = value.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .12
        bump.inputs['Distance'].default_value = .035
        value.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        value.node_tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return value

def materials():
    return {
        'stone': material('Travertine', (.69, .62, .51), grain=True),
        'wall': material('Warm limewash', (.88, .85, .78), grain=True),
        'wood': material('Walnut', (.18, .10, .055), roughness=.42, grain=True),
        'linen': material('Linen', (.71, .66, .55), grain=True),
        'bronze': material('Brushed bronze', (.36, .23, .10), metallic=.8, roughness=.32),
        'paper': material('Paper', (.94, .91, .84)),
        'night': material('Night', (.025, .024, .020)),
    }

def cube(name, size, location, mat, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object; obj.name = name; obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new('Fine material edge', 'BEVEL'); modifier.width = bevel; modifier.segments = 2
        obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj

def cylinder(name, radius, depth, location, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=depth, location=location)
    obj = bpy.context.object; obj.name = name; obj.data.materials.append(mat)
    modifier = obj.modifiers.new('Fine edge', 'BEVEL'); modifier.width = .012; modifier.segments = 2
    return obj

def apothecary(mats, origin=(0, 0, 0)):
    x, y, z = origin
    cube('Walnut apothecary carcass', (3, .55, 1.65), (x, y, z+.825), mats['wood'])
    for row in range(4):
        for col in range(6):
            px, pz = x+(col-2.5)*.48, z+.23+row*.38
            cube(f'Drawer {row+1}-{col+1}', (.455, .045, .35), (px, y-.30, pz), mats['wood'], .007)
            cube('Paper prescription label', (.18, .012, .07), (px, y-.33, pz+.065), mats['paper'], .001)
            cube('Brass drawer pull', (.13, .045, .025), (px, y-.36, pz-.05), mats['bronze'], .008)
    cube('Walnut serving counter', (3.14, .7, .1), (x, y-.03, z+1.72), mats['wood'])
    cylinder('Coffee cup', .08, .11, (x-.9, y-.08, z+1.82), mats['paper'])
    cylinder('Cup saucer', .13, .015, (x-.9, y-.08, z+1.78), mats['paper'])

def area_light(name, location, energy, size, target, color=(1, .78, .51)):
    data = bpy.data.lights.new(name, type='AREA'); data.energy = energy; data.shape = 'DISK'; data.size = size; data.color = color
    obj = bpy.data.objects.new(name, data); bpy.context.collection.objects.link(obj); obj.location = location
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z', 'Y').to_euler()

def configure(camera_position, target, resolution=(1280, 800)):
    scene = bpy.context.scene; scene.render.engine = 'CYCLES'; scene.cycles.samples = 48; scene.cycles.use_denoising = True
    scene.render.threads_mode = 'FIXED'; scene.render.threads = 6
    scene.render.resolution_x, scene.render.resolution_y = resolution; scene.render.resolution_percentage = 100
    scene.world.color = (.25, .25, .25)
    bpy.ops.object.camera_add(location=camera_position)
    camera = bpy.context.object; camera.rotation_euler = (Vector(target)-camera.location).to_track_quat('-Z', 'Y').to_euler(); camera.data.lens = 38
    scene.camera = camera; scene.view_settings.view_transform = 'AgX'

def export(name, image_name):
    out = ROOT / 'brand/3d'; out.mkdir(parents=True, exist_ok=True)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes: obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out / f'{name}.glb'), export_format='GLB', use_selection=True, export_apply=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out / f'{name}.blend'))
    image_dir = ROOT / 'public/images'; image_dir.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.context.scene.render.filepath = str(image_dir / image_name)
    bpy.ops.render.render(write_still=True)
