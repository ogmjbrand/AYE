/**
 * Hospital doctor shift. Pure rules for clocking in, briefing, patients and clocking out.
 * Pay is not handled here: the reducer runs hospital actions through the normal
 * hourly-wage tick (doctor wage), so there is no second economy.
 */

export const HOSPITAL_PATIENTS_PER_SHIFT = 4;
export const PATIENT_MINUTES = 30;
export const BRIEFING_MINUTES = 15;
export const FIRST_CLOCK_IN_MINUTE = 9 * 60;
export const LAST_CLOCK_IN_MINUTE = 15 * 60;

export interface TriageCase {
  patient: string;
  complaint: string;
  options: string[];
  answer: number;
  note: string;
}

export const TRIAGE_CASES: readonly TriageCase[] = [
  { patient: 'Mr. Adeyemi', complaint: 'Crushing chest pain spreading to his left arm, sweating.', options: ['Send him home to rest', 'Urgent ECG and cardiology', 'Give a painkiller and wait'], answer: 1, note: 'Possible heart attack: needs an immediate ECG.' },
  { patient: 'Amaka', complaint: 'Mild sore throat for two days, no fever, eating normally.', options: ['Routine advice and fluids', 'Emergency surgery', 'Admit to intensive care'], answer: 0, note: 'Self-limiting; advise fluids and rest.' },
  { patient: 'Tunde', complaint: 'Fell from a bike, wrist swollen and bent at an odd angle.', options: ['Ignore it', 'X-ray and splint the wrist', 'Prescribe antibiotics'], answer: 1, note: 'Suspected fracture: X-ray and immobilise.' },
  { patient: 'Ngozi', complaint: 'Child with a high fever, stiff neck and a rash that does not fade.', options: ['Send home with paracetamol', 'Treat as an emergency, suspected meningitis', 'Book a routine appointment'], answer: 1, note: 'Red-flag signs: treat as an emergency.' },
  { patient: 'Mrs. Bello', complaint: 'Routine blood pressure check, feels well.', options: ['Measure, record and give lifestyle advice', 'Admit overnight', 'Start emergency treatment'], answer: 0, note: 'A routine check needs measurement and advice.' },
  { patient: 'Chidi', complaint: 'Deep kitchen cut on his hand, bleeding steadily.', options: ['Clean, apply pressure and suture', 'Tell him to wait a week', 'Prescribe a cough syrup'], answer: 0, note: 'Control bleeding, clean and close the wound.' },
];

export interface HospitalState {
  /** Day index the daily counters belong to. */
  day: number;
  onShift: boolean;
  shiftStartMinute: number;
  briefed: boolean;
  /** Patient case indices already treated this shift. */
  treated: number[];
  patientsToday: number;
  shiftsCompleted: number;
  totalPatients: number;
  totalCorrect: number;
}

export function createHospitalState(day = 0): HospitalState {
  return {
    day,
    onShift: false,
    shiftStartMinute: 0,
    briefed: false,
    treated: [],
    patientsToday: 0,
    shiftsCompleted: 0,
    totalPatients: 0,
    totalCorrect: 0,
  };
}

/** A new day ends any shift left open overnight; lifetime totals persist. */
export function hospitalForDay(state: HospitalState, day: number): HospitalState {
  return state.day === day ? state : { ...state, day, onShift: false, briefed: false, treated: [], patientsToday: 0 };
}

export type HospitalRefusal = 'wrong-place' | 'not-open' | 'already-on-shift' | 'no-shift' | 'already-done' | 'not-ready' | 'too-late';

export function clockIn(
  state: HospitalState,
  minuteOfDay: number,
  atReception: boolean,
): { result: 'ok'; hospital: HospitalState } | { result: HospitalRefusal } {
  if (!atReception) return { result: 'wrong-place' };
  if (state.onShift) return { result: 'already-on-shift' };
  if (minuteOfDay < FIRST_CLOCK_IN_MINUTE) return { result: 'not-open' };
  if (minuteOfDay > LAST_CLOCK_IN_MINUTE) return { result: 'too-late' };
  return { result: 'ok', hospital: { ...state, onShift: true, shiftStartMinute: minuteOfDay, briefed: false, treated: [], patientsToday: 0 } };
}

