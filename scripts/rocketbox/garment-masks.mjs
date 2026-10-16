// Builds "garment maps" for a Rocketbox avatar so the game can restyle its
// clothes and hair: which texels of the body texture are the top, the
// bottom and the shoes, and which texels of the head texture are hair or
// headwear. Everything that looks like the person's own skin is left out.
//
//   node scripts/rocketbox/garment-masks.mjs <built.glb> <textureDir> <outDir> <id>
//
// <built.glb> is the un-optimised output of build-avatar.mjs (float
// positions); <textureDir> holds body_color.jpg and head_color.jpg from
// convert-textures.py. Writes <outDir>/<id>-body.png (R top, G bottom,
// B shoes) and <outDir>/<id>-head.png (R hair/headwear).
//
// Method: every triangle is rasterised into texture space with its bind-pose
// height interpolated per texel. Height bands (as fractions of standing
// height) decide top / bottom / shoes; the hands give the skin colour, and
// texels close to it in Lab colour space are excluded.
import { mkdirSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';

const [glbPath, texDir, outDir, id] = process.argv.slice(2);
if (!id) {
  console.log('Usage: node scripts/rocketbox/garment-masks.mjs <built.glb> <textureDir> <outDir> <id>');
  process.exit(1);
}

const SIZE = 512;
// Fractions of standing height
const SHOE_TOP = 0.07;
// Low enough that untucked tops keep their hem
const WAIST = 0.535;
const HAIR_LINE = 0.945;

const doc = await new NodeIO().read(glbPath);
const prims = [];
for (const mesh of doc.getRoot().listMeshes()) {
  for (const p of mesh.listPrimitives()) prims.push({ p, name: p.getMaterial()?.getName() ?? '' });
}
// Mesh space is Z-up (the node rotates it upright); -Y is the front
let height = 0;
let maxX = 0;
for (const { p } of prims) {
  const pos = p.getAttribute('POSITION');
  const v = [];
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, v);
    height = Math.max(height, v[2]);
    maxX = Math.max(maxX, Math.abs(v[0]));
  }
}

/** Rasterises a primitive into texture space; returns per-texel height, |x|, depth and coverage. */
function rasterise(p) {
  const z = new Float32Array(SIZE * SIZE).fill(NaN);
  const ax = new Float32Array(SIZE * SIZE);
  const y = new Float32Array(SIZE * SIZE);
  const pos = p.getAttribute('POSITION');
  const uv = p.getAttribute('TEXCOORD_0');
  const idx = p.getIndices();
  const tri = idx ? idx.getArray() : [...Array(pos.getCount()).keys()];
  const P = [[], [], []];
  const T = [[], [], []];
  for (let t = 0; t < tri.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      pos.getElement(tri[t + k], P[k]);
      uv.getElement(tri[t + k], T[k]);
    }
    // glTF UV origin is the top-left of the image
    const px = T.map((c) => c[0] * SIZE - 0.5);
    const py = T.map((c) => c[1] * SIZE - 0.5);
    const x0 = Math.max(0, Math.floor(Math.min(...px))), x1 = Math.min(SIZE - 1, Math.ceil(Math.max(...px)));
    const y0 = Math.max(0, Math.floor(Math.min(...py))), y1 = Math.min(SIZE - 1, Math.ceil(Math.max(...py)));
    const den = (py[1] - py[2]) * (px[0] - px[2]) + (px[2] - px[1]) * (py[0] - py[2]);
    if (Math.abs(den) < 1e-12) continue;
    for (let yy = y0; yy <= y1; yy++) {
      for (let xx = x0; xx <= x1; xx++) {
        const a = ((py[1] - py[2]) * (xx - px[2]) + (px[2] - px[1]) * (yy - py[2])) / den;
        const b = ((py[2] - py[0]) * (xx - px[2]) + (px[0] - px[2]) * (yy - py[2])) / den;
        const c = 1 - a - b;
        if (a < -0.01 || b < -0.01 || c < -0.01) continue;
        const i = yy * SIZE + xx;
        z[i] = (a * P[0][2] + b * P[1][2] + c * P[2][2]) / height;
        ax[i] = Math.abs(a * P[0][0] + b * P[1][0] + c * P[2][0]) / maxX;
        y[i] = a * P[0][1] + b * P[1][1] + c * P[2][1];
      }
    }
  }
  return { z, ax, y };
}

async function pixels(file) {
  return sharp(file).resize(SIZE, SIZE).removeAlpha().raw().toBuffer();
}

// sRGB -> CIE Lab, for perceptual colour distance
function lab(r, g, b) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const Y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const Z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

const body = prims.find((q) => /_body$/i.test(q.name));
const head = prims.find((q) => /_head$/i.test(q.name));
if (!body || !head) throw new Error(`expected *_body and *_head materials, found ${prims.map((q) => q.name).join(', ')}`);

const B = rasterise(body.p);
const bodyRgb = await pixels(`${texDir}/body_color.jpg`);

