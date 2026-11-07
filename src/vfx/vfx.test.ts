import { describe, expect, it } from 'vitest';
import { ShaderLib, type WebGLProgramParametersWithUniforms, type WebGLRenderer } from 'three';
import { VFX_BUDGET, VFX_TIERS, saveVfxTier, savedVfxTier, scaledCount, vfxTierFor } from './vfxQuality';
import { FIRE_RULES, burning, burningCount, cell, fieldIntensity, fireField, ignite, stepCell, stepField } from './fireModel';
import { RIPPLE_LIFE, WAVES, addRipple, maxWaveHeight, packRipples, puddleSpots, rippleHeight, stepWetness, waveHeight } from './waterModel';
import { ballisticPoint, ballisticVelocity } from './ballistics';
import { createWaterMaterial } from './waterMaterial';
import { FIRE_PRESETS } from './firePresets';
import { brightestGlows, clearFireGlows, reportFireGlow } from './fireLights';

describe('effects quality tiers', () => {
  it('spends more at each tier up, and Low uses no real lights', () => {
    const [low, mid, high] = VFX_TIERS.map((t) => VFX_BUDGET[t]);
    for (const k of ['flames', 'smoke', 'embers', 'droplets', 'puddles'] as const) {
      expect(low[k]).toBeLessThan(mid[k]);
      expect(mid[k]).toBeLessThan(high[k]);
    }
    expect(low.fireLights).toBe(0);
    expect(low.waterWaves).toBe(false);
  });
  it('follows the game quality unless a tier is chosen, and survives blocked storage', () => {
    expect(vfxTierFor('high', null)).toBe('high');
    expect(vfxTierFor('low', null)).toBe('low');
    expect(vfxTierFor('low', 'medium')).toBe('medium');
    const store = new Map<string, string>();
    const s = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    saveVfxTier('medium', s);
    expect(savedVfxTier(s)).toBe('medium');
    saveVfxTier(null, s);
    expect(savedVfxTier(s)).toBeNull();
    store.set('aye_vfx_tier', 'ultra');
    expect(savedVfxTier(s)).toBeNull();
    const broken = { getItem: () => { throw new Error('blocked'); } };
    expect(savedVfxTier(broken)).toBeNull();
  });
  it('draws fewer particles for smaller fires, but at least one while visible', () => {
    expect(scaledCount(40, 0)).toBe(0);
    expect(scaledCount(40, 0.01)).toBe(1);
    expect(scaledCount(40, 0.5)).toBe(20);
    expect(scaledCount(40, 3)).toBe(40);
  });
});

