import { useEffect } from 'react';
import type { Career } from './CharacterCreation';
import { canDo, templateFor, type ActiveEvent, type PastEvent } from '../lib/liveEvents';
import { REPUTATIONS, type RepId } from '../lib/reputation';

const GLASS = 'border border-white/10 bg-[#15181c]/80 text-ui-ink shadow-[0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md';
const SEVERITY_TONE = { emergency: 'text-[#ff8a7a]', minor: 'text-ui-gold-strong', opportunity: 'text-ui-accent-strong' } as const;
const SEVERITY_WORD = { emergency: 'Emergency', minor: 'Someone needs help', opportunity: 'Opportunity' } as const;
const money = (n: number) => `${Math.round(n).toLocaleString()} GHAI`;
const repLabel = (id: RepId) => REPUTATIONS.find((r) => r.id === id)?.label ?? id;
const repLine = (rep: Partial<Record<RepId, number>>) =>
  (Object.entries(rep) as [RepId, number][]).filter(([, v]) => v).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${repLabel(k).toLowerCase()}`).join(', ');

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

/**
 * The alert when something happens in the city: what, how far, how long is
 * left. Respond tracks it on the map; Not now hides it (it still happens).
 * Once you're on your way it shrinks to one line.
 */
export function EventAlert({ event, minutesLeft, distance, onRespond, onDismiss }: {
  event: ActiveEvent;
  minutesLeft: number;
  /** Metres to the scene, or null when it's somewhere you can't walk to from here. */
  distance: number | null;
  onRespond: () => void;
  onDismiss: () => void;
}) {
  const t = templateFor(event.kind);
  const where = distance === null ? 'nearby' : distance < 8 ? 'here' : `${Math.round(distance)} m away`;
  if (event.responding) {
    return (
      <div role="status" className={`${GLASS} pointer-events-auto flex max-w-[20rem] items-center gap-2 rounded-2xl px-3 py-2 text-xs`}>
        <span className={`font-semibold ${SEVERITY_TONE[t.severity]}`}>{t.title}</span>
        <span className="text-ui-muted tabular-nums">{where} · {minutesLeft} min left</span>
        <button type="button" onClick={onDismiss} aria-label="Stop tracking this event" className="ml-auto rounded px-1.5 text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">✕</button>
      </div>
    );
  }
  return (
    <section role="alert" aria-label={t.title} className={`${GLASS} pointer-events-auto w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl p-3 text-sm`}>
      <p className={`m-0 text-[10px] font-bold uppercase tracking-[0.16em] ${SEVERITY_TONE[t.severity]}`}>{SEVERITY_WORD[t.severity]} · {where}</p>
      <p className="m-0 mt-1 font-semibold">{t.title}</p>
      <p className="m-0 mt-0.5 text-xs text-ui-muted">{t.summary}</p>
      <div className="mt-2.5 flex items-center gap-2">
        <button type="button" onClick={onRespond} className="rounded-full bg-ui-gold px-3 py-1.5 text-xs font-semibold text-black hover:bg-ui-gold-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Respond</button>
        <button type="button" onClick={onDismiss} className="rounded-full border border-ui-line px-3 py-1.5 text-xs hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">Not now</button>
        <span className="ml-auto text-[11px] tabular-nums text-ui-muted">{minutesLeft} min left</span>
      </div>
    </section>
  );
}

/**
 * At the scene: what you can do about it, what each thing takes, pays and
 * means for your reputation, and why anything you can't do is out of reach.
 */
export function EventPanel({ event, career, equipment, minute, atScene, atTarget, onAct, onClose }: {
  event: ActiveEvent;
  career: Career;
  equipment: readonly string[];
  minute: number;
  /** Standing within reach of the scene / the search target right now. */
  atScene: boolean;
  atTarget: boolean;
  onAct: (objectiveId: string) => void;
  onClose: () => void;
}) {
  useEscape(onClose);
  const t = templateFor(event.kind);
  const left = Math.max(0, event.endsAt - minute);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="event-title" onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-ui-line p-5">
          <div>
            <p className={`m-0 text-xs font-semibold uppercase tracking-widest ${SEVERITY_TONE[t.severity]}`}>{SEVERITY_WORD[t.severity]} · {left} min left</p>
            <h2 id="event-title" className="m-0 mt-1 font-display text-2xl font-bold">{t.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Close</button>
        </header>
        <div className="space-y-3 p-5">
          <p className="m-0 text-sm">{t.summary}</p>
          <ul className="m-0 grid list-none gap-2 p-0">
            {t.objectives.map((o) => {
              const done = event.done.includes(o.id);
              const can = canDo(event, o.id, career, equipment, minute);
              const here = o.atTarget ? atTarget : atScene;
              const blocked = !can.ok ? can.reason : !here ? (o.atTarget ? 'Go to where he is: he’s marked on the map.' : 'Get closer to the scene.') : null;
              return (
                <li key={o.id}>
                  <button type="button" disabled={done || !!blocked} onClick={() => onAct(o.id)}
                    className={`w-full rounded-xl border p-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed ${done ? 'border-ui-accent/50 bg-ui-accent/10' : blocked ? 'border-ui-line/60 opacity-60' : 'border-ui-line hover:border-ui-accent'}`}>
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{done ? '✓ ' : ''}{o.label}</span>
                      <span className="shrink-0 text-xs tabular-nums text-ui-muted">{o.minutes} min{o.reward ? ` · ${money(o.reward)}` : ''}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-ui-muted">{o.detail}</span>
                    {!done && repLine(o.rep) && <span className="mt-0.5 block text-[11px] text-ui-gold-strong">{repLine(o.rep)}</span>}
                    {!done && blocked && <span className="mt-1 block text-[11px] text-ui-warn">{blocked}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {event.done.length > 0 && <p className="m-0 text-xs text-ui-muted">So far: {money(event.earned)}{repLine(event.rep) ? `, ${repLine(event.rep)}` : ''}.</p>}
          <p className="m-0 text-[11px] text-ui-muted">The emergency services and people around are computer-controlled; they deal with whatever you don&rsquo;t. You&rsquo;re paid only for what you do. The clock runs while you help, off the clock for work.</p>
        </div>
      </div>
    </div>
  );
}

/** How it went, once an event you took part in is over. */
export function EventResult({ result, onClose }: { result: PastEvent; onClose: () => void }) {
  useEscape(onClose);
  const t = templateFor(result.kind);
  const done = t.objectives.filter((o) => result.done.includes(o.id));
  const rep: Partial<Record<RepId, number>> = {};
  for (const o of done) for (const [k, v] of Object.entries(o.rep) as [RepId, number][]) rep[k] = (rep[k] ?? 0) + v;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="event-result-title" onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-md sm:rounded-2xl">
        <header className="border-b border-ui-line p-5">
          <p className="m-0 text-xs uppercase tracking-widest text-ui-muted">It&rsquo;s over</p>
          <h2 id="event-result-title" className="m-0 mt-1 font-display text-2xl font-bold">{t.title}</h2>
        </header>
        <div className="space-y-3 p-5 text-sm">
          <p className="m-0">{t.othersHandle}</p>
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">What you did</p>
            <ul className="m-0 mt-1 list-disc pl-5">{done.map((o) => <li key={o.id}>{o.label}</li>)}</ul>
          </div>
          <p className="m-0"><span className="font-semibold text-ui-gold-strong">{money(result.earned)}</span>{repLine(rep) ? ` · ${repLine(rep)}` : ''}</p>
          {result.abandoned && <p className="m-0 text-xs text-ui-warn">You left before handing over what you started, so your professional standing dropped a little. Finish next time and it soon recovers.</p>}
          <button type="button" onClick={onClose} className="w-full rounded-xl bg-ui-accent py-2 text-sm font-semibold text-black hover:bg-ui-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Carry on</button>
        </div>
      </div>
    </div>
  );
}
