import type { SitSession } from '../hooks/useSitSession';

/** While walking to a seat or sitting: where, how long so far, and a way to get up. */
export function SitBar({ session, onStand }: { session: SitSession; onStand: () => void }) {
  const text = session.phase === 'walking'
    ? <>Going to sit down at <span className="font-semibold">{session.place}</span></>
    : session.minutes > 0
      ? <>Sitting at <span className="font-semibold">{session.place}</span> · <span className="tabular-nums">{session.done} of {session.minutes} min</span></>
      : <>Sitting at <span className="font-semibold">{session.place}</span></>;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[7.5rem] z-30 flex justify-center px-3 sm:top-20">
      <p role="status" className="pointer-events-auto m-0 flex max-w-md items-center gap-3 rounded-xl border border-ui-line bg-ui-panel/90 px-4 py-2 text-sm text-ui-ink shadow-xl">
        <span className="min-w-0">{text}</span>
        <button
          type="button"
          onClick={onStand}
          className="shrink-0 rounded-md border border-ui-line px-2 py-0.5 text-xs font-semibold hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"
        >
          {session.phase === 'walking' ? 'Cancel' : 'Stand up'}
        </button>
      </p>
    </div>
  );
}
