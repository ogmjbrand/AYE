import { describe, expect, it } from 'vitest';
import { overcastAt, parseWeatherOverride, rainAmountAt, weatherForDay } from './weather';

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

describe('parseWeatherOverride', () => {
  it('is null outside dev builds, even with a valid query', () => {
    expect(parseWeatherOverride('?weather=rain', false)).toBeNull();
  });

  it('reads a valid condition from the query in dev', () => {
    expect(parseWeatherOverride('?weather=rain', true)).toBe('rain');
    expect(parseWeatherOverride('?weather=overcast', true)).toBe('overcast');
  });

  it('ignores a missing or invalid value', () => {
    expect(parseWeatherOverride('', true)).toBeNull();
    expect(parseWeatherOverride('?weather=hurricane', true)).toBeNull();
  });
});

const MINUTES_PER_DAY = 1440;
// weatherForDay(0) and weatherForDay(1) are whatever the deterministic roll gives; find a
// consecutive pair that actually differs so the transition-blend tests exercise a real change.
function findDifferingDayPair(): [number, number] {
  for (let day = 0; day < 365; day++) {
    if (weatherForDay(day) !== weatherForDay(day + 1)) return [day, day + 1];
  }
  throw new Error('no two consecutive days differ in the first year; widen the search');
}

describe('overcastAt / rainAmountAt (day-boundary transitions)', () => {
  it('is constant and matches the day once well past the transition window', () => {
    const day = 5;
    const minutesIntoDay = 300; // well past the 90-minute transition
    const totalMinutes = day * MINUTES_PER_DAY + minutesIntoDay;
    const expectedRain = weatherForDay(day) === 'rain' ? 1 : 0;
    expect(rainAmountAt(totalMinutes)).toBe(expectedRain);
    expect(overcastAt(totalMinutes)).toBe(overcastAt(totalMinutes + 10));
  });

  it('blends smoothly from yesterday into today right after midnight', () => {
    const [yesterday, today] = findDifferingDayPair();
    const atMidnight = today * MINUTES_PER_DAY;
    const halfwayThroughTransition = atMidnight + 45;
    const afterTransition = atMidnight + 200;

    const yesterdayRain = weatherForDay(yesterday) === 'rain' ? 1 : 0;
    const todayRain = weatherForDay(today) === 'rain' ? 1 : 0;

    // Right at midnight it's still (almost) yesterday's weather, not an instant cut.
    expect(rainAmountAt(atMidnight)).toBeCloseTo(yesterdayRain, 5);
    // Partway through the transition it's strictly between the two, whenever they differ.
    if (yesterdayRain !== todayRain) {
      const mid = rainAmountAt(halfwayThroughTransition);
      expect(mid).toBeGreaterThan(Math.min(yesterdayRain, todayRain));
      expect(mid).toBeLessThan(Math.max(yesterdayRain, todayRain));
    }
    // Well after the window, it's fully settled on today's weather.
    expect(rainAmountAt(afterTransition)).toBe(todayRain);
  });

  it('an override suppresses the transition entirely: every day is the forced condition', () => {
    const atMidnight = 7 * MINUTES_PER_DAY;
    expect(overcastAt(atMidnight, 'rain')).toBe(1);
    expect(overcastAt(atMidnight + 45, 'rain')).toBe(1);
    expect(rainAmountAt(atMidnight - 1, 'rain')).toBe(1);
    expect(overcastAt(atMidnight, 'clear')).toBe(0);
  });
});
