# Converts a Character Creator 5 FBX export into a game-ready GLB for AYE.
# The FBX, its HUMAN.json and textures/ folder are only read, never changed.
#
#   blender --background --factory-startup --python scripts/cc5/convert_cc5.py -- \
#       <in.fbx> <in.json> <rocketbox-anim.glb> <out.glb> <report.json> <profile> [gestures.glb]
#
# profile "main" is the close-up player model, "lite" the distance LOD.
# Steps: drop scene props, rebuild PBR materials from the CC JSON (roughness,
# AO, opacity and tint the FBX importer loses), turn the character to face the
# way the Rocketbox looks do, apply the 0.01 cm->m scale, retarget the game's
# Rocketbox Idle/Walk/Run clips onto the CC skeleton, decimate per profile,
# then export. Texture sizes and compression are left to build.mjs.
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

args = sys.argv[sys.argv.index('--') + 1:]
fbx_path, json_path, anim_path, out_path, report_path, profile = args[:6]
# Optional: Rocketbox gesture clips (Talk, Listen, Wave, Sit) to retarget too
gestures_path = args[6] if len(args) > 6 and args[6] != '-' else None
json_dir = os.path.dirname(json_path)

# Triangle ratio per mesh; None drops the mesh. Eye occlusion and tear line
# rely on CC's own shaders and render as dark smudges with plain PBR.
PROFILES = {
    'main': {
        'CC_Base_Body': 0.3, 'Classic_Slick_Back': 0.6, 'RS_Regular_Fit_Shirt': 1.0,
        'Slim_Fit_Trousers': 1.0, 'Sport_Sneakers': 1.0, 'CC_Base_Eye': 0.6, 'CC_Base_Teeth': 0.2,
        'CC_Base_Tongue': 0.4, 'Eyelash_Up': 0.7, 'Eyelash_Low': 0.7, 'Brows': 0.7, 'Stubble': 0.6,
        'CC_Base_TearLine': None, 'CC_Base_EyeOcclusion': None,
    },
    'lite': {
        'CC_Base_Body': 0.08, 'Classic_Slick_Back': 0.2, 'RS_Regular_Fit_Shirt': 0.35,
        'Slim_Fit_Trousers': 0.5, 'Sport_Sneakers': 0.4, 'CC_Base_Eye': 0.25, 'CC_Base_Teeth': None,
        'CC_Base_Tongue': None, 'Eyelash_Up': None, 'Eyelash_Low': None, 'Brows': 0.4, 'Stubble': None,
        'CC_Base_TearLine': None, 'CC_Base_EyeOcclusion': None,
    },
}[profile]

# Rocketbox source bone -> CC target bone. ALIGN chains are turned so their
# rest direction matches the source first (both are A-poses, but not the same
# one); fingers, toes, hips and head keep CC's own rest and only take the
# clip's movement, so CC's naturally curled hands stay curled.
MAP = {
    'Bip01 Pelvis': 'CC_Base_Hip',
    'Bip01 Spine': 'CC_Base_Waist',
    'Bip01 Spine1': 'CC_Base_Spine01',
    'Bip01 Spine2': 'CC_Base_Spine02',
    'Bip01 Neck': 'CC_Base_NeckTwist01',
    'Bip01 Head': 'CC_Base_Head',
}
for s, t in (('L', 'L'), ('R', 'R')):
    MAP.update({
        f'Bip01 {s} Clavicle': f'CC_Base_{t}_Clavicle',
        f'Bip01 {s} UpperArm': f'CC_Base_{t}_Upperarm',
        f'Bip01 {s} Forearm': f'CC_Base_{t}_Forearm',
        f'Bip01 {s} Hand': f'CC_Base_{t}_Hand',
        f'Bip01 {s} Thigh': f'CC_Base_{t}_Thigh',
        f'Bip01 {s} Calf': f'CC_Base_{t}_Calf',
        f'Bip01 {s} Foot': f'CC_Base_{t}_Foot',
        f'Bip01 {s} Toe0': f'CC_Base_{t}_ToeBase',
    })
    for i, finger in enumerate(('Thumb', 'Index', 'Mid', 'Ring', 'Pinky')):
        for seg in range(3):
            MAP[f'Bip01 {s} Finger{i}{seg if seg else ""}'] = f'CC_Base_{t}_{finger}{seg + 1}'
