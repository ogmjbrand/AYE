/**
 * Static layout of the city block, shared by rendering and collision.
 * Units are metres. The main boulevard runs north–south along Z, crossed by
 * one east–west street. Buildings sit back from the pavements.
 */
import type { VehicleBodyStyle } from './vehicleCatalog';

export type BuildingStyle = 'tower' | 'office' | 'residential' | 'shop';

export interface Building {
  /** Centre of the footprint at ground level (y is ignored by collision). */
  position: readonly [number, number, number];
  /** Width (X), height (Y), depth (Z). */
  size: readonly [number, number, number];
  color: string;
  style: BuildingStyle;
  /** Shown on signage for shops and landmark buildings. */
  name?: string;
  /** Ground-level architectural opening on the west facade, relative to its centre line. */
  entry?: { side: 'west'; offset: number; width: number; height: number };
}

/** Any solid, axis-aligned footprint the player cannot walk through. */
export interface Obstacle {
  position: readonly [number, number, number];
  size: readonly [number, number, number];
}

export const WORLD_BOUND = 45;
export const PLAYER_RADIUS = 0.3;
export const STREET_LENGTH = 130;
export const PAVEMENT_HEIGHT = 0.12;
export const DANFO_SIZE = [2.0, 2.3, 5.0] as const; // width, height, length
export const STALL_SIZE = [1.4, 1.0, 1.8] as const;

export interface Vehicle {
  position: readonly [number, number, number];
  /** Rotation about Y in radians; 0 faces +Z. */
  heading: number;
  color: string;
  /** Black side stripes (Lagos danfos have them; Accra tro-tros don't). Default true. */
  stripes?: boolean;
  /** A minibus (default) or an ordinary car. Both take up DANFO_SIZE for collisions. */
  kind?: VehicleKind;
  bodyStyle?: VehicleBodyStyle;
}

/** Minibus (danfo, tro-tro, matatu), car, motor tricycle (keke, tuk-tuk, bajaj) or Philippine jeepney. */
export type VehicleKind = 'minibus' | 'car' | 'tricycle' | 'jeepney';

/** One lane of moving traffic: its centre line, direction along Z and how many vehicles use it. */
export interface TrafficLane {
  x: number;
  dir: 1 | -1;
  count: number;
  colors: readonly string[];
  stripes: boolean;
  /** Minibuses (default) or cars. */
  kind?: VehicleKind;
}

type Spot = readonly [number, number, number];

/**
 * What makes one district's streets: the street grid (a boulevard along Z
 * and one cross street), the buildings, and what stands on the pavements.
 * Each district (lib/districts) supplies one; rendering and collision read it.
 */
export interface LayoutSpec {
  id: string;
  /** Boulevard: x in [-roadHalfWidth, roadHalfWidth]; pavements run beside it. */
  roadHalfWidth: number;
  pavementWidth: number;
  crossStreet: { minZ: number; maxZ: number };
  buildings: readonly Building[];
  /** Palms and lamps along both sides of the boulevard: distance from the centre line, spacing, first offset. */
  palms: { x: number; spacing: number; offset: number } | null;
  lamps: { x: number; spacing: number; offset: number };
  powerPoles: readonly Spot[];
  /** Parked minibuses (danfos in Lagos, tro-tros in Accra). */
  vehicles: readonly Vehicle[];
  stalls: readonly Spot[];
  /** Concrete litter bins on the pavement (solid), where the district has them. */
  bins?: readonly Spot[];
  /** Moving traffic, driving on the right. */
  traffic: readonly TrafficLane[];
  /** Roadside billboard with the AYE logo, if the district has one. */
  billboard: Spot | null;
  /** A small public park: lawn, paths, shade trees and benches (trees and benches are solid). */
  park: ParkLayout | null;
  /** Chairs on the pavement outside the lounge (solid), facing the street. */
  terraceChairs: readonly { x: number; z: number; facing: number }[];
  /** Motorhomes parked off the street (solid): centre and heading (0 = along +z). */
  campers?: readonly { x: number; z: number; heading: number }[];
  /** Painted black-and-yellow kerbs and yellow edge lines (default), or plain grey kerbs and white lines. */
  streetStyle?: 'painted' | 'plain';
  /** Distant city massing: seed and colours. */
  skyline: { seed: number; warm: readonly string[]; glass: readonly string[]; towerChance: number };
}

