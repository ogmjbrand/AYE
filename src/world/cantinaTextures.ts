import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { seeded } from '../lib/world';
import { SONGHAI } from '../lib/songhai';

/**
 * Cantina Ayé's surfaces, painted on canvases at load (nothing downloaded):
 * red brick, terracotta floor tiles, yellow plaster, papel picado bunting,
 * the colourful name sign, woven table runners, the green lamp band, painted
 * plates, two original paintings and the little Songhai desk flag.
 */

const cache = new Map<string, CanvasTexture>();

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, rand: () => number) => void, repeat: [number, number] | null = null): CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g, seeded(key.length * 7919 + key.charCodeAt(key.length - 1)));
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(key, t);
  return t;
}

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
};

/** Old red brick in a running bond, each brick a little different, with sandy mortar. */
export function brickTexture(repeat: [number, number], pale = false): CanvasTexture {
  return make(`brick-${pale}-${repeat.join('x')}`, 512, 512, (g, rand) => {
    g.fillStyle = pale ? '#cfc2ad' : '#b8a68e';
    g.fillRect(0, 0, 512, 512);
    const rows = 16, cols = 4, bh = 512 / rows, bw = 512 / cols;
    const reds = pale ? ['#e6dccb', '#ddd1bd', '#efe6d6', '#d6c8b2'] : ['#a4452e', '#b4523a', '#94402c', '#c0603f', '#8a3a28', '#ad4c35'];
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? bw / 2 : 0;
      for (let k = -1; k <= cols; k++) {
        const x = k * bw + off;
        g.fillStyle = reds[Math.floor(rand() * reds.length)];
        g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6);
        // Speckle and a worn corner
        for (let s = 0; s < 14; s++) {
          g.fillStyle = `rgba(${pale ? '120,110,95' : '60,20,10'},${0.08 + rand() * 0.12})`;
          g.fillRect(x + 3 + rand() * (bw - 8), r * bh + 3 + rand() * (bh - 8), 2 + rand() * 4, 1 + rand() * 3);
        }
        g.fillStyle = `rgba(255,240,220,${0.05 + rand() * 0.08})`;
        g.fillRect(x + 3, r * bh + 3, bw - 6, 3);
      }
    }
  }, repeat);
}

/** Glazed terracotta tiles in a big diagonal pattern, with darker grout. */
export function terracottaTexture(repeat: [number, number]): CanvasTexture {
  return make(`terracotta-${repeat.join('x')}`, 512, 512, (g, rand) => {
    g.fillStyle = '#7a4a2e';
    g.fillRect(0, 0, 512, 512);
    const n = 4, s = 512 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const base = ['#c97a45', '#d0844e', '#bf713f', '#c87c4a', '#d38a55'][Math.floor(rand() * 5)];
      const grad = g.createLinearGradient(i * s, j * s, (i + 1) * s, (j + 1) * s);
      grad.addColorStop(0, shade(base, 1.06));
      grad.addColorStop(1, shade(base, 0.92));
      g.fillStyle = grad;
      g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      for (let k = 0; k < 30; k++) {
        g.fillStyle = `rgba(90,40,15,${rand() * 0.12})`;
        g.beginPath();
        g.arc(i * s + rand() * s, j * s + rand() * s, 1 + rand() * 5, 0, Math.PI * 2);
        g.fill();
      }
    }
    // The long diagonal grout lines that run across the floor
    g.strokeStyle = '#6e4129';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(512, 512);
    g.moveTo(512, 0); g.lineTo(0, 512);
    g.stroke();
  }, repeat);
}

/** Warm yellow plaster, faintly mottled. */
export function plasterTexture(repeat: [number, number]): CanvasTexture {
  return make(`plaster-${repeat.join('x')}`, 256, 256, (g, rand) => {
    g.fillStyle = '#efc65a';
    g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 260; k++) {
      g.fillStyle = rand() < 0.5 ? `rgba(255,236,170,${rand() * 0.12})` : `rgba(190,140,40,${rand() * 0.08})`;
      g.beginPath();
      g.arc(rand() * 256, rand() * 256, 4 + rand() * 18, 0, Math.PI * 2);
      g.fill();
    }
  }, repeat);
}

const FIESTA = ['#e2357a', '#f08a24', '#2bb3c0', '#7a3fb0', '#3caa3c', '#e8c22a', '#d63a2f', '#4a6fd6'];

