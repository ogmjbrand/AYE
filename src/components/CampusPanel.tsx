import { useEffect, type ReactNode } from 'react';
import {
  ASSIGNMENT_CREDITS, ATTEND_SHARE, CAFETERIA_MENU, CLASS_CREDITS, CLUBS, ROOM_NAMES, TIMETABLE, assignmentTitle, classById, isSchoolDay, type SchoolState,
} from '../lib/school';
import { DESTINATIONS, UNIVERSITY_NAME, type Destination } from '../lib/university';
import { Icon } from './os/icons';

export type CampusPanelMode = 'directory' | 'records' | 'cafe' | 'clubs';

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const ROOM_CODE: Record<string, string> = { 'hall-a': 'G01', lab: 'G05' };

function Shell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <aside role="dialog" aria-label={title}
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[78vh] flex-col rounded-t-3xl border border-ui-gold/40 bg-[#0d1412]/95 text-ui-ink shadow-2xl sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[5.5rem] sm:max-h-[calc(100vh-11rem)] sm:w-[27rem] sm:rounded-3xl">
      <header className="flex shrink-0 items-center gap-3 border-b border-ui-gold/20 px-4 py-3">
        <button type="button" onClick={onClose} aria-label={`Close ${title}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-ui-gold/40 text-ui-gold-strong hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold">
          <Icon name="back" className="h-4 w-4" />
        </button>
        <div>
          <h2 className="m-0 font-display text-lg font-bold">{title}</h2>
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-ui-gold-strong">{UNIVERSITY_NAME}</p>
        </div>
      </header>
      <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      {footer && <footer className="shrink-0 border-t border-ui-gold/20 px-4 py-3 text-[11px] text-ui-muted" aria-live="polite">{footer}</footer>}
    </aside>
  );
}

const btn = 'rounded-xl border border-ui-gold/30 px-3 py-2 text-sm font-semibold hover:border-ui-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold disabled:cursor-not-allowed disabled:opacity-50';

/** The directory: every place in the building; picking one lays a glowing route to it. */
export function DirectoryPanel({ onGuide, onClose }: { onGuide: (d: Destination) => void; onClose: () => void }) {
  return (
    <Shell title="Campus directory" onClose={onClose} footer="Pick a place and follow the gold arrows on the floor.">
      <ul className="m-0 grid list-none gap-2 p-0">
        {DESTINATIONS.map((d) => (
          <li key={d.id}>
            <button type="button" className={`${btn} flex w-full items-center justify-between text-left`} onClick={() => onGuide(d)}>
              <span>{d.name}</span>
              <Icon name="arrowRight" className="h-4 w-4 text-ui-gold-strong" />
            </button>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

/** Today's timetable and your own academic record (only yours: it's read from your save). */
export function RecordsPanel({ school, student, minute, dayOfWeek, levelTitle, hourlyPay, onClose }: {
  school: SchoolState; student: boolean; minute: number; dayOfWeek: number; levelTitle: string; hourlyPay: number; onClose: () => void;
}) {
  const weekday = isSchoolDay(dayOfWeek);
  return (
    <Shell title="Timetable & records" onClose={onClose}
      footer={`Classes count when you sit through at least ${Math.round(ATTEND_SHARE * 100)}% of them. Allowance is the student rate (${hourlyPay} GHAI an hour) for time on campus between 09:00 and 17:00.`}>
      <h3 className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-ui-muted">{weekday ? 'Today' : 'Weekend: no classes'}</h3>
      <ul className="m-0 mt-2 grid list-none gap-2 p-0">
        {TIMETABLE.map((c) => {
          const done = school.attended.includes(c.id);
          const now = weekday && minute >= c.start && minute < c.end;
          return (
            <li key={c.id} className={`rounded-xl border p-3 ${now ? 'border-ui-gold' : 'border-ui-line/70'}`}>
              <p className="m-0 flex items-center justify-between text-sm font-semibold">
                <span>{c.course}</span>
                <span className={done ? 'text-ui-accent-strong' : 'text-ui-muted'}>{done ? 'Attended' : now ? 'On now' : weekday && minute >= c.end ? 'Missed' : ''}</span>
              </p>
              <p className="m-0 mt-0.5 text-xs text-ui-muted">{hhmm(c.start)}–{hhmm(c.end)} · {ROOM_NAMES[c.room]} · {c.lecturer}</p>
            </li>
          );
        })}
      </ul>
      {student ? (
        <>
          <h3 className="m-0 mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-ui-muted">Your record</h3>
          <dl className="m-0 mt-2 grid grid-cols-2 gap-2 text-xs">
            {[
              ['Year', levelTitle],
              ['Credits', String(school.credits)],
              ['Classes attended', String(school.classesTotal)],
              ['Assignments handed in', String(school.assignmentsDone)],
              ['Current assignment', `${school.assignment}%`],
              ['Clubs', school.clubs.length ? school.clubs.map((id) => CLUBS.find((c) => c.id === id)?.name).join(', ') : 'None yet'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-ui-line/70 p-2.5"><dt className="text-ui-muted">{k}</dt><dd className="m-0 mt-0.5 font-semibold">{v}</dd></div>
            ))}
          </dl>
          <p className="m-0 mt-3 text-xs text-ui-ink/80">Working on: <span className="font-semibold">{assignmentTitle(school.assignmentsDone)}</span>. Each class is worth {CLASS_CREDITS} credits (+1 for notes, +1 for a question); a handed-in assignment {ASSIGNMENT_CREDITS}.</p>
        </>
      ) : (
        <p className="m-0 mt-4 text-sm text-ui-ink/85">You’re visiting. Classes, coursework and records are for students; choose the Student career to enrol.</p>
      )}
    </Shell>
  );
}

/** The cafeteria counter: prices first, paid only when you buy. */
export function CafeteriaPanel({ balance, onBuy, onClose }: { balance: number; onBuy: (id: string) => void; onClose: () => void }) {
  return (
    <Shell title="AYE Cafeteria" onClose={onClose} footer="Meals are paid from your GHAI and eaten here.">
      <ul className="m-0 grid list-none gap-2 p-0">
        {CAFETERIA_MENU.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-ui-line/70 p-3">
            <div>
              <p className="m-0 text-sm font-semibold">{i.name}</p>
              <p className="m-0 text-xs text-ui-muted">+{i.fullness} fullness{i.lift?.energy ? ` · +${i.lift.energy} energy` : ''}</p>
            </div>
            <button type="button" className={btn} disabled={balance < i.price} onClick={() => onBuy(i.id)}>
              {balance < i.price ? 'Not enough GHAI' : `Buy · ${i.price} GHAI`}
            </button>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

/** Clubs on the student centre board: joining is saved on your record. */
export function ClubsPanel({ joined, student, onJoin, onClose }: { joined: readonly string[]; student: boolean; onJoin: (id: string) => void; onClose: () => void }) {
  return (
    <Shell title="Campus clubs" onClose={onClose} footer="Club meetings and events aren’t in the game yet; membership is saved on your record.">
      <ul className="m-0 grid list-none gap-2 p-0">
        {CLUBS.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-ui-line/70 p-3">
            <div>
              <p className="m-0 text-sm font-semibold">{c.name}</p>
              <p className="m-0 text-xs text-ui-muted">{c.about}</p>
            </div>
            {joined.includes(c.id)
              ? <span className="text-xs font-semibold text-ui-accent-strong">Member</span>
              : <button type="button" className={btn} disabled={!student} onClick={() => onJoin(c.id)}>{student ? 'Join' : 'Students only'}</button>}
          </li>
        ))}
      </ul>
    </Shell>
  );
}

/** While you're seated in class: progress, taking part, and getting up. */
export function ClassPanel({ school, minutesLeft, onNotes, onAsk, onFinish, onLeave }: {
  school: SchoolState; minutesLeft: number; onNotes: () => void; onAsk: () => void; onFinish: () => void; onLeave: () => void;
}) {
  const c = school.inClass;
  const slot = classById(c?.classId);
  if (!c || !slot) return null;
  const need = Math.ceil((slot.end - slot.start) * ATTEND_SHARE);
  const pct = Math.min(100, Math.round((c.minutes / need) * 100));
  return (
    <aside aria-label="In class" className="fixed bottom-[9.5rem] left-1/2 z-30 w-[min(26rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-ui-gold/40 bg-[#0d1412]/95 p-4 text-ui-ink shadow-2xl sm:top-[6.5rem]">
      <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-ui-gold-strong">In class · {ROOM_CODE[slot.room] ?? ''} {ROOM_NAMES[slot.room]}</p>
      <p className="m-0 mt-1 font-display text-base font-bold">{slot.course}</p>
      <p className="m-0 text-xs text-ui-muted">{slot.lecturer} · until {hhmm(slot.end)} ({minutesLeft} min left)</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Attendance so far">
        <div className="h-full bg-ui-gold" style={{ width: `${pct}%` }} />
      </div>
      <p className="m-0 mt-1 text-[11px] text-ui-muted">{c.minutes} of {need} minutes needed to count</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className={btn} disabled={c.notes} onClick={onNotes}>{c.notes ? 'Notes taken ✓' : 'Take notes'}</button>
        <button type="button" className={btn} disabled={c.asked} onClick={onAsk}>{c.asked ? 'Question asked ✓' : 'Ask a question'}</button>
        <button type="button" className={btn} disabled={minutesLeft <= 0} onClick={onFinish}>Sit through to the end</button>
        <button type="button" className={btn} onClick={onLeave}>Leave class</button>
      </div>
    </aside>
  );
}
