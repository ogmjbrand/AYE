# Bakes one native CC5 motion export (a full avatar+animation FBX, e.g. CC5's own
# "CATWALK" or "IDLE" project for a character, exported via export_cc5_projects.py
# with export_motion=True) onto an *already-built* player body GLB as one more
# playable clip, alongside its existing Idle/Walk/Run/Talk/Listen/Wave/Sit.
#
# Unlike convert_cc5.py's bake() (which retargets the game's *Rocketbox* clips --
# a different skeleton -- onto the CC rig with full follow/align/stride math), this
# is a same-skeleton source: the motion FBX is the same character's own CC_Base rig,
# so pose-bone rotation/location channels copy straight across, bone-for-bone, once
# both rigs are in the same scale/orientation convention. No IK/FK realignment.
#
#   blender --background --factory-startup --python scripts/cc5/export_cc5_motion.py -- \
#       <target.glb> <motion.fbx> <clip_name> <out.glb> <report.json>
#
# target.glb: an already-built player body (e.g. public/assets/private/characters/
# cc5/woman.glb) -- read only; its mesh/materials/skin and existing clips are kept
# exactly as they are, this only adds one new NLA track.
# motion.fbx: the native CC5 motion export (has its own mesh, dropped here -- only
# its skeleton and baked animation are used).
# clip_name: the name the new clip gets (e.g. "Catwalk").
import json
import math
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

args = sys.argv[sys.argv.index('--') + 1:]
target_glb, motion_fbx, clip_name, out_path, report_path = args[:5]
report = {'clip': clip_name, 'warnings': []}
warn = lambda msg: (report['warnings'].append(msg), print('WARN', msg))


