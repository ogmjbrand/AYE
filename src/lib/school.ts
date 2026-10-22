/**
 * Student life at AYE Global University: the timetable, attending classes,
 * the current assignment and academic records. Pure functions over the game
 * clock (lib/gameState.ts owns the clock and the money); gameState.ts calls
 * these from its reducer so time, pay and progress can never drift apart.
 *
 * Rules:
 *   - Classes run Monday to Friday at fixed times in a fixed room
 *     (TIMETABLE). You can take your seat from CHECK_IN_EARLY minutes before
 *     a class until LATE_LIMIT minutes after it starts.
 *   - While you're seated in class, every game minute on campus counts. When
 *     the class ends, it's recorded as attended if you sat through at least
 *     ATTEND_SHARE of it; each class counts once per day.
 *   - Study (library, computer lab, studying with classmates) takes game time
 *     and moves the current assignment towards 100%. A finished assignment is
 *     handed in once, and the next one starts at 0%.
 *   - Credits are academic progress: CLASS_CREDITS per class attended (+1 for
 *     taking notes, +1 for asking a question) and ASSIGNMENT_CREDITS per
 *     assignment handed in.
 *   - Allowance is the student career's existing hourly pay (HOURLY_WAGE in
 *     gameState.ts): paid for every minute on campus between 09:00 and 17:00,
 *     exactly like any other career's time at work. There is no separate
 *     allowance and no extra money for attending.
 */

export type CampusRoom = 'outside' | 'lobby' | 'corridor' | 'hall-a' | 'lab' | 'library' | 'cafeteria' | 'centre' | 'services' | 'restrooms';

export interface ClassSlot {
  id: string;
  course: string;
  lecturer: string;
  room: CampusRoom;
  /** Start and end, in minutes after midnight. */
  start: number;
  end: number;
}

const at = (h: number, m = 0) => h * 60 + m;

/** The same three classes every weekday. */
export const TIMETABLE: readonly ClassSlot[] = [
  { id: 'gbi', course: 'Global Business & Innovation', lecturer: 'Dr. Funmi Adebayo', room: 'hall-a', start: at(9), end: at(10, 30) },
  { id: 'data', course: 'Data & Programming', lecturer: 'Mr. Kwesi Mensah', room: 'lab', start: at(11), end: at(12, 30) },
  { id: 'writing', course: 'Writing & Research Methods', lecturer: 'Dr. Funmi Adebayo', room: 'hall-a', start: at(14), end: at(15, 30) },
];

export const CHECK_IN_EARLY = 15;
export const LATE_LIMIT = 20;
export const ATTEND_SHARE = 0.6;
export const CLASS_CREDITS = 5;
export const ASSIGNMENT_CREDITS = 10;
export const SCHOOL_START = at(9);
export const SCHOOL_END = at(17);

export const ROOM_NAMES: Record<CampusRoom, string> = {
  outside: 'Campus grounds',
  lobby: 'Main lobby',
  corridor: 'Ground-floor corridor',
  'hall-a': 'Lecture Hall A (G01)',
  lab: 'Computer Laboratory (G05)',
  library: 'Library (G04)',
  cafeteria: 'AYE Cafeteria (G02)',
  centre: 'Student Centre (G08)',
  services: 'Student Services (G07)',
  restrooms: 'Restrooms (G06)',
};

/** What studying is: where, how long, and how far it moves the assignment. */
export type StudyKind = 'library' | 'research' | 'computer' | 'together';
export const STUDY: Record<StudyKind, { label: string; minutes: number; progress: number; rooms: readonly CampusRoom[]; social?: number }> = {
  library: { label: 'Study at a library desk', minutes: 45, progress: 25, rooms: ['library'] },
  research: { label: 'Research on a library computer', minutes: 30, progress: 15, rooms: ['library'] },
  computer: { label: 'Work on your assignment at a lab computer', minutes: 60, progress: 35, rooms: ['lab'] },
  together: { label: 'Study together with classmates', minutes: 30, progress: 15, rooms: ['outside', 'centre'], social: 12 },
};

/** Assignments, handed in one after another. */
export const ASSIGNMENTS: readonly string[] = [
  'Market entry plan for a Lagos start-up',
  'Spreadsheet model of a family budget',
  'Essay: how mobile money changed West Africa',
  'Data report on city transport',
  'Pitch deck for a social enterprise',
];
export const assignmentTitle = (done: number) => ASSIGNMENTS[done % ASSIGNMENTS.length];

