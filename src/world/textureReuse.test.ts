import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial, Texture } from 'three';
import { memoTexture } from './textureCache';
import { tiledMaterial } from './materials';

describe('textures are made once and reused across visits', () => {
  it('memoTexture draws a key once and hands back the same texture', () => {
    let drawn = 0;
    const make = () => { drawn++; return new Texture(); };
    const a = memoTexture('test:sign:A', make);
    const b = memoTexture('test:sign:A', make);
    const c = memoTexture('test:sign:B', make);
    expect(a).toBe(b);
    expect(c).not.toBe(a);
    expect(drawn).toBe(2);
  });

  it('tiledMaterial keeps one copy per size, sharing the image with the original', () => {
    const base = new MeshStandardMaterial({ map: new Texture(), normalMap: new Texture() });
    const a = tiledMaterial(base, 4, 2);
    const again = tiledMaterial(base, 4, 2);
    const other = tiledMaterial(base, 8, 2);
    expect(again).toBe(a);
    expect(other).not.toBe(a);
    expect(a).not.toBe(base);
    expect(a.map!.repeat.toArray()).toEqual([4, 2]);
    expect(other.map!.repeat.toArray()).toEqual([8, 2]);
    // Same pixels: only the repeat differs, so the GPU holds the image once
    expect(a.map!.source).toBe(base.map!.source);
    expect(a.normalMap!.source).toBe(base.normalMap!.source);
    // The original is untouched
    expect(base.map!.repeat.toArray()).toEqual([1, 1]);
  });
});
