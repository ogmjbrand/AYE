// Builds the MakeHuman body used for body-type selection (CC0 data from the MPFB repository).
//
//   node scripts/makehuman/build-body.mjs
//
// 1. Downloads (once, into assets-src/makehuman/cache/) the shape targets, the game-engine rig and its weights.
// 2. Bakes an adult African female base onto the MakeHuman base mesh.
// 3. Poses the arms down by the shoulders with the rig's own skin weights (linear blend skinning), so the
//    figure stands like a body-type chart instead of in MakeHuman's arms-out pose.
// 4. Writes public/assets/characters/mh/female-body.glb: one mesh with real morph targets (weight, muscle,
//    cup size, bust, waist, hips, belly, buttocks, hip width) on the body, eyes and scalp, each target posed
//    the same way and with its own normals, plus a `_REST` attribute (unposed position) that the swimwear
//    shader uses to place a two-piece on the body.
//
// Units: the base mesh is in decimetres, Y up, facing +Z; the GLB is in metres with the feet at y = 0.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { Document, NodeIO } from '@gltf-transform/core';

const ROOT = new URL('../../', import.meta.url);
const MPFB = 'https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/src/mpfb/data';
const CACHE = new URL('assets-src/makehuman/cache/', ROOT);
const OUT = new URL('public/assets/characters/mh/', ROOT);
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