# Source bone whose head the aligned bone points at (rest direction)
AIM = {
    'Bip01 Spine': 'Bip01 Spine1', 'Bip01 Spine1': 'Bip01 Spine2', 'Bip01 Spine2': 'Bip01 Neck',
    'Bip01 Neck': 'Bip01 Head',
}
for s in 'LR':
    AIM.update({
        f'Bip01 {s} Clavicle': f'Bip01 {s} UpperArm', f'Bip01 {s} UpperArm': f'Bip01 {s} Forearm',
        f'Bip01 {s} Forearm': f'Bip01 {s} Hand', f'Bip01 {s} Thigh': f'Bip01 {s} Calf',
        f'Bip01 {s} Calf': f'Bip01 {s} Foot',
    })
CLIPS = ('Idle', 'Walk', 'Run')
GESTURES = ('Talk', 'Listen', 'Wave', 'Sit')
PROP_TYPES = {'CAMERA', 'LIGHT', 'EMPTY'}

report = {'profile': profile, 'source': {}, 'warnings': []}
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

rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE' and o.name.startswith('HD_'))
for o in list(bpy.data.objects):
    skinned = any(m.type == 'ARMATURE' and m.object == rig for m in getattr(o, 'modifiers', []))
    if o is not rig and not skinned:
        bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
# Blender's FBX importer gives CC meshes a stray -90 deg X rotation: the vertex
# data is Z-up like the skeleton, so the body lies flat beside a standing rig.
# CC binds every mesh in rig space, so put them back there.
rig_rot = rig.matrix_world.to_quaternion()
realigned = 0
for o in meshes:
    if o.matrix_world.to_quaternion().rotation_difference(rig_rot).angle > math.radians(1):
        o.matrix_world = rig.matrix_world.copy()
        realigned += 1
report['meshes_realigned'] = realigned
report['source'] = {
    'rig': rig.name, 'bones': len(rig.data.bones),
    'meshes': {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes},
}

# --------------------------------------------------------------- materials ---
cc = json.load(open(json_path, encoding='utf-8-sig'))
cc_meshes = next(v for v in cc[next(iter(cc))]['Object'].values() if v.get('Type') == 'Avatar')['Meshes']


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
    # The glTF exporter reads ambient occlusion from a node group with this name
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
    # Skin, cloth and hair are dielectric; CC's metallic maps here are flat black
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
    is_eye = mat.name.startswith('Std_Eye_')
    if opacity and not is_eye:
        nt.links.new(image_node(opacity).outputs['Color'], bsdf.inputs['Alpha'])
        mat.surface_render_method = 'BLENDED'
    elif spec.get('Opacity', 1) < 1 and not is_eye:
        bsdf.inputs['Alpha'].default_value = spec['Opacity']
        mat.surface_render_method = 'BLENDED'
    else:
        mat.surface_render_method = 'DITHERED'
    mat.use_backface_culling = not spec.get('Two Side', False)


rebuilt = 0
for o in meshes:
    spec_mats = cc_meshes.get(o.name, {}).get('Materials', {})
    for mat in o.data.materials:
        if not mat:
            continue
        spec = spec_mats.get(mat.name) or spec_mats.get(mat.name.rsplit('.', 1)[0])
        if spec is None:
            warn(f'no CC material data for {o.name}/{mat.name}; left as imported')
            continue
        rebuild_material(mat, spec)
        rebuilt += 1
report['materials_rebuilt'] = rebuilt

# ---------------------------------------------------- mesh reduction ---
kept = {}
def profile_ratio(name):
    # Exact name first, then the longest prefix (CC_Base_Eye must not catch CC_Base_EyeOcclusion)
    if name in PROFILES:
        return PROFILES[name]
    keys = sorted((k for k in PROFILES if name.startswith(k + '.')), key=len, reverse=True)
    return PROFILES[keys[0]] if keys else 1.0


for o in list(meshes):
    ratio = profile_ratio(o.name)
    if ratio is None:
        bpy.data.objects.remove(o, do_unlink=True)
        continue
    select_only([o])
    # Morphs block decimation and the game drives no facial animation
    if o.data.shape_keys:
        bpy.ops.object.shape_key_remove(all=True, apply_mix=False)
    for attr in list(o.data.color_attributes):
        o.data.color_attributes.remove(attr)
    if ratio < 1.0:
        mod = o.modifiers.new('dec', 'DECIMATE')
        mod.decimate_type = 'COLLAPSE'
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
        mod.delimit = {'UV', 'MATERIAL', 'SEAM'}
        bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    kept[o.name] = sum(len(p.vertices) - 2 for p in o.data.polygons)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
report['meshes'] = kept
report['triangles'] = sum(kept.values())

