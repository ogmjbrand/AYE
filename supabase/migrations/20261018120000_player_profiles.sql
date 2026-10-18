-- AYE player identity foundation. Local migration only; inspect remote schema before deployment.

create table public.player_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username = lower(username) and username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 40),
  bio text not null default ''
    check (char_length(bio) <= 160),
  discoverable boolean not null default false,
  messaging_privacy text not null default 'friends'
    check (messaging_privacy in ('nobody', 'friends', 'everyone')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index player_profiles_discovery_idx
  on public.player_profiles (username text_pattern_ops)
  where discoverable;

alter table public.player_profiles enable row level security;

create policy "read own player profile" on public.player_profiles
  for select to authenticated using (id = auth.uid());

revoke all on public.player_profiles from public, anon, authenticated;
grant select on public.player_profiles to authenticated;

create function public.create_player_profile(
  p_username text,
  p_display_name text,
  p_bio text default '',
  p_discoverable boolean default false,
  p_messaging_privacy text default 'friends'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  insert into public.player_profiles (
    id, username, display_name, bio, discoverable, messaging_privacy
  )
  values (
    v_user,
    lower(btrim(p_username)),
    btrim(p_display_name),
    btrim(coalesce(p_bio, '')),
    coalesce(p_discoverable, false),
    coalesce(p_messaging_privacy, 'friends')
  );
end
$$;

create function public.update_player_profile(
  p_username text,
  p_display_name text,
  p_bio text,
  p_discoverable boolean,
  p_messaging_privacy text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;

  update public.player_profiles
  set username = lower(btrim(p_username)),
      display_name = btrim(p_display_name),
      bio = btrim(coalesce(p_bio, '')),
      discoverable = coalesce(p_discoverable, false),
      messaging_privacy = coalesce(p_messaging_privacy, 'friends'),
      updated_at = now()
  where id = v_user;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;
end
$$;

-- Only explicitly discoverable profiles are searchable, and only public fields leave this function.
create function public.search_player_profiles(p_prefix text, p_limit integer default 10)
returns table (id uuid, username text, display_name text, bio text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prefix text := lower(btrim(coalesce(p_prefix, '')));
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if v_prefix !~ '^[a-z0-9_]{1,24}$' then
    raise exception 'invalid username prefix';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 20 then
    raise exception 'invalid result limit';
  end if;

  return query
  select p.id, p.username, p.display_name, p.bio
  from public.player_profiles p
  where p.discoverable
    and p.id <> auth.uid()
    and left(p.username, char_length(v_prefix)) = v_prefix
  order by p.username
  limit p_limit;
end
$$;

revoke all on function public.create_player_profile(text, text, text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.update_player_profile(text, text, text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.search_player_profiles(text, integer)
  from public, anon, authenticated;

grant execute on function public.create_player_profile(text, text, text, boolean, text)
  to authenticated;
grant execute on function public.update_player_profile(text, text, text, boolean, text)
  to authenticated;
grant execute on function public.search_player_profiles(text, integer)
  to authenticated;
