import { describe, expect, it } from 'vitest';
import { weatherForDay, weatherOverride } from './weather';

describe('weather', () => {
  it('is deterministic for a given day', () => {
    for (let day = 0; day < 50; day++) {
      expect(weatherForDay(day)).toBe(weatherForDay(day));
    }
  });

  it('is mostly clear, with overcast rarer and rain rarer still', () => {
    const counts = { clear: 0, overcast: 0, rain: 0 };
    for (let day = 0; day < 2000; day++) counts[weatherForDay(day)]++;
    expect(counts.clear).toBeGreaterThan(counts.overcast);
    expect(counts.overcast).toBeGreaterThan(counts.rain);
    expect(counts.rain).toBeGreaterThan(0);
  });
});

describe('weatherOverride', () => {
  it('is null outside dev builds, even with a valid query', () => {
    expect(weatherOverride('?weather=rain', false)).toBeNull();
  });

  it('reads a valid condition from the query in dev', () => {
    expect(weatherOverride('?weather=rain', true)).toBe('rain');
    expect(weatherOverride('?weather=overcast', true)).toBe('overcast');
  });

  it('ignores a missing or invalid value', () => {
    expect(weatherOverride('', true)).toBeNull();
    expect(weatherOverride('?weather=hurricane', true)).toBeNull();
  });
});
