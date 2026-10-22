"""Export only skin base-colour textures from private GLB previews to the ignored lab."""
import sys
from pathlib import Path
import bpy

repo = Path(__file__).resolve().parents[2]
out_dir = repo / "assets-src" / "private-avatars" / "skin-texture-lab"
out_dir.mkdir(parents=True, exist_ok=True)
sources = {
    "tasha": repo / "assets-src" / "private-avatars" / "tasha-web-preview.glb",
    "the-girl": repo / "assets-src" / "private-avatars" / "the-girl-web-preview.glb",
}

for avatar, path in sources.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    body = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.strip().lower() == "body")
    material = body.data.materials[0]
    image_nodes = [
        node for node in material.node_tree.nodes
        if node.type == "TEX_IMAGE" and node.image and "basecolor" in node.image.name.lower()
    ]
    if not image_nodes:
        raise RuntimeError(f"No body base-colour texture found in {path}")
    image = image_nodes[0].image
    image.filepath_raw = str(out_dir / f"{avatar}-skin-basecolor.png")
    image.file_format = "PNG"
    image.save()
    print("EXPORTED", avatar, image.name, image.size[:], image.filepath_raw)
