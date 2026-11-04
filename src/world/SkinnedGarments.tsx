import { useEffect } from 'react';
import type { Object3D } from 'three';
import type { GarmentFabric, GarmentKind } from '../lib/fashion';
import { makeGarment, wear } from './skinnedGarment';

export interface WornGarment { kind: GarmentKind; fabric: GarmentFabric; colors: readonly [string, string, string] }

/** Puts each real 3D garment on the person (world/skinnedGarment.ts) and takes it off again when it changes. */
export function SkinnedGarments({ scene, garments }: { scene: Object3D; garments: readonly WornGarment[] }) {
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
  return null;
}
