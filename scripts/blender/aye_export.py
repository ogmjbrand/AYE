"""AYE's game-ready glTF export from Blender, with the checks the game needs.

Use it from any Blender Python (a desktop Blender's Scripting tab, `blender --background --python`,
or `pip install bpy` in a matching Python):

    import sys; sys.path.insert(0, "<AYE>/scripts/blender")
    from aye_export import check_scene, export_game_glb
    report = export_game_glb("<AYE>/assets-src/blender/out/my-asset.glb", category="prop")

What a game-ready asset is in AYE (three.js, metres, +Y up, glTF 2.0):
- Real-world scale in metres, transforms applied, origin on the floor at the object's footprint
  centre (props, furniture, vehicles) or between the feet (characters, garments).
- Principled BSDF materials only (they become glTF PBR: base colour, metallic, roughness,
  normal, emission, alpha). Procedural node trees don't export; bake them to images first.
- Textures at most 2048 px (1024 for small props); the game's optimiser converts them to WebP
  and adds meshopt compression afterwards (npm run assets:optimize).
- Triangle budgets per category (below); characters and garments skinned to the Bip01 /
  Rocketbox skeleton names the game binds by (world/glbGarment.ts).

Exports go to assets-src/blender/out/ (git-ignored). Nothing here writes into public/: an asset
is promoted only after review, with `npm run assets:optimize -- <in.glb> public/assets/models/...`.
"""
from __future__ import annotations

import math
import os
from typing import Iterable

import bpy

# Triangle budgets for one asset, by kind (desktop High; phones get the same files)
TRI_BUDGET = {
    "prop": 8_000,
    "furniture": 20_000,
    "garment": 30_000,
    "building": 60_000,
    "vehicle": 80_000,
    "character": 120_000,
    "environment": 120_000,
}
MAX_TEXTURE = 2048


def _meshes(objects: Iterable[bpy.types.Object]) -> list[bpy.types.Object]:
    return [o for o in objects if o.type == "MESH"]


def triangle_count(obj: bpy.types.Object) -> int:
    """Triangles after modifiers, as the exporter will write them."""
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = obj.evaluated_get(depsgraph).to_mesh()
    try:
        mesh.calc_loop_triangles()
        return len(mesh.loop_triangles)
    finally:
        obj.evaluated_get(depsgraph).to_mesh_clear()


