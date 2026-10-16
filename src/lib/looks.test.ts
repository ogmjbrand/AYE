import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK_ID, LOOKS, bodyForGender, lookById, looksFor } from './looks';

describe('looks', () => {
  it('every look has its model and portrait on disk', () => {
    // Lists files without loading them
    const files = Object.keys(import.meta.glob('/public/assets/models/characters/rocketbox/**/*.{glb,webp}'));
    for (const l of LOOKS) {
      expect(files, l.url).toContain(`/public/assets/${l.url}`);
      expect(files, l.id).toContain(`/public/assets/models/characters/rocketbox/thumbs/${l.id}.webp`);
    }
  });

  it('has unique ids and several looks for each body', () => {
    expect(new Set(LOOKS.map((l) => l.id)).size).toBe(LOOKS.length);
    expect(looksFor('feminine').length).toBeGreaterThanOrEqual(6);
    expect(looksFor('masculine').length).toBeGreaterThanOrEqual(6);
  });

  it('falls back to the default look for unknown ids', () => {
    expect(lookById('nope').id).toBe(DEFAULT_LOOK_ID);
  });

  it('maps gender to a starting body only where it is implied', () => {
    expect(bodyForGender('woman')).toBe('feminine');
    expect(bodyForGender('man')).toBe('masculine');
    expect(bodyForGender('non-binary')).toBeNull();
    expect(bodyForGender('unspecified')).toBeNull();
  });
});
