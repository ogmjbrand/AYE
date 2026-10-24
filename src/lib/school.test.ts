import { describe, expect, it } from 'vitest';
import { HOURLY_WAGE, createGameState, createTime, gameReducer, type GameAction, type GameState } from './gameState';
import { lifeReducer } from './life';
import { loadProgress, saveProgress } from './save';
import { ATTEND_SHARE, CLASS_CREDITS, ASSIGNMENT_CREDITS, STUDY, TIMETABLE, classOpenNow, emptySchool, nextClass, sanitiseSchool } from './school';
import type { Character } from '../components/CharacterCreation';

const act = (s: GameState, a: GameAction, career: 'student' | 'doctor' = 'student') => gameReducer(s, a, career, 'student');
const ticks = (s: GameState, n: number, onCampus = true, career: 'student' | 'doctor' = 'student') => {
  for (let i = 0; i < n; i++) s = act(s, { type: 'tick', atWorkplace: onCampus, onCampus }, career);
  return s;
};
// Tuesday 08:50, ten minutes before the first class
const morning = () => createGameState(1000, createTime(8, 50, 1));
const first = TIMETABLE[0];

describe('timetable', () => {
  it('opens a class from 15 minutes before to 20 minutes after it starts, only in its room, only on weekdays', () => {
    const s = emptySchool();
    expect(classOpenNow(s, 8 * 60 + 50, 1, 'hall-a')?.id).toBe(first.id);
    expect(classOpenNow(s, 8 * 60 + 50, 1, 'lab')).toBeNull();
    expect(classOpenNow(s, 8 * 60 + 30, 1, 'hall-a')).toBeNull();
    expect(classOpenNow(s, 9 * 60 + 21, 1, 'hall-a')).toBeNull();
    expect(classOpenNow(s, 8 * 60 + 50, 5, 'hall-a')).toBeNull();
    expect(nextClass(8 * 60 + 50, 1)?.id).toBe(first.id);
    expect(nextClass(16 * 60, 1)).toBeNull();
  });
});

describe('attending class', () => {
  it('records a class you sat through, once, with credits', () => {
    let s = act(morning(), { type: 'startClass', classId: first.id, room: 'hall-a' });
    expect(s.school.inClass?.classId).toBe(first.id);
    s = ticks(s, 10 + (first.end - first.start));
    expect(s.school.inClass).toBeNull();
    expect(s.school.attended).toEqual([first.id]);
    expect(s.school.classesTotal).toBe(1);
    expect(s.school.credits).toBe(CLASS_CREDITS);
    // Can't sit the same class twice
    const again = act({ ...s, time: createTime(9, 5, 1) }, { type: 'startClass', classId: first.id, room: 'hall-a' });
    expect(again.school.inClass).toBeNull();
  });

  it('refuses the wrong room, the wrong time, and non-students', () => {
    expect(act(morning(), { type: 'startClass', classId: first.id, room: 'lab' }).school.inClass).toBeNull();
    expect(act(createGameState(0, createTime(7, 0, 1)), { type: 'startClass', classId: first.id, room: 'hall-a' }).school.inClass).toBeNull();
    expect(act(morning(), { type: 'startClass', classId: first.id, room: 'hall-a' }, 'doctor').school.inClass).toBeNull();
  });

  it('does not count a class you left early or walked out of campus from', () => {
    let s = act(morning(), { type: 'startClass', classId: first.id, room: 'hall-a' });
    s = ticks(s, 30);
    s = act(s, { type: 'leaveClass' });
    expect(s.school.inClass).toBeNull();
    expect(s.school.classesTotal).toBe(0);
    let t = act(morning(), { type: 'startClass', classId: first.id, room: 'hall-a' });
    t = ticks(t, 40);
    t = ticks(t, 1, false);
    expect(t.school.inClass).toBeNull();
    expect(t.school.classesTotal).toBe(0);
  });

  it('counts a late arrival who still sits through enough of it', () => {
    let s = act({ ...morning(), time: createTime(9, 20, 1) }, { type: 'startClass', classId: first.id, room: 'hall-a' });
    expect(Math.ceil((first.end - first.start) * ATTEND_SHARE)).toBeLessThanOrEqual(70);
    s = ticks(s, 70);
    expect(s.school.classesTotal).toBe(1);
  });

  it('notes and a question add a credit each; finishing the class passes the time on campus', () => {
    let s = act({ ...morning(), time: createTime(9, 0, 1) }, { type: 'startClass', classId: first.id, room: 'hall-a' });
    s = act(s, { type: 'participate', what: 'notes' });
    s = act(s, { type: 'participate', what: 'asked' });
    s = act(s, { type: 'participate', what: 'asked' });
    const before = s.balance;
    s = act(s, { type: 'finishClass' });
    expect(s.time.hour * 60 + s.time.minute).toBe(first.end);
    expect(s.school.credits).toBe(CLASS_CREDITS + 2);
    // Paid as the student career's normal hourly rate for the hour that ended (09:00–10:00), less living costs
    expect(s.today.income).toBe(HOURLY_WAGE.student);
    expect(s.balance).toBeLessThan(before + HOURLY_WAGE.student + 1);
  });

  it('sleeping or travelling ends a class without counting it', () => {
    let s = act(morning(), { type: 'startClass', classId: first.id, room: 'hall-a' });
    s = act(s, { type: 'wait', minutes: 5 });
    expect(s.school.inClass).toBeNull();
  });
});

