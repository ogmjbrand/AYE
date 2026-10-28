import { describe, expect, it } from 'vitest';
import {
  APPS, DEFAULT_DOCK, MAX_PHOTOS, batteryNow, loadPhone, newPhone, replyFrom, sanitisePhone, savePhone, searchApps, unreadCount,
} from './phone';
import { PHONE_CONTACT, SCENT_BONUS, RIDE_MAX_METRES, createGameState, createTime, gameReducer, rideFare, rideMinutes, type GameState } from './gameState';
import { lifeReducer } from './life';
import { RESIDENTS, sanitiseRelationships } from './people';

const act = (s: GameState, a: Parameters<typeof gameReducer>[1]) => gameReducer(s, a, 'engineer', 'ordinary');

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
}

describe('the phone', () => {
  it('has every app once, the dock included', () => {
    const ids = APPS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of DEFAULT_DOCK) expect(ids).toContain(d);
    const p = newPhone();
    expect([...p.dock, ...p.order].sort()).toEqual([...ids].sort());
  });

  it('search finds apps by name, category and keyword', () => {
    expect(searchApps('bank').map((a) => a.id)).toContain('bank');
    expect(searchApps('taxi').map((a) => a.id)).toEqual(['ride']);
    expect(searchApps('finance').map((a) => a.id)).toEqual(expect.arrayContaining(['bank', 'wallet']));
    expect(searchApps('   ')).toEqual([]);
  });

  it('a saved phone comes back as it was; bad data is dropped and new apps are added', () => {
    const store = new MemoryStorage() as unknown as Storage;
    const p = { ...newPhone(100), wallpaper: 'gold' as const, sound: false, battery: 42 };
    savePhone('linda', p, store);
    expect(loadPhone('linda', 100, store)).toEqual(p);
    expect(loadPhone('nobody', 5, store)).toEqual(newPhone(5));

    const odd = sanitisePhone({ wallpaper: 'neon', dock: ['bank', 'bank', 'nope'], order: ['jobs'], battery: 900, photos: [{ id: 'x', src: 'javascript:alert(1)', t: 1, place: '' }], threads: { r: [{ from: 'hacker', text: 'x', t: 1 }, { from: 'me', text: 'hi', t: 2 }] } });
    expect(odd.wallpaper).toBe('lagoon-dusk');
    expect(odd.dock).toEqual(['bank']);
    expect(odd.order[0]).toBe('jobs');
    expect([...odd.dock, ...odd.order].length).toBe(APPS.length);
    expect(odd.battery).toBe(100);
    expect(odd.photos).toEqual([]);
    expect(odd.threads.r).toEqual([{ from: 'me', text: 'hi', t: 2 }]);
    expect(MAX_PHOTOS).toBeGreaterThan(0);
  });

  it('the battery drains away from home and charges at home', () => {
    const p = { battery: 50, batteryAt: 0 };
    expect(batteryNow(p, 120, false)).toBe(45);
    expect(batteryNow(p, 60, true)).toBe(90);
    expect(batteryNow(p, 6000, true)).toBe(100);
    expect(batteryNow(p, 6000, false)).toBe(0);
  });

  it('counts unread notifications', () => {
    expect(unreadCount({ inbox: [{ id: 'a', app: 'bank', title: '', body: '', t: 0, read: false }, { id: 'b', app: 'bank', title: '', body: '', t: 0, read: true }] })).toBe(1);
  });

  it('residents reply in their own words, and only friends say yes to meeting up', () => {
    const r = RESIDENTS[0];
    expect(replyFrom(r, 0, 'hi')).toBe(r.lines[0]);
    expect(replyFrom(r, 0, 'meet')).toMatch(/another time/);
    expect(replyFrom(r, 40, 'meet')).toMatch(/Yes/);
  });
});

