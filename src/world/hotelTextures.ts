import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { seeded } from '../lib/world';

/**
 * The Grand Lagoon Hotel's surfaces, painted on canvases at load (nothing
 * downloaded). Every room uses exactly these, so all rooms match: oak parquet
 * in a basket weave, cream plaster with a soft mottle, a damask feature
 * paper, beige stone bathroom tiles with a carved border, pale floor tiles,
 * the sisal rug with its blue border, the curtains and the flower prints.
 */

const cache = new Map<string, CanvasTexture>();

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, rand: () => number) => void, repeat: [number, number] | null = null): CanvasTexture {
  const id = `${key}@${repeat ? repeat.join('x') : ''}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, seeded([...key].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 100000));
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  cache.set(id, t);
  return t;
}

/** Light oak parquet: squares of three planks, each square turned against its neighbours. */
export function parquetTexture(repeat: [number, number]): CanvasTexture {
  return make('parquet', 512, 512, (g, rand) => {
    g.fillStyle = '#b89a78';
    g.fillRect(0, 0, 512, 512);
    const n = 4, s = 512 / n, plank = s / 3;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const vertical = (i + j) % 2 === 0;
      for (let k = 0; k < 3; k++) {
        const tone = ['#d6bb98', '#cdb08b', '#dcc4a3', '#c8aa84', '#d2b591'][Math.floor(rand() * 5)];
        const x = i * s + (vertical ? k * plank : 0), y = j * s + (vertical ? 0 : k * plank);
        const w = vertical ? plank : s, h = vertical ? s : plank;
        g.fillStyle = tone;
        g.fillRect(x + 1, y + 1, w - 2, h - 2);
        // Grain lines along the plank
        g.strokeStyle = 'rgba(120,90,60,0.18)';
        g.lineWidth = 1;
        for (let l = 0; l < 6; l++) {
          g.beginPath();
          if (vertical) { const gx = x + 3 + rand() * (w - 6); g.moveTo(gx, y + 2); g.bezierCurveTo(gx + 3, y + h / 3, gx - 3, y + (2 * h) / 3, gx + 1, y + h - 2); }
          else { const gy = y + 3 + rand() * (h - 6); g.moveTo(x + 2, gy); g.bezierCurveTo(x + w / 3, gy + 3, x + (2 * w) / 3, gy - 3, x + w - 2, gy + 1); }
          g.stroke();
        }
      }
    }
  }, repeat);
}

/** Cream plaster with a soft, cloudy mottle (the walls in every room and corridor). */
export function hotelPlasterTexture(repeat: [number, number]): CanvasTexture {
  return make('hotel-plaster', 512, 512, (g, rand) => {
    g.fillStyle = '#e9dcc8';
    g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 420; k++) {
      const light = rand() < 0.55;
      g.fillStyle = light ? `rgba(250,244,232,${0.08 + rand() * 0.18})` : `rgba(196,176,148,${0.05 + rand() * 0.1})`;
      g.beginPath();
      g.ellipse(rand() * 512, rand() * 512, 10 + rand() * 50, 6 + rand() * 30, rand() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  }, repeat);
}

/** Damask wallpaper: tone-on-tone ornaments on cream, for the feature wall in each entrance. */
export function damaskTexture(repeat: [number, number]): CanvasTexture {
  return make('damask', 256, 320, (g) => {
    g.fillStyle = '#e6d7bf';
    g.fillRect(0, 0, 256, 320);
    const motif = (cx: number, cy: number, s: number) => {
      g.fillStyle = 'rgba(176,150,112,0.45)';
      g.save();
      g.translate(cx, cy);
      g.scale(s, s);
      // A symmetric flourish: central bud, leaves and scrolls either side
      g.beginPath(); g.ellipse(0, -40, 14, 30, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(0, 18, 22, 36, 0, 0, Math.PI * 2); g.fill();
      for (const side of [-1, 1]) {
        g.beginPath(); g.ellipse(side * 34, -6, 30, 12, side * 0.7, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(side * 40, 40, 26, 10, -side * 0.6, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(side * 54, -30, 10, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(side * 20, 64, 8, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#e6d7bf';
      g.beginPath(); g.ellipse(0, 18, 9, 20, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    };
    motif(128, 100, 1);
    motif(0, 260, 0.8);
    motif(256, 260, 0.8);
  }, repeat);
}

/** Beige stone wall tiles with the carved border band (bathroom walls up to the dado). */
export function stoneTileTexture(repeat: [number, number]): CanvasTexture {
  return make('stone-tile', 512, 512, (g, rand) => {
    g.fillStyle = '#cfae7c';
    g.fillRect(0, 0, 512, 512);
    const s = 256;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const grad = g.createLinearGradient(i * s, j * s, (i + 1) * s, (j + 1) * s);
      grad.addColorStop(0, ['#e3c595', '#dcbd8b', '#e8cda0'][(i + j) % 3]);
      grad.addColorStop(1, ['#d4b07a', '#cfa772', '#dbbb88'][(i + j * 2) % 3]);
      g.fillStyle = grad;
      g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      // Travertine veins
      for (let k = 0; k < 12; k++) {
        g.strokeStyle = `rgba(170,130,80,${0.1 + rand() * 0.15})`;
        g.lineWidth = 1 + rand() * 2;
        const y = j * s + rand() * s;
        g.beginPath(); g.moveTo(i * s, y); g.bezierCurveTo(i * s + s / 3, y + rand() * 10 - 5, i * s + (2 * s) / 3, y + rand() * 10 - 5, i * s + s, y + rand() * 6 - 3); g.stroke();
      }
    }
  }, repeat);
}

/** The carved border band: a row of fan-and-leaf medallions in warm brown. */
export function tileBorderTexture(repeat: [number, number]): CanvasTexture {
  return make('tile-border', 256, 64, (g) => {
    g.fillStyle = '#a8703e';
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#8a5a30';
    g.fillRect(0, 0, 256, 6);
    g.fillRect(0, 58, 256, 6);
    for (let x = 32; x < 256; x += 64) {
      g.fillStyle = '#c48a52';
      g.beginPath(); g.arc(x, 32, 20, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#7a4a24';
      g.lineWidth = 2;
      for (let k = 0; k < 7; k++) { const a = Math.PI + (k / 6) * Math.PI; g.beginPath(); g.moveTo(x, 40); g.lineTo(x + Math.cos(a) * 18, 40 + Math.sin(a) * 18); g.stroke(); }
      g.beginPath(); g.arc(x, 40, 5, 0, Math.PI * 2); g.stroke();
    }
  }, repeat);
}

/** Pale cream floor tiles with thin grout, for the bathroom. */
export function bathFloorTexture(repeat: [number, number]): CanvasTexture {
  return make('bath-floor', 256, 256, (g, rand) => {
    g.fillStyle = '#d8d0c2';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = ['#ece6da', '#e8e1d4', '#efe9de'][Math.floor(rand() * 3)];
      g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124);
      for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(160,150,135,${rand() * 0.12})`; g.fillRect(i * 128 + rand() * 124, j * 128 + rand() * 124, 2, 2); }
    }
  }, repeat);
}

