/**
 * The rules behind the water: the waves on open water (the same sums the shader draws, so things
 * can float on them), the ripples someone or something makes on a surface, and where puddles
 * gather on a wet street. Pure.
 */
import { MAX_RIPPLES } from './vfxQuality';

/** One Gerstner wave: direction (unit x, z), wavelength (m), amplitude (m), steepness 0 … 1. */
export interface Wave { dir: readonly [number, number]; length: number; amp: number; steep: number }

export type WaterKind = 'pool' | 'river' | 'ocean' | 'puddle';

/** The waves on each kind of water (pools and puddles are still, apart from ripples). */
export const WAVES: Record<WaterKind, readonly Wave[]> = {
  pool: [],
  puddle: [],
  river: [{ dir: [1, 0], length: 2.2, amp: 0.015, steep: 0.2 }],
  ocean: [
    { dir: [0.8, 0.6], length: 14, amp: 0.32, steep: 0.45 },
    { dir: [0.2, 0.98], length: 7.5, amp: 0.14, steep: 0.4 },
    { dir: [-0.6, 0.8], length: 3.6, amp: 0.05, steep: 0.35 },
  ],
};

const G = 9.81;
/** Phase speed of a deep-water wave of this length: c = sqrt(g / k). */
export const waveSpeed = (length: number) => Math.sqrt(G / ((2 * Math.PI) / length));

/** Height of the water at (x, z) and time t (seconds): the vertical part of the Gerstner sum. */
export function waveHeight(waves: readonly Wave[], x: number, z: number, t: number): number {
  let y = 0;
  for (const w of waves) {
    const k = (2 * Math.PI) / w.length;
    y += w.amp * Math.sin(k * (w.dir[0] * x + w.dir[1] * z) - k * waveSpeed(w.length) * t);
  }
  return y;
}

/** The highest crest the waves can make (for sizing what floats or the shoreline foam). */
export const maxWaveHeight = (waves: readonly Wave[]) => waves.reduce((s, w) => s + w.amp, 0);

/** A ripple spreading from where something touched the water. */
export interface Ripple { x: number; z: number; at: number; strength: number }

/** How long a ripple shows, and how fast its ring travels (m/s). */
export const RIPPLE_LIFE = 3.2;
export const RIPPLE_SPEED = 1.1;

/**
 * Add a ripple, keeping only the newest `max` (the shader traces a fixed number). Ripples from the
 * same spot within a moment of each other (someone wading) merge into one.
 */
export function addRipple(list: readonly Ripple[], r: Ripple, max = MAX_RIPPLES): Ripple[] {
  const live = list.filter((p) => r.at - p.at < RIPPLE_LIFE);
  const near = live.find((p) => Math.hypot(p.x - r.x, p.z - r.z) < 0.4 && r.at - p.at < 0.35);
  if (near) return live;
  return [...live, r].slice(-max);
}

/** The ripples packed for the shader: [x, z, start time, strength] each; unused slots start long ago. */
export function packRipples(list: readonly Ripple[], max = MAX_RIPPLES): Float32Array {
  const out = new Float32Array(max * 4);
  for (let i = 0; i < max; i++) {
    const r = list[i];
    out.set(r ? [r.x, r.z, r.at, r.strength] : [0, 0, -1e4, 0], i * 4);
  }
  return out;
}

/** The height of a ripple ring at a distance from its centre, `age` seconds after it started. */
export function rippleHeight(distance: number, age: number, strength: number): number {
  if (age < 0 || age > RIPPLE_LIFE) return 0;
  const front = age * RIPPLE_SPEED;
  const band = distance - front;
  if (band > 0.05) return 0;
  const fade = (1 - age / RIPPLE_LIFE) * Math.exp(-band * band * 6);
  return Math.sin(band * 14) * 0.03 * strength * fade;
}

export interface Puddle { x: number; z: number; rx: number; rz: number; rot: number }

/**
 * Where water gathers on a street: in the gutters along the kerbs and in dips in the lanes, the
 * same spots every time. `half` is half the road's width; the street runs along z.
 */
export function puddleSpots(half: number, fromZ: number, toZ: number, count: number, seed = 7): Puddle[] {
  let s = seed >>> 0;
  const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const out: Puddle[] = [];
  for (let i = 0; i < count; i++) {
    // Two in three in the gutters, the rest in the wheel ruts of the lanes
    const gutter = i % 3 !== 2;
    const side = r() < 0.5 ? -1 : 1;
    const rx = gutter ? 0.3 + r() * 0.25 : 0.6 + r() * 0.7;
    const rz = gutter ? 1.1 + r() * 1.6 : 0.5 + r() * 0.8;
    const rot = (r() - 0.5) * 0.15;
    // Gutter puddles lie against the kerb but never over it, turned or not
    const reach = rx + rz * Math.abs(Math.sin(rot));
    const x = gutter ? side * (half - reach - 0.05 - r() * 0.15) : side * (half * 0.45 + (r() - 0.5) * 0.6);
    const z = fromZ + r() * (toZ - fromZ);
    out.push({ x, z, rx, rz, rot });
  }
  return out;
}

/** How much water lies on the ground (0 … 1), building up while it rains and drying slowly after. */
export function stepWetness(wet: number, rain: number, dt: number): number {
  const target = Math.max(0, Math.min(1, rain));
  const rate = target > wet ? 0.08 : 0.012;
  return wet + (target - wet) * Math.min(1, rate * dt);
}
