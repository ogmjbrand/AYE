// Builds a clips-only GLB of Rocketbox gestures (MIT licence) shared by every
// look of one body type: they are on the same Biped skeleton, so three.js binds
// the tracks to any avatar by bone name and no mesh is needed.
//   node scripts/rocketbox/build-gestures.mjs <out.glb> <Name>=<clip.glb> ...
// Each clip.glb is a FBX2glTF conversion of one animation FBX (see README.md).
// The 3ds Max "Footsteps" helper track and any root travel are dropped, so a
// gesture plays on the spot. Then shrink it with npm run assets:optimize.
import { Document, NodeIO } from '@gltf-transform/core';

const [outPath, ...pairs] = process.argv.slice(2);
if (!outPath || pairs.length === 0 || pairs.some((p) => !p.includes('='))) {
  console.log('Usage: node scripts/rocketbox/build-gestures.mjs <out.glb> <Name>=<clip.glb> ...');
  process.exit(1);
}

const io = new NodeIO();
const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('Gestures');
doc.getRoot().setDefaultScene(scene);
// One node per bone name, flat: animation tracks only need the names to match
const nodes = new Map();
const nodeFor = (name) => {
  if (!nodes.has(name)) {
    const n = doc.createNode(name);
    scene.addChild(n);
    nodes.set(name, n);
  }
  return nodes.get(name);
};

for (const pair of pairs) {
  const [name, path] = pair.split('=');
  const src = (await io.read(path)).getRoot().listAnimations()[0];
  if (!src) throw new Error(`${path} has no animation`);
  const anim = doc.createAnimation(name);
  for (const ch of src.listChannels()) {
    const bone = ch.getTargetNode()?.getName();
    if (!bone || bone === 'Bip01 Footsteps') continue;
    const s = ch.getSampler();
    const out = s.getOutput().getArray().slice();
    if (bone === 'Bip01' && ch.getTargetPath() === 'translation') {
      // Keep the vertical motion, hold the position on the ground
      for (let i = 0; i < out.length; i += 3) {
        out[i] = out[0];
        out[i + 2] = out[2];
      }
    }
    const input = doc.createAccessor().setType('SCALAR').setArray(s.getInput().getArray().slice()).setBuffer(buffer);
    const output = doc.createAccessor().setType(s.getOutput().getType()).setArray(out).setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation(s.getInterpolation());
    anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(nodeFor(bone)).setTargetPath(ch.getTargetPath()).setSampler(sampler));
  }
  const times = src.listChannels()[0].getSampler().getInput().getArray();
  console.log(`${name}: ${anim.listChannels().length} channels, ${times[times.length - 1].toFixed(2)} s`);
}

doc.getRoot().getAsset().copyright = 'Microsoft Rocketbox animations, MIT licence';
await io.write(outPath, doc);
console.log(`wrote ${outPath}`);
