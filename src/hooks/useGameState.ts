import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { Character } from '../components/CharacterCreation';
import { gameReducer, type GameAction, type GameState } from '../lib/gameState';
import { loadProgress, saveProgress } from '../lib/save';

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
    (state: GameState, action: GameAction) =>
      gameReducer(state, action, character.career, character.lifestyle),
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
    rest: (atHome: boolean) => dispatch({ type: 'sleep', atHome }),
    moveIn: (homeId: string) => dispatch({ type: 'moveIn', homeId }),
    moveOut: () => dispatch({ type: 'moveOut' }),
    buyEquipment: (id: string) => dispatch({ type: 'buyEquipment', id }),
    dismissSummary: () => dispatch({ type: 'dismissSummary' }),
    eat: (price: number, fullness: number) => dispatch({ type: 'eat', price, fullness }),
    purchase: (price: number) => dispatch({ type: 'purchase', price }),
  };
}
