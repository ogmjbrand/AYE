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

const capped = new WeakSet<object>();

/**
 * Scales a texture's image down so neither side exceeds `max` pixels, once
 * per image (textures that share an image share the result). Big embedded
 * skin maps (2048 px per resident) cost phones seconds to upload and a lot of
 * memory; at character distances 1024 looks the same. Images that can't be
 * drawn to a canvas (compressed, video, data) are left alone.
 */
export function capTexture(t: Texture, max: number): void {
  const image = t.image as (CanvasImageSource & { width?: number; height?: number }) | undefined;
  if (!image || capped.has(image) || typeof document === 'undefined') return;
  const w = image.width ?? 0;
  const h = image.height ?? 0;
  capped.add(image);
  if (!w || !h || (w <= max && h <= max)) return;
  const drawable = (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement && image.complete)
    || (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap)
    || (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement);
  if (!drawable) return;
  const scale = max / Math.max(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  capped.add(canvas);
  t.image = canvas;
  t.needsUpdate = true;
}
