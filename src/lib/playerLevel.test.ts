import { describe, expect, it } from 'vitest';
import { createGameState, createTime, type GameState } from './gameState';
import { lifeReducer, type AnyAction } from './life';
import { emptyLife, levelProgress, levelReward, playerLevel, sanitiseLife, totalXp, xpForPlayerLevel } from './lifeState';

const act = (s: GameState, a: AnyAction) => lifeReducer(s, a, 'engineer', 'ordinary');

describe('player level', () => {
  it('rises with all skill experience together', () => {
    expect(playerLevel(0)).toBe(1);
    expect(playerLevel(99)).toBe(1);
    expect(playerLevel(100)).toBe(2);
    expect(playerLevel(xpForPlayerLevel(12))).toBe(12);
    expect(levelProgress(150)).toEqual({ level: 2, into: 50, span: 200 });
  });

  it('pays each level once, with a Level up celebration', () => {
    const s = createGameState(1000, createTime(9, 0));
    const skilled = { ...s, life: { ...s.life, skills: { ...s.life.skills, cooking: 350 } } };
    const after = act(skilled, { type: 'tick', atWorkplace: false });
    expect(totalXp(after.life.skills)).toBeGreaterThanOrEqual(350);
    expect(after.life.level).toBe(3);
    const ups = after.life.celebrations.filter((c) => c.kind === 'Level up');
    expect(ups.map((c) => c.text)).toEqual(['You reached level 2', 'You reached level 3']);
    expect(ups.reduce((sum, c) => sum + c.reward, 0)).toBe(levelReward(2) + levelReward(3));
    const again = act(after, { type: 'tick', atWorkplace: false });
    expect(again.life.celebrations.filter((c) => c.kind === 'Level up')).toHaveLength(2);
  });

  it('treats older saves as already at their level, and never above what their skills earn', () => {
    const old = { ...emptyLife(), skills: { ...emptyLife().skills, fitness: 700 } } as Record<string, unknown>;
    delete old.level;
    expect(sanitiseLife(old).level).toBe(playerLevel(700));
    expect(sanitiseLife({ ...old, level: 99 }).level).toBe(playerLevel(700));
  });
});
