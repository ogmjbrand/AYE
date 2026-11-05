import { useEffect } from 'react';
import type { Object3D } from 'three';
import type { GarmentFabric, GarmentKind } from '../lib/fashion';
import { findBody, makeGarment, wear } from './skinnedGarment';
import { hideUnder, makeGlbGarment } from './glbGarment';

export interface WornGarment { kind: GarmentKind; fabric: GarmentFabric; colors: readonly [string, string, string] }
/** A garment from the pattern pipeline: its skinned GLB for this person (lib/garmentRegistry.ts) and colour. */
export interface SewnWorn { path: string; color: string }

const NONE: readonly SewnWorn[] = [];

/** Puts each real 3D garment on the person (world/skinnedGarment.ts, world/glbGarment.ts) and takes it off again when it changes. */
export function SkinnedGarments({ scene, garments, sewn = NONE }: { scene: Object3D; garments: readonly WornGarment[]; sewn?: readonly SewnWorn[] }) {
  const key = JSON.stringify(garments);
  useEffect(() => {
    const list = JSON.parse(key) as WornGarment[];
    const undo: (() => void)[] = [];
    for (const g of list) {
      const mesh = makeGarment(scene, g.kind, g.fabric, g.colors);
      if (mesh) undo.push(wear(scene, mesh));
      else console.warn(`[AYE garments] ${g.kind} needs the Rocketbox skeleton; this person can't wear it`);
    }
    return () => { for (const u of undo) u(); };
  }, [scene, key]);
  const sewnKey = JSON.stringify(sewn);
  useEffect(() => {
    const list = JSON.parse(sewnKey) as SewnWorn[];
    let undo: (() => void)[] = [];
    let live = true;
    void Promise.all(list.map((g) => makeGlbGarment(scene, g.path, g.color).catch((e: unknown) => {
      console.warn(`[AYE garments] couldn't load ${g.path}`, e);
      return null;
    }))).then((meshes) => {
      if (!live) return;
      undo = meshes.flatMap((m, i) => {
        if (m) {
          // The person's own clothes can't show through: their body isn't drawn under the garment
          const body = findBody(scene)?.body;
          const shown = body ? hideUnder(body, m) : () => {};
          const off = wear(scene, m);
          return [() => { off(); shown(); }];
        }
        console.warn(`[AYE garments] ${list[i].path} doesn't fit this person's skeleton`);
        return [];
      });
    });
    return () => { live = false; for (const u of undo) u(); };
  }, [scene, sewnKey]);
  return null;
}
