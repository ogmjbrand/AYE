/**
 * Builds the photoreal furniture used in venues and the Luxe collection from
 * the Khronos glTF sample models (CC0 and CC-BY 4.0, see public/assets/CREDITS.md).
 *
 *   node scripts/khronos/build-furniture.mjs [output names…]   (no names: build them all)
 *
 * Downloads go to assets-src/khronos/cache/ (git-ignored). For each model the
 * chosen colour (KHR_materials_variants) is baked in, lights and unused
 * materials are dropped, textures become WebP at a sensible size and meshes are
 * meshopt-compressed. Output: public/assets/models/furniture/*.glb
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, meshopt, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const SRC = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models';
const CACHE = 'assets-src/khronos/cache';
const OUT = 'public/assets/models/furniture';

/** name: [source model, variant to bake (or null), output file, max texture size] */
const BUILDS = [
  ['GlamVelvetSofa', 'champagne', 'sofa-velvet-champagne', 1024],
  ['GlamVelvetSofa', 'palepink', 'sofa-velvet-blush', 1024],
  ['SheenChair', 'Peacock Velvet', 'chair-velvet-peacock', 1024],
  ['SheenChair', 'Mango Velvet', 'chair-velvet-mango', 1024],
  ['GlassVaseFlowers', null, 'vase-flowers', 512],
  ['DiffuseTransmissionPlant', null, 'plant-potted', 512],
];
const only = process.argv.slice(2);

mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

for (const [model, variant, out, size] of BUILDS) {
  if (only.length && !only.includes(out)) continue;
  const file = `${CACHE}/${model}.glb`;
  if (!existsSync(file)) {
    const res = await fetch(`${SRC}/${model}/glTF-Binary/${model}.glb`);
    if (!res.ok) throw new Error(`${model}: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  const doc = await io.read(file);
  const root = doc.getRoot();
  // Bake the chosen variant: point each primitive at that variant's material
  const variantsExt = root.listExtensionsUsed().find((e) => e.extensionName === 'KHR_materials_variants');
  if (variantsExt) {
    if (variant) {
      for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
        const mv = prim.getExtension('KHR_materials_variants');
        if (!mv) continue;
        for (const mapping of mv.listMappings()) {
          if (mapping.listVariants().some((v) => v.getName().toLowerCase().includes(variant.toLowerCase()))) prim.setMaterial(mapping.getMaterial());
        }
      }
    }
    variantsExt.dispose();
  }
  // The vase model shows two vases side by side (alpha vs transmission glass): keep the transmission one, centred
  if (model === 'GlassVaseFlowers') {
    for (const n of root.listNodes()) {
      if (n.getName() === 'Flowers1' || n.getName() === 'GlassAlpha') n.dispose();
      else { const t = n.getTranslation(); n.setTranslation([t[0] - 0.12, t[1], t[2]]); }
    }
  }
  root.listExtensionsUsed().find((e) => e.extensionName === 'KHR_lights_punctual')?.dispose();
  for (const a of root.listAnimations()) a.dispose();
  await doc.transform(
    prune(),
    dedup(),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  doc.createExtension(EXTMeshoptCompression).setRequired(true);
  await io.write(`${OUT}/${out}.glb`, doc);
  console.log(out, `${(await import('node:fs')).statSync(`${OUT}/${out}.glb`).size >> 10} KB`);
}
