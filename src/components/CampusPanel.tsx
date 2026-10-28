import { useEffect } from 'react';
import { X } from 'lucide-react';
import {
  CLASS_MINUTES,
  CLASS_SLOTS,
  CREDITS_TO_GRADUATE,
  STUDY_MINUTES,
  academicStanding,
  assignmentAverage,
  assignmentForDay,
  classWindowState,
  type CampusState,
  type ClassSlot,
} from '../lib/campus';
import { formatGameTime, type GameTime } from '../lib/gameState';

export type CampusPanelMode = 'info' | 'lecture' | 'study' | 'assignment' | 'services' | 'centre';

interface CampusPanelProps {
  mode: CampusPanelMode;
  campus: CampusState;
  time: GameTime;
  day: number;
  inLectureHall: boolean;
  onAttend: (slot: ClassSlot['id']) => void;
  onStudy: () => void;
  onNotes: () => void;
  onRelax: () => void;
  onAnswer: (choice: number) => void;
  onClose: () => void;
}

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-ui-accent bg-ui-accent px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-accent';
const secondaryClass =
  'inline-flex min-h-11 items-center justify-center rounded-lg border border-ui-line px-4 py-2 text-sm font-semibold text-ui-ink transition active:scale-[0.98] hover:border-ui-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent';

const TITLES: Record<CampusPanelMode, string> = {
  info: 'University directory',
  lecture: 'Lecture hall',
  study: 'Library · study & research',
  assignment: 'Computer lab',
  services: 'Student services',
  centre: 'Student centre',
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ui-line p-3">
      <p className="m-0 text-xs uppercase tracking-[0.12em] text-ui-muted">{label}</p>
      <p className="m-0 mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

export function CampusPanel({ mode, campus, time, day, inLectureHall, onAttend, onStudy, onNotes, onRelax, onAnswer, onClose }: CampusPanelProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const minuteOfDay = time.hour * 60 + time.minute;
  const average = assignmentAverage(campus);
  const question = assignmentForDay(day);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-3 sm:items-center" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="campus-panel-title"
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-ui-line bg-ui-panel p-5 text-ui-ink shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-ui-muted">
              AYE Global University · {formatGameTime(time)}
            </p>
            <h2 id="campus-panel-title" className="m-0 mt-1 font-display text-2xl font-bold">{TITLES[mode]}</h2>
          </div>
          <button type="button" className={secondaryClass} aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        {mode === 'info' && (
          <div className="grid gap-2">
            {[
              ['Lecture Halls', 'Back left · attend classes'],
              ['Library', 'Back right · study and research'],
              ['Computer Lab', 'Library front row · assignments'],
              ['Cafeteria', 'Back centre · buy lunch'],
              ['Student Centre', 'Front right · events and lounge'],
              ['Administration', 'Front left · timetable, records, support'],
            ].map(([name, where]) => (
              <div key={name} className="flex items-center justify-between gap-3 rounded-lg border border-ui-line p-3">
                <p className="m-0 font-semibold">{name}</p>
                <p className="m-0 text-xs text-ui-muted">{where}</p>
              </div>
            ))}
          </div>
        )}

        {mode === 'services' && (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Standing" value={academicStanding(campus)} />
              <Stat label="Credits" value={`${campus.credits} / ${CREDITS_TO_GRADUATE}`} />
              <Stat label="Classes today" value={`${campus.attended.length} / ${CLASS_SLOTS.length}`} />
              <Stat label="Assignment avg" value={average === null ? 'None yet' : `${average}%`} />
              <Stat label="Classes attended" value={String(campus.totalClasses)} />
              <Stat label="Study hours" value={(campus.totalStudyMinutes / 60).toFixed(1)} />
            </div>
            <div className="grid gap-2">
              <p className="m-0 text-xs uppercase tracking-[0.12em] text-ui-muted">Timetable</p>
              {CLASS_SLOTS.map((slot) => (
                <p key={slot.id} className="m-0 text-sm">
                  {String(slot.startHour).padStart(2, '0')}:00–{String(slot.endHour).padStart(2, '0')}:00 · {slot.title} · {slot.room}
                  {campus.attended.includes(slot.id) ? ' ✓' : ''}
                </p>
              ))}
            </div>
            <p className="m-0 text-sm text-ui-muted">
              Support: join a class while it is open, submit one assignment a day at the computer lab, and study in the library.
              Students are paid the normal hourly wage while on campus between 09:00 and 17:00.
            </p>
          </div>
        )}

        {mode === 'centre' && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <p className="m-0 text-xs uppercase tracking-[0.12em] text-ui-muted">Campus events</p>
              {['Fashion Club · Mon 17:00', 'Tech Society · Wed 16:00', 'Music Club · Thu 18:00', 'Volunteer Group · Sat 10:00'].map((event) => (
                <p key={event} className="m-0 rounded-lg border border-ui-line p-3 text-sm">{event}</p>
              ))}
            </div>
            <button type="button" className={buttonClass} onClick={onRelax}>Sit with classmates (15 min)</button>
          </div>
        )}

        {mode === 'lecture' && (
          <div className="grid gap-3">
            {inLectureHall && campus.attended.length > 0 && (
              <button type="button" className={secondaryClass} onClick={onNotes}>Take notes ({STUDY_MINUTES} min, counts as study)</button>
            )}
            {CLASS_SLOTS.map((slot) => {
              const done = campus.attended.includes(slot.id);
              const window = classWindowState(slot, minuteOfDay);
              const label = done ? 'Attended' : window === 'upcoming' ? 'Not yet open' : window === 'ended' ? 'Missed' : `Attend (${CLASS_MINUTES} min)`;
              return (
                <div key={slot.id} className="flex items-center justify-between gap-3 rounded-lg border border-ui-line p-3">
                  <div>
                    <p className="m-0 font-semibold">{slot.title}</p>
                    <p className="m-0 text-xs text-ui-muted">
                      {slot.room} · {String(slot.startHour).padStart(2, '0')}:00–{String(slot.endHour).padStart(2, '0')}:00
                    </p>
                  </div>
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={done || window !== 'open' || !inLectureHall}
                    onClick={() => onAttend(slot.id)}
                  >
                    {label}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {mode === 'study' && (
          <div className="grid gap-4">
            <p className="m-0 text-sm text-ui-muted">
              Studied today: {campus.studyMinutesToday} min. Each session takes {STUDY_MINUTES} minutes of game time.
            </p>
            <button type="button" className={buttonClass} onClick={onStudy}>Study for {STUDY_MINUTES} minutes</button>
            <button type="button" className={secondaryClass} onClick={onStudy}>Research for {STUDY_MINUTES} minutes</button>
          </div>
        )}

        {mode === 'assignment' && (
          campus.assignmentDone ? (
            <p className="m-0 text-sm text-ui-muted">Today&apos;s assignment is already submitted. A new one arrives tomorrow.</p>
          ) : (
            <div className="grid gap-3">
              <p className="m-0 font-semibold">{question.prompt}</p>
              {question.options.map((option, index) => (
                <button key={option} type="button" className={secondaryClass} onClick={() => onAnswer(index)}>
                  {option}
                </button>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}
