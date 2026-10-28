import type { Material, Object3D, Texture } from 'three';

/** Every texture used by the visible meshes of a scene, once each. */
export function sceneTextures(root: Object3D): Texture[] {
  const found = new Set<Texture>();
  root.traverseVisible((o) => {
    const mats = (o as Object3D & { material?: Material | Material[] }).material;
    for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
      for (const value of Object.values(m)) {
        if (value && typeof value === 'object' && (value as Texture).isTexture) found.add(value as Texture);
      }
    }
  });
  return [...found];
}
