import { describe, expect, it } from 'vitest';
import type { Career, Lifestyle } from '../components/CharacterCreation';
import {
  FULLNESS_LOSS_PER_MINUTE,
  HUNGRY_THRESHOLD,
  HOURLY_LIVING_COST,
  HOURLY_WAGE,
  HOME_SLEEP_HUNGER_RATE,
  createGameState,
  createTime,
  gameReducer,
  type GameState,
} from './gameState';
import { ROUGH_SLEEP_FULLNESS_LOSS, allHomes, moveInFee } from './homes';
import { distanceKm, travelOption, travelOptions } from './travel';
import { districtById } from './geography';
import { TASK_REWARD, taskForHour } from './workTasks';
import { ACTIVITIES, FRIENDSHIP_LEVELS } from './people';

const run = (
  state: GameState,
  minutes: number,
  career: Career = 'doctor',
  lifestyle: Lifestyle = 'ordinary',
  atWorkplace = true,
) => {
  for (let i = 0; i < minutes; i++) state = gameReducer(state, { type: 'tick', atWorkplace }, career, lifestyle);
  return state;
};

describe('clock', () => {
  it('advances one minute per tick and rolls over hours and days', () => {
    let s = createGameState(0, createTime(23, 59, 6));
    s = run(s, 1);
    expect(s.time).toMatchObject({ hour: 0, minute: 0, dayOfWeek: 0, period: 'night' });
  });
});

describe('economy', () => {
  it('pays the hourly wage during working hours and charges living costs', () => {
    const s = run(createGameState(5000, createTime(9, 0)), 60);
    expect(s.balance).toBe(5000 + HOURLY_WAGE.doctor - HOURLY_LIVING_COST.ordinary);
    expect(s.today).toEqual({ income: HOURLY_WAGE.doctor, expenses: HOURLY_LIVING_COST.ordinary, minutesWorked: 60 });
  });

  it('pays no wage outside working hours', () => {
    const s = run(createGameState(5000, createTime(20, 0)), 60);
    expect(s.balance).toBe(5000 - HOURLY_LIVING_COST.ordinary);
    expect(s.today.income).toBe(0);
  });

  it('only settles when an hour ends', () => {
    const s = run(createGameState(5000, createTime(9, 0)), 59);
    expect(s.balance).toBe(5000);
  });

  it('never lets the balance go negative and records only what was paid', () => {
    const s = run(createGameState(5, createTime(20, 0)), 60, 'doctor', 'luxury');
    expect(s.balance).toBe(0);
    expect(s.today.expenses).toBe(5);
  });

  it('a full working day for an ordinary-life doctor nets money', () => {
    const s = run(createGameState(5000, createTime(7, 0)), 24 * 60);
    expect(s.balance).toBe(5000 + 8 * HOURLY_WAGE.doctor - 24 * HOURLY_LIVING_COST.ordinary);
  });
});

describe('work shifts', () => {
  it('pays nothing when away from the workplace during working hours', () => {
    const s = run(createGameState(5000, createTime(9, 0)), 60, 'doctor', 'ordinary', false);
    expect(s.today).toEqual({ income: 0, expenses: HOURLY_LIVING_COST.ordinary, minutesWorked: 0 });
  });

  it('pays per minute worked: arriving 15 minutes late earns 45 minutes', () => {
    let s = run(createGameState(5000, createTime(9, 0)), 15, 'doctor', 'ordinary', false);
    s = run(s, 45, 'doctor', 'ordinary', true);
    expect(s.today.minutesWorked).toBe(45);
    expect(s.today.income).toBe(Math.round((HOURLY_WAGE.doctor * 45) / 60));
  });

  it('does not count time at the workplace outside working hours', () => {
    const s = run(createGameState(5000, createTime(17, 0)), 60, 'doctor', 'ordinary', true);
    expect(s.today.minutesWorked).toBe(0);
    expect(s.today.income).toBe(0);
  });

  it('players with no career never count as working', () => {
    const s = run(createGameState(5000, createTime(9, 0)), 60, 'none', 'ordinary', true);
    expect(s.today.minutesWorked).toBe(0);
  });
});

