/**
 * University student gameplay. Pure rules: attendance, assignments and study
 * are real counters. Pay is not handled here: the reducer runs campus actions
 * through the normal hourly-wage tick, so student income stays in one economy.
 */

export interface ClassSlot {
  id: 'morning' | 'midday' | 'afternoon';
  title: string;
  room: string;
  startHour: number;
  endHour: number;
}

export const CLASS_SLOTS: readonly ClassSlot[] = [
  { id: 'morning', title: 'Introduction to Economics', room: 'Lecture Hall A', startHour: 9, endHour: 11 },
  { id: 'midday', title: 'Creative Writing Seminar', room: 'Lecture Hall A', startHour: 11, endHour: 13 },
  { id: 'afternoon', title: 'Data and Society', room: 'Lecture Hall A', startHour: 14, endHour: 16 },
];

export const CLASS_MINUTES = 60;
export const STUDY_MINUTES = 30;
export const CREDITS_PER_CLASS = 1;
export const CREDITS_TO_GRADUATE = 120;

export interface AssignmentQuestion {
  prompt: string;
  options: string[];
  answer: number;
}

export const ASSIGNMENTS: readonly AssignmentQuestion[] = [
  { prompt: 'When demand rises and supply stays the same, what usually happens to price?', options: ['It falls', 'It rises', 'It stays fixed'], answer: 1 },
  { prompt: 'Which source is strongest for a research essay?', options: ['A peer-reviewed article', 'An anonymous post', 'A rumour'], answer: 0 },
  { prompt: 'What does a budget track?', options: ['Only spending', 'Income and spending', 'Only savings'], answer: 1 },
  { prompt: 'A good thesis statement is...', options: ['A question', 'A clear, arguable claim', 'A quotation'], answer: 1 },
  { prompt: 'What is a sample in a survey?', options: ['The whole population', 'A subset that represents it', 'The final report'], answer: 1 },
];

export interface CampusState {
  /** Day index the daily counters belong to. */
  day: number;
  attended: ClassSlot['id'][];
  assignmentDone: boolean;
  studyMinutesToday: number;
  totalClasses: number;
  totalAssignments: number;
  assignmentsCorrect: number;
  totalStudyMinutes: number;
  credits: number;
}

export function createCampusState(day = 0): CampusState {
  return {
    day,
    attended: [],
    assignmentDone: false,
    studyMinutesToday: 0,
    totalClasses: 0,
    totalAssignments: 0,
    assignmentsCorrect: 0,
    totalStudyMinutes: 0,
    credits: 0,
  };
}

/** Roll the daily counters over when a new day starts; lifetime totals persist. */
export function campusForDay(state: CampusState, day: number): CampusState {
  return state.day === day ? state : { ...state, day, attended: [], assignmentDone: false, studyMinutesToday: 0 };
}

export function assignmentForDay(day: number): AssignmentQuestion {
  return ASSIGNMENTS[((day % ASSIGNMENTS.length) + ASSIGNMENTS.length) % ASSIGNMENTS.length];
}

export type CampusRefusal = 'wrong-place' | 'not-open' | 'already-done' | 'too-late';

export function classWindowState(slot: ClassSlot, minuteOfDay: number): 'upcoming' | 'open' | 'ended' {
  if (minuteOfDay < slot.startHour * 60) return 'upcoming';
  // A class can be joined until 30 minutes before it ends, leaving time for the 60-minute session
  if (minuteOfDay >= slot.endHour * 60 - 30) return 'ended';
  return 'open';
}

export function attendClass(
  state: CampusState,
  slotId: ClassSlot['id'],
  minuteOfDay: number,
  inLectureHall: boolean,
): { result: 'ok'; campus: CampusState } | { result: CampusRefusal } {
  const slot = CLASS_SLOTS.find((entry) => entry.id === slotId);
  if (!slot || !inLectureHall) return { result: 'wrong-place' };
  if (state.attended.includes(slot.id)) return { result: 'already-done' };
  const window = classWindowState(slot, minuteOfDay);
  if (window === 'upcoming') return { result: 'not-open' };
  if (window === 'ended') return { result: 'too-late' };
  return {
    result: 'ok',
    campus: {
      ...state,
      attended: [...state.attended, slot.id],
      totalClasses: state.totalClasses + 1,
      credits: state.credits + CREDITS_PER_CLASS,
    },
  };
}

export function submitAssignment(
  state: CampusState,
  day: number,
  choice: number,
  atDesk: boolean,
): { result: 'ok'; campus: CampusState; correct: boolean } | { result: CampusRefusal } {
  if (!atDesk) return { result: 'wrong-place' };
  if (state.assignmentDone) return { result: 'already-done' };
  const question = assignmentForDay(day);
  if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) return { result: 'wrong-place' };
  const correct = choice === question.answer;
  return {
    result: 'ok',
    correct,
    campus: {
      ...state,
      assignmentDone: true,
      totalAssignments: state.totalAssignments + 1,
      assignmentsCorrect: state.assignmentsCorrect + (correct ? 1 : 0),
    },
  };
}

export function studySession(
  state: CampusState,
  atLibrary: boolean,
): { result: 'ok'; campus: CampusState } | { result: CampusRefusal } {
  if (!atLibrary) return { result: 'wrong-place' };
  return {
    result: 'ok',
    campus: {
      ...state,
      studyMinutesToday: state.studyMinutesToday + STUDY_MINUTES,
      totalStudyMinutes: state.totalStudyMinutes + STUDY_MINUTES,
    },
  };
}

export function assignmentAverage(state: CampusState): number | null {
  return state.totalAssignments === 0 ? null : Math.round((state.assignmentsCorrect / state.totalAssignments) * 100);
}

export type AcademicStanding = 'New student' | 'Good standing' | 'Honours track' | 'Needs attention';

export function academicStanding(state: CampusState): AcademicStanding {
  const average = assignmentAverage(state);
  if (average === null) return 'New student';
  if (average >= 80 && state.totalClasses >= 6) return 'Honours track';
  if (average < 40) return 'Needs attention';
  return 'Good standing';
}

export function sanitiseCampus(raw: unknown): CampusState {
  const base = createCampusState();
  if (!raw || typeof raw !== 'object') return base;
  const p = raw as Record<string, unknown>;
  const int = (value: unknown, max: number) =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : 0;
  const ids = new Set(CLASS_SLOTS.map((slot) => slot.id));
  const attended = Array.isArray(p.attended)
    ? [...new Set(p.attended.filter((id): id is ClassSlot['id'] => typeof id === 'string' && ids.has(id as ClassSlot['id'])))]
    : [];
  const totalAssignments = int(p.totalAssignments, 1_000_000);
  return {
    day: int(p.day, 1_000_000),
    attended,
    assignmentDone: p.assignmentDone === true,
    studyMinutesToday: int(p.studyMinutesToday, 1440),
    totalClasses: int(p.totalClasses, 1_000_000),
    totalAssignments,
    assignmentsCorrect: Math.min(int(p.assignmentsCorrect, 1_000_000), totalAssignments),
    totalStudyMinutes: int(p.totalStudyMinutes, 100_000_000),
    credits: int(p.credits, 1_000_000),
  };
}
