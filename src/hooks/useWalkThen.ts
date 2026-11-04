import { useCallback, useEffect, useRef } from 'react';
import { getTrip, nextTripSeq, setMoveTarget, subscribeTrip, type PlayerHandle } from './usePlayerController';
import { makeTarget } from '../lib/clickToMove';

/**
 * Doing something somewhere: walk there first, round whatever is in the way,
 * then do it the moment you arrive. Given several places to stand (best
 * first), it heads for the first one with a way there, so a blocked spot
 * doesn't stop you. Walking off by hand or a blocked walk calls it off.
 */
export function useWalkThen(player: PlayerHandle) {
  const pending = useRef<{ seq: number; act: () => void } | null>(null);
  useEffect(() => subscribeTrip(() => {
    const t = getTrip();
    const p = pending.current;
    if (!p || !t || t.seq !== p.seq || t.status === 'moving') return;
    pending.current = null;
    if (t.status === 'arrived') p.act();
  }), []);
  /** Starts a walk (`start` returns whether it could) and does `act` when it arrives. */
  const thenOnArrival = useCallback((start: () => boolean, act: () => void): boolean => {
    // Listen for this walk before starting it: if you're already there it ends straight away
    pending.current = { seq: nextTripSeq(), act };
    if (start()) return true;
    pending.current = null;
    return false;
  }, []);
  /** Walks to the first of these places with a way there, then does `act`. */
  const walkThen = useCallback((spots: readonly (readonly [number, number])[], label: string, act: () => void): boolean =>
    spots.some(([x, z]) => thenOnArrival(() => setMoveTarget(makeTarget(player.position.x, player.position.z, x, z, false), { label }), act)), [player, thenOnArrival]);
  return { walkThen, thenOnArrival };
}
