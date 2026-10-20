import type { GameTime } from './gameState';
import type { Furniture, Interior } from './interiors';
import { USE_RADIUS } from './interiors';
import type { Seat } from './seating';

export const OFFICE_WORKPLACE = {
  districtId: 'lagos.marina',
  name: 'Marina Business Centre',
  position: [5.5, 0, 12] as const,
  radius: 3.2,
};

const furniture = (
  kind: Furniture['kind'],
  x: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  color: string,
  elevation = 0,
  rotation = 0,
): Furniture => ({ kind, at: [x, z], size: [width, height, depth], color, elevation, rotation });

export const OFFICE_INTERIOR: Interior = {
  tier: 'flat',
  width: 14,
  depth: 10,
  wallColor: '#dedbd2',
  floorColor: '#8d8171',
  window: 'wide',
  partitions: [],
  furniture: [
    furniture('reception', 0, -2.65, 1.8, 1.05, 0.8, '#534a3d'),
    furniture('desk', -3.1, 1.85, 2.5, 0.76, 1.35, '#755a43'),
    furniture('computer', -3.1, 1.85, 1, 0.68, 0.72, '#343b3e', 0.76),
    furniture('chair', -3.1, 3.8, 0.68, 0.92, 0.68, '#49545c', 0, Math.PI),
    furniture('file-cabinet', -3.1, -0.55, 0.95, 1.25, 0.8, '#778087'),
    furniture('conference-table', 2.7, 1.6, 3.4, 0.78, 1.55, '#765b43'),
    furniture('chair', 2.7, -0.4, 0.68, 0.92, 0.68, '#49545c', 0, 0),
    furniture('chair', 1.2, 2.85, 0.68, 0.92, 0.68, '#49545c', 0, Math.PI),
    furniture('chair', 4.2, 2.85, 0.68, 0.92, 0.68, '#49545c', 0, Math.PI),
    furniture('whiteboard', 0, 4.65, 3.4, 1.45, 0.12, '#e9e8df'),
    furniture('plant', 5.35, 3.8, 0.65, 1.35, 0.65, '#52784b'),
    furniture('counter', 5.25, -2.1, 1.65, 0.92, 0.78, '#c7c2b6'),
    furniture('sofa', 4.95, -3.75, 2.25, 0.82, 0.9, '#465255'),
    furniture('table', 3.25, -3.15, 0.9, 0.42, 0.6, '#735b45'),
  ],
};

export const OFFICE_TASK_SEATS: Readonly<Partial<Record<OfficeTaskId, Seat>>> = {
  computer: { id: 'office-computer-chair', x: -3.1, z: 3.8, facing: Math.PI, height: 0.45 },
  meeting: { id: 'office-meeting-chair', x: 2.7, z: -0.4, facing: 0, height: 0.45 },
};

export type OfficeInteraction = 'door' | 'reception' | OfficeTaskId;

const INTERACTION_FURNITURE: Partial<Record<Furniture['kind'], OfficeInteraction>> = {
  reception: 'reception',
  desk: 'computer',
  'file-cabinet': 'documents',
  'conference-table': 'meeting',
};

export function officeInteractionAt(interior: Interior, x: number, z: number): OfficeInteraction | null {
  const doorX = 0;
  const doorZ = -interior.depth / 2 + 0.7;
  if (Math.hypot(x - doorX, z - doorZ) <= USE_RADIUS) return 'door';
  let nearest: { action: OfficeInteraction; distance: number } | null = null;
  for (const item of interior.furniture) {
    const action = INTERACTION_FURNITURE[item.kind];
    if (!action) continue;
    const dx = Math.max(Math.abs(x - item.at[0]) - item.size[0] / 2, 0);
    const dz = Math.max(Math.abs(z - item.at[1]) - item.size[2] / 2, 0);
    const distance = Math.hypot(dx, dz);
    if (distance <= USE_RADIUS && (!nearest || distance < nearest.distance)) nearest = { action, distance };
  }
  return nearest?.action ?? null;
}

export const OFFICE_SHIFT_START_MINUTE = 9 * 60;
export const OFFICE_LAST_CLOCK_IN_MINUTE = 15 * 60;
export const OFFICE_TASK_MINUTES = 15;
export const OFFICE_TASK_PAY = 250;
export const OFFICE_SALARY_BY_LEVEL = [OFFICE_TASK_PAY, 300, 350, 425, 525] as const;
export const OFFICE_DEDUCTIONS = 0;

