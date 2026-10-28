import { describe, expect, it } from 'vitest';
import { isSkinColor, isSkinToneId } from './skinTone';

describe('skin tones', () => {
  it('keeps the existing original, preset and custom tone IDs valid', () => {
    expect(isSkinToneId('original')).toBe(true);
    expect(isSkinToneId('deep')).toBe(true);
    expect(isSkinToneId('custom')).toBe(true);
    expect(isSkinToneId('tasha-source')).toBe(false);
  });

  it('accepts only six-digit hexadecimal player skin colours', () => {
    expect(isSkinColor('#d6a078')).toBe(true);
    expect(isSkinColor('#FFF')).toBe(false);
    expect(isSkinColor('red')).toBe(false);
  });
});