export function brief(
  state: HospitalState,
  atSupervisor: boolean,
): { result: 'ok'; hospital: HospitalState } | { result: HospitalRefusal } {
  if (!atSupervisor) return { result: 'wrong-place' };
  if (!state.onShift) return { result: 'no-shift' };
  if (state.briefed) return { result: 'already-done' };
  return { result: 'ok', hospital: { ...state, briefed: true } };
}

/** The next patient waiting: cases rotate by day so each shift differs. */
export function nextPatientIndex(state: HospitalState, day: number): number | null {
  if (state.treated.length >= HOSPITAL_PATIENTS_PER_SHIFT) return null;
  for (let step = 0; step < TRIAGE_CASES.length; step++) {
    const index = (day * HOSPITAL_PATIENTS_PER_SHIFT + state.treated.length + step) % TRIAGE_CASES.length;
    if (!state.treated.includes(index)) return index;
  }
  return null;
}

export function treatPatient(
  state: HospitalState,
  day: number,
  choice: number,
  atWard: boolean,
): { result: 'ok'; hospital: HospitalState; correct: boolean; note: string } | { result: HospitalRefusal } {
  if (!atWard) return { result: 'wrong-place' };
  if (!state.onShift) return { result: 'no-shift' };
  if (!state.briefed) return { result: 'not-ready' };
  const index = nextPatientIndex(state, day);
  if (index === null) return { result: 'already-done' };
  const triage = TRIAGE_CASES[index];
  if (!Number.isInteger(choice) || choice < 0 || choice >= triage.options.length) return { result: 'wrong-place' };
  const correct = choice === triage.answer;
  return {
    result: 'ok',
    correct,
    note: triage.note,
    hospital: {
      ...state,
      treated: [...state.treated, index],
      patientsToday: state.patientsToday + 1,
      totalPatients: state.totalPatients + 1,
      totalCorrect: state.totalCorrect + (correct ? 1 : 0),
    },
  };
}

export function clockOut(
  state: HospitalState,
  atReception: boolean,
): { result: 'ok'; hospital: HospitalState; completed: boolean } | { result: HospitalRefusal } {
  if (!atReception) return { result: 'wrong-place' };
  if (!state.onShift) return { result: 'no-shift' };
  const completed = state.patientsToday >= HOSPITAL_PATIENTS_PER_SHIFT;
  return {
    result: 'ok',
    completed,
    hospital: {
      ...state,
      onShift: false,
      briefed: false,
      treated: [],
      shiftsCompleted: state.shiftsCompleted + (completed ? 1 : 0),
    },
  };
}

export function diagnosisAccuracy(state: HospitalState): number | null {
  return state.totalPatients === 0 ? null : Math.round((state.totalCorrect / state.totalPatients) * 100);
}

export function sanitiseHospital(raw: unknown): HospitalState {
  const base = createHospitalState();
  if (!raw || typeof raw !== 'object') return base;
  const p = raw as Record<string, unknown>;
  const int = (value: unknown, max: number) =>
    typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : 0;
  const treated = Array.isArray(p.treated)
    ? [...new Set(p.treated.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < TRIAGE_CASES.length))]
    : [];
  const totalPatients = int(p.totalPatients, 1_000_000);
  return {
    day: int(p.day, 1_000_000),
    onShift: p.onShift === true,
    shiftStartMinute: int(p.shiftStartMinute, 1440),
    briefed: p.briefed === true && p.onShift === true,
    treated: p.onShift === true ? treated.slice(0, HOSPITAL_PATIENTS_PER_SHIFT) : [],
    patientsToday: p.onShift === true ? Math.min(int(p.patientsToday, HOSPITAL_PATIENTS_PER_SHIFT), treated.length) : 0,
    shiftsCompleted: int(p.shiftsCompleted, 1_000_000),
    totalPatients,
    totalCorrect: Math.min(int(p.totalCorrect, 1_000_000), totalPatients),
  };
}