export type OfficeTaskId = 'computer' | 'documents' | 'meeting';
export type OfficePerformance = 'excellent' | 'needs-review';

export interface OfficeChallenge {
  title: string;
  prompt: string;
  instruction: string;
  choices: readonly [string, string, string];
  correctIndex: number;
}

const CHALLENGES: Record<OfficeTaskId, OfficeChallenge> = {
  computer: {
    title: 'Prioritise the inbox',
    prompt: 'A client deadline is today, a teammate needs routine feedback, and a newsletter arrived.',
    instruction: 'Which item should you handle first?',
    choices: ['Confirm the client deadline and send the required update', 'Read the newsletter', 'Leave everything until the end of the day'],
    correctIndex: 0,
  },
  documents: {
    title: 'Process an invoice',
    prompt: 'Invoice 1842 is for Marina Supplies, dated 18 October, for 4,250 ⓒ.',
    instruction: 'Choose the record that matches all the invoice details.',
    choices: [
      'Marina Supplies · 18 October · 4,250 ⓒ',
      'Marina Supplies · 18 October · 4,520 ⓒ',
      'Marina Services · 18 October · 4,250 ⓒ',
    ],
    correctIndex: 0,
  },
  meeting: {
    title: 'Team stand-up',
    prompt: 'The team has one urgent deadline and two people waiting on the same shared resource.',
    instruction: 'Choose a useful next step for the team.',
    choices: [
      'Agree the deadline owner, share the resource schedule, and record the next action',
      'End the meeting without assigning actions',
      'Let everyone compete for the resource',
    ],
    correctIndex: 0,
  },
};

export const officeChallenge = (taskId: OfficeTaskId): OfficeChallenge => CHALLENGES[taskId];

export interface OfficeTaskProgress {
  completed: boolean;
  attempts: number;
  performance: OfficePerformance | null;
}

export interface OfficeShiftRecord {
  id: string;
  day: number;
  startedAt: number;
  completedAt: number | null;
  tasks: Record<OfficeTaskId, OfficeTaskProgress>;
  grossPay: number;
  deductions: number;
  netPay: number;
}

export interface OfficeSkills {
  computer: number;
  organization: number;
  teamwork: number;
}

export interface OfficeCareerState {
  employed: boolean;
  jobTitle: string;
  careerLevel: number;
  salaryPerTask: number;
  achievements: string[];
  skills: OfficeSkills;
  activeShift: OfficeShiftRecord | null;
  completedShifts: OfficeShiftRecord[];
  paidShiftIds: string[];
}

export type OfficeActionResult = 'ok' | 'wrong-place' | 'already-employed' | 'not-employed' | 'shift-active' | 'no-shift' | 'outside-hours' | 'already-worked' | 'task-unavailable' | 'already-paid' | 'tasks-incomplete' | 'wrong-answer' | 'task-completed';

export function createOfficeCareer(): OfficeCareerState {
  return {
    employed: false,
    jobTitle: 'Office Assistant',
    careerLevel: 1,
    salaryPerTask: OFFICE_TASK_PAY,
    achievements: [],
    skills: { computer: 0, organization: 0, teamwork: 0 },
    activeShift: null,
    completedShifts: [],
    paidShiftIds: [],
  };
}

export function officeJobTitle(completedShiftCount: number): string {
  if (completedShiftCount >= 60) return 'Executive Director';
  if (completedShiftCount >= 30) return 'Operations Manager';
  if (completedShiftCount >= 15) return 'Office Coordinator';
  if (completedShiftCount >= 5) return 'Administrative Associate';
  return 'Office Assistant';
}

export function officeCareerLevel(completedShiftCount: number): number {
  if (completedShiftCount >= 60) return 5;
  if (completedShiftCount >= 30) return 4;
  if (completedShiftCount >= 15) return 3;
  if (completedShiftCount >= 5) return 2;
  return 1;
}

export function canClockIntoOffice(time: GameTime): boolean {
  const minute = time.hour * 60 + time.minute;
  return minute >= OFFICE_SHIFT_START_MINUTE && minute < OFFICE_LAST_CLOCK_IN_MINUTE;
}

