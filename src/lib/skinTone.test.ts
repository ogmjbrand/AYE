import { describe, expect, it } from 'vitest';
import { isSkinToneId } from './skinTone';

describe('skin tones', () => {
  it('keeps the existing original, preset and custom tone IDs valid', () => {
    expect(isSkinToneId('original')).toBe(true);
    expect(isSkinToneId('deep')).toBe(true);
    expect(isSkinToneId('custom')).toBe(true);
    expect(isSkinToneId('tasha-source')).toBe(false);
  });
});
