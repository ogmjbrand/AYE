import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Character } from '../components/CharacterCreation';
import type { FurnitureTarget, GameState } from '../lib/gameState';
import { lifeReducer, type AnyAction } from '../lib/life';
import type { DreamId, TraitId } from '../lib/lifeState';
import { loadProgress, saveProgress } from '../lib/save';
import type { TravelMode } from '../lib/travel';
import type { Activity } from '../lib/people';

/** Real milliseconds per game minute. */
export const MS_PER_GAME_MINUTE = 3000;

/**
 * The single source of truth for the game clock, balance and daily ledger.
 * Mount it once per character (key the component by character id).
 *
 * `isAtWorkplace` is read on every tick to decide whether that minute is paid.
 */
export function useGameState(character: Character, isAtWorkplace: () => boolean) {
  const atWorkRef = useRef(isAtWorkplace);
  useEffect(() => {
    atWorkRef.current = isAtWorkplace;
  });

  const reducer = useCallback(
    (state: GameState, action: AnyAction) =>
      lifeReducer(state, action, character.career, character.lifestyle),
    [character.career, character.lifestyle],
  );
  const [state, dispatch] = useReducer(reducer, character, (c) => loadProgress(c));

  useEffect(() => {
    const interval = setInterval(
      () => dispatch({ type: 'tick', atWorkplace: atWorkRef.current() }),
      MS_PER_GAME_MINUTE,
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    saveProgress(character.id, state);
  }, [character.id, state]);

  return {
    state,
    rest: (atHome: boolean, atFriend = false) => dispatch({ type: 'sleep', atHome, atFriend }),
    moveIn: (homeId: string) => dispatch({ type: 'moveIn', homeId }),
    moveOut: () => dispatch({ type: 'moveOut' }),
    buyEquipment: (id: string) => dispatch({ type: 'buyEquipment', id }),
    travel: (to: string, mode: TravelMode) => dispatch({ type: 'travel', to, mode }),
    socialise: (residentId: string, activity: Activity) => dispatch({ type: 'socialise', residentId, activity }),
    nightOut: (residentId: string) => dispatch({ type: 'nightOut', residentId }),
    wait: (minutes: number) => dispatch({ type: 'wait', minutes }),
    workTask: (taskId: string, choice: number) => dispatch({ type: 'workTask', taskId, choice, atWorkplace: atWorkRef.current() }),
    dismissSummary: () => dispatch({ type: 'dismissSummary' }),
    eat: (price: number, fullness: number) => dispatch({ type: 'eat', price, fullness }),
    purchase: (price: number) => dispatch({ type: 'purchase', price }),
    buyFurniture: (itemId: string) => dispatch({ type: 'buyFurniture', itemId }),
    sellFurniture: (uid: string) => dispatch({ type: 'sellFurniture', uid }),
    placeFurniture: (uid: string, at: readonly [number, number], rot: 0 | 1) => dispatch({ type: 'placeFurniture', uid, at, rot }),
    storeFurniture: (uid: string) => dispatch({ type: 'storeFurniture', uid }),
    operateFurniture: (target: FurnitureTarget, near: boolean) => dispatch({ type: 'useFurniture', target, near }),
    exercise: (minutes: number, atPark: boolean) => dispatch({ type: 'exercise', minutes, atPark }),
    visit: (placeId: string) => dispatch({ type: 'visit', placeId }),
    setProfile: (bio: string, traits: TraitId[]) => dispatch({ type: 'setProfile', bio, traits }),
    setDream: (dream: DreamId) => dispatch({ type: 'setDream', dream }),
    dismissWish: (id: string) => dispatch({ type: 'dismissWish', id }),
    setSavingsGoal: (amount: number | null) => dispatch({ type: 'setSavingsGoal', amount }),
  };
}
