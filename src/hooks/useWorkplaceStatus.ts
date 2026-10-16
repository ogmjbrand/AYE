import type { Character } from '../components/CharacterCreation';
import type { PlayerHandle } from './usePlayerController';
import { isAtWorkplace, getDistanceToWorkplace } from '../lib/careers';
import type { District } from '../lib/geography';

export interface WorkplaceStatus {
  isAtWorkplace: boolean;
  distanceToWorkplace: number;
}

/**
 * Reads the player's live position on every render. Not memoised: the
 * controller is mutated in place each frame, so its identity never changes.
 */
export function useWorkplaceStatus(character: Character | null, controller: PlayerHandle, district: District): WorkplaceStatus {
  if (!character || character.career === 'none') {
    return { isAtWorkplace: false, distanceToWorkplace: Infinity };
  }
  return {
    isAtWorkplace: isAtWorkplace(district, character.career, controller.position.x, controller.position.z),
    distanceToWorkplace: getDistanceToWorkplace(district, character.career, controller.position.x, controller.position.z),
  };
}
