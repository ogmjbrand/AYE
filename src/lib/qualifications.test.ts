import { describe, expect, it } from 'vitest';
import type { Career } from '../components/CharacterCreation';
import { createGameState, createTime, type GameState } from './gameState';
import { lifeReducer, type AnyAction } from './life';
import { QUALIFICATIONS, RETAKE_WAIT_MINUTES, qualificationById, qualificationPay, qualificationsFor, sanitiseQualifications } from './qualifications';
import { canBuy, gearById } from './careerGear';
import { loadProgress, saveProgress } from './save';

const act = (s: GameState, a: AnyAction, career: Career = 'doctor') => lifeReducer(s, a, career, 'ordinary');
const memory = () => {
  const store = new Map<string, string>();
  return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0 } as Storage;
};
const als = qualificationById('doc-als')!;
const right = als.exam.map((q) => q.answer);
const wrong = als.exam.map((q) => (q.answer + 1) % q.options.length);
const studied = (s: GameState) => { for (let i = 0; i < als.studyHours; i++) s = act(s, { type: 'studyCourse', id: als.id, atStudyPlace: true }); return s; };

describe('the catalogue', () => {
  it('gives every career a certificate and a diploma with a real four-question exam', () => {
    for (const c of ['student', 'artist', 'entrepreneur', 'athlete', 'engineer', 'doctor', 'pilot'] as const) {
      const list = qualificationsFor(c);
      expect(list.map((x) => x.kind).sort()).toEqual(['certificate', 'diploma']);
      for (const x of list) {
        expect(x.exam).toHaveLength(4);
        for (const q of x.exam) expect(q.answer).toBeLessThan(q.options.length);
      }
    }
    expect(new Set(QUALIFICATIONS.map((x) => x.id)).size).toBe(QUALIFICATIONS.length);
  });
});

describe('enrol, study, sit the exam', () => {
  it('charges the fee once and records it', () => {
    const s = act(createGameState(5000, createTime(9, 0)), { type: 'enrolCourse', id: als.id });
    expect(s.balance).toBeLessThanOrEqual(5000 - als.fee);
    expect(s.qualifications.enrolled[als.id]).toBe(0);
    expect(s.life.ledger.some((l) => l.label === `Course fee: ${als.name}` && l.amount === -als.fee)).toBe(true);
    expect(act(s, { type: 'enrolCourse', id: als.id }).balance).toBe(s.balance);
  });

  it('needs a study place, takes an hour a session, and the exam waits for the hours', () => {
    let s = act(createGameState(5000, createTime(9, 0)), { type: 'enrolCourse', id: als.id });
    expect(act(s, { type: 'studyCourse', id: als.id, atStudyPlace: false }).qualifications.enrolled[als.id]).toBe(0);
    const t0 = s.time.totalMinutes;
    s = act(s, { type: 'studyCourse', id: als.id, atStudyPlace: true });
    expect(s.qualifications.enrolled[als.id]).toBe(60);
    expect(s.time.totalMinutes - t0).toBe(60);
    expect(act(s, { type: 'sitExam', id: als.id, answers: right }).qualifications.earned[als.id]).toBeUndefined();
  });

  it('a pass earns the qualification, raises pay and unlocks the gear that needs it', () => {
    let s = studied(act(createGameState(9000, createTime(9, 0)), { type: 'enrolCourse', id: als.id }));
    const kit = gearById('gear-trauma-kit')!;
    expect(canBuy(kit, 'doctor', 2, 99999, [], s.qualifications).ok).toBe(false);
    s = act(s, { type: 'sitExam', id: als.id, answers: right });
    expect(s.qualifications.earned[als.id]).toBeDefined();
    expect(qualificationPay(s.qualifications, 'doctor')).toBeCloseTo(1 + als.payBonus);
    expect(canBuy(kit, 'doctor', 2, 99999, [], s.qualifications).ok).toBe(true);
    // Rank still matters: the qualification doesn't skip it
    expect(canBuy(kit, 'doctor', 0, 99999, [], s.qualifications).ok).toBe(false);
  });

  it('a fail costs nothing and the retake waits a day', () => {
    let s = studied(act(createGameState(9000, createTime(9, 0)), { type: 'enrolCourse', id: als.id }));
    const before = s.balance;
    s = act(s, { type: 'sitExam', id: als.id, answers: wrong });
    expect(s.qualifications.earned[als.id]).toBeUndefined();
    expect(s.balance).toBeGreaterThanOrEqual(before - 50); // only ordinary living costs pass in the exam's half hour
    expect(act(s, { type: 'sitExam', id: als.id, answers: right }).qualifications.earned[als.id]).toBeUndefined();
    s = { ...s, time: { ...s.time, totalMinutes: s.time.totalMinutes + RETAKE_WAIT_MINUTES } };
    expect(act(s, { type: 'sitExam', id: als.id, answers: right }).qualifications.earned[als.id]).toBeDefined();
  });

  it('a diploma needs the career rank first', () => {
    const em = qualificationById('doc-em')!;
    expect(act(createGameState(99999, createTime(9, 0)), { type: 'enrolCourse', id: em.id }).qualifications.enrolled[em.id]).toBeUndefined();
  });
});

describe('saves', () => {
  it('survives a reload, and edited saves are cleaned', () => {
    const storage = memory();
    let s = studied(act(createGameState(9000, createTime(9, 0)), { type: 'enrolCourse', id: als.id }));
    s = act(s, { type: 'sitExam', id: als.id, answers: right });
    saveProgress('c1', s, storage);
    const back = loadProgress({ id: 'c1', career: 'doctor', lifestyle: 'ordinary' } as Parameters<typeof loadProgress>[0], storage);
    expect(back.qualifications).toEqual(s.qualifications);
    const edited = sanitiseQualifications({ earned: { fake: 1, 'doc-als': 5 }, enrolled: { 'eng-safety': 99999, 'doc-als': 10 } });
    expect(Object.keys(edited.earned)).toEqual(['doc-als']);
    expect(edited.enrolled).toEqual({ 'eng-safety': qualificationById('eng-safety')!.studyHours * 60 });
  });
});
