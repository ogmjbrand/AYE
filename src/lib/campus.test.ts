import { describe, expect, it } from 'vitest';
import {
  academicStanding,
  assignmentForDay,
  attendClass,
  campusForDay,
  createCampusState,
  sanitiseCampus,
  submitAssignment,
} from './campus';
import { UNIVERSITY_INTERIOR, universityInteractionAt } from './universityInterior';
import { doorSpot, interiorLayout } from './interiors';

describe('campus rules', () => {
  it('only counts attendance in the lecture hall during the class window', () => {
    const state = createCampusState();
    expect(attendClass(state, 'morning', 9 * 60 + 5, false).result).toBe('wrong-place');
    expect(attendClass(state, 'morning', 8 * 60, true).result).toBe('not-open');
    expect(attendClass(state, 'morning', 10 * 60 + 40, true).result).toBe('too-late');
    const ok = attendClass(state, 'morning', 9 * 60 + 5, true);
    expect(ok.result).toBe('ok');
    if (ok.result === 'ok') {
      expect(ok.campus.attended).toEqual(['morning']);
      expect(ok.campus.credits).toBe(1);
      expect(attendClass(ok.campus, 'morning', 9 * 60 + 10, true).result).toBe('already-done');
    }
  });

  it('records a real assignment result once a day', () => {
    const day = 3;
    const question = assignmentForDay(day);
    const wrong = submitAssignment(createCampusState(day), day, (question.answer + 1) % question.options.length, true);
    expect(wrong.result).toBe('ok');
    if (wrong.result === 'ok') {
      expect(wrong.correct).toBe(false);
      expect(wrong.campus.totalAssignments).toBe(1);
      expect(wrong.campus.assignmentsCorrect).toBe(0);
      expect(submitAssignment(wrong.campus, day, question.answer, true).result).toBe('already-done');
    }
    expect(submitAssignment(createCampusState(day), day, question.answer, false).result).toBe('wrong-place');
  });

  it('rolls daily counters over but keeps lifetime totals', () => {
    const attended = attendClass(createCampusState(0), 'morning', 9 * 60 + 5, true);
    if (attended.result !== 'ok') throw new Error('expected attendance');
    const next = campusForDay(attended.campus, 1);
    expect(next.attended).toEqual([]);
    expect(next.totalClasses).toBe(1);
    expect(academicStanding(next)).toBe('New student');
  });

  it('sanitises corrupted saves', () => {
    expect(sanitiseCampus(null)).toEqual(createCampusState());
    const cleaned = sanitiseCampus({ attended: ['morning', 'bogus', 'morning'], totalAssignments: 2, assignmentsCorrect: 99, credits: -4 });
    expect(cleaned.attended).toEqual(['morning']);
    expect(cleaned.assignmentsCorrect).toBe(2);
    expect(cleaned.credits).toBe(0);
  });
});

describe('university interior', () => {
  it('has a reachable door and every activity zone', () => {
    const [, doorZ] = doorSpot(UNIVERSITY_INTERIOR);
    expect(universityInteractionAt(UNIVERSITY_INTERIOR, 0, doorZ)).toBe('door');
    expect(universityInteractionAt(UNIVERSITY_INTERIOR, -10.2, 5)).toBe('lecture');
    expect(universityInteractionAt(UNIVERSITY_INTERIOR, 13, 6)).toBe('assignment');
    expect(universityInteractionAt(UNIVERSITY_INTERIOR, 0, 7.9)).toBe('cafeteria');
    expect(interiorLayout(UNIVERSITY_INTERIOR).id).toBeDefined();
  });
});