describe('rest', () => {
  it('sleeps to the next 07:00, settles every hour and reports the day', () => {
    let s = run(createGameState(5000, createTime(9, 0, 2)), 8 * 60); // work 09:00-17:00
    s = gameReducer(s, { type: 'sleep', atHome: false }, 'doctor', 'ordinary');
    expect(s.time).toMatchObject({ hour: 7, minute: 0, dayOfWeek: 3 });
    expect(s.summary).toEqual({
      minutesWorked: 8 * 60,
      income: 8 * HOURLY_WAGE.doctor,
      expenses: 22 * HOURLY_LIVING_COST.ordinary, // 09:00 -> 07:00 next day
      netChange: 8 * HOURLY_WAGE.doctor - 22 * HOURLY_LIVING_COST.ordinary,
      wakeDayOfWeek: 3,
      rent: 0,
      rough: true,
      atFriend: false,
      evicted: false,
      promotedTo: null,
    });
    expect(s.today).toEqual({ income: 0, expenses: 0, minutesWorked: 0 });
    expect(s.balance).toBe(5000 + s.summary!.netChange);
  });

  it('resting before dawn wakes the same morning', () => {
    const s = gameReducer(createGameState(100, createTime(2, 30, 4)), { type: 'sleep', atHome: false }, 'none', 'student');
    expect(s.time).toMatchObject({ hour: 7, minute: 0, dayOfWeek: 4 });
  });

  it('pauses the clock until the summary is dismissed', () => {
    let s = gameReducer(createGameState(100), { type: 'sleep', atHome: false }, 'none', 'student');
    const paused = run(s, 30);
    expect(paused.time).toEqual(s.time);
    s = gameReducer(s, { type: 'dismissSummary' }, 'none', 'student');
    expect(run(s, 1).time.minute).toBe(1);
  });
});

describe('homes', () => {
  const room = allHomes()[0];
  const afterSleep = (s: GameState, atHome: boolean) => gameReducer(s, { type: 'sleep', atHome }, 'none', 'student');

  it('moving in costs the move-in fee and is refused without enough money', () => {
    const s = gameReducer(createGameState(5000), { type: 'moveIn', homeId: room.id }, 'none', 'student');
    expect(s.home).toBe(room.id);
    expect(s.balance).toBe(5000 - moveInFee(room));
    expect(s.today.expenses).toBe(moveInFee(room));
    const poor = gameReducer(createGameState(10), { type: 'moveIn', homeId: room.id }, 'none', 'student');
    expect(poor.home).toBeNull();
    expect(poor.balance).toBe(10);
    expect(gameReducer(createGameState(5000), { type: 'moveIn', homeId: 'nowhere' }, 'none', 'student').home).toBeNull();
  });

  it('charges rent each night and sleeping at home is a proper rest', () => {
    const home = { ...createGameState(5000, createTime(22, 0)), home: room.id };
    const s = afterSleep(home, true);
    expect(s.summary).toMatchObject({ rent: room.rentPerNight, rough: false, evicted: false });
    expect(s.summary!.expenses).toBe(room.rentPerNight + 9 * HOURLY_LIVING_COST.student);
    // A night in your own bed uses half the usual hunger
    expect(s.fullness).toBeCloseTo(100 - 9 * 60 * FULLNESS_LOSS_PER_MINUTE * HOME_SLEEP_HUNGER_RATE);
  });

  it('sleeping away from home (or with no home) is sleeping rough and leaves you hungrier', () => {
    const away = afterSleep({ ...createGameState(5000, createTime(22, 0)), home: room.id }, false);
    expect(away.summary).toMatchObject({ rent: room.rentPerNight, rough: true });
    const none = afterSleep(createGameState(5000, createTime(22, 0)), false);
    expect(none.summary).toMatchObject({ rent: 0, rough: true });
    expect(none.fullness).toBeCloseTo(100 - 9 * 60 * FULLNESS_LOSS_PER_MINUTE - ROUGH_SLEEP_FULLNESS_LOSS);
  });

  it('evicts a player who cannot pay the night\'s rent', () => {
    const s = afterSleep({ ...createGameState(room.rentPerNight - 1, createTime(22, 0)), home: room.id }, true);
    expect(s.home).toBeNull();
    expect(s.summary).toMatchObject({ rent: 0, rough: true, evicted: true });
  });

  it('moving out gives up the home', () => {
    const s = gameReducer({ ...createGameState(5000), home: room.id }, { type: 'moveOut' }, 'none', 'student');
    expect(s.home).toBeNull();
  });
});