export function officeTaskId(value: string): value is OfficeTaskId {
  return value === 'computer' || value === 'documents' || value === 'meeting';
}

export function sanitiseOfficeCareer(value: unknown): OfficeCareerState {
  if (typeof value !== 'object' || value === null) return createOfficeCareer();
  const data = value as Record<string, unknown>;
  const skills = typeof data.skills === 'object' && data.skills !== null ? data.skills as Record<string, unknown> : {};
  const count = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? n : 0;
  const savedLevel = count(data.careerLevel);
  const paidShiftIds = Array.isArray(data.paidShiftIds)
    ? [...new Set(data.paidShiftIds.filter((id): id is string => typeof id === 'string' && id.length <= 100))]
    : [];
  const completedShifts = Array.isArray(data.completedShifts)
    ? data.completedShifts.filter((shift): shift is OfficeShiftRecord => isValidShift(shift) && paidShiftIds.includes(shift.id)).slice(-60)
    : [];
  const activeShift = isValidShift(data.activeShift) && !paidShiftIds.includes(data.activeShift.id)
    ? data.activeShift
    : null;
  const careerLevel = Math.max(1, Math.min(5, savedLevel || officeCareerLevel(completedShifts.length)));
  return {
    employed: data.employed === true,
    jobTitle: officeJobTitle(careerLevel === 5 ? 60 : careerLevel === 4 ? 30 : careerLevel === 3 ? 15 : careerLevel === 2 ? 5 : 0),
    careerLevel,
    salaryPerTask: typeof data.salaryPerTask === 'number' && Number.isInteger(data.salaryPerTask)
      && data.salaryPerTask >= 1 && data.salaryPerTask <= 100_000
      ? data.salaryPerTask
      : OFFICE_SALARY_BY_LEVEL[careerLevel - 1],
    achievements: Array.isArray(data.achievements)
      ? [...new Set(data.achievements.filter((item): item is string => typeof item === 'string' && item.length <= 80))].slice(-50)
      : [],
    skills: {
      computer: count(skills.computer),
      organization: count(skills.organization),
      teamwork: count(skills.teamwork),
    },
    activeShift,
    completedShifts,
    paidShiftIds,
  };
}

function isValidShift(value: unknown): value is OfficeShiftRecord {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  if (
    typeof s.id !== 'string' || !Number.isInteger(s.day) || (s.day as number) < 0
    || !Number.isInteger(s.startedAt) || (s.startedAt as number) < 0
    || (s.completedAt !== null && (!Number.isInteger(s.completedAt) || (s.completedAt as number) < 0))
    || !Number.isInteger(s.grossPay) || (s.grossPay as number) < 0
    || !Number.isInteger(s.deductions) || (s.deductions as number) < 0
    || !Number.isInteger(s.netPay) || (s.netPay as number) < 0
    || typeof s.tasks !== 'object' || s.tasks === null
  ) return false;
  const tasks = s.tasks as Record<string, unknown>;
  return (['computer', 'documents', 'meeting'] as const).every((id) => {
    const task = tasks[id];
    return typeof task === 'object' && task !== null
      && typeof (task as Record<string, unknown>).completed === 'boolean'
      && Number.isInteger((task as Record<string, unknown>).attempts)
      && ((task as Record<string, unknown>).attempts as number) >= 0
      && ((task as Record<string, unknown>).performance === null
        || (task as Record<string, unknown>).performance === 'excellent'
        || (task as Record<string, unknown>).performance === 'needs-review');
  });
}

