import { useMemo } from 'react';
import type { Character } from '../components/CharacterCreation';
import type { PlayerHandle } from './usePlayerController';
import { isAtWorkplace, getDistanceToWorkplace } from '../lib/careers';

export interface WorkplaceStatus {
  isAtWorkplace: boolean;
  distanceToWorkplace: number;
}

export function useWorkplaceStatus(character: Character | null, controller: PlayerHandle): WorkplaceStatus {
  return useMemo(() => {
    if (!character || character.career === 'none') {
      return { isAtWorkplace: false, distanceToWorkplace: Infinity };
    }

    return {
      isAtWorkplace: isAtWorkplace(controller.position, character.career),
      distanceToWorkplace: getDistanceToWorkplace(controller.position, character.career),
    };
  }, [character, controller]);
}
