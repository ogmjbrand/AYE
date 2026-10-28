-- AYE: a player's public account profile (username, display name, picture), one per signed-in account.
-- NOT DEPLOYED from here; apply in the Supabase SQL editor or with `supabase db push` (see docs/BACKEND.md).

create table public.player_profiles (
  id uuid primary key references auth.users(id)
    on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.player_profiles
enable row level security;

create policy "Players can view their own profile"
on public.player_profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Players can create their own profile"
on public.player_profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Players can update their own profile"
on public.player_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