/** A sisal rug with a blue border line. */
export function rugTexture(): CanvasTexture {
  return make('sisal-rug', 256, 320, (g, rand) => {
    g.fillStyle = '#cdb48e';
    g.fillRect(0, 0, 256, 320);
    for (let y = 0; y < 320; y += 3) { g.fillStyle = `rgba(${rand() < 0.5 ? '255,245,225' : '140,110,70'},${rand() * 0.15})`; g.fillRect(0, y, 256, 2); }
    g.strokeStyle = '#6f78b8';
    g.lineWidth = 6;
    g.strokeRect(18, 18, 220, 284);
  });
}

/** Heavy brown curtain fabric with soft vertical folds. */
export function curtainTexture(): CanvasTexture {
  return make('curtain', 256, 64, (g) => {
    const grad = g.createLinearGradient(0, 0, 256, 0);
    for (let k = 0; k <= 8; k++) grad.addColorStop(k / 8, k % 2 ? '#6e5a44' : '#8a745a');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 64);
  }, [2, 1]);
}

/** A black-and-white flower print (original drawings): a rose bud, a full rose, and a tulip. */
export function flowerPrintTexture(which: 0 | 1 | 2): CanvasTexture {
  return make(`flower-${which}`, 200, 280, (g) => {
    g.fillStyle = '#f4f2ee';
    g.fillRect(0, 0, 200, 280);
    g.fillStyle = '#141414';
    g.fillRect(16, 16, 168, 248);
    g.strokeStyle = '#bdbdbd';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(100, 250); g.bezierCurveTo(96, 200, 106, 170, 100, 130); g.stroke();
    g.fillStyle = '#9a9a9a';
    g.beginPath(); g.ellipse(84, 200, 18, 7, -0.6, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(116, 180, 16, 6, 0.6, 0, Math.PI * 2); g.fill();
    const petal = (x: number, y: number, rx: number, ry: number, a: number, shade: number) => {
      g.fillStyle = `rgb(${shade},${shade},${shade})`;
      g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); g.fill();
    };
    if (which === 0) {
      petal(100, 110, 18, 30, 0, 225); petal(92, 116, 12, 24, -0.3, 200); petal(108, 116, 12, 24, 0.3, 245);
    } else if (which === 1) {
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; petal(100 + Math.cos(a) * 18, 108 + Math.sin(a) * 14, 22, 14, a, 190 + (k % 3) * 22); }
      petal(100, 106, 14, 12, 0, 250);
    } else {
      petal(100, 96, 26, 40, 0, 240); petal(86, 104, 14, 32, -0.25, 210); petal(114, 104, 14, 32, 0.25, 228);
    }
  });
}