/** A string of papel picado: cut-paper flags in bright colours on a cord (transparent where the paper is cut). */
export function papelPicadoTexture(seed: number): CanvasTexture {
  return make(`papel-${seed}`, 1024, 128, (g, rand) => {
    g.clearRect(0, 0, 1024, 128);
    g.strokeStyle = '#f4f0e6';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 8); g.lineTo(1024, 8); g.stroke();
    const n = 8, fw = 1024 / n;
    for (let i = 0; i < n; i++) {
      const x = i * fw + 8, w = fw - 16, top = 8, h = 112;
      g.save();
      g.fillStyle = FIESTA[Math.floor(rand() * FIESTA.length)];
      // Flag with a zigzag bottom edge
      g.beginPath();
      g.moveTo(x, top); g.lineTo(x + w, top); g.lineTo(x + w, top + h - 10);
      for (let z = 0; z <= 8; z++) g.lineTo(x + w - (w / 8) * z, top + h - (z % 2 ? 0 : 10));
      g.closePath();
      g.fill();
      // Cut-outs: a border of small holes, a flower and diamonds in the middle
      g.globalCompositeOperation = 'destination-out';
      for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(x + 8 + k * ((w - 16) / 8), top + 10, 3, 0, Math.PI * 2); g.fill(); }
      const cx = x + w / 2, cy = top + 54;
      for (let p = 0; p < 8; p++) {
        const a = (p / 8) * Math.PI * 2 + rand() * 0.2;
        g.beginPath(); g.ellipse(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, 9, 4, a, 0, Math.PI * 2); g.fill();
      }
      g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill();
      for (const [dx, dy] of [[-w / 3, 30], [w / 3, 30], [-w / 3, -18], [w / 3, -18]]) {
        g.beginPath(); g.moveTo(cx + dx, cy + dy - 7); g.lineTo(cx + dx + 5, cy + dy); g.lineTo(cx + dx, cy + dy + 7); g.lineTo(cx + dx - 5, cy + dy); g.closePath(); g.fill();
      }
      g.restore();
    }
  });
}