describe('assignments and study', () => {
  it('study takes time and moves the assignment; handing in counts once', () => {
    let s = createGameState(1000, createTime(10, 0, 1));
    s = act(s, { type: 'study', kind: 'computer', room: 'lab' });
    expect(s.time.hour * 60 + s.time.minute).toBe(10 * 60 + STUDY.computer.minutes);
    expect(s.school.assignment).toBe(STUDY.computer.progress);
    // Not in the wrong room
    expect(act(s, { type: 'study', kind: 'computer', room: 'cafeteria' }).school.assignment).toBe(STUDY.computer.progress);
    // Not handed in until it's finished
    expect(act(s, { type: 'handIn', room: 'lab' }).school.assignmentsDone).toBe(0);
    s = act(s, { type: 'study', kind: 'computer', room: 'lab' });
    s = act(s, { type: 'study', kind: 'library', room: 'library' });
    s = act(s, { type: 'study', kind: 'library', room: 'library' });
    expect(s.school.assignment).toBe(100);
    s = act(s, { type: 'handIn', room: 'library' });
    expect(s.school.assignmentsDone).toBe(1);
    expect(s.school.assignment).toBe(0);
    expect(s.school.credits).toBe(ASSIGNMENT_CREDITS);
    expect(act(s, { type: 'handIn', room: 'library' }).school.assignmentsDone).toBe(1);
  });

  it('only students study coursework', () => {
    expect(act(createGameState(1000, createTime(10, 0, 1)), { type: 'study', kind: 'library', room: 'library' }, 'doctor').school.assignment).toBe(0);
  });

  it('daily counters start fresh the next day; records stay', () => {
    let s = act(morning(), { type: 'startClass', classId: first.id, room: 'hall-a' });
    s = act(s, { type: 'finishClass' });
    s = act(s, { type: 'campusVisit', place: 'library' });
    s = act(s, { type: 'sleep', atHome: false });
    s = act(s, { type: 'dismissSummary' });
    s = ticks(s, 1, false);
    expect(s.school.attended).toEqual([]);
    expect(s.school.visited).toEqual([]);
    expect(s.school.classesTotal).toBe(1);
  });
});

describe('saving', () => {
  it('keeps academic progress across a reload, and old saves get a fresh record', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0 } as Storage;
    const character = { id: 'c1', lifestyle: 'student', career: 'student', balance: 1000 } as unknown as Character;
    let s = act(morning(), { type: 'startClass', classId: first.id, room: 'hall-a' });
    s = act(s, { type: 'finishClass' });
    s = act(s, { type: 'joinClub', id: 'tech' });
    saveProgress('c1', s, storage);
    const loaded = loadProgress(character, storage);
    expect(loaded.school.classesTotal).toBe(1);
    expect(loaded.school.clubs).toEqual(['tech']);
    expect(sanitiseSchool(undefined)).toEqual(emptySchool());
    expect(sanitiseSchool({ credits: -5, attended: ['nope', first.id], assignment: 400 })).toMatchObject({ credits: 0, attended: [first.id], assignment: 100 });
  });

  it('awards the first-class achievement through the life layer', () => {
    let s = act(morning(), { type: 'startClass', classId: first.id, room: 'hall-a' });
    s = lifeReducer(s, { type: 'finishClass' }, 'student', 'student');
    expect(s.life.achievements.some((a) => a.id === 'first-class' || (a as unknown as string) === 'first-class')).toBe(true);
  });
});
