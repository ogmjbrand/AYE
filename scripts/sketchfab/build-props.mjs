/**
 * Builds props from CC-BY 4.0 Sketchfab models (credits in public/assets/CREDITS.md):
 *
 *   node scripts/sketchfab/build-props.mjs
 *
 * Put the downloaded .glb files in assets-src/sketchfab/source/ (git-ignored):
 *   sub-sandwich.glb     "Sub Sandwich 3D Model [RapidAssets.ai]" by RapidAssets
 *   bento-box.glb        "FREE Japanese Bento Box – 3D Food Model" by Halabalo067
 *   vending-machine.glb  "Vending Machine" by gabyyu
 *   motorhome.glb        "FREE GMC Motorhome reimagined low poly" by Karol Miklas
 *
 * The vending machine's own textures are photographs full of real drinks
 * brands, so every one of those is replaced here with original artwork (made
 * as SVG and rasterised): the machine front, the drinks on its shelves and
 * the instructions panel. No brand names or logos remain.
 *
 * The motorhome keeps its yellow paint; the badges are painted out (the maker's
 * badge on the grille, the lettering on the tyres, two round badges and the
 * modeller's stickers on the body, the fuel-company stickers on the windows),
 * and the wheels use the yellow sheet instead of the blue one with its decals.
 *
 * Output: public/assets/models/props/*.glb (meshopt, WebP textures).
 */
import { mkdirSync, statSync } from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, meshopt, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const SRC = 'assets-src/sketchfab/source';
const OUT = 'public/assets/models/props';

// ---------------------------------------------------------------- original artwork for the vending machine

/** Drinks of our own: colour, cap and a band, no words. */
const DRINKS = [
  ['#c8202a', '#f2f2f2', '#f6d04a'], ['#2b8a3e', '#e8e8e8', '#f2f2e8'], ['#f08a24', '#2a2a2a', '#fff3d0'],
  ['#2b6cc8', '#f2f2f2', '#9fd3ff'], ['#7a3fb0', '#e0e0e0', '#f2c230'], ['#e8c22a', '#2b8a3e', '#fff8e0'],
  ['#1f9aa8', '#f2f2f2', '#e2f6f8'], ['#8a4a26', '#f2e2c8', '#f2c27a'],
];
const bottle = (x, y, h, [body, cap, band], w = h * 0.32) => `
  <rect x="${x + w * 0.3}" y="${y}" width="${w * 0.4}" height="${h * 0.12}" rx="2" fill="${cap}"/>
  <path d="M${x + w * 0.28} ${y + h * 0.12} Q${x} ${y + h * 0.3} ${x} ${y + h * 0.42} L${x} ${y + h} L${x + w} ${y + h} L${x + w} ${y + h * 0.42} Q${x + w} ${y + h * 0.3} ${x + w * 0.72} ${y + h * 0.12} Z" fill="${body}"/>
  <rect x="${x}" y="${y + h * 0.5}" width="${w}" height="${h * 0.22}" fill="${band}" opacity="0.9"/>
  <rect x="${x + w * 0.15}" y="${y + h * 0.15}" width="${w * 0.12}" height="${h * 0.8}" fill="#fff" opacity="0.25"/>`;
