"""Export a local-only GLB preview from a supplied Blender character scene.

Run with Blender:
  blender --background <source.blend> --python scripts/characters/export-private-avatar.py -- <repo>/assets-src/private-avatars/<name>.glb [max_texture_size]

The output directory is intentionally ignored by Git and outside public/.
"""

import os
import sys
from pathlib import Path

import bpy


def arguments():
    if "--" not in sys.argv:
        raise RuntimeError("Pass an output GLB path after --.")
    values = sys.argv[sys.argv.index("--") + 1 :]
    if not 1 <= len(values) <= 2:
        raise RuntimeError("Expected <output.glb> [max_texture_size].")
    output = Path(values[0]).resolve()
    texture_limit = int(values[1]) if len(values) == 2 else 2048
    repository = Path(__file__).resolve().parents[2]
    private_root = (repository / "assets-src" / "private-avatars").resolve()
    if output.suffix.lower() != ".glb" or not output.is_relative_to(private_root):
        raise RuntimeError("Output must be a .glb inside assets-src/private-avatars/.")
    if texture_limit < 256 or texture_limit > 4096:
        raise RuntimeError("max_texture_size must be between 256 and 4096.")
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing output: {output}")
    return output, texture_limit, repository


def image_path(image):
    if image.packed_file:
        return None
    return Path(bpy.path.abspath(image.filepath))


def make_missing_texture_material():
    material = bpy.data.materials.new("AYE local preview - missing texture fallback")
    material.diffuse_color = (0.82, 0.74, 0.66, 1.0)
    material.use_nodes = True
    shader = next(
        (node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"),
        None,
    )
    if shader:
        shader.inputs["Base Color"].default_value = material.diffuse_color
        shader.inputs["Roughness"].default_value = 0.78
    return material


def prepare_materials(objects, texture_limit):
    fallback = None
    used_images = set()
    missing_files = set()
    for obj in objects:
        for slot in obj.material_slots:
            material = slot.material
            if not material or not material.use_nodes:
                continue
            missing_in_material = False
            for node in material.node_tree.nodes:
                if node.type != "TEX_IMAGE" or not node.image:
                    continue
                image = node.image
                used_images.add(image)
                path = image_path(image)
                if image.size[0] == 0 or (path is not None and not path.is_file()):
                    missing_in_material = True
                    if path is not None:
                        missing_files.add(str(path))
            if missing_in_material:
                if fallback is None:
                    fallback = make_missing_texture_material()
                print(
                    "MISSING_TEXTURE_FALLBACK",
                    obj.name,
                    material.name,
                    "->",
                    fallback.name,
                )
                slot.material = fallback

    for image in used_images:
        width, height = image.size
        if width <= 0 or height <= 0:
            continue
        longest = max(width, height)
        if longest <= texture_limit:
            continue
        scale = min(1.0, texture_limit / longest)
        new_size = (max(1, round(width * scale)), max(1, round(height * scale)))
        print("RESIZE_TEXTURE", image.name, tuple(image.size), "->", new_size)
        image.scale(*new_size)
        image.pack()

    for path in sorted(missing_files):
        print("MISSING_TEXTURE_FILE", path)
    return len(used_images), len(missing_files)


def main():
    output, texture_limit, repository = arguments()
    output.parent.mkdir(parents=True, exist_ok=True)

    meshes = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and len(obj.data.polygons) > 0 and not obj.hide_render
    ]
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    rig = armatures[0] if armatures else None

    if rig:
        weighted_meshes = [
            obj
            for obj in meshes
            if len(obj.vertex_groups) > 0
            and (
                obj.parent == rig
                or any(
                    modifier.type == "ARMATURE" and modifier.object == rig
                    for modifier in obj.modifiers
                )
            )
        ]
    else:
        weighted_meshes = []

    selected = ([rig] + weighted_meshes) if rig and weighted_meshes else meshes
    if not selected:
        raise RuntimeError("No visible character meshes were found.")

    if rig and weighted_meshes:
        rig.hide_set(False)
        rig.hide_viewport = False
        rig.hide_render = False

    image_count, missing_count = prepare_materials(selected, texture_limit)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in selected:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig if rig in selected else selected[0]
    bpy.context.scene.frame_set(bpy.context.scene.frame_start)

    temporary = output.with_name(output.stem + ".build.glb")
    if temporary.exists():
        raise FileExistsError(f"Refusing to overwrite existing temporary output: {temporary}")
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing output: {output}")

    print(
        "EXPORT_PRIVATE_AVATAR",
        "source",
        bpy.data.filepath,
        "objects",
        [obj.name for obj in selected],
        "bones",
        sum(len(obj.data.bones) for obj in armatures) if rig in selected else 0,
        "actions",
        len(bpy.data.actions),
        "images",
        image_count,
        "missing_files",
        missing_count,
        "max_texture_size",
        texture_limit,
        "repo",
        repository,
    )

    bpy.ops.export_scene.gltf(
        filepath=str(temporary),
        export_format="GLB",
        use_selection=True,
        export_apply=not (rig and weighted_meshes),
        export_tangents=True,
    )
    if not temporary.is_file() or temporary.stat().st_size == 0:
        raise RuntimeError(f"Blender did not produce a valid GLB at {temporary}")
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing output: {output}")
    os.rename(temporary, output)
    print("EXPORTED", str(output), output.stat().st_size)


if __name__ == "__main__":
    main()
