import { FABRICS, type Slot, type Style } from './fashion';

/** Staff uniforms, as fabrics on the clothes each person already wears. */
const solid = (color: string, fabric: Style['fabric']): Style => ({ pattern: 'solid', colors: [color, color, color], scale: 18, fabric });

export const UNIFORMS: Record<'black' | 'chef' | 'stylist' | 'scrubs' | 'spa' | 'herbal' | 'labcoat', Partial<Record<Slot, Style>>> = {
  /** Host, waiter, bartender, store assistant: black suiting and black leather shoes. */
  black: { top: solid('#141416', FABRICS.wool), bottom: solid('#18181a', FABRICS.wool), shoes: solid('#0f0f10', FABRICS.leather) },
  /** Chef's whites with black trousers. */
  chef: { top: solid('#f2f0ea', FABRICS.cotton), bottom: solid('#1c1c1e', FABRICS.cotton), shoes: solid('#121212', FABRICS.leather) },
  /** The stylist: a blush silk top and black trousers. */
  /** Hospital nurses: teal scrubs. */
  scrubs: { top: solid('#2f8f8a', FABRICS.cotton), bottom: solid('#2f8f8a', FABRICS.cotton), shoes: solid('#f2f2f0', FABRICS.leather) },
  /** Spa therapists: a white tunic, black trousers and soft white shoes. */
  spa: { top: solid('#f4f1ea', FABRICS.cotton), bottom: solid('#1c1c1e', FABRICS.cotton), shoes: solid('#efefec', FABRICS.leather) },
  /** The Herbal Medicine Centre: an indigo adire-dyed tunic, earth trousers and sandals. */
  herbal: { top: solid('#2f3f6b', FABRICS.cotton), bottom: solid('#5a4632', FABRICS.cotton), shoes: solid('#6b4a2f', FABRICS.leather) },
  /** Doctors and laboratory scientists: a white coat over navy. */
  labcoat: { top: solid('#f4f5f3', FABRICS.cotton), bottom: solid('#1f2a3c', FABRICS.wool), shoes: solid('#121212', FABRICS.leather) },
  stylist: { top: solid('#e7b9c0', FABRICS.silk), bottom: solid('#18181a', FABRICS.wool), shoes: solid('#121212', FABRICS.leather) },
};