export const CLUBS: readonly { id: string; name: string; about: string }[] = [
  { id: 'tech', name: 'Tech Society', about: 'Hackathons and coding nights.' },
  { id: 'fashion', name: 'Fashion Club', about: 'Styling, sewing and the spring show.' },
  { id: 'music', name: 'Music Club', about: 'Afrobeats, highlife and jam sessions.' },
  { id: 'debate', name: 'Debate Union', about: 'Weekly motions and inter-campus contests.' },
];

export interface InClass {
  classId: string;
  /** Game day the class is on. */
  day: number;
  /** Game minutes sat through so far. */
  minutes: number;
  notes: boolean;
  asked: boolean;
}

/** Places that count towards today's goals. */
export type CampusVisit = 'campus' | 'library' | 'cafeteria' | 'students';

export interface SchoolState {
  /** Game day the daily fields below are for. */
  day: number;
  /** Class ids attended (sat through) today. */
  attended: string[];
  inClass: InClass | null;
  classesTotal: number;
  credits: number;
  /** Current assignment, 0–100 %. */
  assignment: number;
  assignmentsDone: number;
  /** Game minutes studied today. */
  studiedToday: number;
  visited: CampusVisit[];
  clubs: string[];
}

export const emptySchool = (): SchoolState => ({
  day: -1, attended: [], inClass: null, classesTotal: 0, credits: 0, assignment: 0, assignmentsDone: 0, studiedToday: 0, visited: [], clubs: [],
});

const dayOf = (totalMinutes: number) => Math.floor(totalMinutes / 1440);
const minuteOfDay = (totalMinutes: number) => ((totalMinutes % 1440) + 1440) % 1440;
/** 0 = Monday … 6 = Sunday, from the game clock. */
export const isSchoolDay = (dayOfWeek: number) => dayOfWeek >= 0 && dayOfWeek <= 4;

/** Starts a fresh day's counters when the day has changed (an unfinished class is dropped). */
export function rollDay(s: SchoolState, totalMinutes: number): SchoolState {
  const day = dayOf(totalMinutes);
  if (s.day === day) return s;
  return { ...s, day, attended: [], studiedToday: 0, visited: [], inClass: s.inClass && s.inClass.day === day ? s.inClass : null };
}

export const classById = (id: string | undefined) => TIMETABLE.find((c) => c.id === id);

/** The class you could take your seat for right now in this room, if any. */
export function classOpenNow(s: SchoolState, totalMinutes: number, dayOfWeek: number, room: CampusRoom): ClassSlot | null {
  if (!isSchoolDay(dayOfWeek)) return null;
  const m = minuteOfDay(totalMinutes);
  const today = rollDay(s, totalMinutes);
  return TIMETABLE.find((c) => c.room === room && m >= c.start - CHECK_IN_EARLY && m <= c.start + LATE_LIMIT && !today.attended.includes(c.id)) ?? null;
}

/** The next class that hasn't finished yet today (or null after the last one, and at weekends). */
export function nextClass(totalMinutes: number, dayOfWeek: number): ClassSlot | null {
  if (!isSchoolDay(dayOfWeek)) return null;
  const m = minuteOfDay(totalMinutes);
  return TIMETABLE.find((c) => m < c.end) ?? null;
}

/** Takes your seat for a class. Refused outside its time window, in the wrong room, or if already attended. */
export function startClass(s: SchoolState, classId: string, room: CampusRoom, totalMinutes: number, dayOfWeek: number): SchoolState {
  const today = rollDay(s, totalMinutes);
  if (today.inClass) return s;
  const open = classOpenNow(today, totalMinutes, dayOfWeek, room);
  if (!open || open.id !== classId) return s;
  return { ...today, inClass: { classId, day: dayOf(totalMinutes), minutes: 0, notes: false, asked: false } };
}

const finish = (s: SchoolState): SchoolState => {
  const c = s.inClass;
  const slot = classById(c?.classId);
  if (!c || !slot) return { ...s, inClass: null };
  const sat = c.minutes >= Math.ceil((slot.end - slot.start) * ATTEND_SHARE);
  if (!sat || s.attended.includes(slot.id)) return { ...s, inClass: null };
  return {
    ...s,
    inClass: null,
    attended: [...s.attended, slot.id],
    classesTotal: s.classesTotal + 1,
    credits: s.credits + CLASS_CREDITS + (c.notes ? 1 : 0) + (c.asked ? 1 : 0),
  };
};

/**
 * One game minute passing (`totalMinutes` is the clock after it). While
 * you're seated in class on campus the minute counts; at the end of the class
 * it's settled. Leaving campus mid-class (onCampus false) ends the session.
 */
