# Retarget the five approved Motifect clips onto one existing CC5 player GLB.
# The CC5 GLB, source archives, and original CC5 project exports are read-only.
#
#   blender --background --factory-startup --python scripts/cc5/retarget_motifect_pilot.py -- \
#       <target.glb> <target.json> <locomotion.zip> <social.zip> <out.glb> <out.json> <asset-url>
#
# The output paths must not already exist. Run once for Aaron and once for Ariana.
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

import bpy
from mathutils import Matrix, Quaternion, Vector


args = sys.argv[sys.argv.index('--') + 1:]
if len(args) != 7:
    raise SystemExit('expected target.glb target.json locomotion.zip social.zip output.glb output.json asset-url')
target_path, target_info_path, locomotion_zip, social_zip, out_path, out_info_path, asset_url = args
if os.path.exists(out_path) or os.path.exists(out_info_path):
    raise SystemExit('refusing to overwrite an existing pilot output')

SOURCES = (
    ('Idle', locomotion_zip, 'Animations/idle_neutral.fbx', 'idle_neutral.fbx', 'loop'),
    ('Walk', locomotion_zip, 'Animations/walk_forward.fbx', 'walk_forward.fbx', 'loop'),
    ('Run', locomotion_zip, 'Animations/run_jog.fbx', 'run_jog.fbx', 'loop'),
    ('MotifectSit', social_zip, 'Animations/sit_and_wave_goodbye.fbx', 'sit_and_wave_goodbye.fbx', 'once'),
    ('Dance', social_zip, 'Animations/dance_simple_groove.fbx', 'dance_simple_groove.fbx', 'loop'),
)

# Motifect Spine1 is the pelvis/root bone; the FBX Armature object named Hips
# carries global root translation and rotation. Chest rotation is distributed
# over CC5's two upper-spine bones; 4-segment fingers fold into CC5's 3 segments.
PAIRS = [
    ('Spine1', 'CC_Base_Hip', 1.0, 'Spine2', 'CC_Base_Waist'),
    ('Spine2', 'CC_Base_Waist', 1.0, 'Chest', 'CC_Base_Spine01'),
    ('Chest', 'CC_Base_Spine01', 0.5, 'Neck1', 'CC_Base_Spine02'),
    ('Chest', 'CC_Base_Spine02', 0.5, 'Neck1', 'CC_Base_NeckTwist01'),
    ('Neck1', 'CC_Base_NeckTwist01', 1.0, 'Neck2', 'CC_Base_NeckTwist02'),
    ('Neck2', 'CC_Base_NeckTwist02', 1.0, 'Head', 'CC_Base_Head'),
    ('Head', 'CC_Base_Head', 1.0, None, None),
    ('Jaw', 'CC_Base_JawRoot', 1.0, None, None),
    ('LeftEye', 'CC_Base_L_Eye', 1.0, None, None),
    ('RightEye', 'CC_Base_R_Eye', 1.0, None, None),
]
for side, cc_side in (('Left', 'L'), ('Right', 'R')):
    PAIRS.extend([
        (f'{side}Shoulder', f'CC_Base_{cc_side}_Clavicle', 1.0, f'{side}Arm', f'CC_Base_{cc_side}_Upperarm'),
        (f'{side}Arm', f'CC_Base_{cc_side}_Upperarm', 1.0, f'{side}ForeArm', f'CC_Base_{cc_side}_Forearm'),
        (f'{side}ForeArm', f'CC_Base_{cc_side}_Forearm', 1.0, f'{side}Hand', f'CC_Base_{cc_side}_Hand'),
        (f'{side}Hand', f'CC_Base_{cc_side}_Hand', 1.0, None, None),
        (f'{side}Leg', f'CC_Base_{cc_side}_Thigh', 1.0, f'{side}Shin', f'CC_Base_{cc_side}_Calf'),
        (f'{side}Shin', f'CC_Base_{cc_side}_Calf', 1.0, f'{side}Foot', f'CC_Base_{cc_side}_Foot'),
        (f'{side}Foot', f'CC_Base_{cc_side}_Foot', 1.0, f'{side}ToeBase', f'CC_Base_{cc_side}_ToeBase'),
        (f'{side}ToeBase', f'CC_Base_{cc_side}_ToeBase', 1.0, None, None),
    ])
    finger_names = (('Thumb', 'Thumb'), ('Index', 'Index'), ('Middle', 'Mid'), ('Ring', 'Ring'), ('Pinky', 'Pinky'))
    for source_finger, target_finger in finger_names:
        source_segments = (1, 2, 3) if source_finger == 'Thumb' else (1, 2, 4)
        for target_segment, source_segment in enumerate(source_segments, 1):
            PAIRS.append((
                f'{side}Hand{source_finger}{source_segment}',
                f'CC_Base_{cc_side}_{target_finger}{target_segment}',
                1.0, None, None,
            ))


