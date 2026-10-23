import { useEffect, useState } from 'react';
import {
  CLIENTS_PER_DAY, LEVELS, ROUTINES, SERVICES, SHIFT_END, SHIFT_START, SPA_NAME, levelOf, satisfaction, serviceById, sessionPay, stars,
  type Client, type SpaJob, type SpaService,
} from '../lib/spa';
import { Icon } from './os/icons';

function Coin({ amount, dark = false }: { amount: number; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 font-display text-sm font-bold tabular-nums ${dark ? 'text-[#2a1c06]' : 'text-ui-gold-strong'}`}>
      <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-b from-[#f3d48f] to-[#b8862f] text-[#3a2606]"><Icon name="coin" className="h-3 w-3" /></span>
      {Math.round(amount).toLocaleString()}
    </span>
  );
}

const SHELL = 'fixed inset-x-0 bottom-0 z-40 flex max-h-[82vh] flex-col rounded-t-3xl border border-ui-gold/40 bg-[#0d1412]/95 text-ui-ink shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[5.5rem] sm:max-h-[calc(100vh-11rem)] sm:w-[28rem] sm:rounded-3xl';
const GOLD_BUTTON = 'flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#e9c77e] to-[#b8862f] px-4 py-3 font-semibold text-[#2a1c06] shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:from-ui-line disabled:to-ui-line disabled:text-ui-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold';
const LINE_BUTTON = 'w-full rounded-2xl border border-ui-gold/40 px-4 py-3 font-semibold text-ui-gold-strong hover:border-ui-gold disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold';

function Header({ title, onBack, balance }: { title: string; onBack: () => void; balance: number }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-ui-gold/20 px-4 py-3">
      <button type="button" onClick={onBack} aria-label="Back"
        className="grid h-9 w-9 place-items-center rounded-full border border-ui-gold/40 text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
        <Icon name="back" className="h-4 w-4" />
      </button>
      <h2 className="m-0 font-display text-xl font-bold">{title}</h2>
      <span className="ml-auto"><Coin amount={balance} /></span>
    </header>
  );
}

function useEscape(onEscape: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEscape]);
}

/** Reception: the treatment menu. Pick one, then go to your room and lie down. */
export function SpaMenu({ balance, open, friends, onBook, onClose }: {
  balance: number;
  /** The spa is open now. */
  open: boolean;
  /** Friends who could come for a couples massage. */
  friends: readonly { id: string; name: string }[];
  onBook: (service: SpaService, friendId?: string) => void;
  onClose: () => void;
}) {
  const [pick, setPick] = useState<SpaService | null>(null);
  const [friend, setFriend] = useState<string>(friends[0]?.id ?? '');
  useEscape(() => (pick ? setPick(null) : onClose()));
  const problem = pick ? (!open ? 'The spa is closed (open 09:00–21:00)' : balance < pick.price ? 'Not enough GHAI' : pick.couples && !friend ? 'Make a friend first: a couples massage is for two' : null) : null;
  return (
    <aside role="dialog" aria-label={`${SPA_NAME} treatments`} className={SHELL}>
      <Header title={pick ? pick.name : 'Treatments'} onBack={() => (pick ? setPick(null) : onClose())} balance={balance} />
      {!pick ? (
        <ul className="m-0 grid min-h-0 list-none gap-2 overflow-y-auto p-3">
          {SERVICES.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setPick(s)}
                className="flex w-full items-center gap-3 rounded-2xl border border-ui-gold/20 bg-gradient-to-b from-[#1a2622] to-[#111916] p-3 text-left hover:border-ui-gold/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{s.name}</span>
                  <span className="block text-[11px] text-ui-muted">{s.minutes} min{s.couples ? ' · for two' : ''}</span>
                </span>
                <Coin amount={s.price} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="min-h-0 overflow-y-auto p-4">
          <p className="m-0 text-sm text-ui-ink/90">{pick.description}</p>
          <ul className="m-0 mt-3 flex flex-wrap gap-2 p-0 text-xs">
            <li className="list-none rounded-full border border-ui-line/70 px-3 py-1">{pick.minutes} minutes</li>
            {Object.entries(pick.lift).map(([k, v]) => <li key={k} className="list-none rounded-full border border-ui-accent/40 px-3 py-1 text-ui-accent-strong">+{v} {k}</li>)}
          </ul>
          {pick.couples && (
            <label className="mt-3 block text-xs text-ui-muted">With
              <select value={friend} onChange={(e) => setFriend(e.target.value)} className="mt-1 block w-full rounded-xl border border-ui-line bg-black/30 px-3 py-2 text-sm text-ui-ink">
                {friends.length === 0 && <option value="">No friends yet</option>}
                {friends.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
          )}
          <button type="button" disabled={!!problem} onClick={() => onBook(pick, pick.couples ? friend : undefined)} className={`mt-4 ${GOLD_BUTTON}`}>
            {problem ?? <>Book · <Coin amount={pick.price} dark /></>}
          </button>
          <p className="m-0 mt-2 text-[11px] text-ui-muted">Kemi shows you to your room; lie on the table when you're ready. You pay when the treatment starts.</p>
        </div>
      )}
    </aside>
  );
}

/** The manager: the therapist job, your level and pay, and clocking in and out. */
export function SpaJobPanel({ job, balance, hour, onHire, onClockIn, onClockOut, onClose }: {
  job: SpaJob;
  balance: number;
  hour: number;
  onHire: () => void;
  onClockIn: () => void;
  onClockOut: () => void;
  onClose: () => void;
}) {
  useEscape(onClose);
  const lvl = levelOf(job);
  const next = LEVELS[lvl + 1];
  const shiftNow = hour >= SHIFT_START && hour < SHIFT_END;
  return (
    <aside role="dialog" aria-label="Spa manager" className={SHELL}>
      <Header title="Ifeoma, spa manager" onBack={onClose} balance={balance} />
      <div className="min-h-0 overflow-y-auto p-4 text-sm">
        {!job.employed ? (
          <>
            <p className="m-0">“We're looking for massage therapists. You'll learn every treatment on the menu: Swedish, deep tissue, sports, hot stone, reflexology, couples. Clients tell you what they want; listen, and they tip well.”</p>
            <ul className="m-0 mt-3 list-disc space-y-1 pl-5 text-xs text-ui-muted">
              <li>Shifts {SHIFT_START}:00–{SHIFT_END}:00; up to {CLIENTS_PER_DAY} clients a day.</li>
              <li>Paid {Math.round(LEVELS[0].share * 100)}% of each treatment's price as a trainee, up to {Math.round(LEVELS[LEVELS.length - 1].share * 100)}% as spa lead, plus tips.</li>
              <li>You can keep your career too: the spa is extra work in your own time.</li>
            </ul>
            <button type="button" onClick={onHire} className={`mt-4 ${GOLD_BUTTON}`}>Take the job</button>
          </>
        ) : (
          <>
            <dl className="m-0 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Level</dt><dd className="m-0 mt-0.5 font-semibold">{LEVELS[lvl].title}</dd></div>
              <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Your share</dt><dd className="m-0 mt-0.5 font-semibold">{Math.round(LEVELS[lvl].share * 100)}% + tips</dd></div>
              <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Good sessions</dt><dd className="m-0 mt-0.5 font-semibold">{job.goodSessions}{next ? ` / ${next.sessions}` : ''}</dd></div>
              <div className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">Earned here</dt><dd className="m-0 mt-0.5"><Coin amount={job.earnedTotal} /></dd></div>
            </dl>
            {job.clockedIn ? (
              <>
                <p className="m-0 mt-3">You're on shift. Clients wait in reception: walk up to one to take them to a room.</p>
                <button type="button" onClick={onClockOut} className={`mt-3 ${LINE_BUTTON}`}>Clock out</button>
              </>
            ) : (
              <button type="button" disabled={!shiftNow} onClick={onClockIn} className={`mt-4 ${GOLD_BUTTON}`}>
                {shiftNow ? 'Clock in' : `Shifts are ${SHIFT_START}:00–${SHIFT_END}:00`}
              </button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

/**
 * A treatment you give: the client's request, then each step of the service's
 * routine as a choice. Satisfaction shows at the end, with your fee and tip.
 */
export function SpaSession({ client, job, balance, onFinish, onClose }: {
  client: Client;
  job: SpaJob;
  balance: number;
  /** Called with your choices when the session ends (time passes and you're paid). */
  onFinish: (choices: number[]) => void;
  onClose: () => void;
}) {
  const steps = ROUTINES[client.service];
  const service = serviceById(client.service)!;
  const [choices, setChoices] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  useEscape(() => { if (!done && choices.length === 0) onClose(); });
  const at = choices.length;
  const sat = at === steps.length ? satisfaction(client, choices) : null;
  const pay = sat !== null ? sessionPay(job, service, sat) : null;
  return (
    <aside role="dialog" aria-label={`Treating ${client.name}`} className={SHELL}>
      <Header title={`${service.name} · ${client.name}`} onBack={() => { if (!done && choices.length === 0) onClose(); }} balance={balance} />
      <div className="min-h-0 overflow-y-auto p-4">
        <p className="m-0 rounded-xl border border-ui-gold/25 bg-ui-gold/10 px-3 py-2 text-xs text-ui-gold-strong">“{client.note}”</p>
        <ol className="m-0 mt-3 flex gap-1 p-0" aria-label="Progress">
          {steps.map((s, i) => <li key={s.id} className={`h-1.5 flex-1 list-none rounded-full ${i < at ? 'bg-ui-accent' : i === at ? 'bg-ui-gold' : 'bg-ui-line'}`} />)}
        </ol>
        {at < steps.length ? (
          <>
            <p className="m-0 mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-muted">Step {at + 1} of {steps.length}</p>
            <h3 className="m-0 mt-1 font-display text-lg font-bold">{steps[at].prompt}</h3>
            <div className="mt-3 grid gap-2">
              {steps[at].options.map((o, i) => (
                <button key={o.label} type="button" onClick={() => setChoices([...choices, i])}
                  className="rounded-2xl border border-ui-gold/25 bg-gradient-to-b from-[#1a2622] to-[#111916] px-4 py-3 text-left text-sm hover:border-ui-gold/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
                  {o.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4 text-center">
            <p className="m-0 text-3xl text-ui-gold-strong" aria-label={`${stars(sat!)} stars`}>{'★'.repeat(stars(sat!))}{'☆'.repeat(5 - stars(sat!))}</p>
            <p className="m-0 mt-1 text-sm">{client.name} is {sat! >= 75 ? 'glowing and relaxed' : sat! >= 55 ? 'happy' : sat! >= 35 ? 'polite, but not impressed' : 'unhappy'} ({sat}%).</p>
            <p className="m-0 mt-2 flex items-center justify-center gap-2 text-sm">Fee <Coin amount={pay!.fee} /> · Tip <Coin amount={pay!.tip} /></p>
            {!done ? (
              <button type="button" onClick={() => { setDone(true); onFinish(choices); }} className={`mt-4 ${GOLD_BUTTON}`}>Finish ({service.minutes} min pass)</button>
            ) : (
              <button type="button" onClick={onClose} className={`mt-4 ${LINE_BUTTON}`}>Done</button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
