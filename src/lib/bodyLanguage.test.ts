import { describe, expect, it } from 'vitest';
import { TURN_SECONDS, WAVE_COOLDOWN, conversationGesture, gesturesUrl, shouldWave } from './bodyLanguage';

describe('body language', () => {
  it('the resident speaks first, then the two take turns', () => {
    expect(conversationGesture('resident', 0)).toBe('Talk');
    expect(conversationGesture('player', 0)).toBe('Listen');
    expect(conversationGesture('resident', TURN_SECONDS + 0.1)).toBe('Listen');
    expect(conversationGesture('player', TURN_SECONDS + 0.1)).toBe('Talk');
    expect(conversationGesture('resident', 2 * TURN_SECONDS)).toBe('Talk');
  });

  it('exactly one of the two is talking at any moment', () => {
    for (let t = 0; t < 40; t += 0.7) {
      const talkers = [conversationGesture('player', t), conversationGesture('resident', t)].filter((g) => g === 'Talk');
      expect(talkers.length).toBe(1);
    }
  });

  it('residents wave when you arrive, not mid-conversation and not over and over', () => {
    expect(shouldWave(true, false, WAVE_COOLDOWN)).toBe(true);
    expect(shouldWave(false, false, WAVE_COOLDOWN)).toBe(false);
    expect(shouldWave(true, true, WAVE_COOLDOWN)).toBe(false);
    expect(shouldWave(true, false, WAVE_COOLDOWN - 1)).toBe(false);
  });

  it('has a gesture file for each body type', () => {
    expect(gesturesUrl('feminine')).toMatch(/gestures-feminine\.glb$/);
    expect(gesturesUrl('masculine')).toMatch(/gestures-masculine\.glb$/);
  });
});
