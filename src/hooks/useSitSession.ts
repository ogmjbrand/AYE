import { useCallback, useEffect, useState } from 'react';
import { getSeated, getTrip, nextTripSeq, setMoveTarget, sitAt, standUp, subscribeSeated, subscribeTrip, type PlayerHandle } from './usePlayerController';
import { standSpot } from '../lib/seating';
import { makeTarget } from '../lib/clickToMove';
import { SitRunner, type SitPlan, type SitState } from '../lib/sitSession';

export type { SitPlan };
export type SitSession = SitState;

/** Real seconds between wait steps while seated. */
const STEP_SECONDS = 0.25;

/**
 * Sitting down somewhere (lib/sitSession.ts has the rules): walk to the seat,
 * sit, let the chosen time pass in steps through the game reducer, get up.
 */
export function useSitSession(
  player: PlayerHandle,
  onWait: (minutes: number) => void,
  onSeated?: (seat: SitPlan['seat']) => void,
  onInterrupted?: () => void,
) {
  const [runner] = useState(() => new SitRunner({ onWait, sitAt, standUp }));
  useEffect(() => { runner.setOnWait(onWait); }, [runner, onWait]);
  const [session, setSession] = useState<SitSession | null>(null);
  const sync = useCallback(() => setSession(runner.state), [runner]);

  useEffect(() => {
    const offTrip = subscribeTrip(() => {
      const t = getTrip();
      if (t && t.status !== 'moving' && runner.tripEnded(t.seq, t.status)) {
        if (runner.state?.phase === 'seated') onSeated?.(runner.state.seat);
        else onInterrupted?.();
        sync();
      }
    });
    const offSeat = subscribeSeated(() => {
      if (getSeated() === null && runner.stoodUp()) {
        onInterrupted?.();
        sync();
      }
    });
    const id = window.setInterval(() => {
      if (runner.state?.phase !== 'seated') return;
      runner.step(STEP_SECONDS);
      sync();
    }, STEP_SECONDS * 1000);
    return () => { offTrip(); offSeat(); window.clearInterval(id); };
  }, [runner, sync, onSeated, onInterrupted]);

  const start = useCallback((plan: SitPlan): boolean => {
    runner.cancel();
    const spot = standSpot(plan.seat);
    // Listen for this walk before starting it: if you're already at the seat it ends straight away
    runner.begin(plan, nextTripSeq());
    const ok = setMoveTarget(makeTarget(player.position.x, player.position.z, spot.x, spot.z, false), { label: plan.place });
    if (!ok) runner.cancel();
    sync();
    return ok;
  }, [player, runner, sync]);

  const cancel = useCallback(() => {
    if (runner.state?.phase === 'walking') setMoveTarget(null);
    runner.cancel();
    sync();
  }, [runner, sync]);

  return { session, start, cancel };
}
