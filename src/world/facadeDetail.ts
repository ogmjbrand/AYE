/**
 * 3D detail that sits exactly on the windows painted into the facade
 * textures (textures.ts): reflective glass, concrete sills and lintels, and
 * floor bands. Positions come from the same tile grid the facade UVs use, so
 * they line up whichever way a building faces.
 */
import { Vector3 } from 'three';
import type { Building, BuildingStyle } from '../lib/world';
import { BAY_WIDTH, FACADE_TILE, FLOOR_HEIGHT } from './textures';

/** Where each style's window pane sits inside one bay × one floor of the texture (0–1, y from the top). */
const PANE: Partial<Record<BuildingStyle, { x0: number; x1: number; y0: number; y1: number }>> = {
  residential: { x0: 0.25, x1: 0.75, y0: 0.22, y1: 0.7 },
  office: { x0: 4 / 128, x1: 124 / 128, y0: 0.18, y1: 0.76 },
  shop: { x0: 0.2, x1: 0.8, y0: 0.25, y1: 0.7 },
};

/** The facade texture's horizontal offset for a building (quarter tiles), fixed by its position. */
export function facadeOffset(b: Building): number {
  const h = Math.abs(Math.round(b.position[0] * 7 + b.position[2] * 13));
  return (h % 4) / 4;
}

export interface Face {
  /** Corner the texture starts from, the direction along the wall, the wall's length and its outward normal. */
  origin: Vector3;
  along: Vector3;
  length: number;
  normal: Vector3;
  /** Rotation about Y that turns +Z to face along the normal. */
  rotationY: number;
}

/** The four walls in the same order and direction as the facade geometry's UVs. */
export function facesOf(b: Building): Face[] {
  const [x, , z] = b.position;
  const [w, , d] = b.size;
  const minX = x - w / 2, maxX = x + w / 2, minZ = z - d / 2, maxZ = z + d / 2;
  const face = (ox: number, oz: number, ax: number, az: number, length: number, nx: number, nz: number): Face => ({
    origin: new Vector3(ox, 0, oz), along: new Vector3(ax, 0, az), length, normal: new Vector3(nx, 0, nz), rotationY: Math.atan2(nx, nz),
  });
  return [
    face(minX, maxZ, 1, 0, w, 0, 1),
    face(maxX, maxZ, 0, -1, d, 1, 0),
    face(maxX, minZ, -1, 0, w, 0, -1),
    face(minX, minZ, 0, 1, d, -1, 0),
  ];
}

export interface WindowSpot {
  /** Centre of the pane, on the wall surface. */
  center: Vector3;
  width: number;
  height: number;
  normal: Vector3;
  rotationY: number;
}

/** Every painted window on a building that has a full pane on the wall. */
export function windowsOf(b: Building): WindowSpot[] {
  const pane = PANE[b.style];
  if (!pane) return [];
  const bay = BAY_WIDTH[b.style];
  const fh = FLOOR_HEIGHT[b.style];
  const height = b.size[1];
  const shift = facadeOffset(b) * FACADE_TILE.bays;
  const width = (pane.x1 - pane.x0) * bay;
  const paneH = (pane.y1 - pane.y0) * fh;
  const centreInBay = ((pane.x0 + pane.x1) / 2) * bay;
  const out: WindowSpot[] = [];
  for (const f of facesOf(b)) {
    for (let k = -1; ; k++) {
      // Bay k starts where the texture's u crosses a whole bay
      const start = (k - shift) * bay;
      if (start > f.length) break;
      const along = start + centreInBay;
      if (along - width / 2 < 0.05 || along + width / 2 > f.length - 0.05) continue;
      for (let fl = 0; (fl + 1) * fh <= height - 0.2; fl++) {
        // Shops: the ground floor is shopfront, not windows
        if (b.style === 'shop' && fl % FACADE_TILE.floors === 0) continue;
        const top = fl * fh + (1 - pane.y0) * fh;
        out.push({
          center: f.origin.clone().addScaledVector(f.along, along).setY(top - paneH / 2),
          width,
          height: paneH,
          normal: f.normal,
          rotationY: f.rotationY,
        });
      }
    }
  }
  return out;
}

/** Floor slab bands around the building at every floor above the ground (residential and office). */
export function floorBandsOf(b: Building): { center: Vector3; length: number; rotationY: number; normal: Vector3 }[] {
  if (b.style !== 'residential' && b.style !== 'office') return [];
  const fh = FLOOR_HEIGHT[b.style];
  const out: { center: Vector3; length: number; rotationY: number; normal: Vector3 }[] = [];
  for (const f of facesOf(b)) {
    for (let fl = 1; fl * fh < b.size[1] - 0.5; fl++) {
      out.push({
        center: f.origin.clone().addScaledVector(f.along, f.length / 2).setY(fl * fh),
        length: f.length + 0.2,
        rotationY: f.rotationY,
        normal: f.normal,
      });
    }
  }
  return out;
}
