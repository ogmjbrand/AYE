/**
 * How a fire behaves, independent of how it's drawn: it grows towards what its fuel allows,
 * spreads to neighbouring surfaces that can burn, and is beaten down by water or an extinguisher.
 * Pure and deterministic (seeded), so tests and a server can run the same rules.
 */

export interface FireCell {
  /** 0 … 1: how hard it's burning. */
  intensity: number;
  /** 0 … 1: what's left to burn. A spent cell can't light again. */
  fuel: number;
  /** How readily it catches (0: never — stone, metal; 1: dry wood, fabric). */
  flammability: number;
  /** 0 … 1: soaked surfaces resist catching until they dry. */
  wetness: number;
}

export const FIRE_RULES = {
  /** Intensity gained per second while there's fuel. */
  growth: 0.12,
  /** Fuel used per second at full intensity. */
  burn: 0.02,
  /** Below this a cell has gone out. */
  out: 0.03,
  /** Chance per second, at full intensity, of lighting a flammable dry neighbour. */
  spread: 0.35,
  /** Intensity a newly caught cell starts at. */
  catchAt: 0.15,
  /** Intensity knocked off per second by a hose at full flow (an extinguisher is weaker). */
  hose: 0.55,
  extinguisher: 0.3,
  /** Wetness water adds per second, and how fast it dries. */
  soak: 0.8,
  dry: 0.02,
} as const;

export const cell = (flammability: number, intensity = 0, fuel = 1): FireCell => ({ intensity, fuel, flammability, wetness: 0 });

export const burning = (c: FireCell) => c.intensity > FIRE_RULES.out;

/**
 * One cell over `dt` seconds: it grows while it has fuel (less when wet), burns its fuel, and
 * water knocks it down and soaks it (`water`: 0 none … 1 a hose at full flow).
 */
export function stepCell(c: FireCell, dt: number, water = 0): FireCell {
  const w = Math.max(0, Math.min(1, water));
  let intensity = c.intensity;
  let fuel = c.fuel;
  if (burning(c)) {
    const room = Math.min(1, fuel * 1.5) - intensity;
    intensity += Math.max(0, room) * FIRE_RULES.growth * (1 - c.wetness) * dt * 4;
    fuel = Math.max(0, fuel - FIRE_RULES.burn * intensity * dt);
    if (fuel <= 0) intensity = Math.max(0, intensity - 0.2 * dt);
  }
  intensity = Math.max(0, intensity - FIRE_RULES.hose * w * dt);
  if (intensity <= FIRE_RULES.out) intensity = 0;
  const wetness = Math.max(0, Math.min(1, c.wetness + FIRE_RULES.soak * w * dt - FIRE_RULES.dry * dt));
  return { ...c, intensity: Math.min(1, intensity), fuel, wetness };
}

/** A row or grid of surfaces that fire can travel along (a facade's windows, a stack of pallets, a car). */
export interface FireField {
  cols: number;
  rows: number;
  cells: FireCell[];
  /** Seconds simulated so far: also the seed for spreading. */
  t: number;
}

export function fireField(cols: number, rows: number, flammability: (col: number, row: number) => number): FireField {
  const cells: FireCell[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(cell(Math.max(0, Math.min(1, flammability(c, r)))));
  return { cols, rows, cells, t: 0 };
}

export function ignite(f: FireField, col: number, row: number, intensity = 0.4): FireField {
  const i = row * f.cols + col;
  if (!f.cells[i] || f.cells[i].flammability <= 0 || f.cells[i].fuel <= 0) return f;
  const cells = f.cells.slice();
  cells[i] = { ...cells[i], intensity: Math.max(cells[i].intensity, intensity) };
  return { ...f, cells };
}

/** A deterministic 0 … 1 from integers (a cell, a time step). */
function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/**
 * The whole field over `dt` seconds. Fire climbs more readily than it spreads sideways (heat
 * rises), and `water(col, row)` says how much water each cell is getting.
 */
export function stepField(f: FireField, dt: number, water: (col: number, row: number) => number = () => 0): FireField {
  const t = f.t + dt;
  const step = Math.floor(t * 10);
  const next = f.cells.map((c, i) => stepCell(c, dt, water(i % f.cols, Math.floor(i / f.cols))));
  for (let i = 0; i < f.cells.length; i++) {
    const src = f.cells[i];
    if (!burning(src)) continue;
    const col = i % f.cols, row = Math.floor(i / f.cols);
    const around: [number, number, number][] = [[col - 1, row, 1], [col + 1, row, 1], [col, row + 1, 1.8], [col, row - 1, 0.4]];
    for (const [c, r, bias] of around) {
      if (c < 0 || r < 0 || c >= f.cols || r >= f.rows) continue;
      const j = r * f.cols + c;
      const n = next[j];
      if (burning(n) || n.fuel <= 0 || n.flammability <= 0) continue;
      const chance = FIRE_RULES.spread * src.intensity * n.flammability * (1 - n.wetness) * bias * dt;
      if (hash(j * 31 + i, step) < chance) next[j] = { ...n, intensity: FIRE_RULES.catchAt };
    }
  }
  return { ...f, cells: next, t };
}

/** The field's overall size, 0 … 1 (the share of its cells' full intensity). */
export const fieldIntensity = (f: FireField) => f.cells.reduce((s, c) => s + c.intensity, 0) / Math.max(1, f.cells.length);
export const burningCount = (f: FireField) => f.cells.filter(burning).length;
