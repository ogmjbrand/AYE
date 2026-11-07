import type { ActiveIncident } from '../lib/incidents';

const OBJECTIVE_LABEL: Record<ActiveIncident['objective'], string> = {
  treat: 'Treat the injured',
  assist: 'Assist and wait for help',
};

/**
 * The on-scene objective prompt, shown once the player has arrived at an
 * incident. Mirrors the game's existing "press E" interaction convention
 * (doors, counters, hugs) rather than a menu to open.
 */
export function IncidentObjectivePanel({ incident, inRange }: { incident: ActiveIncident; inRange: boolean }) {
  return (
    <div
      role="status"
      className="pointer-events-none fixed left-1/2 top-40 z-40 w-[20rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-ui-line bg-ui-panel/90 px-4 py-2.5 text-center text-ui-ink shadow-xl"
    >
      <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Road accident response</p>
      <p className="m-0 mt-1 text-sm font-semibold">
        {OBJECTIVE_LABEL[incident.objective]}
        {inRange && <span className="text-ui-gold-strong"> — press E</span>}
      </p>
    </div>
  );
}
