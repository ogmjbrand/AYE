import { describe, expect, it } from 'vitest';
import { lightingAt, sunElevation, SUNRISE, SUNSET } from './timeOfDay';

describe('time of day lighting', () => {
  it('sun is up between sunrise and sunset and highest at midday', () => {
    expect(sunElevation(SUNRISE)).toBeCloseTo(0);
    expect(sunElevation(SUNSET)).toBeCloseTo(0);
    expect(sunElevation(12.6)).toBeGreaterThan(0.99);
    expect(sunElevation(2)).toBeLessThan(0);
  });

  it('midday is bright daylight with no night glow', () => {
    const l = lightingAt(12, 30);
    expect(l.night).toBe(0);
    expect(l.hdri).toBe('day');
    expect(l.sunIntensity).toBeGreaterThan(2);
  });

  it('early evening is golden hour', () => {
    expect(lightingAt(18, 15).hdri).toBe('golden');
  });

  it('late night is fully night', () => {
    const l = lightingAt(23, 0);
    expect(l.night).toBe(1);
    expect(l.hdri).toBe('night');
    expect(l.sunIntensity).toBeLessThan(lightingAt(12).sunIntensity / 4);
  });

  it('produces valid hex colours all day', () => {
    for (let h = 0; h < 24; h++) {
      const l = lightingAt(h);
      for (const c of [l.sunColor, l.skyColor, l.groundColor, l.fogColor]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('defaults to clear weather, unchanged from before weather existed', () => {
    expect(lightingAt(12, 30)).toEqual(lightingAt(12, 30, 'clear'));
  });

  it('rain flattens and dims daylight but leaves night alone', () => {
    const clearDay = lightingAt(12, 0, 'clear');
    const rainyDay = lightingAt(12, 0, 'rain');
    expect(rainyDay.sunIntensity).toBeLessThan(clearDay.sunIntensity);
    expect(rainyDay.hdri).toBe('day');

    const clearNight = lightingAt(23, 0, 'clear');
    const rainyNight = lightingAt(23, 0, 'rain');
    expect(rainyNight).toEqual(clearNight);
  });

  it('overcast sits between clear and rain', () => {
    const clear = lightingAt(12, 0, 'clear').sunIntensity;
    const overcast = lightingAt(12, 0, 'overcast').sunIntensity;
    const rain = lightingAt(12, 0, 'rain').sunIntensity;
    expect(overcast).toBeLessThan(clear);
    expect(overcast).toBeGreaterThan(rain);
  });
});
