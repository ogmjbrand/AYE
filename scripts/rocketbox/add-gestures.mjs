// Adds Rocketbox clips (MIT licence) straight from their FBX files to a body
// type's gesture file, keeping the clips already in it. Needs no converter:
// three.js's FBXLoader reads the animation, which matches FBX2glTF's output
// (checked against the Sit clip: same rotations, positions in centimetres).
//   node scripts/rocketbox/add-gestures.mjs <gestures.glb> <out.glb> <Name>=<clip.fbx> ...
// Then shrink the result: npm run assets:optimize -- <out.glb> <gestures.glb>
//
// As in build-gestures.mjs, the 3ds Max "Footsteps" helper is dropped and the
// root's travel over the ground is held at its first frame, so a clip plays
// on the spot (sitting down ends with the pelvis over the character's origin,
// as the seated clip has it) and the game moves the character itself.
import { readFileSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const [inPath, outPath, ...pairs] = process.argv.slice(2);
if (!inPath || !outPath || pairs.length === 0 || pairs.some((p) => !p.includes('='))) {
  console.log('Usage: node scripts/rocketbox/add-gestures.mjs <gestures.glb> <out.glb> <Name>=<clip.fbx> ...');
  process.exit(1);
}

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inPath);
const root = doc.getRoot();
const buffer = root.listBuffers()[0] ?? doc.createBuffer();
const scene = root.getDefaultScene() ?? root.listScenes()[0];
const nodes = new Map(root.listNodes().map((n) => [n.getName(), n]));
const nodeFor = (name) => {
  if (!nodes.has(name)) {
    const n = doc.createNode(name);
    scene.addChild(n);
    nodes.set(name, n);
  }
  return nodes.get(name);
};
const PATHS = { position: 'translation', quaternion: 'rotation' };
const CM = 0.01;

for (const pair of pairs) {
  const [name, path] = pair.split('=');
  if (root.listAnimations().some((a) => a.getName() === name)) throw new Error(`${inPath} already has a clip called ${name}`);
  const bytes = readFileSync(path);
  const clip = new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '').animations[0];
  if (!clip) throw new Error(`${path} has no animation`);
  const anim = doc.createAnimation(name);
  for (const track of clip.tracks) {
    const dot = track.name.lastIndexOf('.');
    // three.js names nodes with spaces turned into underscores; the Biped's names use spaces
    const bone = track.name.slice(0, dot).replaceAll('_', ' ');
    const target = PATHS[track.name.slice(dot + 1)];
    if (!target || bone === 'Bip01 Footsteps') continue;
    const out = Float32Array.from(track.values);
    if (target === 'translation') {
      for (let i = 0; i < out.length; i++) out[i] *= CM;
      if (bone === 'Bip01') {
        // Keep the vertical motion, hold the position on the ground
        for (let i = 0; i < out.length; i += 3) {
          out[i] = out[0];
          out[i + 2] = out[2];
        }
      }
    }
    const input = doc.createAccessor().setType('SCALAR').setArray(Float32Array.from(track.times)).setBuffer(buffer);
    const output = doc.createAccessor().setType(target === 'rotation' ? 'VEC4' : 'VEC3').setArray(out).setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
    anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(nodeFor(bone)).setTargetPath(target).setSampler(sampler));
  }
  console.log(`${name}: ${anim.listChannels().length} channels, ${clip.duration.toFixed(2)} s`);
}

// Written uncompressed; assets:optimize compresses it again
for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'EXT_meshopt_compression') ext.dispose();
await io.write(outPath, doc);
console.log(`wrote ${outPath}`);
