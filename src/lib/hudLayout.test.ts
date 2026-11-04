import { describe, expect, it } from 'vitest';
import { hudLayout } from './hudLayout';

describe('HUD layout', () => {
  it.each([[360, 800], [390, 844], [412, 915]])('is compact and upright on a %ix%i phone, with goals folded', (w, h) => {
    const l = hudLayout(w, h);
    expect(l).toMatchObject({ compact: true, portrait: true, navLabels: true, goalsFolded: true });
    // The map and stick leave most of a narrow screen for the world
    expect(l.minimap).toBeLessThanOrEqual(w * 0.25);
    expect(l.stick).toBeLessThanOrEqual(w * 0.32);
  });

  it('drops the bar labels on a short landscape phone', () => {
    expect(hudLayout(844, 390)).toMatchObject({ compact: true, portrait: false, navLabels: false });
  });

  it('keeps the full HUD on desktops and tablets', () => {
    expect(hudLayout(1366, 768)).toMatchObject({ compact: false, minimap: 148, stick: 128, goalsFolded: false });
    expect(hudLayout(1024, 1366).compact).toBe(false);
  });
});