export interface ParkLayout {
  area: { minX: number; maxX: number; minZ: number; maxZ: number };
  trees: readonly (readonly [number, number])[];
  /** Benches: centre and facing (0 = facing +z, π/2 = facing +x). */
  benches: readonly { x: number; z: number; facing: number }[];
  /** Footpaths (drawn only, nothing solid): rectangles on the ground, which may lead out to the street. */
  paths: readonly { x0: number; x1: number; z0: number; z1: number }[];
}
export const BENCH_SIZE = [1.6, 0.9, 0.55] as const; // length, height, depth
export const CHAIR_SIZE = 0.62;
/** A concrete litter bin's footprint (world/Props.tsx draws the scanned bin at its real size). */
export const BIN_SIZE = [0.55, 1, 0.58] as const;
/** A parked motorhome: length, width and height in metres (world/Campers.tsx draws it at this size). */
export const CAMPER_SIZE = { length: 7.8, width: 2.5, height: 2.7 } as const;

export interface DistrictLayout extends LayoutSpec {
  palmSpots: Spot[];
  lampSpots: Spot[];
  /** Everything solid: buildings, parked buses, stalls, tree and lamp bases. */
  obstacles: Obstacle[];
  skylineBuildings: Building[];
}

export const building = (
  x: number, z: number, w: number, d: number, h: number,
  style: BuildingStyle, color: string, name?: string,
): Building => ({ position: [x, 0, z], size: [w, h, d], style, color, name });

/** Height of the walkable surface (pavements are raised above the road). */
export function groundHeightAt(x: number, z: number, layout: DistrictLayout = activeLayout()): number {
  const { roadHalfWidth: R, pavementWidth: P, crossStreet: C } = layout;
  const ax = Math.abs(x);
  const onBoulevardPavement = ax >= R && ax <= R + P && !(z > C.minZ && z < C.maxZ);
  const onCrossPavement = ax >= R && ((z >= C.minZ - P && z <= C.minZ) || (z >= C.maxZ && z <= C.maxZ + P));
  return onBoulevardPavement || onCrossPavement ? PAVEMENT_HEIGHT : 0;
}

/** Deterministic pseudo-random numbers so the city is identical on every load. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pavement positions every `spacing` metres along both sides of the boulevard, skipping the junction. */
function alongBoulevard(spec: LayoutSpec, x: number, spacing: number, offset: number) {
  const { crossStreet: C, pavementWidth: P } = spec;
  const inCross = (z: number) => z > C.minZ - P - 1 && z < C.maxZ + P + 1;
  const out: Spot[] = [];
  for (let z = -WORLD_BOUND + offset; z <= WORLD_BOUND; z += spacing) {
    if (!inCross(z)) out.push([x, 0, z], [-x, 0, z]);
  }
  return out;
}

/**
 * The wider city seen beyond the walkable block: massing only, not solid
 * (the player can never reach it), deterministic so it never changes.
 * Taller towers sit further out, like a business district behind the street.
 */
function skylineFor(spec: LayoutSpec): Building[] {
  const { seed, warm, glass, towerChance } = spec.skyline;
  const rand = seeded(seed);
  const out: Building[] = [];
  const CELL = 20;
  const EXTENT = 150;
  for (let cx = -EXTENT + CELL / 2; cx < EXTENT; cx += CELL) {
    for (let cz = -EXTENT + CELL / 2; cz < EXTENT; cz += CELL) {
      // Keep clear of the playable block and its buildings
      if (Math.abs(cx) < 60 && Math.abs(cz) < 64) continue;
      // Leave the boulevard's corridor open so the street recedes into the distance
      if (Math.abs(cx) < 20) continue;
      if (rand() < 0.12) continue; // the odd gap reads as a real city
      const w = 10 + rand() * 6;
      const d = 10 + rand() * 6;
      const x = cx + (rand() - 0.5) * 4;
      const z = cz + (rand() - 0.5) * 4;
      const dist = Math.hypot(cx, cz);
      const isTower = rand() < Math.min(towerChance, 0.1 + (dist - 60) / 200);
      const h = isTower ? 38 + rand() * (40 + dist / 3) : 10 + rand() * 18;
      const style: BuildingStyle = isTower ? 'tower' : rand() < 0.5 ? 'office' : 'residential';
      const palette = isTower ? glass : warm;
      out.push(building(x, z, w, d, h, style, palette[Math.floor(rand() * palette.length)]));
    }
  }
  return out;
}

