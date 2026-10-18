# Supabase foundation: local, not deployed

AYE still loads and saves game lives in this browser. The Supabase client,
email-link authentication and player-profile foundation are implemented, but
this workspace has no project URL/key configuration. The deployment status of
the existing migrations is unknown. Nothing has been connected to or changed
in the live project.

## What exists locally

| File | What it is |
|---|---|
| `supabase/migrations/20261016120000_player_life.sql` | Catalogue, characters, wallet ledger and inventory, with RLS and server-side functions for money changes. |
| `supabase/migrations/20261017120000_fashion_collections.sql` | Additional catalogue rows; depends on the `shop_items` table from the life migration. |
| `supabase/migrations/20261018120000_player_profiles.sql` | Auth-linked profiles, private-by-default discoverability and messaging privacy, owner-only profile reads/updates, and a limited search RPC that returns only public fields. |
| `src/backend/schema.test.ts` | Applies all local migrations in timestamp order in PGlite and tests database permissions and function behavior. |
| `src/lib/supabase.ts` | Optional browser client configured from Vite variables; rejects secret/service-role key formats. |
| `src/components/CloudAccountPanel.tsx` | Email sign-in link and profile creation/editing. It does not migrate or sync a game save. |

### Existing life migration

- Character, wallet ledger and inventory reads are restricted to their owner.
- Browser roles cannot write player balances, inventory, or progress directly.
- Balance is computed from the ledger; purchase, spend, and work payout are server functions.
- The fashion migration is ordered after the migration that creates `shop_items`.

### Profile foundation

- `player_profiles.id` is the authenticated `auth.users.id`; the client cannot submit another user's id.
- A profile stores only username, display name, bio, discoverability, messaging privacy and timestamps. It stores no email, game save, wallet, inventory or location.
- New profiles default to undiscoverable and allow messages from friends only.
- The table is readable only by its owner. Search is an authenticated, bounded RPC that returns only discoverable profiles and the public fields `id`, `username`, `display_name`, and `bio`.
- Direct client inserts, updates and deletes are revoked. Profile creation and updates use owner-bound database functions.

## Local configuration

The ignored `.env.local` file may contain:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

Use a publishable/anon key only. The client rejects `sb_secret_*` keys and
legacy JWT keys whose role is not `anon`. Never put a service-role key in any
`VITE_` variable. Configure Email sign-in, the project Site URL and its allowed
redirect URLs in Supabase Auth before testing email links.

The account panel is explicitly unavailable when these variables are absent or
invalid. Guest play remains available. Supabase Auth's own session key is
separate from `aye_character` and `aye_progress`; no local save is read,
uploaded, reset or overwritten.

## Safe live inspection and deployment plan

No live schema inspection or deployment has been performed. Before applying
anything:

1. Confirm the target project reference in the Supabase dashboard and confirm
   that it is the existing AYE project.
2. Back up the project using its configured backup/PITR facility or a verified
   database dump. Confirm that the backup can be restored and identify a
   recovery owner before proceeding.
3. With the Supabase CLI linked to that exact project, inspect migration
   history using `supabase migration list --linked`. Compare it with the local
   files above. Do not infer deployment from local files.
4. Inspect the live schema and RLS policies read-only. Compare all existing
   `public` tables, functions, policies and `supabase_migrations` history with
   the local SQL. Resolve any name, policy or migration-history conflict before
   proposing a migration plan.
5. Review the resulting plan and backup with the project owner. Test the
   migrations against a staging project first. The profile migration adds a
   new table and functions, but must not be applied blindly if that table or
   related objects already exist.
6. Only after explicit approval, use the reviewed CLI dry run and deployment
   procedure. This implementation has not run `supabase link`, `db push`, or
   any production write command.

The PGlite tests validate the local SQL and simulated RLS identities; they do
not prove that these migrations are deployed or that live Supabase Auth is
configured. Realtime messaging, connection requests, cloud game-save sync,
payments and shared multiplayer are not implemented by this foundation.

## Tests

`npm test` runs all tests, including the PGlite migration and RLS tests. No
Supabase project credentials or network access are required.
