"""Convert selected CC0 MakeHuman hairstyles from the system-assets ZIP to GLB.

Run with Blender:
  blender --background --python scripts/makehuman/import-system-hairstyles.py -- <system-assets.zip> [output-dir]
"""

import json
import os
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

import bpy

HAIRSTYLES = ("afro01", "braid01", "ponytail01", "long01")
BASE_MESH_MIN_Y = -8.4488
BASE_MESH_MAX_Y = 8.4967
TARGET_HEIGHT_METERS = 1.73
TEXTURE_MAX_SIZE = 1024


def arguments():
    if "--" not in sys.argv:
        raise ValueError("Pass the MakeHuman system-assets ZIP after --")
    args = sys.argv[sys.argv.index("--") + 1 :]
    if not args:
        raise ValueError("Pass the MakeHuman system-assets ZIP after --")
    archive = Path(args[0]).resolve()
    output = Path(args[1]).resolve() if len(args) > 1 else Path(
        "public/assets/clothing/hair"
    ).resolve()
    if not archive.is_file():
        raise FileNotFoundError(f"Asset archive does not exist: {archive}")
    return archive, output


def extract_member(archive, name, destination):
    info = archive.getinfo(name)
    if info.file_size > 32 * 1024 * 1024:
        raise ValueError(f"Refusing unexpectedly large asset member: {name}")
    destination.write_bytes(archive.read(name))
    return destination


def make_hair(archive, asset_id, output):
    prefix = f"hair/{asset_id}/{asset_id}"
    proxy_path = f"{prefix}.mhclo"
    proxy = archive.read(proxy_path).decode("utf-8", errors="replace")
    if "basemesh hm08" not in proxy or "explicitly released as CC0" not in proxy:
        raise ValueError(f"{asset_id}: expected an hm08 proxy with CC0 notice")

    material_path = f"{prefix}.mhmat"
    material_text = archive.read(material_path).decode("utf-8", errors="replace")
    diffuse_name = next(
        (
            line.split(maxsplit=1)[1].strip()
            for line in material_text.splitlines()
            if line.startswith("diffuseTexture ")
        ),
        None,
    )
    if not diffuse_name:
        raise ValueError(f"{asset_id}: material has no diffuse texture")
    asset = json.loads(archive.read("packs/makehuman_system_assets.json"))
    metadata = asset.get(asset_id, {})
    if metadata.get("type") != "hair" or metadata.get("license") != "CC0":
        raise ValueError(f"{asset_id}: asset metadata is not CC0 hair")

    with tempfile.TemporaryDirectory(prefix=f"aye-{asset_id}-") as temp:
        temp_dir = Path(temp)
        obj_path = extract_member(archive, f"{prefix}.obj", temp_dir / f"{asset_id}.obj")
        diffuse_path = extract_member(
            archive, f"hair/{asset_id}/{diffuse_name}", temp_dir / diffuse_name
        )
        thumbnail_path = extract_member(
            archive, f"{prefix}.thumb", temp_dir / f"{asset_id}.png"
        )

        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.wm.obj_import(
            filepath=str(obj_path),
            forward_axis="NEGATIVE_Z",
            up_axis="Y",
        )
        meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
        if not meshes:
            raise ValueError(f"{asset_id}: OBJ contains no mesh")
        bpy.ops.object.select_all(action="DESELECT")
        for mesh in meshes:
            mesh.select_set(True)
            bpy.context.view_layer.objects.active = mesh
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        bpy.context.view_layer.objects.active = meshes[0]
        if len(meshes) > 1:
            bpy.ops.object.join()
        hair = bpy.context.view_layer.objects.active

        height = BASE_MESH_MAX_Y - BASE_MESH_MIN_Y
        scale = TARGET_HEIGHT_METERS / height
        for vertex in hair.data.vertices:
            vertex.co.x *= scale
            vertex.co.y *= scale
            vertex.co.z = (vertex.co.z - BASE_MESH_MIN_Y) * scale
        hair.name = f"MakeHuman_{asset_id}"
        hair.data.name = f"MakeHuman_{asset_id}_mesh"

        material = bpy.data.materials.new(f"MakeHuman_{asset_id}_CC0")
        material.use_nodes = True
        material.use_backface_culling = False
        nodes = material.node_tree.nodes
        nodes.clear()
        output_node = nodes.new("ShaderNodeOutputMaterial")
        shader = nodes.new("ShaderNodeBsdfPrincipled")
        image = bpy.data.images.load(str(diffuse_path), check_existing=False)
        image.colorspace_settings.name = "sRGB"
        if max(image.size) > TEXTURE_MAX_SIZE:
            ratio = TEXTURE_MAX_SIZE / max(image.size)
            image.scale(
                max(1, round(image.size[0] * ratio)),
                max(1, round(image.size[1] * ratio)),
            )
        image.pack()
        texture = nodes.new("ShaderNodeTexImage")
        texture.image = image
        material.node_tree.links.new(
            texture.outputs["Color"], shader.inputs["Base Color"]
        )
        if image.channels == 4 and "Alpha" in shader.inputs:
            material.node_tree.links.new(
                texture.outputs["Alpha"], shader.inputs["Alpha"]
            )
            material.surface_render_method = "DITHERED"
        material.node_tree.links.new(shader.outputs["BSDF"], output_node.inputs["Surface"])
        hair.data.materials.clear()
        hair.data.materials.append(material)

        output.mkdir(parents=True, exist_ok=True)
        output_glb = output / f"{asset_id}.glb"
        bpy.ops.export_scene.gltf(
            filepath=str(output_glb),
            export_format="GLB",
            export_yup=True,
            export_apply=True,
            export_image_format="AUTO",
            export_materials="EXPORT",
            export_cameras=False,
            export_lights=False,
        )
        shutil.copyfile(thumbnail_path, output / f"{asset_id}.png")
        print(
            f"Exported {asset_id}: {len(hair.data.vertices)} vertices, "
            f"1.73m MakeHuman scale, {output_glb.stat().st_size} bytes"
        )


def main():
    archive_path, output = arguments()
    with zipfile.ZipFile(archive_path) as archive:
        for asset_id in HAIRSTYLES:
            make_hair(archive, asset_id, output)


if __name__ == "__main__":
    main()
