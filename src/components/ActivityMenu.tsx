import { useState } from 'react';
import { ListTodo, X } from 'lucide-react';
import type { Activity } from '../lib/venueActivities';

/**
 * "Things to do here" inside a venue: pick an activity and your character
 * walks there, round whatever is in the way, and does it on arrival
 * (App.goDoActivity). Sits above the movement stick on phones.
 */
export function ActivityMenu({ activities, onGo }: { activities: readonly Activity[]; onGo: (a: Activity) => void }) {
  const [open, setOpen] = useState(false);
  if (!activities.length) return null;
  return (
    <div className="pointer-events-auto fixed bottom-[13.5rem] left-2 z-30 max-w-[min(18rem,calc(100vw-1rem))] sm:left-5 short:bottom-[8.5rem]"
      style={{ marginLeft: 'env(safe-area-inset-left, 0px)' }}>
      {open ? (
        <section aria-label="Things to do here" className="rounded-2xl border border-ui-gold/30 bg-[#16120e]/95 p-2 text-ui-ink shadow-2xl">
          <header className="flex items-center justify-between px-1 pb-1">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-gold-strong">Things to do here</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close the list" className="grid h-8 w-8 place-items-center rounded-full text-white/70 hover:text-white"><X size={15} /></button>
          </header>
          <ul className="m-0 max-h-[40dvh] list-none space-y-1 overflow-y-auto p-0 short:max-h-[55dvh]">
            {activities.map((a) => (
              <li key={a.label}>
                <button type="button" onClick={() => { setOpen(false); onGo(a); }}
                  className="flex min-h-10 w-full items-center rounded-xl border border-white/10 bg-white/5 px-3 text-left text-[13px] font-semibold hover:border-ui-gold/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-expanded={false}
          className="flex min-h-10 items-center gap-1.5 rounded-full border border-ui-gold/40 bg-[#16120e]/90 px-3 text-[12px] font-semibold text-ui-ink shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
          <ListTodo size={15} className="text-ui-gold-strong" aria-hidden="true" /> Things to do here
        </button>
      )}
    </div>
  );
}
