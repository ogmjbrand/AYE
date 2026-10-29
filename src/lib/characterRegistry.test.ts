import { describe, expect, it } from 'vitest';
import { CC5_CHARACTER, ROCKETBOX_CHARACTERS, characterById, characterRegistry, displayNameFor } from './characterRegistry';
import { LOOKS } from './looks';

// The character models actually in the repository (resolved by Vite from disk)
const ON_DISK = new Set(Object.keys(import.meta.glob('/public/assets/models/characters/**/*.glb')).map((p) => p.replace('/public/assets/', '')));

describe('character registry', () => {
  it('lists every look the game can draw, once each', () => {
    expect(ROCKETBOX_CHARACTERS.map((c) => c.id)).toEqual(LOOKS.map((l) => l.id));
    const ids = characterRegistry().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every public model is on disk and was measured from its file', () => {
    for (const c of ROCKETBOX_CHARACTERS) {
      expect(ON_DISK.has(c.file), c.file).toBe(true);
      expect(c.status, c.id).toBe('available');
      expect(c.triangles, c.id).toBeGreaterThan(1000);
      expect(c.maxTexture, c.id).toBeGreaterThan(0);
    }
  });

  it('every body can stand, walk and run, and fits the shared talk, wave and sit clips', () => {
    for (const c of ROCKETBOX_CHARACTERS) {
      for (const clip of ['Idle', 'Walk', 'Run']) expect(c.clips, `${c.id} ${clip}`).toContain(clip);
      expect(c.gestureFiles.length, c.id).toBeGreaterThan(0);
    }
  });

  it('says where each body came from and whether its files can be published', () => {
    for (const c of characterRegistry()) {
      expect(c.licence.name, c.id).not.toBe('');
      expect(c.licence.source, c.id).not.toBe('');
    }
    expect(ROCKETBOX_CHARACTERS.every((c) => c.licence.redistributable)).toBe(true);
    expect(CC5_CHARACTER.licence.redistributable).toBe(false);
    expect(CC5_CHARACTER.file.startsWith('private/')).toBe(true);
  });

  it('offers only customisation the models support: no face shaping anywhere, no body shaping on CC5', () => {
    expect(characterRegistry().every((c) => c.customisation.faceShape === false)).toBe(true);
    expect(CC5_CHARACTER.customisation.bodyShape).toBe(false);
    expect(CC5_CHARACTER.customisation.clothing).toBe('colours');
  });

  it('marks the CC5 character available only where it has been built', () => {
    expect(characterById('cc5-aaron')?.status).toBe('not-built');
    expect(characterById('cc5-aaron', CC5_CHARACTER.file)?.status).toBe('available');
    expect(characterById('cc5-aaron', 'models/something-else.glb')?.status).toBe('not-built');
    expect(characterById('nobody')).toBeUndefined();
  });

  it('gives people readable names', () => {
    expect(displayNameFor('female-adult-08')).toBe('Woman 08');
    expect(displayNameFor('pilot-male-01')).toBe('Pilot (man) 01');
    expect(displayNameFor('unknown-file')).toBe('unknown-file');
  });
});