/** The name in chunky letters, each its own colour with a pattern cut through it, under a painted sombrero. Transparent background. */
export function cantinaSignTexture(name: string): CanvasTexture {
  return make(`sign-${name}`, 1536, 640, (g, rand) => {
    g.clearRect(0, 0, 1536, 640);
    // Sombrero over the middle of the name
    const sx = 768, sy = 190;
    g.fillStyle = '#d9473a';
    g.beginPath(); g.ellipse(sx, sy + 40, 300, 46, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f0d27a';
    g.beginPath(); g.ellipse(sx, sy + 34, 286, 34, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e3b85a';
    g.beginPath(); g.moveTo(sx - 120, sy + 34); g.quadraticCurveTo(sx - 110, sy - 120, sx, sy - 130); g.quadraticCurveTo(sx + 110, sy - 120, sx + 120, sy + 34); g.closePath(); g.fill();
    g.fillStyle = '#3caa3c';
    g.fillRect(sx - 118, sy - 10, 236, 26);
    g.fillStyle = '#d9473a';
    for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(sx - 110 + k * 28, sy + 16); g.lineTo(sx - 96 + k * 28, sy - 8); g.lineTo(sx - 82 + k * 28, sy + 16); g.fill(); }
    for (let k = 0; k < 11; k++) { g.fillStyle = k % 2 ? '#3caa3c' : '#d9473a'; g.beginPath(); g.moveTo(sx - 250 + k * 46, sy + 50); g.lineTo(sx - 232 + k * 46, sy + 30); g.lineTo(sx - 214 + k * 46, sy + 50); g.fill(); }
    // The letters
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = "900 230px 'Arial Black', Impact, sans-serif";
    const colours = ['#e2353a', '#f08a24', '#3caa3c', '#2bb3c0', '#e8c22a', '#e2357a', '#7a3fb0', '#2bb3c0', '#f08a24', '#3caa3c', '#e2353a'];
    const total = g.measureText(name).width;
    let x = 768 - total / 2;
    const y = 470;
    [...name].forEach((ch, i) => {
      const cw = g.measureText(ch).width;
      const cx = x + cw / 2;
      g.fillStyle = 'rgba(80,40,10,0.35)';
      g.fillText(ch, cx + 8, y + 10);
      g.fillStyle = colours[i % colours.length];
      g.fillText(ch, cx, y);
      // A cut pattern through each letter: zigzags and dots
      g.save();
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,255,255,0.85)';
      for (let k = 0; k < 4; k++) {
        const yy = y - 70 + k * 46;
        if ((i + k) % 2) { g.beginPath(); g.arc(cx - 10 + rand() * 20, yy, 7, 0, Math.PI * 2); g.fill(); }
        else { g.fillRect(cx - 4, yy - 12, 8, 24); }
      }
      g.restore();
      x += cw + 6;
    });
    // A little sunburst flower after the name
    const fx = 768 + total / 2 + 70, fy = 330;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      g.fillStyle = k % 2 ? '#e2353a' : '#f08a24';
      g.beginPath(); g.ellipse(fx + Math.cos(a) * 34, fy + Math.sin(a) * 34, 26, 6, a, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#2bb3c0'; g.beginPath(); g.arc(fx, fy, 14, 0, Math.PI * 2); g.fill();
  });
}

/** A woven table runner: hot pink with bands of geometric stitching in turquoise, green and orange. */
export function runnerTexture(): CanvasTexture {
  return make('runner', 256, 512, (g, rand) => {
    g.fillStyle = '#e2357a';
    g.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 512; y += 4) { g.fillStyle = `rgba(255,255,255,${rand() * 0.06})`; g.fillRect(0, y, 256, 2); }
    const band = (y: number, h: number, col: string, alt: string) => {
      g.fillStyle = col; g.fillRect(0, y, 256, h);
      g.fillStyle = alt;
      for (let x = 0; x < 256; x += 16) { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 8, y); g.lineTo(x + 16, y + h); g.fill(); }
    };
    for (const y0 of [24, 450]) {
      band(y0, 14, '#2bb3c0', '#f2e9d6');
      band(y0 + 16, 10, '#3caa3c', '#e8c22a');
      band(y0 + 28, 8, '#f08a24', '#7a3fb0');
    }
    // A scatter of little diamonds down the middle
    g.fillStyle = 'rgba(255,240,250,0.55)';
    for (let y = 90; y < 430; y += 26) for (let x = 40; x < 230; x += 44) {
      g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); g.fill();
    }
    // Fringe
    g.fillStyle = '#f7d2e2';
    for (const y0 of [0, 500]) for (let x = 2; x < 256; x += 6) g.fillRect(x, y0, 2, 12);
  });
}

/** The band round the green enamel lamp shades: a white stepped key pattern. */
export function shadeBandTexture(): CanvasTexture {
  return make('shade-band', 512, 64, (g) => {
    g.fillStyle = '#1f8a3e';
    g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#f2efe6';
    g.fillRect(0, 10, 512, 4);
    g.fillRect(0, 50, 512, 4);
    for (let x = 0; x < 512; x += 32) {
      g.fillRect(x + 4, 18, 4, 28); g.fillRect(x + 4, 18, 20, 4); g.fillRect(x + 20, 18, 4, 18); g.fillRect(x + 12, 32, 12, 4); g.fillRect(x + 12, 26, 4, 10);
      g.fillRect(x + 4, 42, 24, 4);
    }
  }, [6, 1]);
}

/** A hand-painted plate: concentric bands, petals and dots in bright glazes. */
export function plateTexture(seed: number): CanvasTexture {
  return make(`plate-${seed}`, 256, 256, (g, rand) => {
    const pal = [...FIESTA].sort(() => rand() - 0.5);
    g.fillStyle = '#f5efe0';
    g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
    const rings = [118, 96, 70, 44, 20];
    rings.forEach((r, i) => {
      g.fillStyle = pal[i % pal.length];
      g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = i % 2 ? '#f5efe0' : pal[(i + 3) % pal.length];
      const n = 8 + i * 2;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rand() * 0.1;
        if ((seed + i) % 3 === 0) { g.beginPath(); g.arc(128 + Math.cos(a) * (r - 10), 128 + Math.sin(a) * (r - 10), 5, 0, Math.PI * 2); g.fill(); }
        else { g.beginPath(); g.ellipse(128 + Math.cos(a) * (r - 12), 128 + Math.sin(a) * (r - 12), 10, 4, a, 0, Math.PI * 2); g.fill(); }
      }
    });
    g.strokeStyle = '#1b2a55'; g.lineWidth = 4;
    g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.stroke();
  });
}