export function schoolMinute(s: SchoolState, totalMinutes: number, onCampus: boolean): SchoolState {
  let next = s;
  if (next.inClass) {
    const slot = classById(next.inClass.classId);
    const sameDay = next.inClass.day === dayOf(totalMinutes);
    if (!slot || !sameDay || !onCampus) next = finish(next);
    else {
      const m = minuteOfDay(totalMinutes);
      // The minute that just passed was inside the class
      if (m > slot.start && m <= slot.end) next = { ...next, inClass: { ...next.inClass!, minutes: next.inClass!.minutes + 1 } };
      if (m >= slot.end) next = finish(next);
    }
  }
  return rollDay(next, totalMinutes);
}

/** Gets up and leaves class: settled now (attended only if you'd already sat through enough of it). */
export const leaveClass = (s: SchoolState): SchoolState => (s.inClass ? finish(s) : s);

/** Taking notes or asking a question during class (each once per class). */
export function participate(s: SchoolState, what: 'notes' | 'asked'): SchoolState {
  if (!s.inClass || s.inClass[what]) return s;
  return { ...s, inClass: { ...s.inClass, [what]: true } };
}

/** Minutes left until the current class ends (0 if not in class). */
export function minutesLeftInClass(s: SchoolState, totalMinutes: number): number {
  const slot = classById(s.inClass?.classId);
  if (!slot) return 0;
  return Math.max(0, slot.end - minuteOfDay(totalMinutes));
}

/** After a study session of this kind has taken its time: the assignment moves on. */
export function studied(s: SchoolState, kind: StudyKind): SchoolState {
  const st = STUDY[kind];
  return { ...s, assignment: Math.min(100, s.assignment + st.progress), studiedToday: s.studiedToday + st.minutes };
}

/** Hands in a finished assignment (once): credits, and the next assignment starts. */
export function handIn(s: SchoolState): SchoolState {
  if (s.assignment < 100) return s;
  return { ...s, assignment: 0, assignmentsDone: s.assignmentsDone + 1, credits: s.credits + ASSIGNMENT_CREDITS };
}

export function visit(s: SchoolState, place: CampusVisit, totalMinutes: number): SchoolState {
  const today = rollDay(s, totalMinutes);
  return today.visited.includes(place) ? today : { ...today, visited: [...today.visited, place] };
}

export function joinClub(s: SchoolState, id: string): SchoolState {
  if (!CLUBS.some((c) => c.id === id) || s.clubs.includes(id)) return s;
  return { ...s, clubs: [...s.clubs, id] };
}

/** Classes on today's timetable (none at weekends). */
export const classesToday = (dayOfWeek: number) => (isSchoolDay(dayOfWeek) ? TIMETABLE.length : 0);

const int = (v: unknown, min = 0, max = 1e9) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : min);
const ids = (v: unknown, ok: (x: string) => boolean) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ok(x)))] : []);

/** A saved school record made safe (missing in older saves: a fresh one). */
export function sanitiseSchool(v: unknown): SchoolState {
  if (!v || typeof v !== 'object') return emptySchool();
  const p = v as Record<string, unknown>;
  const c = p.inClass as Record<string, unknown> | null | undefined;
  const inClass = c && typeof c === 'object' && classById(c.classId as string)
    ? { classId: c.classId as string, day: int(c.day, -1), minutes: int(c.minutes, 0, 600), notes: c.notes === true, asked: c.asked === true }
    : null;
  return {
    day: int(p.day, -1),
    attended: ids(p.attended, (x) => !!classById(x)),
    inClass,
    classesTotal: int(p.classesTotal),
    credits: int(p.credits),
    assignment: int(p.assignment, 0, 100),
    assignmentsDone: int(p.assignmentsDone),
    studiedToday: int(p.studiedToday, 0, 1440),
    visited: ids(p.visited, (x) => ['campus', 'library', 'cafeteria', 'students'].includes(x)) as CampusVisit[],
    clubs: ids(p.clubs, (x) => CLUBS.some((c) => c.id === x)),
  };
}

/** Campus cafeteria meals: paid with the normal 'eat' action. */
export const CAFETERIA_MENU: readonly { id: string; name: string; price: number; fullness: number; lift?: { energy?: number; fun?: number } }[] = [
  { id: 'jollof', name: 'Jollof rice & chicken', price: 18, fullness: 45 },
  { id: 'beans', name: 'Beans & plantain', price: 12, fullness: 40 },
  { id: 'wrap', name: 'Chicken wrap', price: 10, fullness: 25 },
  { id: 'fruit', name: 'Fruit cup', price: 5, fullness: 10, lift: { energy: 4 } },
  { id: 'coffee', name: 'Coffee', price: 6, fullness: 2, lift: { energy: 12 } },
];
