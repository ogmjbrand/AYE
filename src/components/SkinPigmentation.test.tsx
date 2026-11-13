import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SkinPigmentation } from './SkinPigmentation';
import { presetSkin } from '../lib/skinAppearance';

describe('Skin & pigmentation section', () => {
  it('offers the eight presets, and keeping the person’s own skin', () => {
    const html = renderToStaticMarkup(<SkinPigmentation skin={undefined} onChange={() => {}} />);
    for (const label of ['Ebony', 'Light Brown', 'Dark Brown', 'Chocolate', 'Caramel', 'Albinism', 'Light Skin', 'Vitiligo']) expect(html).toContain(label);
    expect(html).toContain('own skin');
    expect(html).not.toContain('Fine-tune');
  });

  it('shows shades and fine-tuning for an ordinary preset', () => {
    const html = renderToStaticMarkup(<SkinPigmentation skin={presetSkin('caramel')} onChange={() => {}} />);
    for (const t of ['Lighter', 'Middle', 'Deeper', 'Pigmentation', 'Undertone', 'Saturation']) expect(html).toContain(t);
  });

  it('vitiligo: base skin, places, size, how many, edges and a new arrangement', () => {
    const html = renderToStaticMarkup(<SkinPigmentation skin={presetSkin('vitiligo')} onChange={() => {}} />);
    for (const t of ['Skin around the patches', 'Around eyes &amp; mouth', 'Hands', 'Patch size', 'How many', 'Natural', 'Rounded', 'New arrangement']) expect(html).toContain(t);
  });

  it('albinism: hair, brows and lashes, and eyes', () => {
    const html = renderToStaticMarkup(<SkinPigmentation skin={presetSkin('albinism')} onChange={() => {}} />);
    for (const t of ['Hair, eyebrows and lashes', 'White', 'Platinum', 'Pale blonde', 'Eyes', 'Violet']) expect(html).toContain(t);
  });
});
