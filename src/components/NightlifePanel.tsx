import { useEffect, useState } from 'react';
import { FRIENDSHIP_LEVELS, HANGOUT_LEVEL, friendshipLevel, gameDay, residentsIn, type Relationship } from '../lib/people';
import {
  CLOSES_HOUR, LAST_ENTRY_HOUR, NIGHT_OUT_MINUTES, NIGHT_OUT_POINTS, OPENS_HOUR,
  canStartNightOut, isOpen, nightOutCost, type Venue,
} from '../lib/nightlife';
import type { GameTime } from '../lib/gameState';

interface NightlifePanelProps {
  venue: Venue;
  districtId: string;
  time: GameTime;
  balance: number;
  relationships: Record<string, Relationship>;
  onNightOut: (residentId: string) => void;
  onClose: () => void;
}

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

/** The lounge door: hours, cover, and a night out with one of your friends. */
export function NightlifePanel({ venue, districtId, time, balance, relationships, onNightOut, onClose }: NightlifePanelProps) {
  const [went, setWent] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = isOpen(time);
  const canStart = canStartNightOut(time);
  const cost = nightOutCost(venue);
  const today = gameDay(time.totalMinutes);
  const people = residentsIn(districtId).map((r) => {
    const rel = relationships[r.id];
    const level = friendshipLevel(rel?.points ?? 0);
    const why = level < HANGOUT_LEVEL ? `Not close enough yet (${FRIENDSHIP_LEVELS[level].name})`
      : rel?.lastDay === today ? 'Already spent time together today'
        : !canStart ? (open ? `Last entry is ${hh(LAST_ENTRY_HOUR)}` : `Opens at ${hh(OPENS_HOUR)}`)
          : balance < cost ? `You need ${cost} ⓒ`
            : null;
    return { r, level, why };
  });
  const anyFriend = people.some((p) => p.level >= HANGOUT_LEVEL);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ui-line p-5">
          <div>
            <p className="m-0 text-xs uppercase tracking-widest text-ui-muted">{venue.kind}</p>
            <h2 id="venue-title" className="m-0 mt-1 font-display text-2xl font-bold">{venue.name}</h2>
            <p className="m-0 mt-1 text-xs text-ui-muted">
              <span className={open ? 'text-ui-accent' : 'text-ui-warn'}>{open ? 'Open now' : 'Closed now'}</span>
              {' '}· {hh(OPENS_HOUR)}–{hh(CLOSES_HOUR)}, last entry {hh(LAST_ENTRY_HOUR)} · Cover {venue.cover} ⓒ
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Close</button>
        </header>
        <div className="space-y-4 p-5">
          <p className="m-0 text-sm">{venue.description}</p>
          {went ? (
            <p role="status" className="m-0 rounded-lg bg-black/20 px-3 py-2 text-sm">
              You and {went} had a good night out. +{NIGHT_OUT_POINTS} friendship.
            </p>
          ) : (
            <>
              <div>
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">Night out with a friend</p>
                <p className="m-0 mt-1 text-xs text-ui-muted">
                  {NIGHT_OUT_MINUTES / 60} hours · you pay both covers ({cost} ⓒ) · +{NIGHT_OUT_POINTS} friendship. Counts as your time together today.
                </p>
              </div>
              {!anyFriend && (
                <p className="m-0 rounded-lg bg-black/20 px-3 py-2 text-sm">
                  Nights out are with friends. Get to know the people around here first: chat with them or treat them, and come back once you&rsquo;re friends.
                </p>
              )}
              <ul className="m-0 grid list-none gap-2 p-0">
                {people.map(({ r, level, why }) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl border border-ui-line p-3">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-sm font-semibold">{r.name}</p>
                      <p className="m-0 text-xs text-ui-muted">{why ?? FRIENDSHIP_LEVELS[level].name}</p>
                    </div>
                    <button
                      type="button"
                      disabled={why !== null}
                      onClick={() => { onNightOut(r.id); setWent(r.name.split(' ')[0]); }}
                      className="shrink-0 rounded-md border border-ui-accent bg-ui-accent/20 px-3 py-1.5 text-xs font-semibold hover:bg-ui-accent/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:border-ui-line disabled:bg-transparent disabled:opacity-50"
                    >
                      Go out
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="m-0 text-[11px] text-ui-muted">The people here are computer-controlled residents, not other players. Money is virtual (ⓒ).</p>
        </div>
      </div>
    </div>
  );
}
