import { describe, expect, it } from 'vitest';
import {
  INCIDENT_COOLDOWN_MINUTES, maybeOfferIncident, objectiveFor, rewardFor,
  sanitiseActiveIncident, sanitiseIncidentHistory, type ActiveIncident,
} from './incidents';

const SPAWN: readonly [number, number, number] = [1, 0, 2];

describe('objectiveFor / rewardFor', () => {
  it('gives the doctor path to a doctor and the civilian path to everyone else', () => {
    expect(objectiveFor('doctor')).toBe('treat');
    for (const c of ['none', 'student', 'artist', 'entrepreneur', 'athlete', 'engineer', 'pilot'] as const) {
      expect(objectiveFor(c)).toBe('assist');
    }
  });

  it('pays the doctor path more than the civilian path', () => {
    expect(rewardFor('treat').amount).toBeGreaterThan(rewardFor('assist').amount);
  });
});

describe('maybeOfferIncident', () => {
  it('never offers within the cooldown of the last offer', () => {
    for (let dt = 0; dt < INCIDENT_COOLDOWN_MINUTES; dt += 10) {
      expect(maybeOfferIncident(1000 + dt, 1000, 'lagos', SPAWN, 'doctor')).toBeNull();
    }
  });

  it('is deterministic: the same moment always rolls the same way', () => {
    const a = maybeOfferIncident(100_000, 0, 'lagos', SPAWN, 'doctor');
    const b = maybeOfferIncident(100_000, 0, 'lagos', SPAWN, 'doctor');
    expect(a).toEqual(b);
  });

  it('offers at least sometimes once the cooldown has passed, anchored at the spawn point', () => {
    let offered: ActiveIncident | null = null;
    for (let hour = 0; hour < 2000 && !offered; hour++) {
      offered = maybeOfferIncident(hour * 60, -Infinity, 'lagos', SPAWN, 'doctor');
    }
    expect(offered).not.toBeNull();
    expect(offered!.position).toEqual(SPAWN);
    expect(offered!.districtId).toBe('lagos');
    expect(offered!.stage).toBe('offered');
    expect(offered!.objective).toBe('treat');
  });

  it('gives different districts independent rolls', () => {
    // Not a hard guarantee for any single hour, but over many hours the two districts
    // shouldn't offer on exactly the same set of hours every time.
    let sameCount = 0;
    const total = 500;
    for (let hour = 0; hour < total; hour++) {
      const a = maybeOfferIncident(hour * 60, -Infinity, 'lagos', SPAWN, 'doctor');
      const b = maybeOfferIncident(hour * 60, -Infinity, 'accra', SPAWN, 'doctor');
      if (!!a === !!b) sameCount++;
    }
    expect(sameCount).toBeLessThan(total);
  });
});

describe('sanitiseActiveIncident', () => {
  const valid: ActiveIncident = {
    id: 'road-accident:lagos:100', kind: 'road-accident', districtId: 'lagos',
    position: [1, 0, 2], stage: 'arrived', objective: 'treat', offeredAt: 100,
  };

  it('accepts a well-formed incident', () => {
    expect(sanitiseActiveIncident(valid)).toEqual(valid);
  });

  it('rejects null, non-objects, and missing/invalid fields', () => {
    expect(sanitiseActiveIncident(null)).toBeNull();
    expect(sanitiseActiveIncident('nope')).toBeNull();
    expect(sanitiseActiveIncident({ ...valid, kind: 'fire' })).toBeNull();
    expect(sanitiseActiveIncident({ ...valid, stage: 'exploded' })).toBeNull();
    expect(sanitiseActiveIncident({ ...valid, objective: 'rescue' })).toBeNull();
    expect(sanitiseActiveIncident({ ...valid, position: [1, 2] })).toBeNull();
    expect(sanitiseActiveIncident({ ...valid, offeredAt: 'soon' })).toBeNull();
  });
});

describe('sanitiseIncidentHistory', () => {
  it('keeps only valid entries and caps the length', () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({ id: `road-accident:lagos:${i}`, kind: 'road-accident', completedAt: i }));
    const result = sanitiseIncidentHistory([...entries, null, 'bad', { id: 5 }]);
    expect(result.length).toBe(20);
    expect(result[result.length - 1]).toEqual(entries[entries.length - 1]);
  });

  it('is empty for non-array input', () => {
    expect(sanitiseIncidentHistory(undefined)).toEqual([]);
    expect(sanitiseIncidentHistory('nope')).toEqual([]);
  });
});
