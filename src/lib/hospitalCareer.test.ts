import { describe, expect, it } from 'vitest';
import {
  HOSPITAL_PATIENTS_PER_SHIFT,
  TRIAGE_CASES,
  brief,
  clockIn,
  clockOut,
  createHospitalState,
  hospitalForDay,
  nextPatientIndex,
  sanitiseHospital,
  treatPatient,
} from './hospitalCareer';
import { HOSPITAL_INTERIOR, hospitalInteractionAt, isInWard } from './hospitalSite';
import { doorSpot, interiorLayout } from './interiors';

describe('hospital shift rules', () => {
  it('only clocks in at reception inside the clock-in window', () => {
    const state = createHospitalState();
    expect(clockIn(state, 10 * 60, false).result).toBe('wrong-place');
    expect(clockIn(state, 8 * 60, true).result).toBe('not-open');
    expect(clockIn(state, 16 * 60, true).result).toBe('too-late');
    const ok = clockIn(state, 10 * 60, true);
    expect(ok.result).toBe('ok');
    if (ok.result === 'ok') expect(clockIn(ok.hospital, 10 * 60, true).result).toBe('already-on-shift');
  });

  it('requires a briefing before patients and tracks real accuracy', () => {
    const on = clockIn(createHospitalState(), 9 * 60, true);
    if (on.result !== 'ok') throw new Error('expected clock-in');
    expect(treatPatient(on.hospital, 0, 0, true).result).toBe('not-ready');
    const briefed = brief(on.hospital, true);
    if (briefed.result !== 'ok') throw new Error('expected briefing');
    const index = nextPatientIndex(briefed.hospital, 0)!;
    const right = treatPatient(briefed.hospital, 0, TRIAGE_CASES[index].answer, true);
    expect(right.result).toBe('ok');
    if (right.result === 'ok') {
      expect(right.correct).toBe(true);
      expect(right.hospital.totalCorrect).toBe(1);
      expect(treatPatient(right.hospital, 0, 0, false).result).toBe('wrong-place');
    }
  });

  it('completes a shift only after the full patient load', () => {
    let state = createHospitalState();
    const on = clockIn(state, 9 * 60, true);
    if (on.result !== 'ok') throw new Error('expected clock-in');
    const briefed = brief(on.hospital, true);
    if (briefed.result !== 'ok') throw new Error('expected briefing');
    state = briefed.hospital;
    const early = clockOut(state, true);
    expect(early.result === 'ok' && early.completed).toBe(false);
    for (let i = 0; i < HOSPITAL_PATIENTS_PER_SHIFT; i++) {
      const result = treatPatient(state, 0, 0, true);
      if (result.result !== 'ok') throw new Error('expected patient');
      state = result.hospital;
    }
    expect(nextPatientIndex(state, 0)).toBeNull();
    const done = clockOut(state, true);
    expect(done.result === 'ok' && done.completed).toBe(true);
    if (done.result === 'ok') expect(done.hospital.shiftsCompleted).toBe(1);
  });

  it('ends an open shift on a new day but keeps lifetime totals', () => {
    const on = clockIn(createHospitalState(0), 9 * 60, true);
    if (on.result !== 'ok') throw new Error('expected clock-in');
    const next = hospitalForDay({ ...on.hospital, totalPatients: 3 }, 1);
    expect(next.onShift).toBe(false);
    expect(next.totalPatients).toBe(3);
  });

  it('sanitises corrupted saves', () => {
    expect(sanitiseHospital(null)).toEqual(createHospitalState());
    const cleaned = sanitiseHospital({ onShift: false, treated: [1, 99], totalPatients: 2, totalCorrect: 50 });
    expect(cleaned.treated).toEqual([]);
    expect(cleaned.totalCorrect).toBe(2);
  });
});

describe('hospital interior', () => {
  it('has a reachable door and working zones', () => {
    const [x, z] = doorSpot(HOSPITAL_INTERIOR);
    expect(hospitalInteractionAt(HOSPITAL_INTERIOR, x, z)).toBe('door');
    expect(hospitalInteractionAt(HOSPITAL_INTERIOR, 0, -4.7)).toBe('reception');
    expect(hospitalInteractionAt(HOSPITAL_INTERIOR, 11, 5)).toBe('supervisor');
    expect(hospitalInteractionAt(HOSPITAL_INTERIOR, -9.5, 5)).toBe('patient');
    expect(isInWard(-9.5, 5)).toBe(true);
    expect(interiorLayout(HOSPITAL_INTERIOR)).toBeTruthy();
  });
});