export function officeShiftClockIn(
  career: OfficeCareerState,
  day: number,
  totalMinutes: number,
  time: GameTime,
  atOffice: boolean,
): { career: OfficeCareerState; result: OfficeActionResult } {
  if (!atOffice) return { career, result: 'wrong-place' };
  if (!career.employed) return { career, result: 'not-employed' };
  if (career.activeShift) return { career, result: 'shift-active' };
  if (!canClockIntoOffice(time)) return { career, result: 'outside-hours' };
  if (career.completedShifts.some((shift) => shift.day === day)) return { career, result: 'already-worked' };
  const id = `${OFFICE_WORKPLACE.districtId}:office:${day}`;
  if (career.paidShiftIds.includes(id)) return { career, result: 'already-paid' };
  return {
    result: 'ok',
    career: {
      ...career,
      activeShift: {
        id,
        day,
        startedAt: totalMinutes,
        completedAt: null,
        tasks: {
          computer: { completed: false, attempts: 0, performance: null },
          documents: { completed: false, attempts: 0, performance: null },
          meeting: { completed: false, attempts: 0, performance: null },
        },
        grossPay: 0,
        deductions: OFFICE_DEDUCTIONS,
        netPay: 0,
      },
    },
  };
}

export function officeTaskAnswer(
  career: OfficeCareerState,
  taskId: OfficeTaskId,
  choice: number,
  atOffice: boolean,
): { career: OfficeCareerState; result: OfficeActionResult } {
  if (!atOffice) return { career, result: 'wrong-place' };
  const shift = career.activeShift;
  if (!shift) return { career, result: 'no-shift' };
  const task = shift.tasks[taskId];
  if (task.completed) return { career, result: 'task-completed' };
  const challenge = officeChallenge(taskId);
  if (!Number.isInteger(choice) || choice < 0 || choice >= challenge.choices.length) {
    return { career, result: 'wrong-answer' };
  }
  const performance = choice === challenge.correctIndex ? 'excellent' : 'needs-review';
  const nextTask = {
    ...task,
    attempts: task.attempts + 1,
    ...(performance === 'excellent' ? {
      completed: true,
      performance: task.attempts === 0 ? 'excellent' as const : 'needs-review' as const,
    } : {}),
  };
  return {
    result: performance === 'excellent' ? 'ok' : 'wrong-answer',
    career: {
      ...career,
      activeShift: { ...shift, tasks: { ...shift.tasks, [taskId]: nextTask } },
      ...(performance === 'excellent' ? {
        skills: {
          ...career.skills,
          ...(taskId === 'computer' ? { computer: career.skills.computer + 1 } : {}),
          ...(taskId === 'documents' ? { organization: career.skills.organization + 1 } : {}),
          ...(taskId === 'meeting' ? { teamwork: career.skills.teamwork + 1 } : {}),
        },
      } : {}),
    },
  };
}

export function officeShiftClockOut(
  career: OfficeCareerState,
  totalMinutes: number,
  atOffice: boolean,
): { career: OfficeCareerState; result: OfficeActionResult; payment: number } {
  if (!atOffice) return { career, result: 'wrong-place', payment: 0 };
  const shift = career.activeShift;
  if (!shift) return { career, result: 'no-shift', payment: 0 };
  if (Object.values(shift.tasks).some((task) => !task.completed)) return { career, result: 'tasks-incomplete', payment: 0 };
  if (career.paidShiftIds.includes(shift.id)) return { career, result: 'already-paid', payment: 0 };
  const grossPay = Object.values(shift.tasks).filter((task) => task.completed).length * career.salaryPerTask;
  const completed = { ...shift, completedAt: totalMinutes, grossPay, deductions: OFFICE_DEDUCTIONS, netPay: grossPay - OFFICE_DEDUCTIONS };
  return {
    career: {
      ...career,
      jobTitle: officeJobTitle(career.completedShifts.length + 1),
      careerLevel: officeCareerLevel(career.completedShifts.length + 1),
      salaryPerTask: OFFICE_SALARY_BY_LEVEL[officeCareerLevel(career.completedShifts.length + 1) - 1],
      achievements: [...new Set([
        ...career.achievements,
        ...(career.completedShifts.length === 0 ? ['first-shift'] : []),
        ...(career.completedShifts.length + 1 === 5 ? ['administrative-associate'] : []),
        ...(career.completedShifts.length + 1 === 15 ? ['office-coordinator'] : []),
        ...(career.completedShifts.length + 1 === 30 ? ['operations-manager'] : []),
        ...(career.completedShifts.length + 1 === 60 ? ['executive-director'] : []),
      ])],
      activeShift: null,
      completedShifts: [...career.completedShifts, completed].slice(-60),
      paidShiftIds: [...career.paidShiftIds, shift.id],
    },
    result: 'ok',
    payment: completed.netPay,
  };
}