async function cached(rel) {
  const file = new URL(rel.replaceAll('/', '__'), CACHE);
  if (!existsSync(file)) {
    const res = await fetch(`${MPFB}/${rel}`);
    if (!res.ok) throw new Error(`Download failed (${res.status}): ${rel}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFileSync(file);
}
const targetText = async (rel) => gunzipSync(await cached(`targets/${rel}.target.gz`)).toString('utf8');

// ---------------------------------------------------------------- base mesh
const obj = readFileSync(new URL('assets-src/makehuman/base/base.obj', ROOT), 'utf8').split('\n');
const base = [];
const groups = new Map();
let group = '';
for (const l of obj) {
  if (l.startsWith('v ')) base.push(l.split(/\s+/).slice(1, 4).map(Number));
  else if (l.startsWith('g ')) group = l.slice(2).trim();
  else if (l.startsWith('f ')) {
    const idx = l.split(/\s+/).slice(1).filter(Boolean).map((t) => parseInt(t.split('/')[0], 10) - 1);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(idx);
  }
}
const N = base.length;

function parseTarget(text) {
  const d = new Float32Array(N * 3);
  for (const l of text.split('\n')) {
    const p = l.trim().split(/\s+/);
    if (p.length < 4 || p[0].startsWith('#')) continue;
    const i = parseInt(p[0], 10);
    d[i * 3] = +p[1]; d[i * 3 + 1] = +p[2]; d[i * 3 + 2] = +p[3];
  }
  return d;
}

// Adult African woman, average muscle and weight (MakeHuman's macro targets)
const rest = new Float32Array(N * 3);
base.forEach((v, i) => rest.set(v, i * 3));
const female = parseTarget(await targetText('macrodetails/african-female-young'));
for (let i = 0; i < rest.length; i++) rest[i] += female[i];

// Body-shape morphs: [name, target, scale]
const MORPHS = [
  ['weightUp', 'macrodetails/universal-female-young-averagemuscle-maxweight', 1],
  ['weightDown', 'macrodetails/universal-female-young-averagemuscle-minweight', 1],
  ['muscleUp', 'macrodetails/universal-female-young-maxmuscle-averageweight', 1],
  ['muscleDown', 'macrodetails/universal-female-young-minmuscle-averageweight', 1],
  ['cupUp', 'breast/female-young-averagemuscle-averageweight-maxcup-averagefirmness', 1],
  ['cupDown', 'breast/female-young-averagemuscle-averageweight-mincup-averagefirmness', 1],
  ['bust', 'torso/measure-bust-circ-incr', 1],
  ['waistIn', 'torso/measure-waist-circ-decr', 1],
  ['waistOut', 'torso/measure-waist-circ-incr', 1],
  ['hips', 'torso/measure-hips-circ-incr', 1],
  ['hipWidth', 'hip/hip-scale-horiz-incr', 1],
  ['belly', 'stomach/stomach-pregnant-incr', 0.7],
  ['buttocks', 'buttocks/buttocks-volume-incr', 1],
];
const deltas = [];
for (const [, rel, scale] of MORPHS) {
  const d = parseTarget(await targetText(rel));
  if (scale !== 1) for (let i = 0; i < d.length; i++) d[i] *= scale;
  deltas.push(d);
}

// ---------------------------------------------------------------- arms down
const rig = JSON.parse((await cached('rigs/standard/rig.game_engine.json')).toString('utf8'));
const weights = JSON.parse((await cached('rigs/standard/weights.game_engine.json')).toString('utf8')).weights;
const centre = (name, pos) => {
  const verts = new Set(groups.get(name).flat());
  const c = [0, 0, 0];
  for (const v of verts) for (let k = 0; k < 3; k++) c[k] += pos[v * 3 + k] / verts.size;
  return c;
};
const subtree = (root) => Object.keys(rig).filter((b) => { for (let x = b; x; x = rig[x].parent) if (x === root) return true; return false; });
const armWeight = (side) => {
  const w = new Float32Array(N);
  for (const b of subtree(`upperarm_${side}`)) for (const [i, v] of weights[b] ?? []) w[i] += v;
  return w;
};
/** Angle of the upper arm from straight down (radians), in the front plane. */
const DOWN = 0.2;
const arms = ['l', 'r'].map((side) => {
  const shoulder = centre(`joint-${side}-shoulder`, rest);
  const elbow = centre(`joint-${side}-elbow`, rest);
  const sign = Math.sign(elbow[0] - shoulder[0]);
  const now = Math.atan2(Math.abs(elbow[0] - shoulder[0]), shoulder[1] - elbow[1]);
  return { shoulder, w: armWeight(side), angle: -sign * (now - DOWN), sign, now };
});
console.log('arms out at', arms.map((a) => ((a.now * 180) / Math.PI).toFixed(0) + '°').join(', '), '→', ((DOWN * 180) / Math.PI).toFixed(0) + '°');

function pose(pos, extra = 0) {
  const out = new Float32Array(pos);
  for (const a of arms) {
    const ang = a.angle + a.sign * extra;
    const c = Math.cos(ang), s = Math.sin(ang);
    for (let i = 0; i < N; i++) {
      const w = Math.min(1, a.w[i]);
      if (w <= 0) continue;
      const x = pos[i * 3] - a.shoulder[0], y = pos[i * 3 + 1] - a.shoulder[1];
      out[i * 3] += w * (a.shoulder[0] + c * x - s * y - pos[i * 3]);
      out[i * 3 + 1] += w * (a.shoulder[1] + s * x + c * y - pos[i * 3 + 1]);
    }
  }
  return out;
}
const posed = pose(rest);
const morphPositions = deltas.map((d) => pose(rest.map((v, i) => v + d[i])));
// Fuller figures hold their arms a little further out, so they don't sink into the hips
MORPHS.push(['armsOut', '', 1]);
morphPositions.push(pose(rest, 0.32));

// ---------------------------------------------------------------- export
// Hair cap: the body's own scalp faces (above the brows, with the hairline set back over the forehead and
// clear of the ears), exported as a separate shell so hair fits the head exactly and follows every morph
const eyeVerts = [...new Set([...groups.get('helper-l-eye'), ...groups.get('helper-r-eye')].flat())];
const eyeY = eyeVerts.reduce((s, v) => s + rest[v * 3 + 1], 0) / eyeVerts.length;
const headFront = Math.max(...[...new Set(groups.get('body').flat())].filter((v) => rest[v * 3 + 1] > eyeY).map((v) => rest[v * 3 + 2]));
const onScalp = (v) => {
  const x = Math.abs(rest[v * 3]), y = rest[v * 3 + 1] - eyeY, z = rest[v * 3 + 2];
  if (y < -0.75) return false; // nape and neck
  if (z > headFront - 0.95 && y < 0.95) return false; // the face, up to the hairline
  if (x > 0.5 && y < 0.5 && z > headFront - 1.55) return false; // ears and temples
  return true;
};
groups.set('cap', groups.get('body').filter((f) => f.every(onScalp)));
const PRIMS = [['body', ['body']], ['eyes', ['helper-l-eye', 'helper-r-eye']], ['cap', ['cap']]];
let minY = Infinity;
for (const f of groups.get('body')) for (const v of f) minY = Math.min(minY, posed[v * 3 + 1]);
const toM = (arr, idx) => { const o = new Float32Array(idx.length * 3); idx.forEach((v, i) => { o[i * 3] = arr[v * 3] * 0.1; o[i * 3 + 1] = (arr[v * 3 + 1] - minY) * 0.1; o[i * 3 + 2] = arr[v * 3 + 2] * 0.1; }); return o; };
function normals(pos, tris, count) {
  const n = new Float32Array(count * 3);
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]];
    const ax = pos[b * 3] - pos[a * 3], ay = pos[b * 3 + 1] - pos[a * 3 + 1], az = pos[b * 3 + 2] - pos[a * 3 + 2];
    const bx = pos[c * 3] - pos[a * 3], by = pos[c * 3 + 1] - pos[a * 3 + 1], bz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    for (const v of [a, b, c]) { n[v * 3] += nx; n[v * 3 + 1] += ny; n[v * 3 + 2] += nz; }
  }
  for (let i = 0; i < count; i++) { const l = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]) || 1; n[i * 3] /= l; n[i * 3 + 1] /= l; n[i * 3 + 2] /= l; }
  return n;
}

const doc = new Document();
const buf = doc.createBuffer();
const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
const mesh = doc.createMesh('female-body');
for (const [name, gs] of PRIMS) {
  const faces = gs.flatMap((g) => groups.get(g));
  const used = [...new Set(faces.flat())].sort((a, b) => a - b);
  const remap = new Map(used.map((v, i) => [v, i]));
  const tris = [];
  for (const f of faces) for (let i = 1; i + 1 < f.length; i++) tris.push(remap.get(f[0]), remap.get(f[i]), remap.get(f[i + 1]));
  const index = new Uint32Array(tris);
  const p0 = toM(posed, used);
  const n0 = normals(p0, index, used.length);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', acc('VEC3', p0))
    .setAttribute('NORMAL', acc('VEC3', n0))
    .setAttribute('_REST', acc('VEC3', toM(rest, used)))
    .setIndices(acc('SCALAR', index));
  // Distinct colours keep the three materials apart when the file is optimised
  prim.setMaterial(doc.createMaterial(name).setBaseColorFactor({ body: [0.35, 0.22, 0.15, 1], eyes: [0.9, 0.9, 0.88, 1], cap: [0.05, 0.04, 0.04, 1] }[name]));
  morphPositions.forEach((mp, k) => {
    const pk = toM(mp, used);
    const nk = normals(pk, index, used.length);
    const dp = pk.map((v, i) => v - p0[i]);
    const dn = nk.map((v, i) => v - n0[i]);
    prim.addTarget(doc.createPrimitiveTarget(MORPHS[k][0]).setAttribute('POSITION', acc('VEC3', dp)).setAttribute('NORMAL', acc('VEC3', dn)));
  });
  mesh.addPrimitive(prim);
  console.log(name, 'vertices', used.length, 'triangles', index.length / 3);
}
const names = MORPHS.map((m) => m[0]);
mesh.setWeights(names.map(() => 0)).setExtras({ targetNames: names });

// Landmarks (metres, rest pose) for the swimwear shader
const R = (i) => [rest[i * 3] * 0.1, (rest[i * 3 + 1] - minY) * 0.1, rest[i * 3 + 2] * 0.1];
const bodyVerts = [...new Set(groups.get('body').flat())];
const height = Math.max(...bodyVerts.map((v) => R(v)[1]));
const inBand = (lo, hi) => bodyVerts.filter((v) => { const y = R(v)[1] / height; return y > lo && y < hi; });
const nipple = inBand(0.66, 0.78).filter((v) => R(v)[0] > 0.03).reduce((a, b) => (R(b)[2] > R(a)[2] ? b : a));
const pelvis = centre('joint-pelvis', rest).map((v, k) => (k === 1 ? (v - minY) * 0.1 : v * 0.1));
const crotch = inBand(0.4, 0.55).filter((v) => Math.abs(R(v)[0]) < 0.006).reduce((a, b) => (R(b)[1] < R(a)[1] ? b : a));
// Widest point of the hips (ignoring the hands, which hang at hip height in the rest pose)
const hipSide = inBand(0.5, 0.56).filter((v) => arms.every((x) => x.w[v] < 0.01)).reduce((a, b) => (R(b)[0] > R(a)[0] ? b : a));
const landmarks = { height, nipple: R(nipple), pelvis, crotch: R(crotch), hipSide: R(hipSide) };
console.log('landmarks', JSON.stringify(landmarks, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)));
doc.createScene('body').addChild(doc.createNode('female-body').setMesh(mesh).setExtras({ landmarks }));
// Written uncompressed to the cache, then optimised (meshopt) into public/ for the game
const raw = new URL('female-body.raw.glb', CACHE).pathname;
await new NodeIO().write(raw, doc);
const opt = spawnSync(process.execPath, [new URL('scripts/optimize-glb.mjs', ROOT).pathname, raw, new URL('female-body.glb', OUT).pathname], { stdio: 'inherit' });
if (opt.status !== 0) process.exit(opt.status ?? 1);
writeFileSync(new URL('female-body.json', OUT), JSON.stringify({ morphs: names, landmarks }, null, 2));
console.log('wrote public/assets/characters/mh/female-body.glb');
