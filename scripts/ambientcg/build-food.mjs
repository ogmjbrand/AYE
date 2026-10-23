/**
 * Builds the 3D food (ambientCG, CC0; credits in public/assets/CREDITS.md)
 * from the unzipped OBJ downloads in assets-src/ambientcg/ (git-ignored):
 *
 *   node scripts/ambientcg/build-food.mjs
 *
 * Each OBJ is read here (positions, normals, UVs; faces fanned into
 * triangles), given its colour, normal and AO maps, simplified to a game-sized
 * mesh, and written as public/assets/models/food/<name>.glb (meshopt, WebP).
 */
import { readFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const SRC = 'assets-src/ambientcg';
const OUT = 'public/assets/models/food';

/** Game name → ambientCG asset. */
const FOOD = {
  'bread-loaf': '3DBread012', 'bread-rustic': '3DBread005', 'bread-roll': '3DBread006', 'bread-baguette': '3DBread007',
  cookie: '3DCookie001', avocado: '3DAvocado001', kiwi: '3DKiwi001', pear: '3DPear001', 'pear-green': '3DPear002',
  pastry: '3DPastry003', cake: '3DCake001', apple: '3DApple002', 'apple-red': '3DApple003', melon: '3DMelon001',
};

function parseObj(text) {
  const v = [], vt = [], vn = [];
  const pos = [], uv = [], nor = [];
  const key = new Map();
  const idx = [];
  const vert = (s) => {
    let k = key.get(s);
    if (k !== undefined) return k;
    const [a, b, c] = s.split('/').map((x) => (x ? parseInt(x, 10) - 1 : -1));
    pos.push(...v[a]);
    uv.push(...(b >= 0 ? [vt[b][0], 1 - vt[b][1]] : [0, 0]));
    nor.push(...(c >= 0 ? vn[c] : [0, 1, 0]));
    k = pos.length / 3 - 1;
    key.set(s, k);
    return k;
  };
  for (const line of text.split('\n')) {
    const p = line.trim().split(/\s+/);
    if (p[0] === 'v') v.push([+p[1], +p[2], +p[3]]);
    else if (p[0] === 'vt') vt.push([+p[1], +p[2]]);
    else if (p[0] === 'vn') vn.push([+p[1], +p[2], +p[3]]);
    else if (p[0] === 'f') {
      const f = p.slice(1).map(vert);
      for (let i = 1; i + 1 < f.length; i++) idx.push(f[0], f[i], f[i + 1]);
    }
  }
  return { pos: new Float32Array(pos), uv: new Float32Array(uv), nor: new Float32Array(nor), idx: new Uint32Array(idx) };
}

mkdirSync(OUT, { recursive: true });
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

for (const [name, id] of Object.entries(FOOD)) {
  const dir = `${SRC}/${id}_HQ-1K-JPG`;
  const base = `${dir}/${id}_HQ-1K-JPG`;
  if (!existsSync(`${base}.obj`)) { console.log('missing', id); continue; }
  const { pos, uv, nor, idx } = parseObj(readFileSync(`${base}.obj`, 'utf8'));
  const doc = new Document();
  const buf = doc.createBuffer();
  const acc = (arr, type) => doc.createAccessor().setArray(arr).setType(type).setBuffer(buf);
  const tex = async (suffix, mime = 'image/jpeg') => {
    const f = `${base}_${suffix}.jpg`;
    return existsSync(f) ? doc.createTexture(suffix).setImage(readFileSync(f)).setMimeType(mime) : null;
  };
  const mat = doc.createMaterial(name).setRoughnessFactor(0.75).setMetallicFactor(0);
  const color = await tex('Color');
  const normal = await tex('NormalGL');
  const ao = await tex('AmbientOcclusion');
  if (color) mat.setBaseColorTexture(color);
  if (normal) mat.setNormalTexture(normal);
  if (ao) mat.setOcclusionTexture(ao);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', acc(pos, 'VEC3'))
    .setAttribute('NORMAL', acc(nor, 'VEC3'))
    .setAttribute('TEXCOORD_0', acc(uv, 'VEC2'))
    .setIndices(acc(idx, 'SCALAR'))
    .setMaterial(mat);
  const mesh = doc.createMesh(name).addPrimitive(prim);
  doc.createScene().addChild(doc.createNode(name).setMesh(mesh));
  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, 9000 / (idx.length / 3)), error: 0.002 }),
    prune(),
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 80 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  doc.createExtension(EXTMeshoptCompression).setRequired(true);
  await io.write(`${OUT}/${name}.glb`, doc);
  console.log(name, `${(idx.length / 3) | 0} tris in`, `${statSync(`${OUT}/${name}.glb`).size >> 10} KB`);
}
