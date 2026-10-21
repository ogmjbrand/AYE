/**
 * Runs the Supabase migration in a real Postgres (PGlite, in-process) and
 * plays it as signed-in players, including ones trying to cheat.
 * Supabase's auth schema, roles and default grants are stubbed the way a
 * Supabase project sets them up.
 */
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
// Every migration, applied in filename (timestamp) order, as Supabase would
const MIGRATIONS = Object.entries(import.meta.glob('../../supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, sql]) => sql);
import { FASHION_ITEMS } from '../lib/fashion';
import { EQUIPMENT } from '../lib/equipment';
import { HOURLY_LIVING_COST, HOURLY_WAGE, STARTING_BALANCE } from '../lib/gameState';
import { careerLadder } from '../lib/progression';

const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  -- Supabase grants everything on new public tables to the API roles; RLS and revokes must protect the data
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`;

const ALICE = '11111111-1111-1111-1111-111111111111';
const BOB = '22222222-2222-2222-2222-222222222222';

let db: PGlite;

/** Runs a query as a signed-in player (or as an anonymous visitor). */
async function as<T = Record<string, unknown>>(user: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false); set role ${user ? 'authenticated' : 'anon'};`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role;');
  }
}
const admin = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;
const balance = async (character: string) =>
  (await admin<{ b: number }>('select public.balance_of($1) as b', [character]))[0].b;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const sql of MIGRATIONS) await db.exec(sql);
  await db.exec(`insert into auth.users (id) values ('${ALICE}'), ('${BOB}');`);
}, 30_000);

describe('catalogue matches the game', () => {
  it('has every fashion item and piece of equipment at the same price', async () => {
    const rows = await admin<{ id: string; price: number; career: string | null; pay_bonus: string }>('select id, price, career, pay_bonus from public.shop_items');
    const byId = new Map(rows.map((r) => [r.id, r]));
    // Collectibles (earned through achievements) are never for sale, so the server doesn't list them
    const forSale = FASHION_ITEMS.filter((i) => i.collection !== 'Rewards');
    expect(rows.length).toBe(forSale.length + EQUIPMENT.length);
    for (const i of forSale) expect(byId.get(i.id)?.price, i.id).toBe(i.price);
    for (const e of EQUIPMENT) {
      expect(byId.get(e.id)?.price, e.id).toBe(e.price);
      expect(byId.get(e.id)?.career ?? undefined, e.id).toBe(e.career);
      expect(Number(byId.get(e.id)?.pay_bonus), e.id).toBe(e.payBonus ?? 0);
    }
  });

  it('has the same wages, promotion ladder and lifestyles', async () => {
    const careers = await admin<{ id: string; hourly_wage: number }>('select * from public.careers');
    expect(Object.fromEntries(careers.map((c) => [c.id, c.hourly_wage]))).toEqual(HOURLY_WAGE);
    const levels = await admin<{ min_hours: number; pay: string }>('select min_hours, pay from public.career_levels order by rung');
    expect(levels.map((l) => [l.min_hours, Number(l.pay)])).toEqual(careerLadder('doctor').map((l) => [l.hours, l.pay]));
    const lifestyles = await admin<{ id: string; starting_balance: number; hourly_living_cost: number }>('select * from public.lifestyles');
    for (const l of lifestyles) {
      expect(l.starting_balance).toBe(STARTING_BALANCE[l.id as keyof typeof STARTING_BALANCE]);
      expect(l.hourly_living_cost).toBe(HOURLY_LIVING_COST[l.id as keyof typeof HOURLY_LIVING_COST]);
    }
  });
});

