import { useCallback, useEffect, useReducer } from 'react';
import type { Character } from '../components/CharacterCreation';
import { gameReducer, type GameAction, type GameState } from '../lib/gameState';
import { loadProgress, saveProgress } from '../lib/save';

/** Real milliseconds per game minute. */
export const MS_PER_GAME_MINUTE = 3000;

/**
 * The single source of truth for the game clock, balance and daily ledger.
 * Mount it once per character (key the component by character id).
 */
export function useGameState(character: Character) {
  const reducer = useCallback(
    (state: GameState, action: GameAction) =>
      gameReducer(state, action, character.career, character.lifestyle),
    [character.career, character.lifestyle],
  );
  const [state, dispatch] = useReducer(reducer, character, (c) => loadProgress(c));

  useEffect(() => {
    const interval = setInterval(() => dispatch({ type: 'tick' }), MS_PER_GAME_MINUTE);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    saveProgress(character.id, state);
  }, [character.id, state]);

  return {
    state,
    rest: () => dispatch({ type: 'sleep' }),
    dismissSummary: () => dispatch({ type: 'dismissSummary' }),
  };
}
