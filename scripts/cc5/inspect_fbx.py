# Read-only inspection of a Character Creator FBX. Run with:
#   blender --background --factory-startup --python inspect_fbx.py -- <in.fbx> <report.json>
import json
import sys
import bpy

src, report = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src, use_anim=True, automatic_bone_orientation=False)

out = {'unit_scale': bpy.context.scene.unit_settings.scale_length, 'meshes': [], 'armatures': [], 'actions': []}
for o in bpy.data.objects:
    if o.type == 'MESH':
        me = o.data
        keys = me.shape_keys.key_blocks if me.shape_keys else []
        out['meshes'].append({
            'name': o.name,
            'verts': len(me.vertices),
            'tris': sum(len(p.vertices) - 2 for p in me.polygons),
            'materials': [m.name if m else None for m in me.materials],
            'shape_keys': len(keys),
            'vertex_groups': len(o.vertex_groups),
            'dimensions_m': [round(v, 3) for v in o.dimensions],
            'modifiers': [m.type for m in o.modifiers],
        })
    elif o.type == 'ARMATURE':
        out['armatures'].append({
            'name': o.name,
            'bones': len(o.data.bones),
            'root_bones': [b.name for b in o.data.bones if b.parent is None],
            'sample_bones': [b.name for b in o.data.bones][:40],
            'scale': list(o.scale),
            'rotation': [round(v, 4) for v in o.rotation_euler],
        })
for a in bpy.data.actions:
    out['actions'].append({'name': a.name, 'frame_range': list(a.frame_range)})
out['images'] = [
    {'name': i.name, 'size': list(i.size), 'packed': bool(i.packed_file), 'path': i.filepath}
    for i in bpy.data.images
]
out['totals'] = {
    'verts': sum(m['verts'] for m in out['meshes']),
    'tris': sum(m['tris'] for m in out['meshes']),
    'shape_keys': sum(m['shape_keys'] for m in out['meshes']),
}
json.dump(out, open(report, 'w'), indent=1)
print('REPORT_WRITTEN', report)