export function buildLayout(spec: LayoutSpec): DistrictLayout {
  const palmSpots = spec.palms ? alongBoulevard(spec, spec.palms.x, spec.palms.spacing, spec.palms.offset) : [];
  const lampSpots = alongBoulevard(spec, spec.lamps.x, spec.lamps.spacing, spec.lamps.offset);
  const obstacles: Obstacle[] = [
    ...spec.buildings,
    ...spec.vehicles.map((v) => ({ position: v.position, size: DANFO_SIZE })),
    ...spec.stalls.map((p) => ({ position: p, size: STALL_SIZE })),
    ...(spec.bins ?? []).map((p) => ({ position: p, size: BIN_SIZE })),
    ...palmSpots.map((p) => ({ position: p, size: [0.5, 1, 0.5] as const })),
    ...lampSpots.map((p) => ({ position: p, size: [0.25, 1, 0.25] as const })),
    ...spec.powerPoles.map((p) => ({ position: p, size: [0.3, 1, 0.3] as const })),
    ...(spec.park?.trees ?? []).map(([x, z]) => ({ position: [x, 0, z] as const, size: [0.5, 1, 0.5] as const })),
    ...spec.terraceChairs.map((c) => ({ position: [c.x, 0, c.z] as const, size: [CHAIR_SIZE, 1, CHAIR_SIZE] as const })),
    ...(spec.campers ?? []).map((c) => carFootprint(c.x, c.z, c.heading, CAMPER_SIZE.length, CAMPER_SIZE.width)),
    ...(spec.park?.benches ?? []).map((b) => {
      // Benches face along an axis; their footprint swaps width and depth when turned sideways
      const sideways = Math.abs(Math.sin(b.facing)) > 0.5;
      return { position: [b.x, 0, b.z] as const, size: (sideways ? [BENCH_SIZE[2], 1, BENCH_SIZE[0]] : [BENCH_SIZE[0], 1, BENCH_SIZE[2]]) as readonly [number, number, number] };
    }),
  ];
  return { ...spec, palmSpots, lampSpots, obstacles, skylineBuildings: skylineFor(spec) };
}

// Moving vehicles add themselves here each frame so the player can't walk through them
export const movingObstacles: Obstacle[] = [];
/** Points on the road that traffic stops for, like a pedestrian: emergency vehicles parked in a lane (world/Emergency). */
export const roadBlockers: { x: number; z: number }[] = [];
// Your cars parked in this district (world/ParkedCars keeps it up to date)
export const parkedObstacles: Obstacle[] = [];
/** The district's own obstacles plus every vehicle on the street right now. */
export const obstaclesWithVehicles = (): readonly Obstacle[] =>
  movingObstacles.length || parkedObstacles.length ? [...activeLayout().obstacles, ...movingObstacles, ...parkedObstacles] : activeLayout().obstacles;

/** A parked car as a box on the ground: the footprint of a car this long, turned to face this way. */
export function carFootprint(x: number, z: number, heading: number, length: number, width = 1.85): Obstacle {
  const c = Math.abs(Math.cos(heading)), s = Math.abs(Math.sin(heading));
  return { position: [x, 0, z], size: [width * c + length * s, 1.4, width * s + length * c] };
}

// The district the player is in. Collision and ground height default to it;
// rendering reads the same layout through React context (world/LayoutContext).
let active: DistrictLayout | null = null;
export function setActiveLayout(layout: DistrictLayout) {
  active = layout;
}
export function activeLayout(): DistrictLayout {
  if (!active) throw new Error('No district layout set');
  return active;
}

/**
 * Pushes a circle (the player's footprint) out of every obstacle it overlaps.
 * Works on the XZ plane; returns the corrected position.
 */
export function resolveCollisions(
  x: number,
  z: number,
  radius = PLAYER_RADIUS,
  obstacles: readonly Obstacle[] = obstaclesWithVehicles(),
): { x: number; z: number } {
  for (const o of obstacles) {
    const halfW = o.size[0] / 2;
    const halfD = o.size[2] / 2;
    const minX = o.position[0] - halfW;
    const maxX = o.position[0] + halfW;
    const minZ = o.position[2] - halfD;
    const maxZ = o.position[2] + halfD;

    const nearestX = Math.max(minX, Math.min(x, maxX));
    const nearestZ = Math.max(minZ, Math.min(z, maxZ));
    const dx = x - nearestX;
    const dz = z - nearestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq >= radius * radius) continue;

    if (distSq > 1e-9) {
      // Centre is outside the box: push straight away from the nearest edge point.
      const dist = Math.sqrt(distSq);
      x = nearestX + (dx / dist) * radius;
      z = nearestZ + (dz / dist) * radius;
    } else {
      // Centre is inside the box: exit through the closest face.
      const exits = [
        { d: x - minX, x: minX - radius, z },
        { d: maxX - x, x: maxX + radius, z },
        { d: z - minZ, x, z: minZ - radius },
        { d: maxZ - z, x, z: maxZ + radius },
      ];
      const best = exits.reduce((a, c) => (c.d < a.d ? c : a));
      x = best.x;
      z = best.z;
    }
  }

  x = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, x));
  z = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, z));
  return { x, z };
}
