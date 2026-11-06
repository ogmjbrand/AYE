import { describe, expect, it } from 'vitest';
import { createGameState, createTime, gameReducer, type GameState } from './gameState';
import { ADMISSION_STAGES, CARE_SERVICES, CONDITIONS, DEPARTMENTS, admissionStage, plansFor } from './healthcare';
import { CARRIED_REMEDIES, HERBAL_DISCLAIMER, PLANTS, REMEDIES, remedyById } from './herbal';
import { CRITICAL, EMERGENCY, MAX_HEALTH, SURVIVAL_FLOOR, damage } from './health';
import { COURSES, RANKS, RESEARCH, consultCorrect, identificationQuestion, prepQuality, rankOf, validateHerbal } from './herbalCareer';
import { diagnose, emptyCare, sanitiseCare } from './careState';
import { conditionById } from './healthcare';
import { loadProgress, saveProgress } from './save';
import { CARE_SEATS, HOSPITAL_INTERIOR, HOSPITAL_POINTS, hospitalInteractionAt } from './hospitalSite';
import { doorSpot, interiorLayout } from './interiors';
import { findPath, walkGridFor } from './pathfinding';
import { standSpot } from './seating';

const act = (s: GameState, a: Parameters<typeof gameReducer>[1]) => gameReducer(s, a, 'doctor', 'ordinary');
const fresh = (balance = 5000) => createGameState(balance, createTime(10, 0));
const hurtTo = (s: GameState, value: number): GameState => ({ ...s, health: { ...s.health, value } });

describe('hospital departments and equipment', () => {
  it('has every modern department and a full herbal medicine centre', () => {
    const ids = DEPARTMENTS.map((d) => d.id);
    for (const id of ['emergency', 'examination', 'imaging', 'laboratory', 'surgery', 'pharmacy', 'rehabilitation', 'recovery']) expect(ids).toContain(id);
    for (const id of ['herbal-dispensary', 'herbal-preparation', 'herbal-garden', 'herbal-treatment', 'herbal-research']) expect(ids).toContain(id);
    for (const d of DEPARTMENTS) expect(d.equipment.length, d.id).toBeGreaterThan(0);
  });
  it('gives every service a department, a price and an effect, and every herbal reference resolves', () => {
    for (const s of CARE_SERVICES) {
      expect(DEPARTMENTS.some((d) => d.id === s.department), s.id).toBe(true);
      expect(s.price).toBeGreaterThan(0);
      expect(Object.keys(s.effect).length).toBeGreaterThan(0);
    }
    expect(validateHerbal()).toEqual([]);
  });
});

describe('walking to every department', () => {
  const grid = walkGridFor(interiorLayout(HOSPITAL_INTERIOR).obstacles);
  const [dx, dz] = doorSpot(HOSPITAL_INTERIOR);
  it('reaches every department point from the door, round the solid equipment, and the point is that department', () => {
    for (const pt of HOSPITAL_POINTS) {
      expect(findPath(grid, { x: dx, z: dz }, { x: pt.at[0], z: pt.at[1] }), pt.action).not.toBeNull();
      expect(hospitalInteractionAt(HOSPITAL_INTERIOR, pt.at[0], pt.at[1]), pt.action).toBe(pt.action);
    }
  });
  it('reaches where you stand to sit for every in-person treatment', () => {
    for (const [id, seat] of Object.entries(CARE_SEATS)) {
      const at = standSpot(seat);
      expect(findPath(grid, { x: dx, z: dz }, at), id).not.toBeNull();
    }
    for (const s of CARE_SERVICES) if (!s.diagnoses || s.id === 'svc-checkup' || s.id === 'svc-imaging') expect(s.id in CARE_SEATS || ['svc-rehab'].includes(s.id), s.id).toBe(true);
  });
});

