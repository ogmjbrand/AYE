// Builds a game-ready GLB from a Microsoft Rocketbox avatar (MIT licence).
// Steps before running (see scripts/rocketbox/README.md):
//   1. FBX2glTF converts the avatar FBX and three animation FBXs to GLB.
//   2. convert-textures.py turns the TGA textures into JPG/PNG.
// Then:
//   node scripts/rocketbox/build-avatar.mjs <avatar.glb> <idle.glb> <walk.glb> <run.glb> <textureDir> <out.glb>
// and shrink it with npm run assets:optimize.
//
// What it does: copies the three clips onto the avatar (same Biped skeleton, so
// no retargeting), renames them Idle / Walk / Run, removes the forward travel
// baked into the walk and run clips so they play in place (the game moves the
// character itself), drops the 3ds Max "Footsteps" helper track and attaches
// PBR textures (colour, normal, roughness) to the body and head materials.
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { NodeIO } from '@gltf-transform/core';

const [avatarPath, idlePath, walkPath, runPath, texDir, outPath] = process.argv.slice(2);
if (!outPath) {
  console.log('Usage: node scripts/rocketbox/build-avatar.mjs <avatar.glb> <idle.glb> <walk.glb> <run.glb> <textureDir> <out.glb>');
  process.exit(1);
}

const io = new NodeIO();
const doc = await io.read(avatarPath);
const root = doc.getRoot();
const buffer = root.listBuffers()[0];
const nodesByName = new Map(root.listNodes().map((n) => [n.getName(), n]));

// Clips from the FBX conversion carry the takes' default name; drop any.
for (const a of root.listAnimations()) a.dispose();

async function addClip(path, name, inPlace) {
  const src = (await io.read(path)).getRoot().listAnimations()[0];
  if (!src) throw new Error(`${basename(path)} has no animation`);
  const anim = doc.createAnimation(name);
  let skipped = 0;
  for (const ch of src.listChannels()) {
    const nodeName = ch.getTargetNode()?.getName();
    if (!nodeName || nodeName === 'Bip01 Footsteps') continue;
    const target = nodesByName.get(nodeName);
    if (!target) { skipped++; continue; }
    const s = ch.getSampler();
    const input = s.getInput();
    const output = s.getOutput();
    const out = output.getArray().slice();
    if (inPlace && nodeName === 'Bip01' && ch.getTargetPath() === 'translation') {
      // Keep the vertical bob, remove travel along the ground (glTF X and Z)
      for (let i = 0; i < out.length; i += 3) {
        out[i] = out[0];
        out[i + 2] = out[2];
      }
    }
    const inAcc = doc.createAccessor().setType(input.getType()).setArray(input.getArray().slice()).setBuffer(buffer);
    const outAcc = doc.createAccessor().setType(output.getType()).setArray(out).setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(inAcc).setOutput(outAcc).setInterpolation(s.getInterpolation());
    anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(target).setTargetPath(ch.getTargetPath()).setSampler(sampler));
  }
  const times = src.listChannels()[0].getSampler().getInput().getArray();
  console.log(`${name}: ${anim.listChannels().length} channels, ${times[times.length - 1].toFixed(2)} s${skipped ? `, ${skipped} channels for missing bones skipped` : ''}`);
}

await addClip(idlePath, 'Idle', false);
await addClip(walkPath, 'Walk', true);
await addClip(runPath, 'Run', true);

const texture = (file, mime) => doc.createTexture(basename(file)).setImage(readFileSync(file)).setMimeType(mime).setURI(basename(file));

for (const m of root.listMaterials()) {
  if (/_opacity$/i.test(m.getName()) && existsSync(`${texDir}/opacity_color.png`)) {
    // Eyelashes: cut-out alpha, visible from both sides
    m.setBaseColorFactor([1, 1, 1, 1])
      .setBaseColorTexture(texture(`${texDir}/opacity_color.png`, 'image/png'))
      .setMetallicFactor(0)
      .setRoughnessFactor(0.7)
      .setAlphaMode('MASK')
      .setAlphaCutoff(0.4)
      .setDoubleSided(true);
    console.log(`material ${m.getName()}: cut-out texture attached`);
    continue;
  }
  const part = /_head$/i.test(m.getName()) ? 'head' : /_body$/i.test(m.getName()) ? 'body' : null;
  if (!part) { console.log(`material ${m.getName()}: left as is`); continue; }
  m.setBaseColorFactor([1, 1, 1, 1])
    .setBaseColorTexture(texture(`${texDir}/${part}_color.jpg`, 'image/jpeg'))
    .setNormalTexture(texture(`${texDir}/${part}_normal.jpg`, 'image/jpeg'))
    .setMetallicRoughnessTexture(texture(`${texDir}/${part}_orm.png`, 'image/png'))
    .setMetallicFactor(0)
    .setRoughnessFactor(1)
    .setAlphaMode('OPAQUE')
    .setDoubleSided(false);
  console.log(`material ${m.getName()}: ${part} textures attached`);
}

await io.write(outPath, doc);
console.log(`wrote ${outPath}`);
