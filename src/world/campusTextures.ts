import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { seeded } from '../lib/world';

/**
 * AYE Global University's signage and surfaces, painted on canvases at load
 * (nothing downloaded): the crest, the gate and building signs, room plates,
 * the lobby directory, the lecture slide, cafeteria menus and the paving.
 */

const NAVY = '#14213d';
const GOLD = '#d4af5a';
const GOLD_DEEP = '#a8822e';
const cache = new Map<string, CanvasTexture>();

function finish(c: HTMLCanvasElement, key: string, repeat?: [number, number]) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(...repeat);
  }
  cache.set(key, t);
  return t;
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

/** The crest: a gold shield with an open book, between laurel branches. */
function crest(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, ink = NAVY) {
  g.save();
  g.translate(cx, cy);
  g.scale(s / 100, s / 100);
  // Laurels
  g.strokeStyle = GOLD;
  g.fillStyle = GOLD;
  g.lineWidth = 3;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.arc(0, 8, 58, side < 0 ? Math.PI * 0.55 : Math.PI * 0.45, side < 0 ? Math.PI * 1.15 : -Math.PI * 0.15, side > 0);
    g.stroke();
    for (let i = 0; i < 7; i++) {
      const a = side < 0 ? Math.PI * (0.62 + i * 0.075) : Math.PI * (0.38 - i * 0.075);
      const x = Math.cos(a) * 58, y = 8 + Math.sin(a) * 58;
      g.beginPath();
      g.ellipse(x, y, 9, 4, a + Math.PI / 2 * side, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Shield
  const grad = g.createLinearGradient(0, -48, 0, 50);
  grad.addColorStop(0, '#f1d58c');
  grad.addColorStop(1, GOLD_DEEP);
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(-38, -46);
  g.lineTo(38, -46);
  g.lineTo(38, 4);
  g.quadraticCurveTo(36, 36, 0, 54);
  g.quadraticCurveTo(-36, 36, -38, 4);
  g.closePath();
  g.fill();
  g.fillStyle = ink;
  g.beginPath();
  g.moveTo(-30, -38);
  g.lineTo(30, -38);
  g.lineTo(30, 2);
  g.quadraticCurveTo(28, 28, 0, 44);
  g.quadraticCurveTo(-28, 28, -30, 2);
  g.closePath();
  g.fill();
  // Open book
  g.fillStyle = '#f4ead2';
  g.beginPath();
  g.moveTo(0, -6);
  g.quadraticCurveTo(-12, -16, -24, -12);
  g.lineTo(-24, 14);
  g.quadraticCurveTo(-12, 10, 0, 18);
  g.quadraticCurveTo(12, 10, 24, 14);
  g.lineTo(24, -12);
  g.quadraticCurveTo(12, -16, 0, -6);
  g.fill();
  g.strokeStyle = GOLD_DEEP;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, -6);
  g.lineTo(0, 18);
  g.stroke();
  // A star above the book
  g.fillStyle = GOLD;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 4 : 9;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(Math.cos(a) * r, -26 + Math.sin(a) * r);
  }
  g.fill();
  g.restore();
}

/** Gold letters with a dark edge, for signs on stone. */
function goldText(g: CanvasRenderingContext2D, text: string, x: number, y: number, font: string) {
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const grad = g.createLinearGradient(0, y - 40, 0, y + 40);
  grad.addColorStop(0, '#f6dc94');
  grad.addColorStop(0.5, GOLD);
  grad.addColorStop(1, GOLD_DEEP);
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(40,30,10,0.55)';
  g.strokeText(text, x, y + 3);
  g.fillStyle = grad;
  g.fillText(text, x, y);
}

/** The gate's sign: crest and name on dark stone. */
export function gateSign() {
  const key = 'gate';
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(2048, 384);
  g.fillStyle = '#2b2a28';
  g.fillRect(0, 0, 2048, 384);
  g.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 2048; i += 128) g.fillRect(i, 0, 2, 384);
  crest(g, 240, 196, 240);
  goldText(g, 'AYE GLOBAL UNIVERSITY', 1120, 170, "800 150px 'Cinzel', 'Trajan Pro', Georgia, serif");
  g.fillStyle = GOLD;
  g.font = "600 44px 'DM Sans', sans-serif";
  g.textAlign = 'center';
  g.fillText('L E A R N   ·   G R O W   ·   C R E A T E', 1120, 300);
  return finish(c, key);
}