def check_scene(objects: Iterable[bpy.types.Object] | None = None, category: str = "prop") -> dict:
    """What would stop these objects working in the game, and a summary. Nothing is changed."""
    objs = list(objects) if objects is not None else [o for o in bpy.context.scene.objects if o.visible_get()]
    problems: list[str] = []
    warnings: list[str] = []
    scene = bpy.context.scene
    if scene.unit_settings.system not in ("METRIC", "NONE") or abs(scene.unit_settings.scale_length - 1.0) > 1e-6:
        problems.append(f"Scene units are {scene.unit_settings.system} at scale {scene.unit_settings.scale_length}: use metric at 1.0 (1 unit = 1 m).")
    tris = 0
    materials: set[str] = set()
    for o in _meshes(objs):
        if any(abs(s - 1.0) > 1e-4 for s in o.scale):
            warnings.append(f"{o.name}: scale {tuple(round(s, 3) for s in o.scale)} not applied (Ctrl+A → Scale). It exports fine but skinning and physics prefer 1.")
        if any(abs(r) > 1e-4 for r in o.rotation_euler) and o.parent is None and not o.find_armature():
            warnings.append(f"{o.name}: rotation not applied.")
        tris += triangle_count(o)
        if not o.material_slots:
            warnings.append(f"{o.name}: no material (it will show white in the game).")
        for slot in o.material_slots:
            m = slot.material
            if not m:
                continue
            materials.add(m.name)
            if not m.use_backface_culling:
                warnings.append(f"Material {m.name} is double-sided (Backface Culling off): fine for cloth, leaves and glass; otherwise tick Backface Culling to halve its drawing cost.")
            if m.use_nodes:
                out = next((n for n in m.node_tree.nodes if n.type == "OUTPUT_MATERIAL" and n.is_active_output), None)
                surface = out and out.inputs["Surface"].links and out.inputs["Surface"].links[0].from_node
                if not surface or surface.type != "BSDF_PRINCIPLED":
                    problems.append(f"Material {m.name}: the surface isn't a Principled BSDF, so glTF can't carry it. Bake it to images or rebuild it with Principled BSDF.")
                for n in m.node_tree.nodes:
                    if n.type == "TEX_IMAGE" and n.image:
                        w, h = n.image.size
                        if max(w, h) > MAX_TEXTURE:
                            warnings.append(f"Texture {n.image.name} is {w}×{h}: the optimiser will shrink it to {MAX_TEXTURE}.")
                        if w == 0:
                            problems.append(f"Texture {n.image.name} is missing ({n.image.filepath}).")
    budget = TRI_BUDGET.get(category, TRI_BUDGET["prop"])
    if tris > budget:
        problems.append(f"{tris:,} triangles is over the {category} budget of {budget:,}: decimate or simplify.")
    # Where the asset stands: the lowest point should be on the floor (z = 0 in Blender, y = 0 in the game)
    lows = [min((o.matrix_world @ v.co).z for v in o.data.vertices) for o in _meshes(objs) if o.data.vertices]
    if lows and abs(min(lows)) > 0.01:
        warnings.append(f"The lowest point is at {min(lows):.3f} m: AYE stands assets on the floor (0).")
    dims = None
    if lows:
        xs, ys, zs = [], [], []
        for o in _meshes(objs):
            for corner in o.bound_box:
                w = o.matrix_world @ __import__("mathutils").Vector(corner)
                xs.append(w.x); ys.append(w.y); zs.append(w.z)
        dims = [round(max(xs) - min(xs), 3), round(max(ys) - min(ys), 3), round(max(zs) - min(zs), 3)]
        if max(dims) > 200 or max(dims) < 0.005:
            problems.append(f"Size {dims} m doesn't look like metres.")
    return {"ok": not problems, "problems": problems, "warnings": warnings, "triangles": tris, "budget": budget,
            "materials": sorted(materials), "size_m": dims, "objects": [o.name for o in objs]}


def export_game_glb(path: str, objects: Iterable[bpy.types.Object] | None = None, category: str = "prop", force: bool = False) -> dict:
    """Check, then write a binary glTF for AYE: +Y up, modifiers applied, no cameras or lights,
    skins and animations kept. Refuses (unless `force`) when the check finds a problem."""
    report = check_scene(objects, category)
    if not report["ok"] and not force:
        report["exported"] = None
        return report
    if os.path.abspath(path).replace("\\", "/").find("/public/") >= 0:
        raise ValueError("Export to assets-src/blender/out/ first; promote to public/ with npm run assets:optimize after review.")
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    sel = list(objects) if objects is not None else None
    if sel is not None:
        bpy.ops.object.select_all(action="DESELECT")
        for o in sel:
            o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=sel is not None,
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_skins=True,
        export_animations=True,
        export_morph=True,
    )
    report["exported"] = path
    report["bytes"] = os.path.getsize(path)
    return report


def set_metric_units() -> None:
    """Metres, as AYE uses."""
    s = bpy.context.scene.unit_settings
    s.system = "METRIC"
    s.scale_length = 1.0
    s.length_unit = "METERS"


def principled(name: str, colour: tuple[float, float, float], roughness: float = 0.5, metallic: float = 0.0) -> bpy.types.Material:
    """A glTF-safe material (Principled BSDF), colour in linear RGB 0 … 1."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*colour, 1.0)
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Metallic"].default_value = metallic
    # Single-sided: glTF's doubleSided doubles the faces three.js draws; use it only for thin cloth and leaves
    m.use_backface_culling = True
    return m


def degrees(d: float) -> float:
    return math.radians(d)
