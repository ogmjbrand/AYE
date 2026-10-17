import { useEffect, useState, useSyncExternalStore } from 'react';
import { getTrip, setMoveTarget, subscribeTrip } from '../hooks/usePlayerController';
import type { Destination } from '../lib/cityDirectory';

/** How long an arrival or "stopped" message stays up, in milliseconds. */
const MESSAGE_MS = 6000;

/**
 * A slim bar for trips started from the city directory: where you're heading
 * (with Stop), then what happened: arrived, stopped by you, or blocked.
 * Plain clicks on the ground don't show it; the ring and dots are enough.
 */
export function TripStatus({ destinations }: { destinations: readonly Destination[] }) {
  const trip = useSyncExternalStore(subscribeTrip, getTrip);
  const [hidden, setHidden] = useState<string | null>(null);
  const key = trip ? `${trip.seq}:${trip.status}` : null;

  useEffect(() => {
    if (!trip || trip.status === 'moving') return;
    const t = setTimeout(() => setHidden(`${trip.seq}:${trip.status}`), MESSAGE_MS);
    return () => clearTimeout(t);
  }, [trip]);

  if (!trip?.destinationId || hidden === key) return null;
  const dest = destinations.find((d) => d.id === trip.destinationId);
  const name = trip.label ?? dest?.name ?? 'there';

  const text = trip.status === 'moving'
    ? <>Heading to <span className="font-semibold">{name}</span></>
    : trip.status === 'arrived'
      ? dest?.status === 'open' && !dest.id.includes('.work.')
        ? <>You&rsquo;re at <span className="font-semibold">{name}</span>. Press E or tap the prompt.</>
        : <>You&rsquo;re at <span className="font-semibold">{name}</span>. {dest?.note}.</>
      : trip.status === 'blocked'
        ? <>Couldn&rsquo;t get to <span className="font-semibold">{name}</span>: something is in the way. Try Go again.</>
        : <>Stopped. Route to <span className="font-semibold">{name}</span> cancelled.</>;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[7.5rem] z-30 flex justify-center px-3 sm:top-20">
      <p role="status" className="pointer-events-auto m-0 flex max-w-md items-center gap-3 rounded-xl border border-ui-line bg-ui-panel/90 px-4 py-2 text-sm text-ui-ink shadow-xl">
        <span className="min-w-0">{text}</span>
        {trip.status === 'moving' && (
          <button
            type="button"
            onClick={() => setMoveTarget(null)}
            className="shrink-0 rounded-md border border-ui-line px-2 py-0.5 text-xs font-semibold hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"
          >
            Stop
          </button>
        )}
      </p>
    </div>
  );
}