/** A navy board with the crest and white lettering: building names, the courtyard monument. */
export function crestBoard(title: string, subtitle = '', w = 1536, h = 384) {
  const key = `board:${title}:${subtitle}:${w}x${h}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(w, h);
  g.fillStyle = NAVY;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = GOLD;
  g.lineWidth = 8;
  g.strokeRect(14, 14, w - 28, h - 28);
  crest(g, h * 0.62, h / 2, h * 0.62);
  goldText(g, title, w / 2 + h * 0.3, subtitle ? h * 0.42 : h / 2, `800 ${Math.round(h * 0.3)}px 'Cinzel', Georgia, serif`);
  if (subtitle) {
    g.fillStyle = '#e9e4d8';
    g.font = `600 ${Math.round(h * 0.11)}px 'DM Sans', sans-serif`;
    g.textAlign = 'center';
    g.fillText(subtitle.toUpperCase().split('').join(' '), w / 2 + h * 0.3, h * 0.74);
  }
  return finish(c, key);
}

/** A tall banner hung on the building (navy, gold edge, words stacked). */
export function banner(words: string[]) {
  const key = `banner:${words.join('|')}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(256, 768);
  g.fillStyle = '#1b2a55';
  g.fillRect(0, 0, 256, 768);
  g.fillStyle = GOLD;
  g.fillRect(0, 0, 256, 10);
  g.fillRect(0, 758, 256, 10);
  crest(g, 128, 120, 120, '#1b2a55');
  g.fillStyle = '#f4f1ea';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const size = words.length > 4 ? 44 : 54;
  g.font = `800 ${size}px Manrope, 'DM Sans', sans-serif`;
  words.forEach((wd, i) => g.fillText(wd, 128, 260 + i * (size + 22)));
  return finish(c, key);
}

/** A small room plate over a door: number and name. */
export function roomPlate(code: string, name: string) {
  const key = `plate:${code}:${name}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(768, 160);
  g.fillStyle = '#1d2433';
  g.fillRect(0, 0, 768, 160);
  g.fillStyle = GOLD;
  g.fillRect(0, 0, 150, 160);
  g.fillStyle = NAVY;
  g.font = "800 64px Manrope, 'DM Sans', sans-serif";
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(code || 'AYE', 75, 82);
  g.fillStyle = '#f2efe8';
  g.textAlign = 'left';
  g.font = "700 56px Manrope, 'DM Sans', sans-serif";
  g.fillText(name, 180, 82);
  return finish(c, key);
}

/** A list board: a title bar, then rows (with an optional right-hand column). Directories, menus, timetables. */
export function listBoard(title: string, rows: readonly (readonly [string, string?])[], opts: { w?: number; h?: number; accent?: string; arrows?: boolean } = {}) {
  const { w = 768, h = 1024, accent = GOLD, arrows = false } = opts;
  const key = `list:${title}:${rows.map((r) => r.join('/')).join('|')}:${w}x${h}:${arrows}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(w, h);
  g.fillStyle = '#121a2c';
  g.fillRect(0, 0, w, h);
  g.fillStyle = accent;
  g.fillRect(0, 0, w, 120);
  g.fillStyle = NAVY;
  g.font = "800 64px Manrope, 'DM Sans', sans-serif";
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.fillText(title, 40, 62);
  const rowH = Math.min(110, (h - 160) / Math.max(1, rows.length));
  rows.forEach(([a, b], i) => {
    const y = 160 + i * rowH + rowH / 2;
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)';
    g.fillRect(24, y - rowH / 2 + 4, w - 48, rowH - 8);
    g.fillStyle = '#f2efe8';
    g.textAlign = 'left';
    g.font = `600 ${Math.round(rowH * 0.36)}px 'DM Sans', sans-serif`;
    g.fillText(a, 48, y);
    if (b || arrows) {
      g.textAlign = 'right';
      g.fillStyle = accent;
      g.font = `700 ${Math.round(rowH * 0.36)}px 'DM Sans', sans-serif`;
      g.fillText(b ?? '→', w - 48, y);
    }
  });
  return finish(c, key);
}

