"""Prove a Blender setup can do what AYE's 3D production needs, end to end, and say what it found.

    <blender python> scripts/blender/smoke-test.py --out assets-src/blender/out [--import <plain .glb>]
    blender --background --python scripts/blender/smoke-test.py -- --out assets-src/blender/out

Steps, each reported as passed or failed:
1. Run Blender Python (version, background or interactive).
2. Create objects: a bevelled crate and a stool, in metres.
3. Modify a mesh: taper the crate's top edge with bmesh, add a bevel modifier.
4. Apply materials: glTF-safe Principled BSDF (painted wood, brushed metal).
5. Import a 3D model: an existing AYE GLB (decompressed first: node scripts/garments/decompress-glb.mjs).
6. Save a .blend file.
7. Export a game-ready GLB with aye_export (checks, +Y up), then re-import it and compare.
8. Render a preview image (Cycles on the CPU, so it works with no GPU).

It only writes into --out. Run inside a desktop Blender it also leaves the test objects in the
open scene (in a collection called "AYE smoke test"), so you can see them.
"""
import argparse
import json
import os
import sys
import traceback

import bpy
import bmesh

def _here() -> str:
    """This script's folder, whether run from a terminal or opened in Blender's Text Editor."""
    f = globals().get("__file__")
    if f and os.path.exists(f):
        return os.path.dirname(os.path.abspath(f))
    for t in bpy.data.texts:
        if t.filepath and os.path.basename(t.filepath) == "smoke-test.py":
            return os.path.dirname(bpy.path.abspath(t.filepath))
    raise RuntimeError("Open scripts/blender/smoke-test.py from the AYE folder (Text → Open), then Run Script.")


HERE = _here()
sys.path.insert(0, HERE)
from aye_export import check_scene, export_game_glb, principled, set_metric_units, triangle_count  # noqa: E402

# After "--" when run by the blender binary; nothing at all when run from Blender's Text Editor
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ([] if not bpy.app.background else sys.argv[1:])
ap = argparse.ArgumentParser()
ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.dirname(HERE)), "assets-src", "blender", "out"))
ap.add_argument("--import", dest="model", default=None)
ap.add_argument("--no-render", action="store_true")
args = ap.parse_args(argv)
out = os.path.abspath(args.out)
os.makedirs(out, exist_ok=True)

steps: list[dict] = []


def step(name):
    def wrap(fn):
        try:
            detail = fn()
            steps.append({"step": name, "ok": True, "detail": detail})
        except Exception as e:  # report and carry on, so one failure doesn't hide the rest
            steps.append({"step": name, "ok": False, "error": f"{type(e).__name__}: {e}", "trace": traceback.format_exc(limit=3)})
        return fn
    return wrap


interactive = not bpy.app.background
state: dict = {}


def fresh_scene(name: str):
    """An empty scene to work in. Headless: start from nothing. In a desktop Blender: a new scene of
    its own, so the scene you have open is never cleared."""
    if not interactive:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        return bpy.context.scene
    sc = bpy.data.scenes.new(name)
    bpy.context.window.scene = sc
    return sc


@step("Blender Python runs")
def _():
    return {"version": bpy.app.version_string, "background": bpy.app.background, "binary": bpy.app.binary_path}


@step("Create objects (metres)")
def _():
    if not interactive:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        set_metric_units()
    col = bpy.data.collections.new("AYE smoke test")
    bpy.context.scene.collection.children.link(col)
    bpy.ops.mesh.primitive_cube_add(size=0.6, location=(0, 0, 0.3))
    crate = bpy.context.active_object
    crate.name = "AYE_Test_Crate"
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.18, depth=0.45, location=(0.75, 0, 0.225))
    stool = bpy.context.active_object
    stool.name = "AYE_Test_Stool"
    for o in (crate, stool):
        for c in list(o.users_collection):
            c.objects.unlink(o)
        col.objects.link(o)
    state.update(crate=crate, stool=stool)
    return {"objects": [crate.name, stool.name], "crate_size_m": [round(v, 3) for v in crate.dimensions]}