def action_fcurves(action):
    return [
        curve
        for layer in action.layers
        for strip in layer.strips
        for bag in strip.channelbags
        for curve in bag.fcurves
    ]


def select_only(objects, active):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = active


def world_head(armature, bone_name, matrix=None):
    return (matrix or armature.matrix_world) @ armature.data.bones[bone_name].head_local


def forward(armature, head_name, left_eye_name, right_eye_name, matrix=None):
    direction = (
        (world_head(armature, left_eye_name, matrix) + world_head(armature, right_eye_name, matrix)) / 2
        - world_head(armature, head_name, matrix)
    )
    direction.z = 0
    if direction.length < 1e-5:
        raise RuntimeError(f'could not determine forward axis for {armature.name}')
    return direction.normalized()


def height(armature, matrix):
    points = []
    for bone in armature.data.bones:
        points.extend((matrix @ bone.head_local, matrix @ bone.tail_local))
    return max(point.z for point in points) - min(point.z for point in points)


def action_location_warnings(action):
    variable = []
    for curve in action_fcurves(action):
        if '.location' not in curve.data_path:
            continue
        values = [point.co.y for point in curve.keyframe_points]
        if values and max(values) - min(values) > 1e-4:
            variable.append((curve.data_path, round(max(values) - min(values), 6)))
    return variable


def object_scale_warnings(action):
    variable = []
    for curve in action_fcurves(action):
        if not (curve.data_path == 'scale' or curve.data_path.endswith('.scale')):
            continue
        values = [point.co.y for point in curve.keyframe_points]
        if values and max(values) - min(values) > 1e-4:
            variable.append((curve.data_path, round(max(values) - min(values), 6)))
    return variable


def quaternion_error(first, last):
    dot = abs(first.normalized().dot(last.normalized()))
    return 2 * math.acos(min(1.0, max(0.0, dot)))


def create_output_track(armature, action, name):
    slot = armature.animation_data.action_slot
    track = armature.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, action)
    if slot is not None and hasattr(strip, 'action_slot'):
        strip.action_slot = slot
    armature.animation_data.action = None


def verify_glb(path, expected_bones, expected_meshes):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    rigs = [obj for obj in bpy.data.objects if obj.type == 'ARMATURE']
    if len(rigs) != 1:
        raise RuntimeError(f'{path} has {len(rigs)} armatures; expected one')
    rig = rigs[0]
    clips = [track.name for track in rig.animation_data.nla_tracks] if rig.animation_data else []
    required_clips = {'Idle', 'Walk', 'Run', 'MotifectSit', 'Dance', 'Talk', 'Listen', 'Wave', 'Sit'}
    missing_clips = sorted(required_clips - set(clips))
    if missing_clips:
        raise RuntimeError(f'{path} is missing clips: {missing_clips}; found {clips}')
    mesh_count = sum(obj.type == 'MESH' for obj in bpy.data.objects)
    if len(rig.data.bones) != expected_bones or mesh_count != expected_meshes:
        raise RuntimeError(
            f'{path} changed the target rig or meshes: '
            f'{len(rig.data.bones)} bones/{mesh_count} meshes; '
            f'expected {expected_bones}/{expected_meshes}'
        )
    return clips, mesh_count, len(rig.data.bones)


