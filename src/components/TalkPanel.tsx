import { useEffect } from 'react';
import { useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import {
  ACTIVITIES, COUCH_LEVEL, FRIENDSHIP_LEVELS, HANGOUT_LEVEL, MAX_POINTS, friendshipLevel,
  type Activity, type Relationship, type Resident,
} from '../lib/people';

interface TalkPanelProps {
  resident: Resident;
  relationship: Relationship | undefined;
  /** Today's game day, to tell whether you've already spent time together today. */
  today: number;
  balance: number;
  onActivity: (activity: Activity) => void;
  onRequestHug: () => string | null;
  onStayOver: () => void;
  onClose: () => void;
}

/** Talking to a resident: their line for your friendship level, and things to do together. */
export function TalkPanel({ resident, relationship, today, balance, onActivity, onRequestHug, onStayOver, onClose }: TalkPanelProps) {
  const [hugResponse, setHugResponse] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const points = relationship?.points ?? 0;
  const level = friendshipLevel(points);
  const next = FRIENDSHIP_LEVELS[level + 1];
  const doneToday = relationship?.lastDay === today;
  const first = resident.name.split(' ')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="talk-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-ui-line p-5">
          <div>
            <p className="m-0 text-xs uppercase tracking-widest text-ui-muted">{resident.role}</p>
            <h2 id="talk-title" className="m-0 mt-1 font-display text-2xl font-bold">{resident.name}</h2>
            <p className="m-0 mt-1 text-xs text-ui-muted">Computer-controlled resident, not another player</p>
          </div>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Close</button>
        </header>
        <div className="space-y-4 p-5">
          <blockquote className="m-0 rounded-lg border-l-2 border-ui-accent bg-black/20 px-4 py-3 text-sm italic">“{resident.lines[level]}”</blockquote>
          <section className="space-y-2 rounded-xl border border-ui-line p-3" aria-label="Affection">
            <div>
              <p className="m-0 text-sm font-semibold">Respectful affection</p>
              <p className="m-0 mt-1 text-xs text-ui-muted">Ask first. A hug is only shared when {first} is comfortable.</p>
            </div>
            <button
              type="button"
              disabled={relationship?.lastHugDay === today}
              onClick={() => {
                const response = onRequestHug();
                if (response) setHugResponse(response);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-ui-line px-3 py-2 text-sm font-semibold hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <HeartHandshake size={17} aria-hidden="true" />
              {relationship?.lastHugDay === today ? 'You shared a hug today' : 'Ask for a hug'}
            </button>
            {hugResponse && <p role="status" className="m-0 text-sm text-ui-muted">{hugResponse}</p>}
          </section>
          <div>
            <div className="flex justify-between text-xs">
              <span className="font-semibold">{FRIENDSHIP_LEVELS[level].name}</span>
              <span className="text-ui-muted">{next ? `${next.points - points} to ${next.name}` : 'As close as it gets'}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ui-line" role="progressbar" aria-label="Friendship" aria-valuenow={points} aria-valuemin={0} aria-valuemax={MAX_POINTS}>
              <div className="h-full rounded-full bg-ui-accent" style={{ width: `${(points / MAX_POINTS) * 100}%` }} />
            </div>
          </div>
          {doneToday ? (
            <p className="m-0 text-sm text-ui-muted">You've already spent time with {first} today. Come back tomorrow.</p>
          ) : (
            <ul className="m-0 grid list-none gap-2 p-0">
              {(Object.keys(ACTIVITIES) as Activity[]).map((id) => {
                const a = ACTIVITIES[id];
                const locked = id === 'hangout' && level < HANGOUT_LEVEL;
                const poor = balance < a.cost;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={locked || poor}
                      onClick={() => onActivity(id)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-ui-line p-3 text-left hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-sm font-semibold">{a.label}</span>
                        <span className="block text-xs text-ui-muted">{locked ? `Once you're friends.` : a.description}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-ui-muted">{a.cost > 0 ? `${a.cost} ⓒ` : 'Free'} · +{a.points}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {level >= COUCH_LEVEL && (
            <button
              type="button"
              onClick={onStayOver}
              className="w-full rounded-lg bg-ui-accent py-2.5 text-sm font-semibold text-black hover:bg-ui-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent"
            >
              Stay the night at {first}'s
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