describe('career progression', () => {
  it('promotes after enough hours worked, announces it in the morning and raises the wage', () => {
    // 15h 59m of experience, then one more working hour crosses the 16h rung
    let s = { ...createGameState(5000, createTime(9, 0, 2)), workMinutes: 16 * 60 - 1 };
    s = run(s, 60, 'engineer');
    expect(s.workMinutes).toBe(16 * 60 + 59);
    // The hour is paid at the level held when it ends
    expect(s.today.income).toBe(Math.round(HOURLY_WAGE.engineer * 1.15));
    s = gameReducer(s, { type: 'sleep', atHome: false }, 'engineer', 'ordinary');
    expect(s.summary!.promotedTo).toBe('Engineer');
    s = gameReducer(s, { type: 'dismissSummary' }, 'engineer', 'ordinary');
    // Next working day, still at the new level
    s = run({ ...s, time: createTime(9, 0, 3), fullness: 100 }, 60, 'engineer');
    expect(s.today.income).toBe(Math.round(HOURLY_WAGE.engineer * 1.15));
  });

  it('no promotion on an ordinary day', () => {
    const s = gameReducer(run(createGameState(5000, createTime(9, 0)), 60, 'doctor'), { type: 'sleep', atHome: false }, 'doctor', 'ordinary');
    expect(s.summary!.promotedTo).toBeNull();
  });
});

describe('hunger and eating', () => {
  it('fullness falls over time and empties in 16 game hours', () => {
    const s = run(createGameState(5000, createTime(20, 0)), 60);
    expect(s.fullness).toBeCloseTo(100 - 60 * FULLNESS_LOSS_PER_MINUTE);
    expect(run(createGameState(5000, createTime(20, 0)), 16 * 60 + 5).fullness).toBe(0);
  });

  it('eating costs money, counts as an expense and raises fullness (capped at 100)', () => {
    let s = { ...createGameState(100), fullness: 30 };
    s = gameReducer(s, { type: 'eat', price: 25, fullness: 45 }, 'doctor', 'ordinary');
    expect(s.balance).toBe(75);
    expect(s.fullness).toBe(75);
    expect(s.today.expenses).toBe(25);
    s = gameReducer(s, { type: 'eat', price: 25, fullness: 45 }, 'doctor', 'ordinary');
    expect(s.fullness).toBe(100);
  });

  it("can't buy a meal you can't afford", () => {
    const s = { ...createGameState(10), fullness: 30 };
    expect(gameReducer(s, { type: 'eat', price: 25, fullness: 45 }, 'doctor', 'ordinary')).toBe(s);
  });

  it('very hungry workers are paid half', () => {
    const s = run({ ...createGameState(5000, createTime(9, 0)), fullness: HUNGRY_THRESHOLD - 10 }, 60);
    expect(s.today.minutesWorked).toBe(60);
    expect(s.today.income).toBe(Math.round(HOURLY_WAGE.doctor / 2));
  });
});

describe('shopping', () => {
  it('a purchase costs money and counts as an expense', () => {
    const s = gameReducer(createGameState(1000), { type: 'purchase', price: 450 }, 'doctor', 'ordinary');
    expect(s.balance).toBe(550);
    expect(s.today.expenses).toBe(450);
  });

  it("can't buy what you can't afford, or nothing", () => {
    const s = createGameState(100);
    expect(gameReducer(s, { type: 'purchase', price: 450 }, 'doctor', 'ordinary')).toBe(s);
    expect(gameReducer(s, { type: 'purchase', price: 0 }, 'doctor', 'ordinary')).toBe(s);
  });
});

