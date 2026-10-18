// Builds a test GLB: the MakeHuman base body with targets from assets-src/makehuman as morph targets.
// Usage: node scripts/makehuman/build-test.mjs [out.glb]   (run fetch-base.mjs first)
import { readFileSync } from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
const root = new URL('../../assets-src/makehuman/', import.meta.url).pathname;
const objPath = `${root}base/base.obj`;
const packs = root.replace(/\/$/, '');
const out = process.argv[2] ?? 'makehuman-test.glb';
const lines = readFileSync(objPath, 'utf8').split('\n');
const verts = [];
const faces = [];
let group = '';
for (const l of lines) {
  if (l.startsWith('v ')) verts.push(l.split(/\s+/).slice(1, 4).map(Number));
  else if (l.startsWith('g ')) group = l.slice(2).trim();
  else if (l.startsWith('f ') && group === 'body') {
    const idx = l.split(/\s+/).slice(1).filter(Boolean).map((t) => parseInt(t.split('/')[0], 10) - 1);
    for (let i = 1; i + 1 < idx.length; i++) faces.push(idx[0], idx[i], idx[i + 1]);
  }
}
// Keep only vertices the body uses, remembering the mapping for targets
const used = [...new Set(faces)].sort((a, b) => a - b);
const remap = new Map(used.map((v, i) => [v, i]));
const pos = new Float32Array(used.length * 3);
used.forEach((v, i) => pos.set(verts[v], i * 3));
const index = new Uint32Array(faces.map((v) => remap.get(v)));
const readTarget = (file) => {
  const d = new Float32Array(used.length * 3);
  for (const l of readFileSync(file, 'utf8').split('\n')) {
    const p = l.trim().split(/\s+/);
    if (p.length < 4 || p[0].startsWith('#')) continue;
    const i = remap.get(parseInt(p[0], 10));
    if (i === undefined) continue;
    d[i * 3] = +p[1]; d[i * 3 + 1] = +p[2]; d[i * 3 + 2] = +p[3];
  }
  return d;
};
const combine = (...ds) => ds.reduce((a, b) => a.map((v, i) => v + b[i]));
const t = (rel) => readTarget(`${packs}/targets/${rel}.target`);
const morphs = {
  smile: combine(t('faceunits/mouthSmileLeft'), t('faceunits/mouthSmileRight'), t('faceunits/cheekSquintLeft'), t('faceunits/cheekSquintRight')),
  blink: combine(t('faceunits/eyeBlinkLeft'), t('faceunits/eyeBlinkRight')),
  surprise: combine(t('faceunits/jawOpen'), t('faceunits/browInnerUp'), t('faceunits/eyeWideLeft'), t('faceunits/eyeWideRight')),
  noseBulbous: t('nose/elvs_bulbous_nose_1'),
  noseWide: t('nose/elvs_nose_widening_1'),
  earsFlap: t('ears/elvs_flap_ears_2'),
};
const doc = new Document();
const buf = doc.createBuffer();
const prim = doc.createPrimitive()
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf))
  .setIndices(doc.createAccessor().setType('SCALAR').setArray(index).setBuffer(buf));
const names = Object.keys(morphs);
for (const n of names) prim.addTarget(doc.createPrimitiveTarget(n).setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(morphs[n]).setBuffer(buf)));
const mesh = doc.createMesh('mh-base').addPrimitive(prim).setWeights(names.map(() => 0)).setExtras({ targetNames: names });
doc.createScene().addChild(doc.createNode('body').setMesh(mesh));
await new NodeIO().write(out, doc);
console.log('vertices', used.length, 'triangles', index.length / 3, 'morphs', names.join(','));