/** Two original paintings for the walls (no real people): folk-art flowers round a cactus, and agaves at sunset. */
export function paintingTexture(which: 0 | 1): CanvasTexture {
  return make(`painting-${which}`, 256, 340, (g, rand) => {
    if (which === 0) {
      g.fillStyle = '#f6eadb'; g.fillRect(0, 0, 256, 340);
      g.fillStyle = '#2f8f4e';
      g.fillRect(112, 120, 32, 190);
      g.beginPath(); g.ellipse(128, 120, 16, 30, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(70, 190, 46, 20); g.fillRect(70, 150, 20, 60); g.fillRect(140, 210, 50, 20); g.fillRect(170, 160, 20, 70);
      for (let k = 0; k < 16; k++) {
        const x = 20 + rand() * 216, y = 20 + rand() * 300, r = 10 + rand() * 14, c = FIESTA[Math.floor(rand() * FIESTA.length)];
        for (let p = 0; p < 6; p++) { const a = (p / 6) * Math.PI * 2; g.fillStyle = c; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, r * 0.25, a, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#f2c230'; g.beginPath(); g.arc(x, y, r * 0.25, 0, Math.PI * 2); g.fill();
      }
    } else {
      const sky = g.createLinearGradient(0, 0, 0, 340);
      sky.addColorStop(0, '#2b3f7a'); sky.addColorStop(0.45, '#e2705a'); sky.addColorStop(0.7, '#f2b25a');
      g.fillStyle = sky; g.fillRect(0, 0, 256, 340);
      g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(170, 200, 34, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#7a3a4a'; g.beginPath(); g.moveTo(0, 240); g.lineTo(80, 190); g.lineTo(150, 230); g.lineTo(256, 180); g.lineTo(256, 340); g.lineTo(0, 340); g.fill();
      g.fillStyle = '#3d5a3a'; g.fillRect(0, 270, 256, 70);
      for (const [x, s] of [[60, 1], [190, 0.8], [130, 0.6]] as const) {
        g.fillStyle = '#4f8a5a';
        for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.28; g.beginPath(); g.moveTo(x - 4 * s, 300); g.lineTo(x + Math.cos(a) * 70 * s, 300 + Math.sin(a) * 70 * s); g.lineTo(x + 4 * s, 300); g.fill(); }
      }
    }
    g.strokeStyle = '#1a1a1a'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 334);
  });
}

/** The little desk flag on the bar: Songhai's indigo, gold and emerald bands. */
export function songhaiFlagTexture(): CanvasTexture {
  return make('songhai-flag', 96, 64, (g) => {
    const f = SONGHAI.flag;
    [[f.top, 0], [f.middle, 21], [f.bottom, 42]].forEach(([c, y]) => { g.fillStyle = c as string; g.fillRect(0, y as number, 96, 22); });
    g.fillStyle = f.emblem; g.beginPath(); g.arc(48, 32, 8, 0, Math.PI * 2); g.fill();
  });
}

/** A small printed menu card. */
export function menuCardTexture(): CanvasTexture {
  return make('menu-card', 128, 192, (g) => {
    g.fillStyle = '#fbf5e6'; g.fillRect(0, 0, 128, 192);
    g.fillStyle = '#e2353a'; g.fillRect(0, 0, 128, 26);
    g.fillStyle = '#fff'; g.font = '700 15px sans-serif'; g.textAlign = 'center'; g.fillText('MENÚ', 64, 18);
    g.fillStyle = '#3a2a1a';
    for (let y = 40; y < 180; y += 12) { g.fillRect(12, y, 70, 3); g.fillRect(96, y, 20, 3); }
    g.fillStyle = '#3caa3c'; g.fillRect(0, 186, 128, 6);
  });
}

/** The sombreros' painted brims: rings of stitched colour. */
export function brimTexture(seed: number): CanvasTexture {
  return make(`brim-${seed}`, 256, 256, (g) => {
    const cols = seed % 2 ? ['#2a2a2a', '#c9c3b6', '#2a2a2a', '#e8e2d2'] : ['#2a2a2a', '#3caa3c', '#f2efe6', '#d63a2f'];
    for (let i = 0; i < 8; i++) {
      g.fillStyle = cols[i % cols.length];
      g.beginPath(); g.arc(128, 128, 128 - i * 14, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#f2efe6';
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; g.beginPath(); g.ellipse(128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80, 18, 7, a, 0, Math.PI * 2); g.fill(); }
  });
}
