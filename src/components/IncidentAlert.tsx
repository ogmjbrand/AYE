import type { ActiveIncident } from '../lib/incidents';

const TITLE: Record<ActiveIncident['kind'], string> = {
  'road-accident': 'Road accident reported',
};

const BODY: Record<ActiveIncident['kind'], string> = {
  'road-accident': 'People nearby need assistance.',
};

/**
 * An Accept/Decline mission alert for a newly offered incident. Non-blocking
 * (no backdrop, play continues around it) so declining really does cost
 * nothing, unlike a modal the player has to dismiss to keep playing.
 */
export function IncidentAlert({ incident, onAccept, onDecline }: {
  incident: ActiveIncident;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="incident-alert-title"
      className="os-glass fixed left-1/2 top-24 z-50 w-[22rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-ui-gold/50 p-4 text-ui-ink shadow-2xl"
    >
      <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-ui-gold-strong">Emergency alert</p>
      <h2 id="incident-alert-title" className="m-0 mt-1 font-display text-lg font-bold">{TITLE[incident.kind]}</h2>
      <p className="m-0 mt-1 text-sm text-ui-muted">{BODY[incident.kind]}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 rounded-xl bg-ui-accent px-3 py-2 text-sm font-semibold text-black transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"
        >
          Accept Mission
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="rounded-xl border border-ui-line px-3 py-2 text-sm text-ui-muted transition hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
