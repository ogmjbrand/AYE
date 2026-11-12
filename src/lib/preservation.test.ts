/**
 * Guards for the features that went missing from production on 7 November 2026, when the live
 * site was rebuilt from an older line of work (see docs/ASSET_PRESERVATION.md). Each test names
 * the thing players saw disappear, so a merge or rewrite that drops one fails here first.
 */
import { describe, expect, it } from 'vitest';
import manifest from '../../public/assets/manifest.json';

// Source files as text, keyed by their path from the repository root
const SOURCES = Object.fromEntries(
  Object.entries(import.meta.glob(['../**/*.{ts,tsx}', '!../**/*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>)
    .map(([k, v]) => [k.replace(/^\.\//, 'src/lib/').replace(/^\.\.\//, 'src/'), v]),
);
const MODELS = import.meta.glob('../../public/assets/models/**/*.glb', { query: '?url', import: 'default', eager: true });
const exists = (p: string) => p in SOURCES || ('../../' + p) in MODELS;
const read = (p: string) => {
  const s = SOURCES[p];
  if (s === undefined) throw new Error(`${p} is missing`);
  return s;
};

describe('existing game content is preserved', () => {
  it('the danfo bus is the real minibus model, listed in the manifest', () => {
    expect((manifest as { vehicles?: { danfo?: { url?: string } } }).vehicles?.danfo?.url).toBe('models/props/minibus.glb');
    expect(exists('public/assets/models/props/minibus.glb')).toBe(true);
  });

  it('homes keep their ceiling, which hides when the camera is above the room', () => {
    const src = read('src/world/HomeInterior.tsx');
    expect(src).toMatch(/The ceiling: a plaster slab/);
    expect(src).toMatch(/ceiling\.current\.visible\s*=\s*!cameraIsAboveTheRoom/);
  });

  it('venues and hotel rooms keep their ceilings', () => {
    for (const f of ['src/world/VenueShell.tsx', 'src/world/HotelInterior.tsx', 'src/world/CrownResidence.tsx']) {
      expect(read(f).toLowerCase(), f).toContain('ceiling');
    }
  });

  it('sleeping in your own bed is still wired into the game', () => {
    expect(exists('src/lib/bedSleep.ts')).toBe(true);
    expect(exists('src/world/SleepingDuvet.tsx')).toBe(true);
    const app = read('src/App.tsx');
    expect(app).toContain("from './lib/bedSleep'");
    expect(app).toContain('<SleepingDuvet');
    expect(app).toContain('useWalkThen(');
  });

  it('furniture can still be dragged around the home', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('<FurnitureDrag');
  });

  it('the shared road material has exactly one wetness writer', () => {
    const src = read('src/world/materials.ts');
    expect(src).toContain('export function setWetness');
    expect(src).not.toMatch(/export function setWet\b/);
  });

  it('Songhai place names are kept (Lagos shows as Lagoon)', () => {
    expect(read('src/lib/districts/lagos.ts')).toContain('Lagoon');
  });
});