describe('texting and calling', () => {
  const r = RESIDENTS[0];
  const met = (points = 10): GameState => ({ ...createGameState(1000, createTime(12, 0)), needs: { energy: 80, hygiene: 80, fun: 50, social: 40 }, relationships: { [r.id]: { points, lastDay: -1 } } });

  it('needs their number: you have to have met them', () => {
    const s0 = createGameState(1000, createTime(12, 0));
    expect(act(s0, { type: 'phoneFriend', residentId: r.id, kind: 'text' })).toBe(s0);
  });

  it('a text builds the friendship a little, once a day, wherever they are', () => {
    const s0 = { ...met(), districtId: 'somewhere-else' };
    const s1 = act(s0, { type: 'phoneFriend', residentId: r.id, kind: 'text' });
    expect(s1.relationships[r.id].points).toBe(10 + PHONE_CONTACT.text.points);
    expect(s1.time.totalMinutes).toBe(s0.time.totalMinutes);
    expect(s1.needs.social).toBeGreaterThan(s0.needs.social);
    expect(act(s1, { type: 'phoneFriend', residentId: r.id, kind: 'call' })).toBe(s1);
    // Meeting them today is still open
    expect(s1.relationships[r.id].lastDay).toBe(-1);
  });

  it('a call takes a few minutes and does more', () => {
    const s0 = met();
    const s1 = act(s0, { type: 'phoneFriend', residentId: r.id, kind: 'call' });
    expect(s1.relationships[r.id].points).toBe(10 + PHONE_CONTACT.call.points);
    expect(s1.time.totalMinutes - s0.time.totalMinutes).toBe(PHONE_CONTACT.call.minutes);
  });

  it('the day you last phoned is saved', () => {
    expect(sanitiseRelationships({ [r.id]: { points: 12, lastDay: 3, lastPhone: 4 } })[r.id]).toEqual({ points: 12, lastDay: 3, lastHugDay: -1, lastPhone: 4 });
    expect(sanitiseRelationships({ [r.id]: { points: 12, lastDay: 3, lastPhone: 'x' } })[r.id]).toEqual({ points: 12, lastDay: 3, lastHugDay: -1 });
  });
});

describe('a taxi', () => {
  it('charges the fare for the distance and takes its time', () => {
    const s0 = createGameState(1000, createTime(12, 0));
    const s1 = act(s0, { type: 'ride', metres: 400 });
    const waited = act(s0, { type: 'wait', minutes: rideMinutes(400) });
    expect(s1.balance).toBe(waited.balance - rideFare(400));
    expect(s1.time.totalMinutes - s0.time.totalMinutes).toBe(rideMinutes(400));
  });

  it('refuses rides you can’t pay for or that make no sense', () => {
    const poor = createGameState(10, createTime(12, 0));
    expect(act(poor, { type: 'ride', metres: 400 })).toBe(poor);
    const s0 = createGameState(1000, createTime(12, 0));
    expect(act(s0, { type: 'ride', metres: 0 })).toBe(s0);
    expect(act(s0, { type: 'ride', metres: Number.NaN })).toBe(s0);
    expect(act(s0, { type: 'ride', metres: RIDE_MAX_METRES + 1 })).toBe(s0);
  });

  it('shows as its own line in the bank statement', () => {
    const s0 = createGameState(1000, createTime(12, 0));
    const s1 = lifeReducer(s0, { type: 'ride', metres: 400 }, 'engineer', 'ordinary');
    expect(s1.life.ledger.find((e) => e.label === 'Taxi ride')?.amount).toBe(-rideFare(400));
  });
});

describe('wearing a fragrance', () => {
  const r = RESIDENTS[0];
  const base = (): GameState => ({ ...createGameState(1000, createTime(12, 0)), districtId: r.district, needs: { energy: 80, hygiene: 80, fun: 50, social: 40 }, relationships: { [r.id]: { points: 10, lastDay: -1, lastPhone: 3 } } });
  it('people warm to you a little more, and it keeps the day you last phoned', () => {
    const plain = act(base(), { type: 'socialise', residentId: r.id, activity: 'chat' });
    const scented = act(base(), { type: 'socialise', residentId: r.id, activity: 'chat', scent: true });
    expect(scented.relationships[r.id].points - plain.relationships[r.id].points).toBe(SCENT_BONUS.points);
    expect(scented.needs.social).toBeGreaterThan(plain.needs.social);
    expect(scented.relationships[r.id].lastPhone).toBe(3);
  });
});
