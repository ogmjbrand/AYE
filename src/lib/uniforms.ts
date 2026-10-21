import { FABRICS, type Slot, type Style } from './fashion';

/** Staff uniforms, as fabrics on the clothes each person already wears. */
const solid = (color: string, fabric: Style['fabric']): Style => ({ pattern: 'solid', colors: [color, color, color], scale: 18, fabric });

export const UNIFORMS: Record<'black' | 'chef' | 'stylist', Partial<Record<Slot, Style>>> = {
  /** Host, waiter, bartender, store assistant: black suiting and black leather shoes. */
  black: { top: solid('#141416', FABRICS.wool), bottom: solid('#18181a', FABRICS.wool), shoes: solid('#0f0f10', FABRICS.leather) },
  /** Chef's whites with black trousers. */
  chef: { top: solid('#f2f0ea', FABRICS.cotton), bottom: solid('#1c1c1e', FABRICS.cotton), shoes: solid('#121212', FABRICS.leather) },
  /** The stylist: a blush silk top and black trousers. */
  stylist: { top: solid('#e7b9c0', FABRICS.silk), bottom: solid('#18181a', FABRICS.wool), shoes: solid('#121212', FABRICS.leather) },
};