describe('equipment', () => {
  it('buying equipment costs money once and is refused when unaffordable', () => {
    let s = gameReducer(createGameState(5000), { type: 'buyEquipment', id: 'smartphone' }, 'none', 'student');
    expect(s.equipment).toEqual(['smartphone']);
    expect(s.balance).toBe(4100);
    s = gameReducer(s, { type: 'buyEquipment', id: 'smartphone' }, 'none', 'student');
    expect(s.balance).toBe(4100);
    expect(gameReducer(createGameState(10), { type: 'buyEquipment', id: 'smartphone' }, 'none', 'student').equipment).toEqual([]);
  });

  it("a career's work kit raises that career's pay by 10%", () => {
    const kit = { ...createGameState(5000, createTime(9, 0)), equipment: ['kit-doctor'] };
    expect(run(kit, 60, 'doctor').today.income).toBe(Math.round(HOURLY_WAGE.doctor * 1.1));
    // Someone else's kit does nothing
    expect(run({ ...kit, equipment: ['kit-pilot'] }, 60, 'doctor').today.income).toBe(HOURLY_WAGE.doctor);
  });
});

describe('travel', () => {
  const lagos = districtById('lagos.marina').city;
  const accra = districtById('accra.osu').city;
  const flight = travelOption(lagos, accra, 'flight')!;

  it('flying to Accra costs the fare, takes the flight time and moves you there', () => {
    const start = createGameState(5000, createTime(9, 0));
    const s = gameReducer(start, { type: 'travel', to: 'accra.osu', mode: 'flight' }, 'none', 'student');
    expect(s.districtId).toBe('accra.osu');
    expect(s.time.totalMinutes - start.time.totalMinutes).toBe(flight.minutes);
    expect(s.balance).toBe(5000 - flight.fare - Math.floor(flight.minutes / 60) * HOURLY_LIVING_COST.student);
    expect(s.fullness).toBeLessThan(100);
  });

  it('the coach is cheaper but takes much longer', () => {
    const coach = travelOption(lagos, accra, 'coach')!;
    expect(coach.fare).toBeLessThan(flight.fare);
    expect(coach.minutes).toBeGreaterThan(flight.minutes);
  });

  it('fares and times grow with distance, and short hops are by road only', () => {
    expect(distanceKm(lagos, accra)).toBeGreaterThan(380);
    expect(distanceKm(lagos, accra)).toBeLessThan(440);
    const ibadan = districtById('ibadan.dugbe').city;
    const kano = districtById('kano.sabon-gari').city;
    expect(travelOptions(lagos, ibadan).map((o) => o.mode)).toEqual(['coach']);
    expect(travelOption(lagos, kano, 'flight')!.fare).toBeGreaterThan(flight.fare);
    expect(travelOption(lagos, kano, 'coach')!.minutes).toBeGreaterThan(travelOption(lagos, ibadan, 'coach')!.minutes);
    expect(travelOptions(lagos, lagos)).toEqual([]);
    const s = createGameState(9000);
    expect(gameReducer(s, { type: 'travel', to: 'ibadan.dugbe', mode: 'flight' }, 'none', 'student')).toBe(s);
  });

  it('refuses trips you cannot afford, to unknown places or to where you already are', () => {
    const poor = createGameState(100);
    expect(gameReducer(poor, { type: 'travel', to: 'accra.osu', mode: 'flight' }, 'none', 'student')).toBe(poor);
    const rich = createGameState(9000);
    expect(gameReducer(rich, { type: 'travel', to: 'atlantis', mode: 'coach' }, 'none', 'student')).toBe(rich);
    expect(gameReducer(rich, { type: 'travel', to: 'lagos.marina', mode: 'coach' }, 'none', 'student')).toBe(rich);
  });

  it('you are paid in whichever city you work', () => {
    const accra = { ...createGameState(5000, createTime(9, 0)), districtId: 'accra.osu' };
    expect(run(accra, 60, 'doctor').today.income).toBe(HOURLY_WAGE.doctor);
  });
});