@step("Modify a mesh (bmesh edit + bevel modifier)")
def _():
    crate = state["crate"]
    bm = bmesh.new()
    bm.from_mesh(crate.data)
    # Taper: pull the top four corners in by 15%
    top = [v for v in bm.verts if v.co.z > 0]
    for v in top:
        v.co.x *= 0.85
        v.co.y *= 0.85
    bm.to_mesh(crate.data)
    bm.free()
    crate.data.update()
    mod = crate.modifiers.new("Bevel", "BEVEL")
    mod.width = 0.02
    mod.segments = 2
    return {"tapered_vertices": len(top), "triangles_after_bevel": triangle_count(crate)}


@step("Apply materials (Principled BSDF, glTF-safe)")
def _():
    wood = principled("AYE_PaintedWood", (0.55, 0.22, 0.08), roughness=0.7)
    metal = principled("AYE_BrushedMetal", (0.6, 0.62, 0.65), roughness=0.35, metallic=1.0)
    state["crate"].data.materials.append(wood)
    state["stool"].data.materials.append(metal)
    return {"materials": [wood.name, metal.name]}


@step("Import a 3D model (an AYE GLB)")
def _():
    if not args.model:
        return {"skipped": "no --import given"}
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.abspath(args.model))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for o in new:
        o.location.x += 3.0 if o.parent is None else 0
    state["imported"] = new
    return {"file": os.path.basename(args.model), "objects": len(new), "meshes": len(meshes),
            "triangles": sum(triangle_count(o) for o in meshes), "armatures": sum(1 for o in new if o.type == "ARMATURE")}


@step("Save a .blend file")
def _():
    path = os.path.join(out, "aye-smoke-test.blend")
    bpy.ops.wm.save_as_mainfile(filepath=path, copy=True)
    return {"file": path, "bytes": os.path.getsize(path)}


@step("Export a game-ready GLB and re-import it")
def _():
    path = os.path.join(out, "aye-smoke-test.glb")
    objs = [state["crate"], state["stool"]]
    report = export_game_glb(path, objs, category="prop")
    if not report.get("exported"):
        raise RuntimeError(f"Export refused: {report['problems']}")
    # Re-import into a clean scene and compare what came back
    sent = {o.name: triangle_count(o) for o in objs}
    sc = fresh_scene("AYE smoke test: re-import")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    # Re-imported names may gain a .001 suffix next to the originals in a desktop Blender
    back = {o.name.split(".")[0]: triangle_count(o) for o in new}
    mats = sorted({s.material.name.split(".")[0] for o in new for s in o.material_slots if s.material})
    state["check_scene"] = sc
    if set(back) != set(sent) or any(back[k] != sent[k] for k in sent):
        raise RuntimeError(f"Round trip differs: sent {sent}, got {back}")
    # The game reads +Y up: the crate stands on the floor in glTF (its lowest point at y = 0 in the file)
    return {"file": path, "bytes": report["bytes"], "check": {k: report[k] for k in ("triangles", "budget", "warnings", "size_m")}, "reimported": back, "materials": mats}


@step("Render a preview (Cycles, CPU)")
def _():
    if args.no_render:
        return {"skipped": "--no-render"}
    scene = state.get("check_scene") or bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 24
    scene.render.resolution_x, scene.render.resolution_y = 640, 400
    scene.render.image_settings.file_format = "PNG"
    world = bpy.data.worlds.new("AYE_Sky") if not scene.world else scene.world
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.55, 0.62, 0.72, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0.4, 0, 0))
    bpy.ops.object.light_add(type="SUN", location=(2, -2, 4))
    bpy.context.active_object.data.energy = 3.5
    bpy.context.active_object.rotation_euler = (0.7, 0.2, 0.6)
    bpy.ops.object.camera_add(location=(2.0, -2.4, 1.4), rotation=(1.2, 0, 0.72))
    scene.camera = bpy.context.active_object
    path = os.path.join(out, "aye-smoke-test.png")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return {"file": path, "bytes": os.path.getsize(path)}


ok = all(s["ok"] for s in steps)
print("AYE_BLENDER_SMOKE_TEST " + json.dumps({"ok": ok, "steps": steps}, default=str, indent=1))
