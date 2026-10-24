import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { seeded } from '../lib/world';

/**
 * Textures painted on a canvas at load, so venues look finished without
 * downloading anything: polished marble, and the city skyline seen through
 * big windows (day, golden hour or night).
 */

const cache = new Map<string, CanvasTexture>();

function finish(c: HTMLCanvasElement, repeat: [number, number] | null) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** White marble with soft grey veins and a thin gold seam between big tiles. */
export function marbleTexture(tone: 'white' | 'cream' | 'black' = 'white', repeat: [number, number] = [3, 3]): CanvasTexture {
  const key = `marble:${tone}:${repeat.join(',')}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d')!;
  const base = { white: ['#f3f1ec', '#e6e2da'], cream: ['#efe6d6', '#ded2bd'], black: ['#1b1d1e', '#26292a'] }[tone];
  const vein = { white: 'rgba(120,120,125,', cream: 'rgba(150,125,95,', black: 'rgba(220,200,160,' }[tone];
  const grad = g.createLinearGradient(0, 0, 1024, 1024);
  grad.addColorStop(0, base[0]);
  grad.addColorStop(1, base[1]);
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 1024);
  const rand = seeded(tone.length * 97 + 13);
  // Cloudy patches
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `${vein}${0.025 + rand() * 0.03})`;
    g.beginPath();
    g.ellipse(rand() * 1024, rand() * 1024, 60 + rand() * 200, 30 + rand() * 90, rand() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  // Veins: wandering lines, a few strong and many faint
  for (let i = 0; i < 26; i++) {
    let x = rand() * 1024;
    let y = rand() * 1024;
    let a = rand() * Math.PI * 2;
    g.strokeStyle = `${vein}${i < 5 ? 0.45 : 0.12 + rand() * 0.15})`;
    g.lineWidth = i < 5 ? 1.6 + rand() * 1.4 : 0.6 + rand();
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 60; s++) {
      a += (rand() - 0.5) * 0.6;
      x += Math.cos(a) * 14;
      y += Math.sin(a) * 14;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // Tile joints, in gold
  g.strokeStyle = tone === 'black' ? 'rgba(201,160,82,0.9)' : 'rgba(190,150,80,0.55)';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, 1021, 1021);
  const t = finish(c, repeat);
  cache.set(key, t);
  return t;
}

export type SkyMood = 'day' | 'golden' | 'night';

/** A city skyline at the given time of day, for windows. */
export function skylineTexture(mood: SkyMood, seed = 7): CanvasTexture {
  const key = `sky:${mood}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 768;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, 768);
  if (mood === 'night') { sky.addColorStop(0, '#0b1426'); sky.addColorStop(0.6, '#1c2b4a'); sky.addColorStop(1, '#3a3350'); }
  else if (mood === 'golden') { sky.addColorStop(0, '#5a7fb0'); sky.addColorStop(0.55, '#f0a868'); sky.addColorStop(1, '#f6d29a'); }
  else { sky.addColorStop(0, '#7fb2e0'); sky.addColorStop(1, '#d7e8f2'); }
  g.fillStyle = sky;
  g.fillRect(0, 0, 2048, 768);
  const rand = seeded(seed);
  // Two rows of towers, the far row paler
  for (const row of [0, 1]) {
    let x = -20;
    while (x < 2068) {
      const w = 60 + rand() * 120;
      const h = (row ? 260 : 180) + rand() * (row ? 360 : 260);
      const top = 768 - h - (row ? 0 : 60);
      const body = mood === 'night' ? (row ? '#141a26' : '#1f2738') : mood === 'golden' ? (row ? '#4a3f48' : '#7a6d78') : (row ? '#5d6f80' : '#9fb0bf');
      g.fillStyle = body;
      g.fillRect(x, top, w, 768 - top);
      // Lit windows at night, glints by day
      const lit = mood === 'night' ? 0.55 : mood === 'golden' ? 0.25 : 0.12;
      for (let wy = top + 10; wy < 760; wy += 16) {
        for (let wx = x + 6; wx < x + w - 8; wx += 12) {
          if (rand() > lit) continue;
          g.fillStyle = mood === 'night' ? (rand() > 0.2 ? '#f6d08a' : '#bfe0ff') : mood === 'golden' ? '#ffd9a0' : 'rgba(255,255,255,0.55)';
          g.fillRect(wx, wy, 6, 8);
        }
      }
      x += w + rand() * 18;
    }
  }
  // Lagoon water along the bottom, catching the light
  const water = g.createLinearGradient(0, 700, 0, 768);
  water.addColorStop(0, mood === 'night' ? '#101a2c' : mood === 'golden' ? '#c98a5a' : '#6f9fbf');
  water.addColorStop(1, mood === 'night' ? '#0a1220' : '#3f6f8f');
  g.fillStyle = water;
  g.fillRect(0, 700, 2048, 68);
  const t = finish(c, null);
  cache.set(key, t);
  return t;
}

export const skyMoodAt = (night: number, hour: number): SkyMood => (night > 0.55 ? 'night' : (hour >= 17 && hour < 20) || (hour >= 6 && hour < 8) ? 'golden' : 'day');

/** A hand-tufted rug: sand field, charcoal border and a soft geometric pattern. */
export function rugTexture(seed = 3): CanvasTexture {
  const key = `rug:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 768;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d9cdb6';
  g.fillRect(0, 0, 1024, 768);
  const rand = seeded(seed);
  // Wool speckle
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${rand() > 0.5 ? '255,250,240' : '120,100,80'},${0.05 + rand() * 0.08})`;
    g.fillRect(rand() * 1024, rand() * 768, 2, 2);
  }
  g.strokeStyle = '#3a3836';
  g.lineWidth = 28;
  g.strokeRect(34, 34, 956, 700);
  g.lineWidth = 4;
  g.strokeStyle = '#b8955a';
  g.strokeRect(66, 66, 892, 636);
  // Soft arcs, like a modern abstract rug
  g.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    g.strokeStyle = i % 3 === 0 ? 'rgba(58,56,54,0.55)' : i % 3 === 1 ? 'rgba(184,149,90,0.55)' : 'rgba(150,140,125,0.45)';
    g.lineWidth = 10 + rand() * 18;
    g.beginPath();
    g.arc(200 + rand() * 620, 180 + rand() * 400, 90 + rand() * 220, rand() * Math.PI * 2, rand() * Math.PI * 2 + 1.6);
    g.stroke();
  }
  const t = finish(c, null);
  cache.set(key, t);
  return t;
}

/** An original abstract painting: layered colour fields and a gold sweep. */
export function artTexture(seed = 5): CanvasTexture {
  const key = `art:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 768;
  c.height = 576;
  const g = c.getContext('2d')!;
  const rand = seeded(seed);
  g.fillStyle = '#efe7da';
  g.fillRect(0, 0, 768, 576);
  const palette = ['#1f5a47', '#c9a052', '#2b2622', '#b4543a', '#e6d3b0', '#0f3d33'];
  for (let i = 0; i < 9; i++) {
    g.fillStyle = palette[Math.floor(rand() * palette.length)];
    g.globalAlpha = 0.55 + rand() * 0.4;
    g.beginPath();
    const x = rand() * 768, y = rand() * 576;
    g.ellipse(x, y, 80 + rand() * 220, 50 + rand() * 160, rand() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 0.9;
  g.strokeStyle = '#d9b66a';
  g.lineWidth = 14;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(80, 460);
  g.bezierCurveTo(260, 120, 480, 520, 700, 140);
  g.stroke();
  g.globalAlpha = 1;
  const t = finish(c, null);
  cache.set(key, t);
  return t;
}