describe('relationships', () => {
  const lagos = () => createGameState(5000, createTime(10, 0, 2));
  const social = (s: GameState, residentId: string, activity: 'chat' | 'treat' | 'hangout') =>
    gameReducer(s, { type: 'socialise', residentId, activity }, 'none', 'student');

  it('chatting builds friendship, once per resident per day', () => {
    let s = social(lagos(), 'tunde', 'chat');
    expect(s.relationships.tunde.points).toBe(ACTIVITIES.chat.points);
    s = social(s, 'tunde', 'treat');
    expect(s.relationships.tunde.points).toBe(ACTIVITIES.chat.points);
    // Another resident is fine the same day
    expect(social(s, 'adaeze', 'chat').relationships.adaeze.points).toBe(ACTIVITIES.chat.points);
    // The next day you can see Tunde again
    const tomorrow = social({ ...s, time: { ...s.time, totalMinutes: s.time.totalMinutes + 1440 } }, 'tunde', 'chat');
    expect(tomorrow.relationships.tunde.points).toBe(2 * ACTIVITIES.chat.points);
  });

  it('treats cost money; hanging out needs a friendship and takes an hour', () => {
    const treated = social(lagos(), 'tunde', 'treat');
    expect(treated.balance).toBe(5000 - ACTIVITIES.treat.cost);
    expect(social(lagos(), 'tunde', 'hangout').relationships.tunde).toBeUndefined();
    const friends = { ...lagos(), relationships: { tunde: { points: FRIENDSHIP_LEVELS[2].points, lastDay: -1 } } };
    const s = social(friends, 'tunde', 'hangout');
    expect(s.relationships.tunde.points).toBe(FRIENDSHIP_LEVELS[2].points + ACTIVITIES.hangout.points);
    expect(s.time.totalMinutes - friends.time.totalMinutes).toBe(60);
  });

  it('you can only spend time with people in the city you are in', () => {
    expect(social(lagos(), 'kojo', 'chat').relationships.kojo).toBeUndefined();
    expect(social({ ...lagos(), districtId: 'accra.osu' }, 'kojo', 'chat').relationships.kojo.points).toBe(ACTIVITIES.chat.points);
  });

  it("sleeping on a close friend's couch is not sleeping rough", () => {
    const s = gameReducer(createGameState(5000, createTime(22, 0)), { type: 'sleep', atHome: false, atFriend: true }, 'none', 'student');
    expect(s.summary).toMatchObject({ rough: false, atFriend: true });
  });
});

describe('work tasks', () => {
  const atWork = (hour = 10) => createGameState(5000, createTime(hour, 0, 2));
  const task = (s: GameState) => taskForHour('doctor', s.time.totalMinutes)!;
  const answer = (s: GameState, quality: 'best' | 'ok' | 'poor', atWorkplace = true) => {
    const t = task(s);
    return gameReducer(s, { type: 'workTask', taskId: t.id, choice: t.options.findIndex((o) => o.quality === quality), atWorkplace }, 'doctor', 'ordinary');
  };

  it('a good call pays a bonus and counts towards promotion', () => {
    const s = answer(atWork(), 'best');
    expect(s.balance).toBe(5000 + Math.round(HOURLY_WAGE.doctor * TASK_REWARD.best.payShare));
    expect(s.workMinutes).toBe(TASK_REWARD.best.xpMinutes);
    expect(s.today.income).toBe(Math.round(HOURLY_WAGE.doctor * TASK_REWARD.best.payShare));
  });

  it('a poor call earns nothing extra', () => {
    const s = answer(atWork(), 'poor');
    expect(s.balance).toBe(5000);
    expect(s.lastTaskHour).toBe(10);
  });

  it('one task per hour, only at work, only in working hours, only the task on offer', () => {
    const once = answer(atWork(), 'best');
    expect(answer(once, 'best')).toBe(once);
    const away = atWork();
    expect(answer(away, 'best', false)).toBe(away);
    const night = atWork(22);
    expect(answer(night, 'best')).toBe(night);
    const s = atWork();
    expect(gameReducer(s, { type: 'workTask', taskId: 'pil-weather', choice: 0, atWorkplace: true }, 'doctor', 'ordinary')).toBe(s);
  });
});
