/**
 * Procedural PBR textures drawn on canvas at load time. Original work: no
 * third-party texture licences, nothing extra to download.
 *
 * Each set provides a colour map and an "ORM" map (G = roughness, B = metalness,
 * matching three.js channel conventions); ground sets add a normal map, facades
 * add an emissive map with lit windows for night.
 */
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearSRGBColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { seeded } from '../lib/world';

type Ctx = CanvasRenderingContext2D;

function canvas(size: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')!];
}

function toTexture(c: HTMLCanvasElement, srgb: boolean, repeat = true, anisotropy = 4): Texture {
  const t = new CanvasTexture(c);
  t.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace;
  t.wrapS = t.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  t.anisotropy = anisotropy;
  return t;
}

/** Per-pixel noise on top of whatever is drawn. */
function speckle(ctx: Ctx, size: number, amount: number, rand: () => number) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** Soft blotches for staining and wear. */
function blotches(ctx: Ctx, size: number, count: number, color: string, maxR: number, rand: () => number) {
  for (let i = 0; i < count; i++) {
    const x = rand() * size, y = rand() * size, r = maxR * (0.3 + rand());
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/** Builds a tangent-space normal map from a greyscale height canvas. */
function normalFromHeight(height: HTMLCanvasElement, strength: number): HTMLCanvasElement {
  const size = height.width;
  const src = height.getContext('2d')!.getImageData(0, 0, size, size).data;
  const [c, ctx] = canvas(size);
  const out = ctx.createImageData(size, size);
  const h = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

/** ORM map from a roughness canvas (greyscale) and a constant/optional metalness canvas. */
function ormFrom(rough: HTMLCanvasElement, metal?: HTMLCanvasElement): HTMLCanvasElement {
  const size = rough.width;
  const r = rough.getContext('2d')!.getImageData(0, 0, size, size).data;
  const m = metal?.getContext('2d')!.getImageData(0, 0, size, size).data;
  const [c, ctx] = canvas(size);
  const out = ctx.createImageData(size, size);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255;
    out.data[i + 1] = r[i];
    out.data[i + 2] = m ? m[i] : 0;
    out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

export interface SurfaceSet {
  map: Texture;
  orm: Texture;
  normal?: Texture;
  emissive?: Texture;
}

const cache = new Map<string, SurfaceSet>();
function cached(key: string, make: () => SurfaceSet): SurfaceSet {
  let set = cache.get(key);
  if (!set) {
    set = make();
    cache.set(key, set);
  }
  return set;
}

// ---------------------------------------------------------------- ground

/** Worn asphalt: aggregate, patch repairs, cracks, darker wheel tracks. */
export function asphalt(): SurfaceSet {
  return cached('asphalt', () => {
    const S = 512, rand = seeded(11);
    const [col, c] = canvas(S);
    c.fillStyle = '#3a3b3c';
    c.fillRect(0, 0, S, S);
    blotches(c, S, 40, 'rgba(70,70,68,0.5)', 60, rand);
    blotches(c, S, 30, 'rgba(20,20,22,0.5)', 50, rand);
    // patch repairs
    for (let i = 0; i < 4; i++) {
      c.fillStyle = `rgba(${28 + rand() * 10},${28 + rand() * 10},${30 + rand() * 10},0.85)`;
      c.fillRect(rand() * S, rand() * S, 40 + rand() * 90, 30 + rand() * 60);
    }
    // wheel tracks (texture V runs along the road)
    for (const u of [0.22, 0.38, 0.62, 0.78]) {
      const g = c.createLinearGradient((u - 0.06) * S, 0, (u + 0.06) * S, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(15,15,15,0.28)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect((u - 0.06) * S, 0, 0.12 * S, S);
    }
    // aggregate
    for (let i = 0; i < 9000; i++) {
      const v = 60 + rand() * 90;
      c.fillStyle = `rgba(${v},${v},${v - 4},${0.35 + rand() * 0.4})`;
      c.fillRect(rand() * S, rand() * S, 1 + rand() * 1.5, 1 + rand() * 1.5);
    }
    // cracks
    c.strokeStyle = 'rgba(12,12,12,0.7)';
    for (let i = 0; i < 7; i++) {
      c.lineWidth = 0.6 + rand();
      c.beginPath();
      let x = rand() * S, y = rand() * S;
      c.moveTo(x, y);
      for (let k = 0; k < 8; k++) {
        x += (rand() - 0.5) * 40;
        y += (rand() - 0.5) * 40;
        c.lineTo(x, y);
      }
      c.stroke();
    }
    speckle(c, S, 18, rand);

    const [rough, r] = canvas(S);
    r.fillStyle = 'rgb(225,225,225)';
    r.fillRect(0, 0, S, S);
    blotches(r, S, 12, 'rgba(120,120,120,0.6)', 70, rand); // smoother, oily patches
    speckle(r, S, 30, rand);

    const [height, h] = canvas(S);
    h.drawImage(col, 0, 0);
    return {
      map: toTexture(col, true),
      orm: toTexture(ormFrom(rough), false),
      normal: toTexture(normalFromHeight(height, 2.2), false),
    };
  });
}

/** Grey interlocking pavers with dusty joints. */
export function pavers(): SurfaceSet {
  return cached('pavers', () => {
    const S = 512, rand = seeded(23);
    const [col, c] = canvas(S);
    const [height, h] = canvas(S);
    c.fillStyle = '#6d675d';
    c.fillRect(0, 0, S, S);
    h.fillStyle = '#000';
    h.fillRect(0, 0, S, S);
    const bw = S / 8, bh = S / 16;
    for (let row = 0; row < 16; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let k = -1; k < 9; k++) {
        const x = k * bw + off, y = row * bh;
        const v = 128 + rand() * 22;
        const tint = rand() < 0.12 ? [v + 14, v - 6, v - 18] : [v, v - 3, v - 9];
        c.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`;
        c.fillRect(x + 2, y + 2, bw - 4, bh - 4);
        h.fillStyle = '#c8c8c8';
        h.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      }
    }
    blotches(c, S, 25, 'rgba(60,45,30,0.25)', 50, rand);
    blotches(c, S, 10, 'rgba(25,25,25,0.25)', 30, rand);
    speckle(c, S, 22, rand);

    const [rough, r] = canvas(S);
    r.fillStyle = 'rgb(215,215,215)';
    r.fillRect(0, 0, S, S);
    speckle(r, S, 25, rand);
    return {
      map: toTexture(col, true),
      orm: toTexture(ormFrom(rough), false),
      normal: toTexture(normalFromHeight(height, 3), false),
    };
  });
}

/** Red-brown laterite soil with patchy dry grass, as on Lagos verges. */
export function ground(): SurfaceSet {
  return cached('ground', () => {
    const S = 512, rand = seeded(37);
    const [col, c] = canvas(S);
    c.fillStyle = '#7a5a3e';
    c.fillRect(0, 0, S, S);
    blotches(c, S, 50, 'rgba(92,110,52,0.55)', 70, rand);
    blotches(c, S, 30, 'rgba(140,96,60,0.45)', 50, rand);
    for (let i = 0; i < 6000; i++) {
      const g = rand() < 0.6;
      c.strokeStyle = g ? `rgba(${70 + rand() * 50},${95 + rand() * 50},${40 + rand() * 20},0.55)` : 'rgba(60,40,25,0.4)';
      c.lineWidth = 1;
      const x = rand() * S, y = rand() * S;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (rand() - 0.5) * 4, y - 2 - rand() * 5);
      c.stroke();
    }
    speckle(c, S, 26, rand);
    const [rough, r] = canvas(S);
    r.fillStyle = 'rgb(245,245,245)';
    r.fillRect(0, 0, S, S);
    const [height, h] = canvas(S);
    h.drawImage(col, 0, 0);
    return {
      map: toTexture(col, true),
      orm: toTexture(ormFrom(rough), false),
      normal: toTexture(normalFromHeight(height, 1.5), false),
    };
  });
}

/** Kerb stones painted in alternating black and yellow blocks. */
export function kerb(): SurfaceSet {
  return cached('kerb', () => {
    const S = 256, rand = seeded(41);
    const [col, c] = canvas(S);
    for (let i = 0; i < 2; i++) {
      c.fillStyle = i ? '#1c1c1c' : '#d9a514';
      c.fillRect(0, (i * S) / 2, S, S / 2);
    }
    blotches(c, S, 20, 'rgba(110,100,80,0.45)', 30, rand);
    speckle(c, S, 30, rand);
    const [rough, r] = canvas(S);
    r.fillStyle = 'rgb(200,200,200)';
    r.fillRect(0, 0, S, S);
    return { map: toTexture(col, true), orm: toTexture(ormFrom(rough), false) };
  });
}

// ---------------------------------------------------------------- facades

/** One facade texture covers this many bays across and floors up. */
export const FACADE_TILE = { bays: 4, floors: 4 } as const;
export const BAY_WIDTH: Record<'tower' | 'office' | 'residential' | 'shop', number> = {
  tower: 1.6,
  office: 3,
  residential: 3.2,
  shop: 3,
};
export const FLOOR_HEIGHT: Record<'tower' | 'office' | 'residential' | 'shop', number> = {
  tower: 3.6,
  office: 3.6,
  residential: 3.1,
  shop: 3.5,
};

interface FacadeSpec {
  key: string;
  wall: string;
  draw: (ctx: {
    col: Ctx; rough: Ctx; metal: Ctx; glow: Ctx; x: number; y: number; w: number; h: number;
    rand: () => number; lit: boolean;
  }) => void;
  grime: number;
}

function facade(spec: FacadeSpec): SurfaceSet {
  return cached(spec.key, () => {
    const S = 512, rand = seeded(spec.key.length * 97 + spec.key.charCodeAt(0));
    const [colC, col] = canvas(S);
    const [roughC, rough] = canvas(S);
    const [metalC, metal] = canvas(S);
    const [glowC, glow] = canvas(S);
    col.fillStyle = spec.wall;
    col.fillRect(0, 0, S, S);
    rough.fillStyle = 'rgb(225,225,225)';
    rough.fillRect(0, 0, S, S);
    metal.fillStyle = '#000';
    metal.fillRect(0, 0, S, S);
    glow.fillStyle = '#000';
    glow.fillRect(0, 0, S, S);
    // plaster variation
    blotches(col, S, 30, 'rgba(255,255,255,0.10)', 60, rand);
    blotches(col, S, 30, 'rgba(0,0,0,0.06)', 60, rand);

    const w = S / FACADE_TILE.bays, h = S / FACADE_TILE.floors;
    for (let fy = 0; fy < FACADE_TILE.floors; fy++) {
      for (let bx = 0; bx < FACADE_TILE.bays; bx++) {
        spec.draw({ col, rough, metal, glow, x: bx * w, y: fy * h, w, h, rand, lit: rand() < 0.45 });
      }
    }
    // rain and dust streaks running down from window sills
    for (let i = 0; i < spec.grime; i++) {
      const x = rand() * S, y = rand() * S, len = 30 + rand() * 120;
      const g = col.createLinearGradient(0, y, 0, y + len);
      g.addColorStop(0, 'rgba(40,35,30,0.22)');
      g.addColorStop(1, 'rgba(40,35,30,0)');
      col.fillStyle = g;
      col.fillRect(x, y, 2 + rand() * 6, len);
    }
    speckle(col, S, 14, rand);
    speckle(rough, S, 20, rand);
    return {
      map: toTexture(colC, true),
      orm: toTexture(ormFrom(roughC, metalC), false),
      emissive: toTexture(glowC, true),
    };
  });
}

/** Window pane: dark reflective glass with a frame; optionally lit at night. */
function pane(
  { col, rough, metal, glow, rand, lit }: Parameters<FacadeSpec['draw']>[0],
  x: number, y: number, w: number, h: number, frame = '#d8d8d4',
) {
  col.fillStyle = frame;
  col.fillRect(x - 3, y - 3, w + 6, h + 6);
  const g = col.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#2c3b44');
  g.addColorStop(1, '#14202a');
  col.fillStyle = g;
  col.fillRect(x, y, w, h);
  // interior hint: curtains or blinds
  if (rand() < 0.5) {
    col.fillStyle = `rgba(${150 + rand() * 80},${120 + rand() * 60},${90 + rand() * 50},0.35)`;
    col.fillRect(x + (rand() < 0.5 ? 0 : w * 0.55), y, w * 0.45, h);
  }
  rough.fillStyle = 'rgb(28,28,28)';
  rough.fillRect(x, y, w, h);
  metal.fillStyle = 'rgb(150,150,150)';
  metal.fillRect(x, y, w, h);
  if (lit) {
    glow.fillStyle = `rgb(${200 + rand() * 40},${140 + rand() * 40},${80 + rand() * 40})`;
    glow.fillRect(x, y, w, h);
  }
}

export function facadeFor(style: 'tower' | 'office' | 'residential' | 'shop'): SurfaceSet {
  switch (style) {
    case 'residential':
      return facade({
        key: 'fac-residential', wall: '#f2efe8', grime: 70,
        draw: (ctx) => {
          const { col, x, y, w, h, rand } = ctx;
          const pw = w * 0.5, ph = h * 0.48, px = x + (w - pw) / 2, py = y + h * 0.22;
          pane(ctx, px, py, pw, ph, '#e9e6de');
          // burglar-proof bars
          col.strokeStyle = 'rgba(40,40,40,0.85)';
          col.lineWidth = 2;
          for (let k = 1; k < 5; k++) {
            col.beginPath();
            col.moveTo(px + (pw * k) / 5, py);
            col.lineTo(px + (pw * k) / 5, py + ph);
            col.stroke();
          }
          // sill
          col.fillStyle = 'rgba(0,0,0,0.25)';
          col.fillRect(px - 6, py + ph + 3, pw + 12, 5);
          // floor band
          col.fillStyle = 'rgba(0,0,0,0.07)';
          col.fillRect(x, y + h - 6, w, 6);
          if (rand() < 0.3) {
            // laundry or a satellite dish shadow for variety
            col.fillStyle = `rgba(${rand() * 255},${rand() * 255},${rand() * 255},0.6)`;
            col.fillRect(px + rand() * pw * 0.6, py + ph + 10, 18, 14);
          }
        },
      });
    case 'office':
      return facade({
        key: 'fac-office', wall: '#e2e0da', grime: 40,
        draw: (ctx) => {
          const { col, x, y, w, h } = ctx;
          pane(ctx, x + 4, y + h * 0.18, w - 8, h * 0.58, '#9aa0a3');
          col.fillStyle = 'rgba(0,0,0,0.12)';
          col.fillRect(x, y + h * 0.78, w, 4); // spandrel shadow
        },
      });
    case 'tower':
      return facade({
        key: 'fac-tower', wall: '#36505e', grime: 6,
        draw: (ctx) => {
          const { col, rough, metal, x, y, w, h, rand, lit, glow } = ctx;
          const g = col.createLinearGradient(x, y, x, y + h);
          g.addColorStop(0, '#5f8197');
          g.addColorStop(1, '#2e4a5c');
          col.fillStyle = g;
          col.fillRect(x, y, w, h);
          rough.fillStyle = 'rgb(18,18,18)';
          rough.fillRect(x, y, w, h);
          metal.fillStyle = 'rgb(200,200,200)';
          metal.fillRect(x, y, w, h);
          // spandrel panel
          col.fillStyle = '#25343e';
          col.fillRect(x, y + h * 0.8, w, h * 0.2);
          // mullions
          col.fillStyle = '#9fb1bb';
          col.fillRect(x, y, 3, h);
          col.fillRect(x, y + h * 0.8, w, 3);
          if (lit && rand() < 0.8) {
            glow.fillStyle = `rgb(${170 + rand() * 40},${150 + rand() * 30},${110 + rand() * 30})`;
            glow.fillRect(x + 3, y, w - 3, h * 0.8);
          }
        },
      });
    case 'shop':
      return facade({
        key: 'fac-shop', wall: '#efe9dc', grime: 60,
        draw: (ctx) => {
          const { col, rough, x, y, w, h, rand } = ctx;
          // FACADE_TILE.floors rows: the bottom row of the tile is the ground floor
          const ground = y >= (512 / FACADE_TILE.floors) * (FACADE_TILE.floors - 1) - 1;
          if (ground) {
            const open = rand() < 0.6;
            if (open) {
              pane(ctx, x + 6, y + h * 0.15, w - 12, h * 0.8, '#5b5b5b');
            } else {
              // roller shutter
              col.fillStyle = '#8e9296';
              col.fillRect(x + 6, y + h * 0.15, w - 12, h * 0.85);
              col.fillStyle = 'rgba(0,0,0,0.25)';
              for (let k = y + h * 0.15; k < y + h; k += 6) col.fillRect(x + 6, k, w - 12, 2);
              rough.fillStyle = 'rgb(120,120,120)';
              rough.fillRect(x + 6, y + h * 0.15, w - 12, h * 0.85);
            }
          } else {
            pane(ctx, x + w * 0.2, y + h * 0.25, w * 0.6, h * 0.45, '#e3ddd0');
          }
        },
      });
  }
}

/** Bitumen/concrete roof with water stains. */
export function roof(): SurfaceSet {
  return cached('roof', () => {
    const S = 256, rand = seeded(53);
    const [col, c] = canvas(S);
    c.fillStyle = '#6f6c66';
    c.fillRect(0, 0, S, S);
    blotches(c, S, 30, 'rgba(30,30,28,0.35)', 40, rand);
    speckle(c, S, 25, rand);
    const [rough, r] = canvas(S);
    r.fillStyle = 'rgb(240,240,240)';
    r.fillRect(0, 0, S, S);
    return { map: toTexture(col, true), orm: toTexture(ormFrom(rough), false) };
  });
}

/** Text sign (shop names, billboards). Not cached: one per sign. */
export function signTexture(text: string, bg: string, fg: string, width = 512, height = 128): Texture {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = fg;
  ctx.font = `800 ${Math.floor(height * 0.5)}px Manrope, 'DM Sans', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), width / 2, height / 2 + 2);
  return toTexture(c, true, false);
}

/** Palm frond with leaflets, transparent background (alpha-tested). */
export function frondTexture(): Texture {
  const key = 'frond';
  const hit = cache.get(key);
  if (hit) return hit.map;
  const W = 128, H = 512, rand = seeded(61);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#6b5a2a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W / 2, H);
  ctx.lineTo(W / 2, 0);
  ctx.stroke();
  for (let y = H - 10; y > 6; y -= 5) {
    const t = y / H;
    const len = (W / 2) * (0.35 + 0.65 * Math.sin(Math.PI * (1 - t) * 0.95 + 0.1));
    for (const side of [-1, 1]) {
      const g = 85 + rand() * 50;
      ctx.strokeStyle = `rgb(${45 + rand() * 30},${g + 25},${30 + rand() * 20})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(W / 2, y);
      ctx.quadraticCurveTo(W / 2 + side * len * 0.5, y - 6, W / 2 + side * len, y + 14 + rand() * 8);
      ctx.stroke();
    }
  }
  const t = toTexture(c, true, false);
  cache.set(key, { map: t, orm: t });
  return t;
}

/** Soft radial glow used for street-lamp light pools on the ground. */
export function lightPoolTexture(): Texture {
  const hit = cache.get('pool');
  if (hit) return hit.map;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  // Opaque black background: drawn with additive blending, black adds nothing
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
  g.addColorStop(0, 'rgb(255,196,128)');
  g.addColorStop(0.35, 'rgb(150,105,60)');
  g.addColorStop(0.7, 'rgb(40,26,14)');
  g.addColorStop(1, 'rgb(0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = toTexture(c, true, false);
  cache.set('pool', { map: t, orm: t });
  return t;
}