def select_only(objs, active=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = active or objs[0]


def world_head(arm, name):
    return arm.matrix_world @ arm.data.bones[name].head_local


def forward(arm, head, l_eye, r_eye):
    f = (world_head(arm, l_eye) + world_head(arm, r_eye)) / 2 - world_head(arm, head)
    f.z = 0
    return f.normalized()


bpy.ops.wm.read_factory_settings(use_empty=True)

# --- target: the already-built player body (kept exactly as it is) ---
bpy.ops.import_scene.gltf(filepath=target_glb)
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
report['target_bones'] = len(rig.data.bones)
report['target_existing_clips'] = [a.name for a in bpy.data.actions]

# --- source: the native CC5 motion export (its own mesh is dropped -- no CC JSON
# manifest comes with a motion-only export, so there's nothing to rebuild materials
# from, and nothing here needs them: only the skeleton and animation are used) ---
before = set(bpy.data.objects)
known_actions = set(bpy.data.actions)
bpy.ops.import_scene.fbx(filepath=motion_fbx, use_anim=True, automatic_bone_orientation=False)
src_objs = [o for o in bpy.data.objects if o not in before]
src_rig = next(o for o in src_objs if o.type == 'ARMATURE')
for o in list(src_objs):
    if o.type == 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
src_objs = [o for o in bpy.data.objects if o not in before]
report['source_bones'] = len(src_rig.data.bones)

# Same "arrives tilted" quirk convert_cc5.py corrects for any raw CC5 FBX import
# (there framed as ActorScan-specific; the check itself is generic). Dropping the
# rotation to identity leaves the bone/mesh data's own Z-up convention intact --
# re-baking that same rotation via transform_apply would instead swap which local
# axis means "up" for every bone, which is the opposite of what's needed here.
loc, rot, sca = src_rig.matrix_world.decompose()
report['source_import_rotation_degrees'] = round(math.degrees(rot.angle), 1)
if math.degrees(rot.angle) > 1:
    src_rig.matrix_world = Matrix.LocRotScale(loc, None, sca)
    bpy.context.view_layer.update()

new_actions = [a for a in bpy.data.actions if a not in known_actions]
# The real motion is the Armature-named action with the longest frame range (not the
# 1-frame "T-Pose" entries, and not the Key*/shape-key actions -- those drive the mesh
# we already dropped).
candidates = [a for a in new_actions if a.name.startswith('Armature') and (a.frame_range[1] - a.frame_range[0]) > 1]
if not candidates:
    raise SystemExit(f'no usable Armature action found among {[a.name for a in new_actions]}')
main_action = max(candidates, key=lambda a: a.frame_range[1] - a.frame_range[0])
report['source_action'] = main_action.name
report['source_frame_range'] = list(main_action.frame_range)

# The hip's rotation is scale-invariant, but its *location* keyframes are raw numbers
# in the FBX's native (~100x too large) units; transform_apply below rescales the
# rest pose (bone.matrix_local) but has no way to retroactively rescale already-
# authored F-curve data, so the hip location channel is rescaled here, once, at the
# source -- otherwise the baked clip's root motion comes out ~100x too large (an
# avatar that should walk a few metres instead flies hundreds of metres offscreen).
hip_scale = sca.x
# Blender 4.4+ "slotted actions": f-curves live under layers/strips/channelbags, not
# directly on the Action (main_action.fcurves doesn't exist on this Blender version).
# Every bone's *location* channel needs this, not just the hip's: the actual root-
# motion authority on this rig turned out to be a parent of CC_Base_Hip (its own
# location alone was too small a fix -- the hip's resolved world position still
# inherits whatever its parent chain contributes).
action_fcurves = [fc for layer in main_action.layers for strip in layer.strips for cb in strip.channelbags for fc in cb.fcurves]
rescaled = 0
for fcurve in action_fcurves:
    if 'location' not in fcurve.data_path:
        continue
    for kp in fcurve.keyframe_points:
        kp.co.y *= hip_scale
        kp.handle_left.y *= hip_scale
        kp.handle_right.y *= hip_scale
    rescaled += 1
report['location_fcurves_rescaled'] = rescaled

tgt_bones = {b.name for b in rig.data.bones}
src_bones = {b.name for b in src_rig.data.bones}
report['bones_only_in_target'] = sorted(tgt_bones - src_bones)
missing_from_source = sorted(tgt_bones - src_bones)
if missing_from_source:
    warn(f'target bones with no source data (left at rest): {missing_from_source}')

# --- face the same way as the target rig, then bake that correction (plus CC5's
# native FBX scale) into the source's own bone-local rest data -- so pose-bone
# channels sampled below are in the same convention as the target's ---
src_fwd = forward(src_rig, 'CC_Base_Head', 'CC_Base_L_Eye', 'CC_Base_R_Eye')
tgt_fwd = forward(rig, 'CC_Base_Head', 'CC_Base_L_Eye', 'CC_Base_R_Eye')
turn = math.atan2(tgt_fwd.y, tgt_fwd.x) - math.atan2(src_fwd.y, src_fwd.x)
report['turn_degrees'] = round(math.degrees(turn), 1)
src_rig.rotation_mode = 'XYZ'
src_rig.matrix_world = Matrix.Rotation(turn, 4, 'Z') @ src_rig.matrix_world
bpy.context.view_layer.update()
select_only([src_rig], src_rig)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.context.view_layer.update()

# --- bake, frame by frame ---
# A plain local-quaternion copy is NOT valid even with matching rest poses (verified
# separately): Blender's pose_bone.rotation_quaternion is internal to its own local
# convention, and a direct copy produced a character lying on the ground. Reusing
# convert_cc5.py's own bake() reconstruction -- world-space delta off each bone's own
# rest, reapplied onto the target's rest -- works for any pair of rigs with matching
# rest poses, retargeting onto a *different* skeleton included; here the "mapping" is
# just every shared bone onto itself, so no AIM/align correction is needed (identity).
order = [b for b in rig.data.bones]
for pb in rig.pose.bones:
    pb.rotation_mode = 'QUATERNION'
for pb in src_rig.pose.bones:
    pb.rotation_mode = 'QUATERNION'
scene = bpy.context.scene
fps = scene.render.fps / scene.render.fps_base
report['fps'] = fps

hip_name = 'CC_Base_Hip'
hip_cc = world_head(rig, hip_name)
hip_src = world_head(src_rig, hip_name)
stride = hip_cc.z / hip_src.z  # leg-length ratio, so feet don't slide/float
report['hip_ratio'] = round(stride, 3)
# CC_Base_BoneRoot is excluded on purpose, matching convert_cc5.py's own Rocketbox MAP
# (which has no entry targeting it -- 'Bip01 Pelvis', the Rocketbox source's own true
# root, maps directly onto CC_Base_Hip, so the player body's BoneRoot always stays at
# rest for every other clip too). Unlike Rocketbox's root, though, this source clip's
# CC_Base_Hip is *not* the true root of its own rig -- CC_Base_BoneRoot sits above it
# and carries a large, constant rest-relative rotation -- so Hip's *resolved* world
# pose on the source side is contaminated by it, while the target's Hip (parented to
# a BoneRoot left at rest) has nothing to match that contamination against. Zeroing
# BoneRoot's pose on the source every frame, before reading any other bone's resolved
# matrix, makes both sides symmetric (BoneRoot ignored on both ends, not just one).
NEVER_RETARGET = {'CC_Base_BoneRoot'}
pairs = {s: s for s in src_bones if s in tgt_bones and s not in NEVER_RETARGET}
src_rot = src_rig.matrix_world.to_quaternion()
tgt_rot_inv = rig.matrix_world.to_quaternion().inverted()
src_rest = {s: src_rot @ src_rig.data.bones[s].matrix_local.to_quaternion() for s in pairs}
tgt_rest = {t: rig.data.bones[t].matrix_local.to_quaternion() for t in pairs.values()}
by_target = {t: s for s, t in pairs.items()}

src_rig.animation_data_create()
src_rig.animation_data.action = main_action
if hasattr(src_rig.animation_data, 'action_slot') and main_action.slots:
    src_rig.animation_data.action_slot = main_action.slots[0]
start, end = (int(round(v)) for v in main_action.frame_range)

rig.animation_data_create()
out_act = bpy.data.actions.new(clip_name)
out_act.use_fake_user = True
rig.animation_data.action = out_act

prev = {}
for f in range(start, end + 1):
    scene.frame_set(f)
    bpy.context.view_layer.update()
    # Neutralize BoneRoot's own pose on the source before reading any other bone's
    # resolved (pose_bone.matrix) world transform -- see the NEVER_RETARGET comment.
    for excluded in NEVER_RETARGET:
        if excluded in src_bones:
            src_rig.pose.bones[excluded].rotation_quaternion = Quaternion()
            src_rig.pose.bones[excluded].location = Vector()
    bpy.context.view_layer.update()
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
        src_world = src_rot @ src_rig.pose.bones[s].matrix.to_quaternion()
        delta = src_world @ src_rest[s].inverted()
        want = tgt_rot_inv @ delta @ tgt_rest[bone.name]
        head = follow.to_translation()
        if bone.name == hip_name:
            moved = src_rig.matrix_world @ src_rig.pose.bones[s].head - hip_src
            head = hip_cc + (tgt_rot_inv @ moved) * stride
        basis = follow.inverted() @ Matrix.LocRotScale(head, want, None)
        q = basis.to_quaternion()
        if bone.name in prev and prev[bone.name].dot(q) < 0:
            q.negate()
        prev[bone.name] = q
        pb.rotation_quaternion = q
        pb.location = basis.to_translation() if bone.name == hip_name else Vector()
        pose[bone.name] = follow @ Matrix.LocRotScale(pb.location, q, None)
        pb.keyframe_insert('rotation_quaternion', frame=f - start)
        if bone.name == hip_name:
            pb.keyframe_insert('location', frame=f - start)

report['baked_frames'] = end - start + 1
slot = rig.animation_data.action_slot if hasattr(rig.animation_data, 'action_slot') else None
track = rig.animation_data.nla_tracks.new()
track.name = clip_name
strip = track.strips.new(clip_name, 0, out_act)
if slot is not None and hasattr(strip, 'action_slot'):
    strip.action_slot = slot
rig.animation_data.action = None

for o in src_objs:
    bpy.data.objects.remove(o, do_unlink=True)
for pb in rig.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0)
    pb.location = (0, 0, 0)

# ----------------------------------------------------------- export ---
select_only([rig] + meshes, rig)
bpy.ops.export_scene.gltf(
    filepath=out_path, export_format='GLB', use_selection=True, export_yup=True,
    export_apply=False, export_animations=True, export_animation_mode='NLA_TRACKS',
    export_force_sampling=True, export_skins=True, export_morph=False,
    export_all_influences=False, export_image_format='AUTO', export_materials='EXPORT',
    export_texcoords=True, export_normals=True, export_tangents=False,
)
report['output'] = out_path
report['output_bytes'] = __import__('os').path.getsize(out_path)
report['actions'] = [a.name for a in bpy.data.actions]
json.dump(report, open(report_path, 'w'), indent=1)
print('CC5_MOTION_REPORT', json.dumps(report))
