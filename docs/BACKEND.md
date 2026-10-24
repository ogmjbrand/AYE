# Backend (Milestone 4): ready, not switched on

The game still saves in the browser only. The server side for accounts and
trustworthy money is written and tested, but **nothing has been created,
connected or paid for**. Switching it on needs your approval (see
`ARCHITECTURE.md`, "Decisions needed").

## What exists

| File | What it is |
|---|---|
| `supabase/migrations/20261016120000_player_life.sql` | The database: catalogue (wages, promotion ladder, lifestyles, shop prices), characters, an append-only wallet ledger and inventory, row-level security, and the only functions that can move money. |
| `src/backend/schema.test.ts` | Runs that migration in a real Postgres inside the test suite (PGlite) and plays it as signed-in players, including cheaters. |

### The rules the database enforces

- A player can **read** their own character, ledger and inventory, and nobody else's. They can **never write** those tables directly.
- **Balance = sum of the ledger.** Money only moves through `create_character`, `buy_item`, `spend` and `claim_work`.
- **Prices and pay come from the server's catalogue**, which a test keeps identical to the game's data in `src/lib`.
- **Wages are bounded by real time**: one game minute per 3 real seconds since the last claim, at most 8 hours per claim, paid at the server's wage × promotion level × work-kit bonus.
- **Spending can't create money or overdraw.**
- One life per account (for now).

What it **can't** check: the server doesn't see where the player stands, so it limits how much work can be claimed, not whether the player was at the workplace. That needs the authoritative game server planned for multiplayer (Milestone 8).

## Switching it on (after approval)

1. Create a free project at supabase.com under your own account (free tier; limits apply, and inactive projects pause).
2. In the project's **SQL editor**, paste and run the migration file. Or, with the Supabase CLI: `supabase link` then `supabase db push`.
3. Turn on **Email** sign-in under Authentication → Providers.
4. Put the project URL and the **publishable key** in `.env.local` at the project root:
   ```
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   ```
   `.env.local` is git-ignored. Never put the service-role (secret) key in the game: it bypasses every rule above. `src/backend/supabase.ts` refuses a secret key if one is put there by mistake.
5. Then the remaining client work: a sign-in screen on the entry page, and the game calling these functions instead of saving money to the browser, with a guest mode that stays offline.

**Status:** `@supabase/supabase-js` is installed and `src/backend/supabase.ts` creates the client from `.env.local` (a project URL and publishable key are set locally, not committed). The migrations haven't been confirmed as applied to that project, and the game doesn't use the client yet: it still saves in the browser.

## Running the tests

`npm.cmd test` runs everything, including the database tests (no account or internet needed).