describe('fire behaviour', () => {
  it('grows while it has fuel, burns the fuel, and goes out when it runs dry', () => {
    let c = cell(1, 0.2, 0.4);
    for (let i = 0; i < 20; i++) c = stepCell(c, 0.5);
    expect(c.intensity).toBeGreaterThan(0.2);
    expect(c.fuel).toBeLessThan(0.4);
    let spent = cell(1, 0.8, 0.01);
    for (let i = 0; i < 200; i++) spent = stepCell(spent, 0.5);
    expect(burning(spent)).toBe(false);
  });
  it('is knocked down by a hose faster than by an extinguisher, and soaks what it hits', () => {
    const lit = cell(1, 0.9, 1);
    const hose = stepCell(lit, 1, 1);
    expect(hose.intensity).toBeLessThan(lit.intensity);
    expect(hose.wetness).toBeGreaterThan(0.5);
    let out = lit;
    for (let i = 0; i < 10; i++) out = stepCell(out, 0.5, 1);
    expect(burning(out)).toBe(false);
    expect(FIRE_RULES.hose).toBeGreaterThan(FIRE_RULES.extinguisher);
  });
  it('spreads to flammable neighbours, faster upwards than sideways, never to stone, the same every run', () => {
    const run = () => {
      let f = ignite(fireField(9, 5, (c) => (c === 8 ? 0 : 0.9)), 4, 0, 0.9);
      for (let i = 0; i < 300; i++) f = stepField(f, 0.1);
      return f;
    };
    const f = run();
    expect(burningCount(f)).toBeGreaterThan(3);
    expect(run()).toEqual(f);
    // The stone column never catches
    for (let r = 0; r < 5; r++) expect(f.cells[r * 9 + 8].intensity).toBe(0);
    // Above the start burns before far to the side
    let early = ignite(fireField(9, 5, () => 0.9), 4, 0, 0.9);
    let up = 0, side = 0;
    for (let i = 0; i < 400; i++) {
      early = stepField(early, 0.05);
      if (!up && burning(early.cells[1 * 9 + 4])) up = i;
      if (!side && burning(early.cells[0 * 9 + 6])) side = i;
    }
    expect(up).toBeGreaterThan(0);
    expect(side === 0 || up < side).toBe(true);
  });
  it('a field soaked by water stops spreading and dies down', () => {
    let f = ignite(fireField(6, 3, () => 1), 2, 0, 0.9);
    for (let i = 0; i < 60; i++) f = stepField(f, 0.1);
    const before = fieldIntensity(f);
    for (let i = 0; i < 80; i++) f = stepField(f, 0.1, () => 1);
    expect(fieldIntensity(f)).toBeLessThan(before * 0.2);
    expect(burningCount(f)).toBe(0);
  });
  it('sizes every kind of fire sensibly: a building fire is the biggest, a small one the least smoky', () => {
    expect(FIRE_PRESETS.building.height).toBeGreaterThan(FIRE_PRESETS.vehicle.height);
    expect(FIRE_PRESETS.small.smoke).toBeLessThan(FIRE_PRESETS.vehicle.smoke);
  });
  it('lends the rig to the strongest fires first, and forgets fires that go out', () => {
    clearFireGlows();
    reportFireGlow('a', { x: 0, y: 1, z: 0, intensity: 0.3 });
    reportFireGlow('b', { x: 5, y: 1, z: 0, intensity: 0.9 });
    expect(brightestGlows(1)[0].x).toBe(5);
    reportFireGlow('b', null);
    expect(brightestGlows(2).map((g) => g.x)).toEqual([0]);
    reportFireGlow('a', { x: 0, y: 1, z: 0, intensity: 0 });
    expect(brightestGlows(2)).toEqual([]);
  });
});

describe('water behaviour', () => {
  it('keeps waves within their amplitude, moving with time; still water has none', () => {
    const max = maxWaveHeight(WAVES.ocean);
    for (let i = 0; i < 50; i++) expect(Math.abs(waveHeight(WAVES.ocean, i * 1.7, i * 0.9, i * 0.3))).toBeLessThanOrEqual(max + 1e-9);
    expect(waveHeight(WAVES.ocean, 3, 4, 0)).not.toBeCloseTo(waveHeight(WAVES.ocean, 3, 4, 1.3), 3);
    expect(waveHeight(WAVES.pool, 3, 4, 1)).toBe(0);
  });
  it('keeps the newest ripples, merges a wader’s steps, and lets old ones fade', () => {
    let list = addRipple([], { x: 0, z: 0, at: 0, strength: 1 });
    list = addRipple(list, { x: 0.1, z: 0, at: 0.1, strength: 1 });
    expect(list).toHaveLength(1);
    for (let i = 1; i <= 6; i++) list = addRipple(list, { x: i, z: 0, at: i * 0.2, strength: 1 });
    expect(list).toHaveLength(4);
    expect(list.at(-1)!.x).toBe(6);
    expect(addRipple(list, { x: 9, z: 9, at: 100, strength: 1 })).toHaveLength(1);
    const packed = packRipples([{ x: 2, z: 3, at: 4, strength: 1 }]);
    expect([...packed.slice(0, 4)]).toEqual([2, 3, 4, 1]);
    expect(packed[6]).toBeLessThan(-1000);
    expect(rippleHeight(5, 0.5, 1)).toBe(0);
    expect(rippleHeight(0.5, 0.5, 1)).not.toBe(0);
    expect(rippleHeight(0.5, RIPPLE_LIFE + 1, 1)).toBe(0);
  });
  it('gathers puddles on the road, in the same places each time, mostly in the gutters', () => {
    const spots = puddleSpots(4, -30, 30, 18);
    expect(puddleSpots(4, -30, 30, 18)).toEqual(spots);
    for (const p of spots) {
      // Rotated a little, so allow for the turn
      expect(Math.abs(p.x) + p.rx + p.rz * Math.abs(Math.sin(p.rot))).toBeLessThanOrEqual(4.05);
      expect(p.z).toBeGreaterThanOrEqual(-30);
      expect(p.z).toBeLessThanOrEqual(30);
    }
    expect(spots.filter((p) => Math.abs(p.x) > 2.9).length).toBeGreaterThan(spots.length / 2);
  });
  it('wets the ground while it rains and dries it slowly after', () => {
    let w = 0;
    for (let i = 0; i < 60; i++) w = stepWetness(w, 1, 1);
    expect(w).toBeGreaterThan(0.9);
    const wet = w;
    w = stepWetness(w, 0, 10);
    expect(w).toBeLessThan(wet);
    expect(w).toBeGreaterThan(wet * 0.8);
  });
  it('aims a jet so it lands on its target', () => {
    const from = [0, 1.2, 0] as const, to = [6, 2, -3] as const;
    const v = ballisticVelocity(from, to, 0.8);
    const end = ballisticPoint(from, v, 0.8);
    end.forEach((c, i) => expect(c).toBeCloseTo(to[i], 6));
  });
});

