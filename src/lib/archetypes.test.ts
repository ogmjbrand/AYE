import { describe, expect, it } from 'vitest';
import { ARCHETYPES, archetypeVariety, personFor } from './archetypes';
import { LOOKS } from './looks';
import { itemById } from './fashion';

describe('archetypes', () => {
  it('covers the population the game needs, each played only by real base models', () => {
    expect(ARCHETYPES.length).toBeGreaterThanOrEqual(23);
    for (const a of ARCHETYPES) {
      expect(a.looks.length, a.id).toBeGreaterThan(0);
      for (const id of a.looks) expect(LOOKS.some((l) => l.id === id), `${a.id}: ${id}`).toBe(true);
    }
  });

  it('only claims a uniform where the models themselves wear one', () => {
    for (const a of ARCHETYPES.filter((x) => x.uniform)) {
      expect(a.looks.every((id) => /^(medical|police|pilot|construction|business)-/.test(id)), a.id).toBe(true);
    }
    // No modelled kit exists for these yet, and the data says so
    for (const id of ['firefighter', 'military', 'chef']) {
      const a = ARCHETYPES.find((x) => x.id === id)!;
      expect(a.uniform).toBe(false);
      expect(a.needs).toBeTruthy();
    }
  });

  it('makes the same person from the same identity, and different people from different ones', () => {
    expect(personFor('lab-1-3', 'doctor')).toEqual(personFor('lab-1-3', 'doctor'));
    const crowd = Array.from({ length: 40 }, (_, i) => personFor(`p-${i}`, 'resident'));
    expect(new Set(crowd.map((p) => p.lookId)).size).toBeGreaterThan(5);
    expect(new Set(crowd.map((p) => JSON.stringify(p.appearance.itemIds))).size).toBeGreaterThan(30);
  });

  it('dresses people only in items that exist, in the right slots', () => {
    for (const a of ARCHETYPES) {
      const p = personFor(`check-${a.id}`, a.id);
      for (const [slot, id] of Object.entries(p.appearance.itemIds)) expect(itemById(id)?.slot, `${a.id} ${id}`).toBe(slot);
    }
  });

  it('refuses unknown archetypes instead of guessing', () => {
    expect(() => personFor('x', 'astronaut')).toThrow(/Unknown archetype/);
    expect(() => archetypeVariety('astronaut')).toThrow(/Unknown archetype/);
  });

  it('counts variety honestly: appearances per real base model', () => {
    const police = archetypeVariety('police');
    expect(police.baseModels).toBe(1);
    const resident = archetypeVariety('resident');
    expect(resident.baseModels).toBe(LOOKS.filter((l) => /^(fe)?male-adult-/.test(l.id)).length);
    expect(resident.appearances).toBeGreaterThan(police.appearances);
  });
});