// Skin colour: the median of the hand texels (furthest out along the arms)
const hand = [];
for (let i = 0; i < SIZE * SIZE; i++) if (!Number.isNaN(B.z[i]) && B.ax[i] > 0.86) hand.push(lab(bodyRgb[i * 3], bodyRgb[i * 3 + 1], bodyRgb[i * 3 + 2]));
const median = (k) => hand.map((c) => c[k]).sort((a, b) => a - b)[Math.floor(hand.length / 2)];
const skin = [median(0), median(1), median(2)];
const notSkin = (rgb, i) => {
  const c = lab(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]);
  // Lightness matters less than hue (shading varies a lot across skin); skin is
  // redder than khaki or beige cloth, so the red-green axis counts most
  const d = Math.hypot((c[0] - skin[0]) * 0.5, (c[1] - skin[1]) * 1.4, c[2] - skin[2]);
  return smooth(10, 20, d);
};

/**
 * Morphological closing (max then min filter) over covered texels: fills thin
 * gaps such as beige stripes or blonde highlights that look like skin, without
 * growing the garment past its outline.
 */
function close(w, covered, r = 3) {
  const pass = (src, pick) => {
    const out = new Float32Array(src);
    for (let yy = 0; yy < SIZE; yy++) {
      for (let xx = 0; xx < SIZE; xx++) {
        const i = yy * SIZE + xx;
        if (!covered[i]) continue;
        let v = src[i];
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const x2 = xx + dx, y2 = yy + dy;
            if (x2 < 0 || x2 >= SIZE || y2 < 0 || y2 >= SIZE) continue;
            const j = y2 * SIZE + x2;
            if (covered[j]) v = pick(v, src[j]);
          }
        }
        out[i] = v;
      }
    }
    return out;
  };
  return pass(pass(w, Math.max), Math.min);
}

// Hands are never clothing: dark skin has much lighter palms, which colour alone would miss
const bodyCovered = Uint8Array.from(B.z, (v) => (Number.isNaN(v) ? 0 : 1));
const cloth = close(Float32Array.from(B.z, (h, i) => (Number.isNaN(h) || B.ax[i] > 0.82 ? 0 : notSkin(bodyRgb, i))), bodyCovered);

const bodyOut = Buffer.alloc(SIZE * SIZE * 4);
for (let i = 0; i < SIZE * SIZE; i++) {
  bodyOut[i * 4 + 3] = 255;
  const h = B.z[i];
  if (Number.isNaN(h) || B.ax[i] > 0.82) continue;
  const shoe = 1 - smooth(SHOE_TOP - 0.01, SHOE_TOP + 0.01, h);
  const top = smooth(WAIST - 0.01, WAIST + 0.01, h);
  const bottom = Math.max(0, 1 - shoe - top);
  bodyOut[i * 4] = Math.round(255 * top * cloth[i]);
  bodyOut[i * 4 + 1] = Math.round(255 * bottom * cloth[i]);
  bodyOut[i * 4 + 2] = Math.round(255 * shoe * cloth[i]);
}

const H = rasterise(head.p);
const headRgb = await pixels(`${texDir}/head_color.jpg`);
const headCovered = Uint8Array.from(H.z, (v) => (Number.isNaN(v) ? 0 : 1));
// The face (eyes, lips, teeth) is never dyed: front-facing texels in the face band
const isFace = (i) => H.y[i] < 0 && H.ax[i] < 0.06 && H.z[i] > 0.85 && H.z[i] < HAIR_LINE + 0.01;
// Everything on the head that isn't skin or the face: hair, beards' surroundings, headwraps, hijabs
const inHairZone = () => true;
const hair = close(Float32Array.from(H.z, (h, i) => (Number.isNaN(h) || isFace(i) || !inHairZone() ? 0 : notSkin(headRgb, i))), headCovered);
const headOut = Buffer.alloc(SIZE * SIZE * 4);
for (let i = 0; i < SIZE * SIZE; i++) {
  headOut[i * 4 + 3] = 255;
  if (!headCovered[i] || isFace(i)) continue;
  headOut[i * 4] = Math.round(255 * hair[i]);
}

/** Grows covered texels into empty space so filtering at UV seams doesn't bleed. */
function dilate(buf, covered) {
  for (let pass = 0; pass < 4; pass++) {
    const next = Buffer.from(buf);
    const nextCov = Uint8Array.from(covered);
    for (let yy = 0; yy < SIZE; yy++) {
      for (let xx = 0; xx < SIZE; xx++) {
        const i = yy * SIZE + xx;
        if (covered[i]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = (yy + dy) * SIZE + (xx + dx);
          if (xx + dx < 0 || xx + dx >= SIZE || yy + dy < 0 || yy + dy >= SIZE || !covered[j]) continue;
          for (let k = 0; k < 3; k++) next[i * 4 + k] = buf[j * 4 + k];
          nextCov[i] = 1;
          break;
        }
      }
    }
    buf.set(next);
    covered.set(nextCov);
  }
}
dilate(bodyOut, bodyCovered);
dilate(headOut, headCovered);

mkdirSync(outDir, { recursive: true });
const png = (buf, file) => sharp(buf, { raw: { width: SIZE, height: SIZE, channels: 4 } }).png({ compressionLevel: 9 }).toFile(file);
await png(bodyOut, `${outDir}/${id}-body.png`);
await png(headOut, `${outDir}/${id}-head.png`);
console.log(`${id}: height ${height.toFixed(2)} m, ${hand.length} hand texels, skin Lab ${skin.map((v) => v.toFixed(0)).join('/')}`);
