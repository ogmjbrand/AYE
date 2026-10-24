import { Icon } from './os/icons';

/** What the HUD shows a student: all of it read from the save (lib/school.ts), nothing assumed. */
export interface StudentHud {
  university: string;
  /** Year of study (the student career's level). */
  title: string;
  status: string;
  tone: 'good' | 'warn' | 'muted';
  next: string | null;
  allowance: number;
  attended: number;
  classesToday: number;
  assignment: number;
  credits: number;
  room: string | null;
  goals: readonly { label: string; done: boolean }[];
}

const GLASS = 'border border-ui-gold/35 bg-[#0c1210]/80 backdrop-blur-md shadow-lg';
const TONE = { good: 'text-ui-accent-strong', warn: 'text-ui-warn', muted: 'text-ui-muted' } as const;

export function TodaysGoals({ goals }: { goals: StudentHud['goals'] }) {
  if (!goals.length) return null;
  return (
    <section aria-label="Today's goals" className={`${GLASS} pointer-events-auto w-[13.5rem] rounded-2xl p-3`}>
      <h2 className="m-0 font-display text-sm font-bold">Today’s Goals</h2>
      <ul className="m-0 mt-2 grid list-none gap-1 p-0">
        {goals.map((g) => (
          <li key={g.label} className={`flex items-center gap-2 rounded-lg px-1.5 py-1 text-xs ${g.done ? 'bg-ui-gold/10 text-ui-ink' : 'text-ui-ink/75'}`}>
            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${g.done ? 'border-ui-gold bg-ui-gold text-[#2a1c06]' : 'border-ui-ink/40'}`} aria-hidden>
              {g.done && <Icon name="check" className="h-3 w-3" />}
            </span>
            <span>{g.label}</span>
            <span className="sr-only">{g.done ? '(done)' : '(not yet)'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StudentStatus({ s }: { s: StudentHud }) {
  const pct = s.classesToday ? Math.round((s.attended / s.classesToday) * 100) : 0;
  return (
    <section aria-label="Student status" className={`${GLASS} pointer-events-auto w-[15rem] rounded-2xl p-3`}>
      <h2 className="m-0 font-display text-sm font-bold">Active Status</h2>
      <p className="m-0 mt-1.5 text-sm font-semibold">Student · {s.title}</p>
      <p className="m-0 text-[11px] text-ui-muted">{s.university}</p>
      <p className={`m-0 mt-1 flex items-center gap-1.5 text-xs font-semibold ${TONE[s.tone]}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> {s.status}
      </p>
      {s.room && <p className="m-0 text-[11px] text-ui-ink/80">{s.room}</p>}
      <p className="m-0 mt-1 text-[11px] text-ui-ink/80">{s.next ? `Next: ${s.next}` : 'No more classes today'}</p>
      <dl className="m-0 mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
        <dt className="text-ui-muted">Allowance</dt><dd className="m-0 text-right font-semibold text-ui-accent-strong">{s.allowance} GHAI/h on campus</dd>
        <dt className="text-ui-muted">Assignment</dt><dd className="m-0 text-right font-semibold">{s.assignment}%</dd>
        <dt className="text-ui-muted">Credits</dt><dd className="m-0 text-right font-semibold">{s.credits}</dd>
      </dl>
      <p className="m-0 mt-2 flex justify-between text-[11px] text-ui-muted"><span>Classes today</span><span className="font-semibold text-ui-ink">{s.attended} / {s.classesToday}</span></p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Classes attended today" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-ui-gold" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

/** A doctor's shift, from the save (lib/hospital.ts). */
export interface ShiftHud {
  place: string;
  title: string;
  status: string;
  tone: 'good' | 'warn' | 'muted';
  pay: number;
  seen: number;
  target: number;
  waiting: number;
  earnedToday: number;
  room: string | null;
  goals: readonly { label: string; done: boolean }[];
}

export function ShiftStatus({ s }: { s: ShiftHud }) {
  const pct = Math.min(100, Math.round((s.seen / s.target) * 100));
  return (
    <section aria-label="Shift status" className={`${GLASS} pointer-events-auto w-[15rem] rounded-2xl p-3`}>
      <h2 className="m-0 font-display text-sm font-bold">Active Status</h2>
      <p className="m-0 mt-1.5 text-sm font-semibold">Doctor · {s.title}</p>
      <p className="m-0 text-[11px] text-ui-muted">{s.place}</p>
      <p className={`m-0 mt-1 flex items-center gap-1.5 text-xs font-semibold ${TONE[s.tone]}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> {s.status}
      </p>
      {s.room && <p className="m-0 text-[11px] text-ui-ink/80">{s.room}</p>}
      <dl className="m-0 mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
        <dt className="text-ui-muted">Pay</dt><dd className="m-0 text-right font-semibold text-ui-accent-strong">{s.pay} GHAI/h on shift</dd>
        <dt className="text-ui-muted">Earned today</dt><dd className="m-0 text-right font-semibold">{s.earnedToday} GHAI</dd>
        <dt className="text-ui-muted">Still waiting</dt><dd className="m-0 text-right font-semibold">{s.waiting}</dd>
      </dl>
      <p className="m-0 mt-2 flex justify-between text-[11px] text-ui-muted"><span>Patients today</span><span className="font-semibold text-ui-ink">{s.seen} / {s.target}</span></p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Patients seen against today's target" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-ui-gold" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