def source_file(archive_path, member, temp_dir, leaf):
    destination = Path(temp_dir) / leaf
    with zipfile.ZipFile(archive_path) as archive:
        try:
            destination.write_bytes(archive.read(member))
        except KeyError as error:
            raise RuntimeError(f'{member} is missing from {archive_path}') from error
    return str(destination)


def import_source(path):
    objects_before = set(bpy.data.objects)
    actions_before = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=path, use_anim=True, automatic_bone_orientation=False)
    objects = [obj for obj in bpy.data.objects if obj not in objects_before]
    armatures = [obj for obj in objects if obj.type == 'ARMATURE']
    if len(armatures) != 1:
        raise RuntimeError(f'{path} imported {len(armatures)} armatures; expected one')
    armature = armatures[0]
    actions = [action for action in bpy.data.actions if action not in actions_before and action.frame_range[1] > action.frame_range[0]]
    if not actions:
        raise RuntimeError(f'{path} contains no animated action')
    action = max(actions, key=lambda item: item.frame_range[1] - item.frame_range[0])
    armature.animation_data_create()
    armature.animation_data.action = action
    if hasattr(armature.animation_data, 'action_slot') and action.slots:
        armature.animation_data.action_slot = action.slots[0]
    for obj in objects:
        if obj != armature and obj.type == 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)
    objects = [obj for obj in bpy.data.objects if obj not in objects_before]
    return armature, action, objects, actions