describe('player life on the server', () => {
  let alice: string;

  beforeAll(async () => {
    const [row] = await as<{ id: string }>(ALICE, `select public.create_character('Ada', 'doctor', 'ordinary', '{"lookId":"female-adult-08"}') as id`);
    alice = row.id;
  });

  it('a new character starts with the lifestyle balance, written to the ledger', async () => {
    expect(await balance(alice)).toBe(STARTING_BALANCE.ordinary);
    const ledger = await as(ALICE, 'select amount, reason from public.wallet_ledger');
    expect(ledger).toEqual([{ amount: STARTING_BALANCE.ordinary, reason: 'starting_balance' }]);
  });

  it('one life per account', async () => {
    await expect(as(ALICE, `select public.create_character('Ada again', 'doctor', 'ordinary')`)).rejects.toThrow();
  });

  it('players cannot write money, items or progress directly', async () => {
    await expect(as(ALICE, `insert into public.wallet_ledger (character_id, amount, reason) values ($1, 1000000, 'wages')`, [alice])).rejects.toThrow(/permission denied/);
    await expect(as(ALICE, `update public.wallet_ledger set amount = 999999`)).rejects.toThrow(/permission denied/);
    await expect(as(ALICE, `insert into public.inventory (character_id, item_id) values ($1, 'kit-doctor')`, [alice])).rejects.toThrow(/permission denied/);
    await expect(as(ALICE, `update public.characters set work_minutes = 100000`)).rejects.toThrow(/permission denied/);
    await expect(as(ALICE, `update public.shop_items set price = 1`)).rejects.toThrow(/permission denied/);
    expect(await balance(alice)).toBe(STARTING_BALANCE.ordinary);
  });

  it("players cannot see or touch anyone else's life", async () => {
    const [bobRow] = await as<{ id: string }>(BOB, `select public.create_character('Bob', 'pilot', 'luxury') as id`);
    expect(await as(ALICE, 'select id from public.characters')).toEqual([{ id: alice }]);
    expect((await as(ALICE, 'select * from public.wallet_ledger where character_id = $1', [bobRow.id])).length).toBe(0);
    await expect(as(ALICE, `select public.buy_item($1, 'smartphone')`, [bobRow.id])).rejects.toThrow(/no such character/);
    await expect(as(null, 'select public.claim_work($1, 60)', [alice])).rejects.toThrow(/permission denied/);
  });

  it('buying checks the real price, the balance and ownership on the server', async () => {
    const [{ b }] = await as<{ b: number }>(ALICE, `select public.buy_item($1, 'top-kente-gold') as b`, [alice]);
    expect(b).toBe(STARTING_BALANCE.ordinary - 900);
    await expect(as(ALICE, `select public.buy_item($1, 'top-kente-gold')`, [alice])).rejects.toThrow(/already owned/);
    await expect(as(ALICE, `select public.buy_item($1, 'free-money')`, [alice])).rejects.toThrow(/unknown item/);
    // Too expensive: refused by the server, balance unchanged
    await as(ALICE, `select public.spend($1, $2, 'rent')`, [alice, b - 100]);
    await expect(as(ALICE, `select public.buy_item($1, 'smartphone')`, [alice])).rejects.toThrow(/insufficient funds/);
    expect(await balance(alice)).toBe(100);
  });

  it('spending can never add money or overdraw', async () => {
    await expect(as(ALICE, `select public.spend($1, -5000, 'food')`, [alice])).rejects.toThrow(/invalid amount/);
    await expect(as(ALICE, `select public.spend($1, 500, 'food')`, [alice])).rejects.toThrow(/insufficient funds/);
    await expect(as(ALICE, `select public.spend($1, 5, 'wages')`, [alice])).rejects.toThrow(/invalid reason/);
  });

  it('wages are paid only for time the server allows', async () => {
    // Just claimed nothing yet, but the character was created moments ago: almost no time has passed
    const before = await balance(alice);
    await as(ALICE, 'select public.claim_work($1, 480)', [alice]);
    expect(await balance(alice)).toBeLessThanOrEqual(before + HOURLY_WAGE.doctor); // at most a few seconds' worth
    // An hour of real time later (simulated), a whole working day can be claimed, but no more
    await admin(`update public.characters set last_work_claim = now() - interval '1 hour' where id = $1`, [alice]);
    const start = await balance(alice);
    await as(ALICE, 'select public.claim_work($1, 100000)', [alice]);
    expect(await balance(alice)).toBe(start + 8 * HOURLY_WAGE.doctor);
    // Straight away again: nothing more
    await as(ALICE, 'select public.claim_work($1, 480)', [alice]);
    expect(await balance(alice)).toBe(start + 8 * HOURLY_WAGE.doctor);
  });

  it('promotions and work kits raise pay on the server too', async () => {
    await admin(`update public.characters set work_minutes = 16 * 60, last_work_claim = now() - interval '10 minutes' where id = $1`, [alice]);
    await admin(`insert into public.inventory (character_id, item_id) values ($1, 'kit-doctor')`, [alice]);
    const start = await balance(alice);
    await as(ALICE, 'select public.claim_work($1, 60)', [alice]);
    expect(await balance(alice)).toBe(start + Math.round(HOURLY_WAGE.doctor * 1.15 * 1.1));
  });

  it('profile (looks and identity) can be updated, but only your own', async () => {
    await as(ALICE, `select public.update_profile($1, '{"lookId":"female-adult-03"}')`, [alice]);
    expect((await as<{ profile: { lookId: string } }>(ALICE, 'select profile from public.characters'))[0].profile.lookId).toBe('female-adult-03');
    await expect(as(BOB, `select public.update_profile($1, '{}')`, [alice])).rejects.toThrow(/no such character/);
  });
});