const can = (x, y, w, h, [body, , band]) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.12}" fill="${body}"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h * 0.08}" fill="#d9dcdf"/>
  <rect x="${x}" y="${y + h * 0.92}" width="${w}" height="${h * 0.08}" fill="#b9bcbf"/>
  <circle cx="${x + w / 2}" cy="${y + h * 0.5}" r="${w * 0.28}" fill="${band}"/>
  <rect x="${x + w * 0.12}" y="${y + h * 0.1}" width="${w * 0.12}" height="${h * 0.8}" fill="#fff" opacity="0.22"/>`;

/** The machine's front, laid out like the photograph it replaces (512 × 1024) so it fits the model's UVs. */
function frontSvg() {
  let shelves = '';
  const rows = [[115, 70, 'can'], [220, 115, 'bottle'], [372, 70, 'can']];
  rows.forEach(([y, h, kind], r) => {
    for (let i = 0; i < 12; i++) {
      const x = 92 + i * 27;
      const d = DRINKS[(i + r * 3) % DRINKS.length];
      shelves += kind === 'can' ? can(x, y, 22, h, d) : bottle(x, y, h, d, 22);
    }
    const sy = y + h + 6;
    shelves += `<rect x="72" y="${sy}" width="362" height="20" rx="8" fill="#f4f4f2"/>`;
    for (let i = 0; i < 12; i++) shelves += `<rect x="${92 + i * 27}" y="${sy - 10}" width="22" height="9" fill="#1f8fd6"/><ellipse cx="${103 + i * 27}" cy="${sy + 10}" rx="7" ry="4" fill="#3a3a3a"/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="1024">
  <rect width="512" height="1024" fill="#6e6a64"/>
  <rect x="30" y="20" width="446" height="940" rx="14" fill="#1d6fd0"/>
  <rect x="48" y="65" width="414" height="410" rx="22" fill="#f2f4f6"/>
  ${shelves}
  <rect x="60" y="505" width="162" height="150" rx="8" fill="#cfe8f6"/>
  ${bottle(95, 520, 120, DRINKS[0], 38)}${bottle(150, 530, 110, DRINKS[5], 36)}
  <rect x="260" y="545" width="38" height="38" rx="4" fill="#2a2e34"/>
  <path d="M312 482 h104 a14 14 0 0 1 14 14 v110 a14 14 0 0 1 -14 14 h-80 a24 24 0 0 1 -24 -24 Z" fill="#3e4248"/>
  <rect x="322" y="495" width="46" height="24" rx="3" fill="#0e1012"/><text x="345" y="512" font-family="Arial" font-size="13" fill="#4cff7a" text-anchor="middle">GHAI</text>
  <circle cx="392" cy="510" r="14" fill="#25282c"/><rect x="330" y="545" width="40" height="40" rx="4" fill="#25282c"/>
  <rect x="435" y="505" width="45" height="30" rx="12" fill="#e8eaec"/>
  <rect x="66" y="728" width="304" height="100" rx="6" fill="#4a4e54"/><rect x="76" y="740" width="284" height="56" rx="4" fill="#2a2d31"/>
  <rect x="421" y="765" width="34" height="40" rx="4" fill="#2a2d31"/>
  <rect x="50" y="905" width="40" height="30" fill="#e8eaec"/><rect x="335" y="905" width="35" height="22" fill="#e8eaec"/>
  <rect x="34" y="945" width="440" height="30" fill="#155aa8"/>
</svg>`;
}

const gridSvg = () => {
  let s = '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#fafafa"/>';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) s += can(30 + c * 250, 20 + r * 335, 210, 310, DRINKS[(r * 4 + c) % DRINKS.length]);
  return `${s}</svg>`;
};
const lineupSvg = () => {
  let s = '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#fafafa"/>';
  for (let i = 0; i < 7; i++) s += bottle(30 + i * 140, 300, 420, DRINKS[i % DRINKS.length], 120);
  return `${s}</svg>`;
};
const singleSvg = (d) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#000"/>${bottle(196, 40, 440, d, 120)}</svg>`;
const instructionsSvg = () => {
  const box = (x, y, n, title, line) => `<rect x="${x}" y="${y}" width="120" height="118" rx="6" fill="#f2c230"/><circle cx="${x + 18}" cy="${y + 18}" r="13" fill="#1a1a1a"/><text x="${x + 18}" y="${y + 23}" font-family="Arial" font-weight="700" font-size="15" fill="#f2c230" text-anchor="middle">${n}</text><text x="${x + 38}" y="${y + 24}" font-family="Arial" font-weight="700" font-size="13" fill="#1a1a1a">${title}</text><text x="${x + 8}" y="${y + 100}" font-family="Arial" font-size="10" fill="#1a1a1a">${line}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#ffffff"/>${box(4, 4, 1, 'Pay', 'Tap your phone (GHAI)')}${box(132, 4, 2, 'Choose', 'Press the button')}${box(4, 132, 3, 'Take', 'Lift the flap')}${box(132, 132, 4, 'Enjoy', 'Recycle the bottle')}</svg>`;
};

const png = async (svg) => sharp(Buffer.from(svg)).png().toBuffer();

