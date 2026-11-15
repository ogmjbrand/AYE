# Extracts one garment mesh from a Character Creator 5 FBX export as a standalone
# skinned GLB, reusing the same CC_Base rig the player bodies use (scripts/cc5/
# convert_cc5.py). Unlike the player-body pipeline, this does no animation
# retargeting, no height measurement and no per-profile decimation: a garment has
# no clips of its own, and at runtime (components/Cc5Garment.tsx) its SkinnedMesh
# is rebound onto the *player's own* skeleton bone-for-bone by name, discarding the
# skeleton this script exports -- so the exported skeleton only has to carry the
# correct joint order and inverse bind matrices, not drive anything itself.
#
#   blender --background --factory-startup --python scripts/cc5/export_cc5_garment.py -- \
#       <in.fbx> <in.json> <mesh_name> <anim.glb> <out.glb> <report.json>
#
# anim.glb: the same Rocketbox reference GLB build.mjs passes convert_cc5.py for this
# character's body (e.g. female-adult-08.glb for the feminine body). It's imported only
# to compute the exact same forward-facing rotation convert_cc5.py applies to the
# player body's rig -- without it, this garment's bind pose would be rotated relative
# to the live avatar's actual skeleton (both start from the same raw FBX orientation,
# but only the player-body pipeline turns it to face the way Rocketbox clips do), so
# rebinding it at runtime (components/Cc5Garment.tsx) would skew the mesh.
#
# The FBX, its JSON and the reference GLB are only read, never changed.
import json
import math
import os
import sys

import bpy
from mathutils import Matrix

args = sys.argv[sys.argv.index('--') + 1:]
fbx_path, json_path, mesh_name, anim_path, out_path, report_path = args[:6]
json_dir = os.path.dirname(json_path)

report = {'mesh': mesh_name, 'warnings': []}
warn = lambda msg: (report['warnings'].append(msg), print('WARN', msg))


def select_only(objs, active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]


# ---------------------------------------------------------------- import ---
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx_path, use_anim=False, automatic_bone_orientation=False)
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)

armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
rig = next((o for o in armatures if o.name.startswith('HD_')), armatures[0])
# Same upright fix as convert_cc5.py, for an ActorScan-sourced rig (unlikely for a
# built avatar's garment, but cheap to keep consistent)
loc, rot, sca = rig.matrix_world.decompose()
if math.degrees(rot.angle) > 1:
    rig.matrix_world = Matrix.LocRotScale(loc, None, sca)
    bpy.context.view_layer.update()

garment = bpy.data.objects.get(mesh_name)
if garment is None or garment.type != 'MESH':
    raise SystemExit(f'mesh {mesh_name!r} not found in {fbx_path} (or is not a mesh)')
for o in list(bpy.data.objects):
    if o is not rig and o is not garment:
        bpy.data.objects.remove(o, do_unlink=True)

# Same -90 deg X import quirk fix as convert_cc5.py: put the mesh back in rig space
rig_rot = rig.matrix_world.to_quaternion()
if garment.matrix_world.to_quaternion().rotation_difference(rig_rot).angle > math.radians(1):
    garment.matrix_world = rig.matrix_world.copy()
report['vertices'] = len(garment.data.vertices)
report['vertex_groups'] = [vg.name for vg in garment.vertex_groups]

# --------------------------------------------------------------- materials ---
cc = json.load(open(json_path, encoding='utf-8-sig'))
cc_top_name = next(iter(cc))
cc_objects = cc[cc_top_name]['Object']
cc_character = next((v for v in cc_objects.values() if v.get('Type') in ('Avatar', 'ActorScan')), None)
if cc_character is None:
    cc_character = cc_objects.get(cc_top_name)
if cc_character is None:
    cc_character = max(cc_objects.values(), key=lambda v: len(v.get('Meshes', {})))
cc_meshes = cc_character['Meshes']


def find_image(path, non_color):
    """CC paths are either relative to the JSON or bare names of images packed in the FBX."""
    if not path:
        return None
    full = os.path.normpath(os.path.join(json_dir, path))
    stem = os.path.splitext(os.path.basename(path))[0].lower()
    img = None
    if os.path.isfile(full):
        img = bpy.data.images.load(full, check_existing=True)
    else:
        img = next((i for i in bpy.data.images if os.path.splitext(i.name)[0].lower() == stem), None)
    if img is None:
        warn(f'texture not found: {path}')
        return None
    if non_color:
        img.colorspace_settings.name = 'Non-Color'
    return img


def gltf_settings_group():
    g = bpy.data.node_groups.get('glTF Material Output')
    if g is None:
        g = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        g.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    return g


