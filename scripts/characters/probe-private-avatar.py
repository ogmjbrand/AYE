"""Probe a static preview GLB against the Rocketbox rig (read-only)."""
import sys
import bpy
from mathutils import Vector

values = sys.argv[sys.argv.index("--") + 1 :]
bpy.ops.wm.read_factory_settings(use_empty=True)


def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


for path in values:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    arms = [o for o in new if o.type == "ARMATURE"]
    lo, hi = bounds(meshes)
    print("FILE", path)
    print(" meshes", [(m.name, len(m.data.vertices)) for m in meshes])
    print(" armatures", [(a.name, len(a.data.bones)) for a in arms])
    print(" bounds", tuple(round(v, 3) for v in lo), tuple(round(v, 3) for v in hi))
    if arms:
        a = arms[0]
        print(" arm loc/scale/rot", tuple(a.location), tuple(a.scale), tuple(a.rotation_euler))
        for n in ("Bip01_L_Hand", "Bip01_R_Hand", "Bip01_Head", "Bip01_Pelvis", "Bip01"):
            if n in a.data.bones:
                b = a.data.bones[n]
                print(" bone", n, tuple(round(v, 3) for v in (a.matrix_world @ b.head_local)))
