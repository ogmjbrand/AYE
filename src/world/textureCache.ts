import type { Texture } from 'three';

const made = new Map<string, Texture>();

/**
 * One texture per key for the whole session. Signs and name tags are drawn on
 * a canvas; drawing a fresh one every time a place mounts gave the GPU a new
 * texture on each visit (going home and back out added about 75) and none was
 * ever freed. Keyed by everything that's drawn, so the same sign is shared and
 * reused. Callers must not change a cached texture.
 */
export function memoTexture<T extends Texture>(key: string, make: () => T): T {
  const hit = made.get(key);
  if (hit) return hit as T;
  const t = make();
  made.set(key, t);
  return t;
}
