import { createContext, useContext } from 'react';
import { useQuality } from '../world/quality';
import { VFX_BUDGET, savedVfxTier, vfxTierFor, type VfxBudget, type VfxTier } from './vfxQuality';

/** A tier forced from above (the effects lab's switch); null follows Settings and the game's quality. */
export const VfxTierContext = createContext<VfxTier | null>(null);

/** The effects tier to draw at, and its budget. */
export function useVfx(): { tier: VfxTier; budget: VfxBudget } {
  const forced = useContext(VfxTierContext);
  const quality = useQuality();
  const tier = forced ?? vfxTierFor(quality.quality, savedVfxTier());
  return { tier, budget: VFX_BUDGET[tier] };
}