def rebuild_material(mat, spec):
    tex = spec.get('Textures', {})
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

    def image_node(img):
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = img
        return n

    tint = [c / 255 for c in spec.get('Diffuse Color', [255, 255, 255])] + [1]
    base = find_image(tex.get('Base Color', {}).get('Texture Path'), False)
    if base:
        n = image_node(base)
        if tint[:3] != [1, 1, 1]:
            mix = nt.nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1
            nt.links.new(n.outputs['Color'], mix.inputs['A'])
            mix.inputs['B'].default_value = tint
            nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
        else:
            nt.links.new(n.outputs['Color'], bsdf.inputs['Base Color'])
    else:
        bsdf.inputs['Base Color'].default_value = tint

    rough = find_image(tex.get('Roughness', {}).get('Texture Path'), True)
    if rough:
        nt.links.new(image_node(rough).outputs['Color'], bsdf.inputs['Roughness'])
    else:
        bsdf.inputs['Roughness'].default_value = 0.6
    bsdf.inputs['Metallic'].default_value = 0

    normal = find_image(tex.get('Normal', {}).get('Texture Path'), True)
    if normal:
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = tex['Normal'].get('Strength', 100) / 100
        nt.links.new(image_node(normal).outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])

    ao = find_image(tex.get('AO', {}).get('Texture Path'), True)
    if ao:
        g = nt.nodes.new('ShaderNodeGroup')
        g.node_tree = gltf_settings_group()
        nt.links.new(image_node(ao).outputs['Color'], g.inputs['Occlusion'])

    opacity = find_image(tex.get('Opacity', {}).get('Texture Path'), True)
    if opacity:
        nt.links.new(image_node(opacity).outputs['Color'], bsdf.inputs['Alpha'])
        mat.surface_render_method = 'BLENDED'
    elif spec.get('Opacity', 1) < 1:
        bsdf.inputs['Alpha'].default_value = spec['Opacity']
        mat.surface_render_method = 'BLENDED'
    else:
        mat.surface_render_method = 'DITHERED'
    mat.use_backface_culling = not spec.get('Two Side', False)


spec_mats = cc_meshes.get(garment.name, {}).get('Materials', {})
rebuilt = 0
for mat in garment.data.materials:
    if not mat:
        continue
    spec = spec_mats.get(mat.name) or spec_mats.get(mat.name.rsplit('.', 1)[0])
    if spec is None:
        warn(f'no CC material data for {garment.name}/{mat.name}; left as imported')
        continue
    rebuild_material(mat, spec)
    rebuilt += 1
report['materials_rebuilt'] = rebuilt

# Morphs block nothing here (no decimation), but the game drives no facial animation
# on garments either, and shape keys would otherwise re-trigger a shape-key export warning
if garment.data.shape_keys:
    select_only([garment])
    bpy.ops.object.shape_key_remove(all=True, apply_mix=False)
for attr in list(garment.data.color_attributes):
    garment.data.color_attributes.remove(attr)

# --------------------------------------- face the Rocketbox way, like the player body ---
def world_head(arm, name):
    return arm.matrix_world @ arm.data.bones[name].head_local


def forward(arm, head, l_eye, r_eye):
    f = (world_head(arm, l_eye) + world_head(arm, r_eye)) / 2 - world_head(arm, head)
    f.z = 0
    return f.normalized()


before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=anim_path)
ref_objs = [o for o in bpy.data.objects if o not in before]
ref_arm = next(o for o in ref_objs if o.type == 'ARMATURE')
src_fwd = forward(ref_arm, 'Bip01 Head', 'Bip01 LEye', 'Bip01 REye')
cc_fwd = forward(rig, 'CC_Base_Head', 'CC_Base_L_Eye', 'CC_Base_R_Eye')
turn = math.atan2(src_fwd.y, src_fwd.x) - math.atan2(cc_fwd.y, cc_fwd.x)
for o in ref_objs:
    bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
rig.rotation_mode = 'XYZ'
rig.matrix_world = Matrix.Rotation(turn, 4, 'Z') @ rig.matrix_world
bpy.context.view_layer.update()
select_only([rig, garment], rig)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.context.view_layer.update()
report['turn_degrees'] = round(math.degrees(turn), 1)

# ----------------------------------------------------------- export ---
select_only([rig, garment], rig)
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_apply=False,
    export_animations=False,
    export_skins=True,
    export_morph=False,
    export_all_influences=False,
    export_image_format='AUTO',
    export_materials='EXPORT',
    export_texcoords=True,
    export_normals=True,
    export_tangents=False,
)
report['output'] = out_path
report['output_bytes'] = os.path.getsize(out_path)
json.dump(report, open(report_path, 'w'), indent=1)
print('CC5_GARMENT_REPORT', json.dumps(report))
