import { describe, expect, it } from 'vitest';
import {
  OFFICE_TASK_PAY,
  OFFICE_INTERIOR,
  OFFICE_TASK_SEATS,
  OFFICE_WORKPLACE,
  canClockIntoOffice,
  createOfficeCareer,
  officeChallenge,
  officeInteractionAt,
  officeShiftClockIn,
  officeShiftClockOut,
  officeTaskAnswer,
  sanitiseOfficeCareer,
} from './officeCareer';
import { createGameState, createTime, gameReducer } from './gameState';
import { loadProgress, saveProgress } from './save';
import { doorSpot, interiorLayout } from './interiors';
import { DISTRICTS } from './geography';
import { PLAYER_RADIUS, resolveCollisions } from './world';
import type { Character } from '../components/CharacterCreation';
import { AVERAGE_SHAPE } from './bodyShape';

const character: Character = {
  id: 'office-test', name: 'Ada', lifestyle: 'ordinary', career: 'none', diet: 'everything',
  colorR: 1, colorG: 2, colorB: 3, balance: 1_000, createdAt: 1, lastBalanceUpdate: 1,
  gender: 'woman', heritage: 'black-african', ethnicGroup: 'Yoruba', country: 'NG', region: 'Lagos',
  body: 'feminine', lookId: 'female-adult-08', heightCm: 165,
  shape: AVERAGE_SHAPE,
  wardrobe: { owned: [], equipped: {} },
};

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('Office Worker shift rules', () => {
  it('uses a complete office interior and keeps the entrance and aligned workstation seats usable', () => {
    expect(OFFICE_INTERIOR.architecture).toBe('office');
    expect(OFFICE_INTERIOR.partitions.some((partition) => partition.material === 'glass')).toBe(true);
    expect(OFFICE_WORKPLACE.exteriorDoor[0]).toBe(OFFICE_WORKPLACE.position[0] + 1.3);
    const exteriorBuilding = DISTRICTS.find((district) => district.id === OFFICE_WORKPLACE.districtId)
      ?.layout.buildings.find((building) => building.name === 'Marina Heights');
    expect(exteriorBuilding?.entry?.side).toBe('west');
    expect(exteriorBuilding!.position[0] - exteriorBuilding!.size[0] / 2).toBe(OFFICE_WORKPLACE.exteriorDoor[0]);
    expect(exteriorBuilding!.position[2] + exteriorBuilding!.entry!.offset).toBe(OFFICE_WORKPLACE.exteriorDoor[2]);

    const layout = interiorLayout(OFFICE_INTERIOR);
    const entry = doorSpot(OFFICE_INTERIOR);
    const resolvedEntry = resolveCollisions(entry[0], entry[1], PLAYER_RADIUS, layout.obstacles);
    expect(Math.hypot(resolvedEntry.x - entry[0], resolvedEntry.z - entry[1])).toBeLessThan(0.01);

    for (const [taskId, seat] of Object.entries(OFFICE_TASK_SEATS)) {
      const desk = OFFICE_INTERIOR.furniture.find((item) => (item.kind === 'desk' || item.kind === 'conference-table')
        && Math.abs(item.at[0] - seat!.x) < 0.01);
      expect(desk, `${taskId} has a desk`).toBeDefined();
      const towardDesk = Math.atan2(desk!.at[0] - seat!.x, desk!.at[1] - seat!.z);
      const facingError = Math.atan2(Math.sin(towardDesk - seat!.facing), Math.cos(towardDesk - seat!.facing));
      expect(Math.abs(facingError), `${taskId} chair faces its desk`).toBeLessThan(0.05);
      expect(Math.hypot(desk!.at[0] - seat!.x, desk!.at[1] - seat!.z), `${taskId} chair reaches desk`).toBeLessThan(1.4);
      const resolved = resolveCollisions(seat!.x, seat!.z, PLAYER_RADIUS, layout.obstacles);
      expect(Math.hypot(resolved.x - seat!.x, resolved.z - seat!.z), `${taskId} chair is clear`).toBeLessThan(0.01);
    }
  });

  it('requires seated workstations to be clear and in interaction range of the assigned station', () => {
    const layout = interiorLayout(OFFICE_INTERIOR);
    for (const [taskId, seat] of Object.entries(OFFICE_TASK_SEATS)) {
      expect(seat).toBeDefined();
      const position = seat!;
      const resolved = resolveCollisions(position.x, position.z, PLAYER_RADIUS, layout.obstacles);
      expect(Math.hypot(resolved.x - position.x, resolved.z - position.z), taskId).toBeLessThan(0.01);
      expect(officeInteractionAt(OFFICE_INTERIOR, position.x, position.z)).toBe(taskId);
    }
  });

  it('only permits clock-in between 09:00 and 15:00', () => {
    expect(canClockIntoOffice(createTime(8, 59))).toBe(false);
    expect(canClockIntoOffice(createTime(9, 0))).toBe(true);
    expect(canClockIntoOffice(createTime(14, 59))).toBe(true);
    expect(canClockIntoOffice(createTime(15, 0))).toBe(false);
  });

  it('requires employment, presence at reception and an available shift', () => {
    const fresh = createOfficeCareer();
    expect(officeShiftClockIn(fresh, 0, 540, createTime(9), true).result).toBe('not-employed');
    const employed = { ...fresh, employed: true };
    expect(officeShiftClockIn(employed, 0, 540, createTime(9), false).result).toBe('wrong-place');
    const active = officeShiftClockIn(employed, 0, 540, createTime(9), true).career;
    expect(officeShiftClockIn(active, 0, 540, createTime(9), true).result).toBe('shift-active');
  });

  it('does not complete a task for a wrong answer and records reviewed performance after retries', () => {
    const career = officeShiftClockIn({ ...createOfficeCareer(), employed: true }, 0, 540, createTime(9), true).career;
    const wrong = officeTaskAnswer(career, 'documents', 2, true);
    expect(wrong.result).toBe('wrong-answer');
    expect(wrong.career.activeShift?.tasks.documents).toMatchObject({ completed: false, attempts: 1 });
    const right = officeTaskAnswer(wrong.career, 'documents', officeChallenge('documents').correctIndex, true);
    expect(right.career.activeShift?.tasks.documents).toMatchObject({ completed: true, attempts: 2, performance: 'needs-review' });
    expect(officeTaskAnswer(right.career, 'documents', 0, true).result).toBe('task-completed');
  });

  it('rejects invalid answer indexes and task interactions outside the office', () => {
    const career = officeShiftClockIn({ ...createOfficeCareer(), employed: true }, 0, 540, createTime(9), true).career;
    expect(officeTaskAnswer(career, 'computer', -1, true).result).toBe('wrong-answer');
    expect(officeTaskAnswer(career, 'computer', 0, false).result).toBe('wrong-place');
    expect(officeShiftClockOut(career, 600, false).result).toBe('wrong-place');
  });

  it('pays once only after all three tasks are completed', () => {
    let career = officeShiftClockIn({ ...createOfficeCareer(), employed: true }, 0, 540, createTime(9), true).career;
    expect(officeShiftClockOut(career, 540, true)).toMatchObject({ result: 'tasks-incomplete', payment: 0 });
    for (const id of ['computer', 'documents', 'meeting'] as const) {
      career = officeTaskAnswer(career, id, officeChallenge(id).correctIndex, true).career;
    }
    const settled = officeShiftClockOut(career, 600, true);
    expect(settled).toMatchObject({ result: 'ok', payment: OFFICE_TASK_PAY * 3 });
    expect(settled.career.paidShiftIds).toEqual(['lagos.marina:office:0']);
    expect(officeShiftClockOut(settled.career, 600, true)).toMatchObject({ result: 'no-shift', payment: 0 });
    expect(settled.career.jobTitle).toBe('Office Assistant');
    expect(settled.career.achievements).toContain('first-shift');
  });

  it('promotes after five and fifteen paid shifts, raising the configured task salary', () => {
    let career = { ...createOfficeCareer(), employed: true };
    for (let day = 0; day < 15; day++) {
      career = officeShiftClockIn(career, day, day * 1_440 + 540, createTime(9), true).career;
      for (const id of ['computer', 'documents', 'meeting'] as const) {
        career = officeTaskAnswer(career, id, officeChallenge(id).correctIndex, true).career;
      }
      career = officeShiftClockOut(career, day * 1_440 + 585, true).career;
      if (day === 4) expect(career).toMatchObject({ jobTitle: 'Administrative Associate', careerLevel: 2, salaryPerTask: 300 });
    }
    expect(career).toMatchObject({ jobTitle: 'Office Coordinator', careerLevel: 3, salaryPerTask: 350 });
    expect(career.achievements).toEqual(['first-shift', 'administrative-associate', 'office-coordinator']);
  });

  it('continues promotions into management and executive roles', () => {
    let career = { ...createOfficeCareer(), employed: true };
    for (let day = 0; day < 60; day++) {
      career = officeShiftClockIn(career, day, day * 1_440 + 540, createTime(9), true).career;
      for (const id of ['computer', 'documents', 'meeting'] as const) {
        career = officeTaskAnswer(career, id, officeChallenge(id).correctIndex, true).career;
      }
      career = officeShiftClockOut(career, day * 1_440 + 585, true).career;
      if (day === 29) expect(career).toMatchObject({ jobTitle: 'Operations Manager', careerLevel: 4, salaryPerTask: 425 });
    }
    expect(career).toMatchObject({ jobTitle: 'Executive Director', careerLevel: 5, salaryPerTask: 525 });
    expect(career.achievements).toContain('executive-director');
  });

  it('deduplicates and validates saved office-career data', () => {
    const sanitised = sanitiseOfficeCareer({
      employed: true,
      careerLevel: 3,
      jobTitle: 'injected title',
      salaryPerTask: -10,
      paidShiftIds: ['shift-1', 'shift-1'],
      achievements: ['first-shift', 2],
      skills: { computer: 5, organization: -1, teamwork: 1.5 },
    });
    expect(sanitised).toMatchObject({
      employed: true,
      careerLevel: 3,
      jobTitle: 'Office Coordinator',
      salaryPerTask: 350,
      paidShiftIds: ['shift-1'],
      achievements: ['first-shift'],
      skills: { computer: 5, organization: 0, teamwork: 0 },
    });
  });

  it('requires station context, does not pay on entry and preserves exactly-once payroll on reload', () => {
    let state = createGameState(1_000, createTime(9));
    state = gameReducer(state, { type: 'officeApply', atReception: true }, 'none', 'ordinary');
    state = gameReducer(state, { type: 'officeClockIn', atReception: true }, 'none', 'ordinary');
    const before = state.balance;
    state = gameReducer(state, { type: 'officeTask', taskId: 'computer', choice: 0, atStation: null }, 'none', 'ordinary');
    expect(state.balance).toBe(before);
    expect(state.officeCareer.activeShift?.tasks.computer.completed).toBe(false);
    for (const id of ['computer', 'documents', 'meeting'] as const) {
      state = gameReducer(state, { type: 'officeTask', taskId: id, choice: officeChallenge(id).correctIndex, atStation: id }, 'none', 'ordinary');
    }
    expect(state.time.totalMinutes).toBe(585);
    state = gameReducer(state, { type: 'officeClockOut', atReception: true }, 'none', 'ordinary');
    expect(state.balance).toBe(before + OFFICE_TASK_PAY * 3);

    const storage = new MemoryStorage();
    saveProgress(character.id, state, storage);
    const reloaded = loadProgress(character, storage);
    const attemptedDuplicate = gameReducer(reloaded, { type: 'officeClockIn', atReception: true }, 'none', 'ordinary');
    expect(attemptedDuplicate).toEqual(reloaded);
    expect(attemptedDuplicate.balance).toBe(before + OFFICE_TASK_PAY * 3);
  });
});