def bake_clip(target, source, source_action, clip_name, loop_type, report):
    scene = bpy.context.scene
    start, end = (int(round(frame)) for frame in source_action.frame_range)
    scene.render.fps = 30
    scene.render.fps_base = 1.0
    source.animation_data.action = source_action
    if hasattr(source.animation_data, 'action_slot') and source_action.slots:
        source.animation_data.action_slot = source_action.slots[0]
    scene.frame_set(start)
    bpy.context.view_layer.update()

    source_base_matrix = source.matrix_world.copy()
    source_base_translation = source_base_matrix.to_translation()
    source_base_rotation = source_base_matrix.to_quaternion()
    source_to_target = Quaternion((0, 0, 1), report['turn_radians'])
    source_bones = source.data.bones
    target_bones = target.data.bones
    pairs = [pair for pair in PAIRS if pair[0] in source_bones and pair[1] in target_bones]
    missing = [f'{src} -> {tgt}' for src, tgt, *_ in PAIRS if src not in source_bones or tgt not in target_bones]
    if missing:
        raise RuntimeError(f'{clip_name}: required mapping bones are missing: {missing}')

    moving_locations = action_location_warnings(source_action)
    if moving_locations:
        raise RuntimeError(f'{clip_name}: unhandled source bone-location animation: {moving_locations}')
    moving_scales = object_scale_warnings(source_action)
    if moving_scales:
        raise RuntimeError(f'{clip_name}: unhandled source object-scale animation: {moving_scales}')

    source_rest = {
        src: source_to_target @ source_base_rotation @ source_bones[src].matrix_local.to_quaternion()
        for src, _, _, _, _ in pairs
    }
    align = {}
    for src, tgt, _, source_aim, target_aim in pairs:
        if not source_aim or not target_aim or source_aim not in source_bones or target_aim not in target_bones:
            align[tgt] = Quaternion()
            continue
        source_head = source_to_target @ (source_base_matrix @ source_bones[src].head_local)
        source_aim_head = source_to_target @ (source_base_matrix @ source_bones[source_aim].head_local)
        target_head = target.matrix_world @ target_bones[tgt].head_local
        target_aim_head = target.matrix_world @ target_bones[target_aim].head_local
        source_direction = (source_aim_head - source_head).normalized()
        target_direction = (target_aim_head - target_head).normalized()
        align[tgt] = target_direction.rotation_difference(source_direction)

    target_rotation_inverse = target.matrix_world.to_quaternion().inverted()
    target_rest = {tgt: target.matrix_world.to_quaternion() @ target_bones[tgt].matrix_local.to_quaternion()
                   for _, tgt, _, _, _ in pairs}
    by_target = {tgt: (src, weight) for src, tgt, weight, _, _ in pairs}
    by_target['CC_Base_BoneRoot'] = ('__object_root__', 1.0)
    order = list(target_bones)
    root = target_bones['CC_Base_BoneRoot']
    target_height = height(target, target.matrix_world)
    source_height = height(source, source_base_matrix)
    if source_height <= 0 or target_height <= 0:
        raise RuntimeError(f'{clip_name}: invalid source or target skeleton height')
    proportion = target_height / source_height

    scene.frame_set(end)
    bpy.context.view_layer.update()
    source_end_translation = source.matrix_world.to_translation()
    net_translation = source_end_translation - source_base_translation
    horizontal_net = Vector((net_translation.x, net_translation.y, 0))
    duration = (end - start) / 30
    source_speed = horizontal_net.length / duration if duration > 0 else 0
    if loop_type == 'loop' and clip_name in ('Idle', 'Dance'):
        root_drift = net_translation.copy()
    elif loop_type == 'loop':
        root_drift = horizontal_net
    else:
        root_drift = Vector()

    action = bpy.data.actions.new(clip_name)
    action.use_fake_user = True
    target.animation_data.action = action
    scene.frame_set(start)
    bpy.context.view_layer.update()
    previous_quaternions = {}
    first_pose = None
    last_pose = None
    first_root = None
    last_root = None
    max_root_rotation = 0.0
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        progress = (frame - start) / max(1, end - start)
        source_object_matrix = source.matrix_world.copy()
        object_rotation = source_object_matrix.to_quaternion() @ source_base_rotation.inverted()
        object_rotation = source_to_target @ object_rotation @ source_to_target.inverted()
        root_translation = source_object_matrix.to_translation() - source_base_translation - root_drift * progress
        root_translation = target_rotation_inverse @ (source_to_target @ root_translation * proportion)

        pose = {}
        for bone in order:
            parent = bone.parent
            parent_pose = pose[parent.name] if parent else Matrix()
            parent_rest = parent.matrix_local if parent else Matrix()
            follow = parent_pose @ parent_rest.inverted() @ bone.matrix_local
            mapped = by_target.get(bone.name)
            pose_bone = target.pose.bones[bone.name]
            if mapped is None:
                pose[bone.name] = follow
                pose_bone.rotation_quaternion = Quaternion()
                pose_bone.location = Vector()
                continue

            source_name, weight = mapped
            if source_name == '__object_root__':
                delta = object_rotation
                desired_rotation = target_rotation_inverse @ delta @ (target.matrix_world.to_quaternion() @ root.matrix_local.to_quaternion())
                desired_head = follow.to_translation() + root_translation
            else:
                source_pose_rotation = (
                    source_to_target @ source_base_rotation @ source.pose.bones[source_name].matrix.to_quaternion()
                )
                delta = source_pose_rotation @ source_rest[source_name].inverted()
                if weight != 1.0:
                    delta = Quaternion().slerp(delta, weight)
                desired_rotation = target_rotation_inverse @ delta @ align[bone.name] @ target_rest[bone.name]
                desired_head = follow.to_translation()

            basis = follow.inverted() @ Matrix.LocRotScale(desired_head, desired_rotation, None)
            rotation = basis.to_quaternion()
            if bone.name in previous_quaternions and previous_quaternions[bone.name].dot(rotation) < 0:
                rotation.negate()
            previous_quaternions[bone.name] = rotation
            pose_bone.rotation_quaternion = rotation
            pose_bone.location = basis.to_translation()
            pose[bone.name] = follow @ Matrix.LocRotScale(pose_bone.location, rotation, None)
            pose_bone.keyframe_insert('rotation_quaternion', frame=frame - start)
            if bone.name == 'CC_Base_BoneRoot':
                pose_bone.keyframe_insert('location', frame=frame - start)

        current_pose = {name: pose[name].to_quaternion() for name in by_target if name != 'CC_Base_BoneRoot'}
        if frame == start:
            first_pose = current_pose
            first_root = root_translation.copy()
        if frame == end:
            last_pose = current_pose
            last_root = root_translation.copy()
        max_root_rotation = max(max_root_rotation, object_rotation.angle)

    for curve in action_fcurves(action):
        for point in curve.keyframe_points:
            point.interpolation = 'LINEAR'

    loop_error = None
    loop_error_bone = None
    if loop_type == 'loop' and first_pose and last_pose:
        loop_error_bone = max(first_pose, key=lambda name: quaternion_error(first_pose[name], last_pose[name]))
        loop_error = quaternion_error(first_pose[loop_error_bone], last_pose[loop_error_bone])
        loop_root_error = (last_root - first_root).length if last_root is not None and first_root is not None else 0
    else:
        loop_root_error = None
    create_output_track(target, action, clip_name)

    return {
        'frames': end - start + 1,
        'durationSeconds': round(duration, 3),
        'fps': 30,
        'sourceAction': source_action.name,
        'sourceRigBones': len(source_bones),
        'mappedTargetBones': len(pairs),
        'sourceRootDisplacementMeters': [round(value, 4) for value in net_translation],
        'sourceRootHorizontalDistanceMeters': round(horizontal_net.length, 4),
        'sourceRootSpeedMps': round(source_speed, 4),
        'rootMotionPolicy': 'velocity-driven AYE locomotion; remove net horizontal travel and retain residual root motion'
        if clip_name in ('Walk', 'Run') else
        'looped stationary action; remove net root drift and retain cyclic residual motion'
        if clip_name in ('Idle', 'Dance') else
        'one-shot interaction; preserve complete source root trajectory',
        'targetSourceHeightRatio': round(proportion, 4),
        'maxObjectRootRotationDegrees': round(math.degrees(max_root_rotation), 2),
        'loopPoseErrorDegrees': round(math.degrees(loop_error), 2) if loop_error is not None else None,
        'loopPoseErrorBone': loop_error_bone,
        'loopRootErrorMeters': round(loop_root_error, 5) if loop_root_error is not None else None,
    }


