import { describe, expect, it } from 'vitest';
import { careerLadder, careerLevel, hoursToNextLevel, levelIndex } from './progression';

describe('career progression', () => {
  it('every career has five rising rungs', () => {
    for (const c of ['student', 'artist', 'entrepreneur', 'athlete', 'engineer', 'doctor', 'pilot'] as const) {
      const ladder = careerLadder(c);
      expect(ladder).toHaveLength(5);
      for (let i = 1; i < ladder.length; i++) {
        expect(ladder[i].hours).toBeGreaterThan(ladder[i - 1].hours);
        expect(ladder[i].pay).toBeGreaterThan(ladder[i - 1].pay);
      }
    }
  });

  it('levels follow hours worked', () => {
    expect(careerLevel('doctor', 0).title).toBe('House officer');
    expect(levelIndex('doctor', 16 * 60 - 1)).toBe(0);
    expect(careerLevel('doctor', 16 * 60).title).toBe('Resident doctor');
    expect(careerLevel('doctor', 10_000 * 60).title).toBe('Consultant');
  });

  it('counts down to the next promotion and stops at the top', () => {
    expect(hoursToNextLevel('pilot', 10 * 60)).toBe(6);
    expect(hoursToNextLevel('pilot', 160 * 60)).toBeNull();
    expect(careerLevel('none', 999).title).toBe('Undecided');
  });
});