/** The lecture slide on the hall's screen: a title and a bar chart. */
export function lectureSlide(title: string, lecturer: string) {
  const key = `slide:${title}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(1280, 720);
  g.fillStyle = '#f7f8fb';
  g.fillRect(0, 0, 1280, 720);
  g.fillStyle = NAVY;
  g.fillRect(0, 0, 1280, 18);
  g.font = "800 66px Manrope, 'DM Sans', sans-serif";
  g.textAlign = 'left';
  g.fillText(title, 70, 130);
  g.fillStyle = '#5a6478';
  g.font = "500 34px 'DM Sans', sans-serif";
  g.fillText(lecturer + ' · AYE Global University', 70, 190);
  const bars = [0.35, 0.5, 0.62, 0.8, 0.95];
  bars.forEach((v, i) => {
    g.fillStyle = i === bars.length - 1 ? GOLD : '#2f5fb3';
    const bh = v * 360;
    g.fillRect(640 + i * 110, 640 - bh, 70, bh);
  });
  g.strokeStyle = '#9aa3b5';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(620, 640);
  g.lineTo(1220, 640);
  g.stroke();
  g.fillStyle = '#2b3242';
  g.font = "500 32px 'DM Sans', sans-serif";
  ['• Markets across Africa', '• Ideas into ventures', '• Measuring growth', '• This week: case study'].forEach((t, i) => g.fillText(t, 70, 300 + i * 70));
  crest(g, 1170, 110, 110);
  return finish(c, key);
}

/** A monitor's screen: lines of code or a spreadsheet, slightly different per seed. */
export function screenTexture(seed: number) {
  const key = `screen:${seed % 4}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(256, 160);
  const rand = seeded(seed % 4 + 3);
  g.fillStyle = seed % 2 ? '#0f1726' : '#f4f6fa';
  g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#2f5fb3';
  g.fillRect(0, 0, 256, 14);
  for (let i = 0; i < 12; i++) {
    g.fillStyle = seed % 2 ? ['#7fd1a8', '#e9c46a', '#8ab4f8', '#d0d4dc'][i % 4] : ['#3a4252', '#7a8496', '#2f5fb3'][i % 3];
    g.fillRect(12 + (i % 3) * 10, 24 + i * 11, 40 + rand() * 170, 5);
  }
  return finish(c, key);
}

/** Large pale stone paving with fine joints. */
export function pavingTexture(repeat: [number, number]) {
  const key = `paving:${repeat.join(',')}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(512, 512);
  const rand = seeded(11);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const v = 176 + Math.round(rand() * 16);
      g.fillStyle = `rgb(${v},${v - 10},${v - 28})`;
      g.fillRect(x * 128, y * 128, 128, 128);
      for (let k = 0; k < 30; k++) {
        g.fillStyle = `rgba(120,100,80,${0.03 + rand() * 0.04})`;
        g.fillRect(x * 128 + rand() * 128, y * 128 + rand() * 128, 2 + rand() * 5, 2 + rand() * 5);
      }
    }
  }
  g.strokeStyle = 'rgba(110,95,80,0.55)';
  g.lineWidth = 3;
  for (let i = 0; i <= 512; i += 128) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
  }
  return finish(c, key, repeat);
}

/** Asphalt with a little grain. */
export function asphaltTexture(repeat: [number, number]) {
  const key = `asphalt:${repeat.join(',')}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#3a3b3d';
  g.fillRect(0, 0, 256, 256);
  const rand = seeded(5);
  for (let i = 0; i < 2500; i++) {
    const v = 40 + Math.round(rand() * 40);
    g.fillStyle = `rgba(${v},${v},${v + 2},0.6)`;
    g.fillRect(rand() * 256, rand() * 256, 1.5, 1.5);
  }
  return finish(c, key, repeat);
}

/** Lawn: green with mottling. */
export function lawnTexture(repeat: [number, number]) {
  const key = `lawn:${repeat.join(',')}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#4f7f35';
  g.fillRect(0, 0, 256, 256);
  const rand = seeded(8);
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = rand() > 0.5 ? 'rgba(110,160,70,0.5)' : 'rgba(40,80,30,0.45)';
    g.fillRect(rand() * 256, rand() * 256, 1.5, 3);
  }
  return finish(c, key, repeat);
}

/** A poster for a noticeboard. */
export function poster(title: string, line: string, color: string) {
  const key = `poster:${title}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, g] = canvas(256, 360);
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 360);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.font = "800 38px Manrope, 'DM Sans', sans-serif";
  g.textAlign = 'center';
  title.split(' ').forEach((wd, i) => g.fillText(wd, 128, 80 + i * 44));
  g.font = "500 22px 'DM Sans', sans-serif";
  g.fillText(line, 128, 320);
  return finish(c, key);
}
