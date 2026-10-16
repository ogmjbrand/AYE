/**
 * Career progression: every career has a ladder of job titles. Hours worked
 * at the workplace build experience; each rung raises the hourly wage.
 * Promotions are announced in the morning summary.
 */
import type { Career } from '../components/CharacterCreation';

export interface CareerLevel {
  title: string;
  /** Total hours worked needed to reach this level. */
  hours: number;
  /** Multiplies the career's base hourly wage. */
  pay: number;
}

/** Hours and pay shared by every ladder: about 2, 5, 10 and 20 working days of 8 hours. */
const RUNGS = [
  { hours: 0, pay: 1 },
  { hours: 16, pay: 1.15 },
  { hours: 40, pay: 1.35 },
  { hours: 80, pay: 1.6 },
  { hours: 160, pay: 2 },
] as const;

const TITLES: Record<Exclude<Career, 'none'>, readonly [string, string, string, string, string]> = {
  student: ['Fresher', 'Second-year student', 'Final-year student', 'Graduate student', 'Doctoral researcher'],
  artist: ['Studio assistant', 'Junior artist', 'Exhibiting artist', 'Established artist', 'Master artist'],
  entrepreneur: ['Side hustler', 'Founder', 'Funded founder', 'Chief executive', 'Serial entrepreneur'],
  athlete: ['Trialist', 'Squad player', 'First-team regular', 'Team captain', 'National team star'],
  engineer: ['Graduate engineer', 'Engineer', 'Senior engineer', 'Lead engineer', 'Principal engineer'],
  doctor: ['House officer', 'Resident doctor', 'Registrar', 'Senior registrar', 'Consultant'],
  pilot: ['Cadet pilot', 'Second officer', 'First officer', 'Captain', 'Training captain'],
};

export function careerLadder(career: Career): CareerLevel[] {
  if (career === 'none') return [{ title: 'Undecided', hours: 0, pay: 0 }];
  return RUNGS.map((r, i) => ({ ...r, title: TITLES[career][i] }));
}

/** Index of the level reached after this many worked minutes. */
export function levelIndex(career: Career, workMinutes: number): number {
  const ladder = careerLadder(career);
  let i = 0;
  while (i + 1 < ladder.length && workMinutes >= ladder[i + 1].hours * 60) i++;
  return i;
}

export const careerLevel = (career: Career, workMinutes: number) => careerLadder(career)[levelIndex(career, workMinutes)];

/** Hours still to work for the next promotion, or null at the top. */
export function hoursToNextLevel(career: Career, workMinutes: number): number | null {
  const ladder = careerLadder(career);
  const next = ladder[levelIndex(career, workMinutes) + 1];
  return next ? Math.max(0, Math.ceil(next.hours - workMinutes / 60)) : null;
}