# ------------------------------------------- source animation rigs ---
def world_head(arm, name):
    return arm.matrix_world @ arm.data.bones[name].head_local


def forward(arm, head, l_eye, r_eye):
    f = (world_head(arm, l_eye) + world_head(arm, r_eye)) / 2 - world_head(arm, head)
    f.z = 0
    return f.normalized()


done_clips = []


def import_source(path, required):
    """A Rocketbox GLB's skeleton and clips (its meshes are dropped)."""
    before = set(bpy.data.objects)
    known = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in objs if o.type == 'ARMATURE')
    zs = [(o.matrix_world @ Vector(c)).z for o in objs if o.type == 'MESH' and o.parent == arm for c in o.bound_box]
    for o in objs:
        if o.type == 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)
    objs = [o for o in bpy.data.objects if o not in before]
    acts = {}
    for a in [a for a in bpy.data.actions if a not in known]:
        name = a.name.split('.')[0]
        acts[name] = a
        # Free the clip names for the baked output actions
        a.name = 'src_' + a.name
    missing = [c for c in required if c not in acts]
    if missing:
        raise SystemExit(f'{path} lacks clips: {missing}')
    arm.animation_data_create()
    arm.animation_data.action = None
    bpy.context.view_layer.update()
    return arm, objs, acts, (max(zs) - min(zs) if zs else None)


src, src_objs, src_actions, src_height = import_source(anim_path, CLIPS)
report['source_height_m'] = round(src_height, 3)

# --------------------------------- face the Rocketbox way, metres ---
src_fwd = forward(src, 'Bip01 Head', 'Bip01 LEye', 'Bip01 REye')
cc_fwd = forward(rig, 'CC_Base_Head', 'CC_Base_L_Eye', 'CC_Base_R_Eye')
turn = math.atan2(src_fwd.y, src_fwd.x) - math.atan2(cc_fwd.y, cc_fwd.x)
rig.rotation_mode = 'XYZ'
rig.matrix_world = Matrix.Rotation(turn, 4, 'Z') @ rig.matrix_world
bpy.context.view_layer.update()
select_only([rig] + meshes, rig)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.context.view_layer.update()
report['turn_degrees'] = round(math.degrees(turn), 1)

