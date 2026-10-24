import { describe, expect, it } from 'vitest';
import { isDriving, setDriving } from './usePlayerController';

describe('driving your car', () => {
  it('switches between driving and walking', () => {
    setDriving({ speed: 10 });
    expect(isDriving()).toBe(true);
    setDriving(null);
    expect(isDriving()).toBe(false);
  });
});