describe('the water shader', () => {
  const compile = (kind: 'pool' | 'river' | 'ocean' | 'puddle', tier: 'low' | 'high') => {
    const m = createWaterMaterial({ kind, edgeFoam: 0.05 }, VFX_BUDGET[tier]);
    const shader = {
      uniforms: {}, defines: {},
      vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader,
    } as unknown as WebGLProgramParametersWithUniforms;
    m.onBeforeCompile(shader, {} as WebGLRenderer);
    return { m, shader };
  };
  it('hooks into every part of three’s physical shader it means to (so an engine update can’t silently drop it)', () => {
    for (const kind of ['pool', 'river', 'ocean', 'puddle'] as const) {
      const { shader } = compile(kind, 'high');
      expect(shader.vertexShader).toContain('vfxWave');
      expect(shader.vertexShader).toContain('vWaterWorld =');
      expect(shader.fragmentShader).toContain('float vfxDetail');
      expect(shader.fragmentShader).toContain('waterFoam = clamp');
      expect(shader.fragmentShader).toContain('roughnessFactor = mix(roughnessFactor, 0.75, waterFoam)');
      expect(shader.fragmentShader).toContain('normal = normalize((viewMatrix * vec4(nWorld, 0.0)).xyz)');
      for (const u of ['uTime', 'uFlow', 'uRipples', 'uRain', 'uEdgeFoam', 'uShoreZ', 'uPuddle']) expect(shader.uniforms).toHaveProperty(u);
    }
  });
  it('never names a variable with a GLSL reserved word (they compile nowhere)', () => {
    const reserved = ['out', 'in', 'inout', 'input', 'output', 'sample', 'filter', 'common', 'partition', 'active', 'flat', 'smooth', 'patch', 'texture', 'buffer', 'shared'];
    for (const kind of ['pool', 'river', 'ocean', 'puddle'] as const) {
      const { shader } = compile(kind, 'high');
      for (const src of [shader.vertexShader, shader.fragmentShader]) {
        for (const word of reserved) expect(src, `${kind}: ${word}`).not.toMatch(new RegExp(`\\b(float|vec[234]|int|bool|mat[234])\\s+${word}\\b`));
      }
    }
  });
  it('moves the surface only for open water on tiers with waves, and keys its program by kind and tier', () => {
    expect(compile('ocean', 'high').shader.defines).toHaveProperty('WAVES_ON');
    expect(compile('ocean', 'low').shader.defines).not.toHaveProperty('WAVES_ON');
    expect(compile('pool', 'high').shader.defines).not.toHaveProperty('WAVES_ON');
    expect(compile('ocean', 'high').m.customProgramCacheKey()).not.toBe(compile('ocean', 'low').m.customProgramCacheKey());
  });
  it('makes puddles see-through at their soft edges and keeps pools slightly clear', () => {
    expect(compile('puddle', 'low').m.transparent).toBe(true);
    expect(compile('pool', 'low').m.opacity).toBeLessThan(1);
    expect(compile('ocean', 'low').m.opacity).toBe(1);
  });
});
