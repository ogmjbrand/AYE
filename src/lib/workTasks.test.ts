import { describe, expect, it } from 'vitest';
import { WORK_TASKS, taskForHour, tasksFor } from './workTasks';

describe('work tasks', () => {
  it('every career has at least three tasks, each with exactly one best answer', () => {
    for (const c of ['student', 'artist', 'entrepreneur', 'athlete', 'engineer', 'doctor', 'pilot'] as const) {
      expect(tasksFor(c).length, c).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(WORK_TASKS.map((t) => t.id)).size).toBe(WORK_TASKS.length);
    for (const t of WORK_TASKS) {
      expect(t.options.filter((o) => o.quality === 'best').length, t.id).toBe(1);
      for (const o of t.options) expect(o.why.length, t.id).toBeGreaterThan(10);
    }
  });

  it('rotates tasks hour by hour and has none for the undecided', () => {
    expect(taskForHour('doctor', 9 * 60)?.id).not.toBe(taskForHour('doctor', 10 * 60)?.id);
    expect(taskForHour('none', 600)).toBeNull();
  });
});
