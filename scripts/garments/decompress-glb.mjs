// Write a plain copy of a game GLB that Blender's importer can read: meshopt compression
// removed and quantised attributes turned back into floats. The copy is for the garment
// pipeline only (scripts/garments/drape-in-blender.py) and stays out of the repo.
//
//   node scripts/garments/decompress-glb.mjs public/assets/models/characters/rocketbox/<person>.glb <out.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('usage: node scripts/garments/decompress-glb.mjs <in.glb> <out.glb>');
  process.exit(1);
}
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(input);
await doc.transform(dequantize());
for (const ext of doc.getRoot().listExtensionsUsed()) {
  if (ext.extensionName === EXTMeshoptCompression.EXTENSION_NAME || ext.extensionName === KHRMeshQuantization.EXTENSION_NAME) ext.dispose();
}
await io.write(output, doc);
console.log(`wrote ${output}`);