/** Which source image (by index) each replacement goes into. */
async function replaceVendingArt(doc) {
  const textures = doc.getRoot().listTextures();
  const art = {
    0: await png(frontSvg()), 5: await png(frontSvg()),
    3: await png(instructionsSvg()),
    9: await png(gridSvg()), 10: await png(singleSvg(DRINKS[1])), 11: await png(lineupSvg()), 12: await png(singleSvg(DRINKS[0])),
  };
  textures.forEach((t, i) => {
    if (art[i]) t.setImage(art[i]).setMimeType('image/png').setName(`aye-art-${i}`);
  });
  // The cherry-blossom decal stays (no text or logos)
}

// ---------------------------------------------------------------- the motorhome's badges, painted out

/** The average colour of a ring of pixels just outside a rectangle. */
function around(px, w, ch, [x0, y0, x1, y1], pad = 4) {
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = y0 - pad; y <= y1 + pad; y++) {
    for (let x = x0 - pad; x <= x1 + pad; x++) {
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue;
      const i = (y * w + x) * ch;
      for (let k = 0; k < 3; k++) sum[k] += px[i + k];
      n++;
    }
  }
  return sum.map((v) => v / n);
}

/** Fills each rectangle (x0, y0, x1, y1 on a 1024 sheet) with the colour round it. */
async function paintOut(image, rects) {
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const s = info.width / 1024;
  for (const r of rects) {
    const [x0, y0, x1, y1] = r.map((v) => Math.round(v * s));
    const c = around(data, info.width, info.channels, [x0, y0, x1, y1]);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = (y * info.width + x) * info.channels;
      for (let k = 0; k < 3; k++) data[i + k] = c[k];
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

/** The tyre's sidewall lettering: a ring round the wheel, filled with plain rubber. */
async function plainTyre(image) {
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const s = info.width / 1024;
  const [cx, cy, r0, r1] = [905 * s, 102 * s, 43 * s, 58 * s];
  for (let y = Math.floor(cy - r1); y <= cy + r1; y++) for (let x = Math.floor(cx - r1); x <= cx + r1; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d < r0 || d > r1) continue;
    const i = (y * info.width + x) * info.channels;
    data[i] = data[i + 1] = data[i + 2] = 30;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function debadgeMotorhome(doc) {
  const textures = doc.getRoot().listTextures();
  const paint = textures[0];
  let img = await paintOut(paint.getImage(), [
    [211, 753, 237, 813], // the maker's badge on the grille
    [62, 708, 101, 735], // a round badge by the headlamp
    [66, 21, 106, 37], [99, 52, 116, 74], // stickers on the back
    [866, 702, 901, 796], // the modeller's logo on the side
    [724, 103, 772, 120], // a sticker by the roof
  ]);
  img = await plainTyre(img);
  paint.setImage(img).setMimeType('image/png');
  // The wheels used the blue sheet (decals all over); same layout, so give them the yellow one
  const blue = textures[4];
  for (const m of doc.getRoot().listMaterials()) if (m.getBaseColorTexture() === blue) m.setBaseColorTexture(paint);
  // Window stickers: every bright mark on the glass sheet goes dark like the glass
  const glass = textures[6];
  const { data, info } = await sharp(glass.getImage()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] + data[i + 1] + data[i + 2] > 3 * 90) { data[i] = 24; data[i + 1] = 24; data[i + 2] = 26; }
  }
  glass.setImage(await sharp(data, { raw: info }).png().toBuffer()).setMimeType('image/png');
}

mkdirSync(OUT, { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

for (const [name, size] of [['sub-sandwich', 1024], ['bento-box', 1024], ['vending-machine', 1024], ['motorhome', 1024]]) {
  const doc = await io.read(`${SRC}/${name}.glb`);
  if (name === 'vending-machine') await replaceVendingArt(doc);
  if (name === 'motorhome') await debadgeMotorhome(doc);
  for (const a of doc.getRoot().listAnimations()) a.dispose();
  await doc.transform(
    prune(),
    dedup(),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [size, size], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  doc.createExtension(EXTMeshoptCompression).setRequired(true);
  await io.write(`${OUT}/${name}.glb`, doc);
  console.log(name, `${statSync(`${OUT}/${name}.glb`).size >> 10} KB`);
}