hip_cc = world_head(rig, 'CC_Base_Hip')
zs = [(o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box]
report['height_m'] = round(max(zs) - min(zs), 3)
report['hip_m'] = round(hip_cc.z, 3)
report['source_hip_m'] = round(world_head(src, 'Bip01 Pelvis').z, 3)
report['hip_ratio'] = round(hip_cc.z / report['source_hip_m'], 3)

order = [b for b in rig.data.bones]  # parents always precede children
for pb in rig.pose.bones:
    pb.rotation_mode = 'QUATERNION'
scene = bpy.context.scene
# The importers key clips at the scene rate (FBX sets 30 fps); export at the same rate
fps = scene.render.fps / scene.render.fps_base
rig.animation_data_create()
baked = {}


def bake(src, src_actions, names):
    """Retargets the named clips of one Rocketbox rig onto the CC rig (see MAP and AIM)."""
    # A second source file is turned to face the same way as the first
    fwd = forward(src, 'Bip01 Head', 'Bip01 LEye', 'Bip01 REye')
    spin = math.atan2(src_fwd.y, src_fwd.x) - math.atan2(fwd.y, fwd.x)
    if abs(spin) > math.radians(1):
        src.matrix_world = Matrix.Rotation(spin, 4, 'Z') @ src.matrix_world
        bpy.context.view_layer.update()
    hip_src = world_head(src, 'Bip01 Pelvis')
    stride = hip_cc.z / hip_src.z  # leg length ratio, so feet don't slide
    pairs = {s: t for s, t in MAP.items() if s in src.data.bones and t in rig.data.bones}
    for s, t in MAP.items():
        if (s, t) not in pairs.items():
            warn(f'bone pair skipped (missing): {s} -> {t}')
    src_rot = src.matrix_world.to_quaternion()
    tgt_rot_inv = rig.matrix_world.to_quaternion().inverted()
    src_rest = {s: src_rot @ src.data.bones[s].matrix_local.to_quaternion() for s in pairs}
    tgt_rest = {t: rig.data.bones[t].matrix_local.to_quaternion() for t in pairs.values()}
    # Rotation that brings each aligned CC bone's rest direction onto the source's
    align = {}
    for s, t in pairs.items():
        aim = AIM.get(s)
        if not aim or aim not in pairs:
            align[t] = Quaternion()
            continue
        d_src = (world_head(src, aim) - world_head(src, s)).normalized()
        d_tgt = (world_head(rig, pairs[aim]) - world_head(rig, t)).normalized()
        align[t] = d_tgt.rotation_difference(d_src)
    report['max_align_degrees'] = round(max([report.get('max_align_degrees', 0)] + [math.degrees(q.angle) for q in align.values()]), 1)
    by_target = {t: s for s, t in pairs.items()}
    for clip in names:
        act = src_actions[clip]
        src.animation_data.action = act
        if hasattr(src.animation_data, 'action_slot') and act.slots:
            src.animation_data.action_slot = act.slots[0]
        start, end = (int(round(v)) for v in act.frame_range)
        out_act = bpy.data.actions.new(clip)
        out_act.use_fake_user = True
        rig.animation_data.action = out_act
        prev = {}
        for f in range(start, end + 1):
            scene.frame_set(f)
            pose = {}
            for bone in order:
                parent = bone.parent
                p_pose = pose[parent.name] if parent else Matrix()
                p_rest = parent.matrix_local if parent else Matrix()
                follow = p_pose @ p_rest.inverted() @ bone.matrix_local
                s = by_target.get(bone.name)
                pb = rig.pose.bones[bone.name]
                if s is None:
                    pose[bone.name] = follow
                    pb.rotation_quaternion = Quaternion()
                    pb.location = Vector()
                    continue
                src_world = src_rot @ src.pose.bones[s].matrix.to_quaternion()
                delta = src_world @ src_rest[s].inverted()
                want = tgt_rot_inv @ delta @ align[bone.name] @ tgt_rest[bone.name]
                head = follow.to_translation()
                if bone.name == 'CC_Base_Hip':
                    moved = src.matrix_world @ src.pose.bones[s].head - hip_src
                    head = hip_cc + (tgt_rot_inv @ moved) * stride
                basis = follow.inverted() @ Matrix.LocRotScale(head, want, None)
                q = basis.to_quaternion()
                if bone.name in prev and prev[bone.name].dot(q) < 0:
                    q.negate()
                prev[bone.name] = q
                pb.rotation_quaternion = q
                pb.location = basis.to_translation() if bone.name == 'CC_Base_Hip' else Vector()
                pose[bone.name] = follow @ Matrix.LocRotScale(pb.location, q, None)
                pb.keyframe_insert('rotation_quaternion', frame=f - start)
                if bone.name == 'CC_Base_Hip':
                    pb.keyframe_insert('location', frame=f - start)
        baked[clip] = {'frames': end - start + 1, 'seconds': round((end - start) / fps, 3)}
        slot = rig.animation_data.action_slot if hasattr(rig.animation_data, 'action_slot') else None
        track = rig.animation_data.nla_tracks.new()
        track.name = clip
        strip = track.strips.new(clip, 0, out_act)
        # Blender 4.4+ "slotted" actions: a strip without its slot exports nothing
        if slot is not None and hasattr(strip, 'action_slot'):
            strip.action_slot = slot
        rig.animation_data.action = None
        done_clips.append(clip)
        print('BAKED', clip, 'frames', end - start + 1, 'slot', getattr(slot, 'identifier', None),
              'strip_slot', getattr(getattr(strip, 'action_slot', None), 'identifier', None))


def drop_source(objs, acts):
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)
    for a in list(acts.values()):
        bpy.data.actions.remove(a)


bake(src, src_actions, CLIPS)
drop_source(src_objs, src_actions)
# Conversation and sitting gestures go in the close-up model only
expected = list(CLIPS)
if gestures_path and profile == 'main':
    g_src, g_objs, g_actions, _ = import_source(gestures_path, GESTURES)
    bake(g_src, g_actions, GESTURES)
    drop_source(g_objs, g_actions)
    expected += GESTURES
report['clips'] = baked
report['actions'] = [a.name for a in bpy.data.actions]
if sorted(report['actions']) != sorted(expected):
    raise SystemExit(f'baked actions are {report["actions"]}, expected {expected}')
for pb in rig.pose.bones:
    pb.rotation_quaternion = Quaternion()
    pb.location = Vector()

# ----------------------------------------------------------- export ---
if os.environ.get('CC5_SAVE_BLEND'):
    bpy.ops.wm.save_as_mainfile(filepath=os.environ['CC5_SAVE_BLEND'])
select_only([rig] + meshes, rig)
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,
    export_yup=True,
    export_apply=False,
    export_animations=True,
    export_animation_mode='NLA_TRACKS',
    export_force_sampling=True,
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
print('CC5_REPORT', json.dumps(report))