def main():
    with open(target_info_path, encoding='utf-8-sig') as source_info:
        original_info = json.load(source_info)
    original_avatar = original_info.get('avatar')
    if not isinstance(original_avatar, dict) or not isinstance(original_avatar.get('height'), (int, float)):
        raise RuntimeError(f'{target_info_path} has no verified avatar height')

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=target_path)
    target_rigs = [obj for obj in bpy.data.objects if obj.type == 'ARMATURE']
    if len(target_rigs) != 1:
        raise RuntimeError(f'{target_path} imported {len(target_rigs)} armatures; expected one')
    target = target_rigs[0]
    meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    if not meshes:
        raise RuntimeError(f'{target_path} contains no skinned meshes')
    target_animation = target.animation_data
    if target_animation is None or not target_animation.nla_tracks:
        raise RuntimeError(f'{target_path} has no existing animation tracks to preserve')
    original_clips = [track.name for track in target_animation.nla_tracks]
    if not {'Idle', 'Walk', 'Run', 'Sit'}.issubset(set(original_clips)):
        raise RuntimeError(f'{target_path} is missing one or more expected CC5 clips: {original_clips}')
    for track in target_animation.nla_tracks:
        if track.name in ('Idle', 'Walk', 'Run'):
            legacy_name = f'CC5_{track.name}'
            track.name = legacy_name
            for strip in track.strips:
                strip.name = legacy_name
                if strip.action:
                    strip.action.name = legacy_name
        track.mute = True
    target_animation.action = None

    target_height = height(target, target.matrix_world)
    original_mesh_vertices = sum(len(mesh.data.vertices) for mesh in meshes)
    report = {
        'target': os.path.basename(target_path),
        'targetRig': target.name,
        'targetBones': len(target.data.bones),
        'targetHeightFromSkeletonMeters': round(target_height, 4),
        'targetMeshCount': len(meshes),
        'targetMeshVertices': original_mesh_vertices,
        'originalClips': original_clips,
        'mappedClips': {},
        'warnings': [
            'Source animations have no CC5 facial blendshape tracks; original CC5 morph targets are preserved but not driven by these clips.',
            'MotifectSit is a one-shot interaction, not a seated idle. AYE visual QA showed a crouched pose above the bench; native CC5 Sit remains the seated gameplay clip, and MotifectSit is not marked ready.',
        ],
    }

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(out_info_path)), exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='aye-motifect-pilot-') as temp_dir:
        for clip_name, archive_path, member, leaf, loop_type in SOURCES:
            extracted = source_file(archive_path, member, temp_dir, leaf)
            source, source_action, source_objects, source_actions = import_source(extracted)
            scene = bpy.context.scene
            start = int(round(source_action.frame_range[0]))
            scene.frame_set(start)
            bpy.context.view_layer.update()
            if len(source.data.bones) != 76:
                raise RuntimeError(f'{clip_name}: expected the verified 76-bone Motifect rig, got {len(source.data.bones)}')
            head = 'Head'
            source_fwd = forward(source, head, 'LeftEye', 'RightEye', source.matrix_world)
            target_fwd = forward(target, 'CC_Base_Head', 'CC_Base_L_Eye', 'CC_Base_R_Eye', target.matrix_world)
            turn = math.atan2(target_fwd.y, target_fwd.x) - math.atan2(source_fwd.y, source_fwd.x)
            report['turn_radians'] = turn
            report['turnDegrees'] = round(math.degrees(turn), 2)
            report['mappedClips'][clip_name] = bake_clip(target, source, source_action, clip_name, loop_type, report)
            for obj in source_objects:
                if obj.name in bpy.data.objects:
                    bpy.data.objects.remove(obj, do_unlink=True)
            for action in source_actions:
                if action.name in bpy.data.actions:
                    bpy.data.actions.remove(action)

    for track in target.animation_data.nla_tracks:
        track.mute = False
    for pose_bone in target.pose.bones:
        pose_bone.rotation_quaternion = Quaternion()
        pose_bone.location = Vector()
        pose_bone.scale = Vector((1, 1, 1))

    selected = [target] + meshes
    select_only(selected, target)
    node = shutil.which('node')
    if not node:
        raise RuntimeError('Node.js is required to optimize the pilot GLB for AYE')
    project_root = Path(__file__).resolve().parents[2]
    optimizer = project_root / 'scripts' / 'optimize-glb.mjs'
    if not optimizer.is_file():
        raise RuntimeError(f'AYE GLB optimizer was not found: {optimizer}')
    with tempfile.TemporaryDirectory(prefix='aye-motifect-pilot-glb-') as temp_dir:
        raw_path = str(Path(temp_dir) / Path(out_path).name)
        bpy.ops.export_scene.gltf(
            filepath=raw_path,
            export_format='GLB',
            use_selection=True,
            export_yup=True,
            export_apply=False,
            export_animations=True,
            export_animation_mode='NLA_TRACKS',
            export_force_sampling=True,
            export_skins=True,
            export_morph=True,
            export_all_influences=False,
            export_image_format='AUTO',
            export_materials='EXPORT',
            export_texcoords=True,
            export_normals=True,
            export_tangents=False,
        )
        report['rawOutputBytes'] = os.path.getsize(raw_path)
        report['rawRoundTripClips'], _, _ = verify_glb(raw_path, len(target.data.bones), len(meshes))
        subprocess.run(
            [node, str(optimizer), raw_path, out_path, '2048'],
            cwd=str(project_root),
            check=True,
        )
    roundtrip_clips, roundtrip_mesh_count, roundtrip_bones = verify_glb(
        out_path, report['targetBones'], report['targetMeshCount']
    )
    report['outputBytes'] = os.path.getsize(out_path)
    report['roundTripClips'] = roundtrip_clips
    report['roundTripMeshCount'] = roundtrip_mesh_count
    report['roundTripTargetBones'] = roundtrip_bones
    report['output'] = out_path

    avatar = {
        'url': asset_url,
        'height': original_avatar['height'],
        'walkSpeed': report['mappedClips']['Walk']['sourceRootSpeedMps'],
        'runSpeed': report['mappedClips']['Run']['sourceRootSpeedMps'],
        'clips': roundtrip_clips,
    }
    output_info = {
        'avatar': avatar,
        'pilot': report,
    }
    with open(out_info_path, 'w', encoding='utf-8') as output_file:
        json.dump(output_info, output_file, indent=2)
    print('MOTIFECT_PILOT_REPORT ' + json.dumps(report))


main()