describe('herbal plants and remedies', () => {
  it('lists the researched plants with their traditional use kept apart from the game effect, and no cure claims', () => {
    for (const id of ['bitter-leaf', 'neem', 'ginger', 'turmeric', 'lemongrass', 'aloe', 'hibiscus', 'moringa', 'scent-leaf']) expect(PLANTS.some((p) => p.id === id), id).toBe(true);
    for (const p of PLANTS) {
      expect(p.traditional.length).toBeGreaterThan(20);
      expect(p.game.length).toBeGreaterThan(10);
      expect(`${p.traditional} ${p.game}`).not.toMatch(/\bcures?\b|\btreats? (malaria|cancer|diabetes|hypertension|covid|hiv|typhoid)/i);
    }
    expect(HERBAL_DISCLAIMER).toMatch(/fictional/);
    expect(HERBAL_DISCLAIMER).toMatch(/not medical advice/);
  });
  it('gives every remedy a fictional effect, a preparation, a price and its rules', () => {
    for (const r of REMEDIES) {
      expect(r.steps.length).toBeGreaterThanOrEqual(4);
      expect(r.price).toBeGreaterThan(0);
      expect(Object.keys(r.effect).length).toBeGreaterThan(0);
      expect(r.prepareRank).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('buying herbal remedies and medical supplies', () => {
  it('takes the price once and puts the remedy in your cabinet', () => {
    const s0 = fresh(100);
    const s1 = act(s0, { type: 'careBuyRemedy', remedyId: 'rem-ginger-lemongrass' });
    expect(s1.balance).toBe(70);
    expect(s1.care.cabinet['rem-ginger-lemongrass']).toBe(1);
    expect(s1.today.expenses).toBe(30);
  });
  it('refuses, taking nothing, when you cannot afford it, are full, or it is still being researched', () => {
    const broke = fresh(10);
    expect(act(broke, { type: 'careBuyRemedy', remedyId: 'rem-ginger-lemongrass' })).toBe(broke);
    const r = remedyById('rem-zobo')!;
    let full = fresh(10_000);
    for (let i = 0; i < r.max; i++) full = act(full, { type: 'careBuyRemedy', remedyId: r.id });
    expect(act(full, { type: 'careBuyRemedy', remedyId: r.id })).toBe(full);
    const s = fresh(10_000);
    expect(act(s, { type: 'careBuyRemedy', remedyId: 'rem-turmeric-recovery' })).toBe(s);
    // A centre treatment is had there and then, never carried
    expect(act(s, { type: 'careBuyRemedy', remedyId: 'rem-neem-bath' })).toBe(s);
  });
  it('taking a remedy uses it up and applies its game effect', () => {
    const s0 = hurtTo(act(fresh(), { type: 'careBuyRemedy', remedyId: 'rem-bitter-tonic' }), 60);
    const s1 = act(s0, { type: 'careTakeRemedy', remedyId: 'rem-bitter-tonic' });
    expect(s1.care.cabinet['rem-bitter-tonic']).toBeUndefined();
    expect(s1.health.value).toBeGreaterThanOrEqual(60 + 15 - 1);
    expect(act(s1, { type: 'careTakeRemedy', remedyId: 'rem-bitter-tonic' })).toBe(s1);
  });
  it('the pharmacy kit still works alongside the cabinet (medical inventory)', () => {
    const s1 = act(fresh(1000), { type: 'buyMedical', itemId: 'med-first-aid' });
    expect(s1.health.kit['med-first-aid']).toBe(1);
    expect(s1.balance).toBe(850);
  });
  it('keeps the cabinet and the herbal profession in the save', () => {
    const store = new Map<string, string>();
    const fake = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } as unknown as Storage;
    const s1 = act(fresh(), { type: 'careBuyRemedy', remedyId: 'rem-zobo' });
    const s2 = { ...s1, care: { ...s1.care, herbal: { ...s1.care.herbal, xp: 80, trained: ['course-plant-id'] } } };
    saveProgress('c1', s2, fake);
    const loaded = loadProgress({ id: 'c1', balance: 5000, lifestyle: 'ordinary' } as unknown as Parameters<typeof loadProgress>[0], fake);
    expect(loaded.care.cabinet['rem-zobo']).toBe(1);
    expect(loaded.care.herbal.xp).toBe(80);
    expect(loaded.care.herbal.trained).toEqual(['course-plant-id']);
    expect(sanitiseCare({ cabinet: { 'rem-zobo': 50, nope: 3 } }).cabinet).toEqual({ 'rem-zobo': remedyById('rem-zobo')!.max });
  });
});

describe('modern treatment and care plans', () => {
  it('a check-up charges, takes its time, heals, and finds a condition with a care plan', () => {
    const s0 = hurtTo(fresh(1000), 50);
    const s1 = act(s0, { type: 'careService', serviceId: 'svc-checkup' });
    expect(s1.balance).toBe(880);
    expect(s1.time.totalMinutes).toBe(s0.time.totalMinutes + 20);
    expect(s1.health.value).toBeGreaterThan(55);
    expect(s1.care.diagnosis).not.toBeNull();
    const plans = plansFor(conditionById(s1.care.diagnosis!.condition)!);
    const s2 = act(s1, { type: 'careChoosePlan', plan: plans[plans.length - 1] });
    expect(s2.care.diagnosis!.plan).toBe(plans[plans.length - 1]);
  });
  it('never offers herbal care alone for a red-flag emergency', () => {
    for (const c of CONDITIONS.filter((x) => x.emergency)) expect(plansFor(c)).toEqual(['modern']);
    expect(diagnose(123, CRITICAL)).toBe('collapse');
  });
  it('emergency treatment is free while health is critical, even with no money', () => {
    const s0 = hurtTo(fresh(0), CRITICAL);
    const s1 = act(s0, { type: 'careService', serviceId: 'svc-emergency' });
    expect(s1.balance).toBe(0);
    expect(s1.health.value).toBeGreaterThan(CRITICAL + 30);
  });
  it('optional treatments are refused without money, taking nothing', () => {
    const s0 = fresh(50);
    expect(act(s0, { type: 'careService', serviceId: 'svc-procedure' })).toBe(s0);
    expect(act(s0, { type: 'careHerbalTreatment', remedyId: 'rem-neem-bath' })).toBe(s0);
  });
});

describe('emergency admission and no-death protection', () => {
  it('goes through reception, assessment, a bed, treatment, monitoring, restored and discharge, in order', () => {
    const seen = [0, 0.06, 0.2, 0.4, 0.7, 0.95, 1].map(admissionStage);
    expect(seen).toEqual(ADMISSION_STAGES.map((s) => s.id));
  });
  it('an emergency still admits you to hospital and restores you, free, whatever you own or can afford', () => {
    let s = act(fresh(0), { type: 'careBuyRemedy', remedyId: 'rem-zobo' }); // refused: no money
    s = { ...s, care: { ...s.care, cabinet: { 'rem-zobo': 2 } } };
    s = { ...s, health: damage({ ...s.health, value: EMERGENCY + 1 }, 30, 'a test', s.time.totalMinutes, { supernatural: false, hasSanctuary: false }) };
    expect(s.health.value).toBe(SURVIVAL_FLOOR);
    expect(s.health.recovery?.place).toBe('hospital');
    // Remedies wait: the ward is looking after you
    expect(act(s, { type: 'careTakeRemedy', remedyId: 'rem-zobo' })).toBe(s);
    // A free optional extra, once per stay
    const s1 = act(s, { type: 'careRecoveryExtra', extraId: 'extra-herbal-tea' });
    expect(s1.care.extras?.taken).toEqual(['extra-herbal-tea']);
    expect(act(s1, { type: 'careRecoveryExtra', extraId: 'extra-herbal-tea' })).toBe(s1);
    const done = act(s1, { type: 'restToRecover' });
    expect(done.health.value).toBe(MAX_HEALTH);
    expect(done.health.recovery).toBeNull();
    expect(done.balance).toBe(0);
    expect(done.care.cabinet['rem-zobo']).toBe(2);
  });
  it('nothing in healthcare can take health below the floor', () => {
    let s = hurtTo(fresh(), SURVIVAL_FLOOR + 1);
    s = act(s, { type: 'careService', serviceId: 'svc-rehab' });
    expect(s.health.value).toBeGreaterThanOrEqual(SURVIVAL_FLOOR);
  });
});

describe('the herbal profession', () => {
  const herbalist = (xp: number, courses: number, research: string[] = []) => {
    const s = fresh(20_000);
    return { ...s, care: { ...emptyCare(), herbal: { ...emptyCare().herbal, xp, trained: COURSES.slice(0, courses).map((c): string => c.id), research } } } as GameState;
  };
  it('climbs from Beginner to Master only with experience, training and research', () => {
    expect(rankOf(herbalist(5000, 0).care.herbal)).toBe(0);
    expect(rankOf(herbalist(RANKS[1].xp, 1).care.herbal)).toBe(1);
    expect(rankOf(herbalist(5000, 5).care.herbal)).toBe(4);
    expect(rankOf(herbalist(5000, 5, ['a', 'b', 'c']).care.herbal)).toBe(5);
  });
  it('training costs its fee and time, and must be taken in order', () => {
    const s0 = herbalist(RANKS[1].xp, 0);
    expect(act(s0, { type: 'herbalTrain', courseId: 'course-dispensary' })).toBe(s0);
    const s1 = act(s0, { type: 'herbalTrain', courseId: 'course-plant-id' });
    // The fee, plus the hour's ordinary living costs while the course runs
    expect(s1.today.expenses).toBeGreaterThanOrEqual(150);
    expect(s1.balance).toBeLessThanOrEqual(s0.balance - 150);
    expect(s1.time.totalMinutes).toBe(s0.time.totalMinutes + 60);
    expect(s1.care.herbal.trained).toEqual(['course-plant-id']);
  });
  it('rewards right identifications only', () => {
    const q = identificationQuestion(17);
    expect(q.options.some((o) => o.id === q.plantId)).toBe(true);
    const wrong = q.options.find((o) => o.id !== q.plantId)!.id;
    const s0 = herbalist(0, 0);
    expect(act(s0, { type: 'herbalIdentify', plantId: q.plantId, answerId: wrong }).care.herbal.xp).toBe(0);
    expect(act(s0, { type: 'herbalIdentify', plantId: q.plantId, answerId: q.plantId }).care.herbal.xp).toBe(8);
  });
  it('grows, harvests and prepares a remedy whose quality depends on the steps', () => {
    let s = herbalist(RANKS[1].xp, 1);
    s = act(s, { type: 'herbalPlant', plot: 0, plantId: 'lemongrass' });
    expect(act(s, { type: 'herbalHarvest', plot: 0 })).toBe(s);
    s = { ...s, time: { ...s.time, totalMinutes: s.time.totalMinutes + 200 } };
    s = act(s, { type: 'herbalHarvest', plot: 0 });
    expect(s.care.herbal.ingredients.lemongrass).toBeGreaterThanOrEqual(4);
    s = { ...s, care: { ...s.care, herbal: { ...s.care.herbal, ingredients: { ...s.care.herbal.ingredients, ginger: 1 } } } };
    const tea = remedyById('rem-ginger-lemongrass')!;
    expect(prepQuality(tea.steps, [...tea.steps].reverse())).toBeLessThan(0.5);
    const done = act(s, { type: 'herbalPrepare', remedyId: tea.id, order: [...tea.steps] });
    expect(done.care.herbal.stock[tea.id]).toBe(1);
    expect(done.care.herbal.ingredients.ginger ?? 0).toBe(0);
  });
  it('consultations send emergencies to the doctors and pay only for the right plan', () => {
    const collapse = conditionById('collapse')!;
    expect(consultCorrect(collapse, 'refer')).toBe(true);
    expect(consultCorrect(collapse, 'herbal:rem-bitter-tonic')).toBe(false);
    const s0 = herbalist(RANKS[2].xp, 2);
    const right = act(s0, { type: 'herbalConsult', conditionId: 'harmattan-cough', choice: 'herbal:rem-ginger-lemongrass' });
    expect(right.balance).toBe(s0.balance + 50);
    const wrong = act(s0, { type: 'herbalConsult', conditionId: 'collapse', choice: 'herbal:rem-bitter-tonic' });
    expect(wrong.balance).toBe(s0.balance);
  });
  it('research needs its groundwork and all the right answers, then unlocks what it promises', () => {
    const p = RESEARCH.find((r) => r.id === 'res-plant-survey')!;
    let s = herbalist(RANKS[1].xp, 1);
    expect(act(s, { type: 'herbalResearch', projectId: p.id, answers: p.questions.map((q) => q.answer) })).toBe(s);
    s = { ...s, care: { ...s.care, herbal: { ...s.care.herbal, identified: Object.fromEntries(PLANTS.slice(0, 6).map((pl) => [pl.id, 1])) } } };
    expect(act(s, { type: 'herbalResearch', projectId: p.id, answers: [9, 9, 9] }).care.herbal.research).toEqual([]);
    const done = act(s, { type: 'herbalResearch', projectId: p.id, answers: p.questions.map((q) => q.answer) });
    expect(done.care.herbal.research).toEqual([p.id]);
  });
  it('sells only what is in stock, and only from Experienced Herbalist', () => {
    const s0 = herbalist(RANKS[3].xp, 3);
    const stocked = { ...s0, care: { ...s0.care, herbal: { ...s0.care.herbal, stock: { 'rem-zobo': 1 } } } };
    const sold = act(stocked, { type: 'herbalSell', remedyId: 'rem-zobo' });
    expect(sold.balance).toBe(stocked.balance + Math.round(25 * 0.6));
    expect(act(sold, { type: 'herbalSell', remedyId: 'rem-zobo' })).toBe(sold);
    expect(CARRIED_REMEDIES.length).toBeGreaterThan(5);
  });
});
