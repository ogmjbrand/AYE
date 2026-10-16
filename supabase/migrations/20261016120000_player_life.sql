-- AYE Milestone 4: persistent, trustworthy player life.
--
-- NOT DEPLOYED. This migration is ready for a Supabase project but nothing
-- has been created or connected; see docs/BACKEND.md.
--
-- Rules:
--   * A player can read their own character, wallet and inventory, and
--     nothing else. They can never insert, update or delete those rows.
--   * Money only moves through the functions at the bottom (security
--     definer). Balance is the sum of the append-only ledger.
--   * Prices, wages and pay rates live in catalogue tables here, so a
--     modified client cannot change them. Tests check they match the game
--     data in src/lib (src/backend/schema.test.ts).
--   * Wages are bounded by real time: one game minute per 3 real seconds
--     since the last claim (the game clock speed), at most 8 hours per claim.
--     The server cannot see where the player stands, so it limits how much
--     can be claimed, not whether the player was at work.

-- ---------------------------------------------------------------- catalogue

create table public.careers (
  id text primary key,
  hourly_wage integer not null check (hourly_wage >= 0)
);

create table public.career_levels (
  rung smallint primary key,
  min_hours integer not null check (min_hours >= 0),
  pay numeric(4, 2) not null check (pay > 0)
);

create table public.lifestyles (
  id text primary key,
  starting_balance integer not null check (starting_balance >= 0),
  hourly_living_cost integer not null check (hourly_living_cost >= 0)
);

create table public.shop_items (
  id text primary key,
  kind text not null check (kind in ('fashion', 'equipment')),
  price integer not null check (price > 0),
  -- Work kits raise pay for one career
  career text references public.careers (id),
  pay_bonus numeric(4, 2) not null default 0 check (pay_bonus >= 0)
);

-- ---------------------------------------------------------------- player data

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  -- One life per account for now
  owner uuid not null unique references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  career text not null references public.careers (id),
  lifestyle text not null references public.lifestyles (id),
  -- Identity and appearance (name of look, height, body shape, home country...). Not used for money.
  profile jsonb not null default '{}'::jsonb check (pg_column_size(profile) < 8192),
  work_minutes integer not null default 0 check (work_minutes >= 0),
  last_work_claim timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.wallet_ledger (
  id bigint generated always as identity primary key,
  character_id uuid not null references public.characters (id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (reason in (
    'starting_balance', 'wages', 'purchase', 'food', 'rent', 'move_in', 'travel', 'living_costs', 'treat'
  )),
  ref text check (ref is null or char_length(ref) <= 80),
  created_at timestamptz not null default now()
);
create index wallet_ledger_character_idx on public.wallet_ledger (character_id);

create table public.inventory (
  character_id uuid not null references public.characters (id) on delete cascade,
  item_id text not null references public.shop_items (id),
  acquired_at timestamptz not null default now(),
  primary key (character_id, item_id)
);

-- ---------------------------------------------------------------- access

alter table public.careers enable row level security;
alter table public.career_levels enable row level security;
alter table public.lifestyles enable row level security;
alter table public.shop_items enable row level security;
alter table public.characters enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.inventory enable row level security;

create policy "catalogue is public" on public.careers for select using (true);
create policy "catalogue is public" on public.career_levels for select using (true);
create policy "catalogue is public" on public.lifestyles for select using (true);
create policy "catalogue is public" on public.shop_items for select using (true);

create policy "read own character" on public.characters
  for select to authenticated using (owner = auth.uid());
create policy "read own ledger" on public.wallet_ledger
  for select to authenticated using (character_id in (select id from public.characters where owner = auth.uid()));
create policy "read own inventory" on public.inventory
  for select to authenticated using (character_id in (select id from public.characters where owner = auth.uid()));

-- Belt and braces: even if a write policy were added by mistake, clients hold no write privileges
revoke insert, update, delete, truncate on
  public.careers, public.career_levels, public.lifestyles, public.shop_items,
  public.characters, public.wallet_ledger, public.inventory
  from anon, authenticated;

-- ---------------------------------------------------------------- functions

create function public.balance_of(p_character uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::integer from public.wallet_ledger where character_id = p_character
$$;

-- The caller's own character, locked for the rest of the transaction so concurrent calls queue up
create function public.own_character_for_update(p_character uuid)
returns public.characters
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.characters;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select * into c from public.characters where id = p_character and owner = auth.uid() for update;
  if not found then
    raise exception 'no such character' using errcode = '42501';
  end if;
  return c;
end
$$;

create function public.create_character(p_name text, p_career text, p_lifestyle text, p_profile jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_start integer;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  select starting_balance into v_start from public.lifestyles where id = p_lifestyle;
  if not found then
    raise exception 'unknown lifestyle';
  end if;
  insert into public.characters (owner, name, career, lifestyle, profile)
  values (auth.uid(), btrim(p_name), p_career, p_lifestyle, coalesce(p_profile, '{}'::jsonb))
  returning id into v_id;
  if v_start > 0 then
    insert into public.wallet_ledger (character_id, amount, reason) values (v_id, v_start, 'starting_balance');
  end if;
  return v_id;
end
$$;

-- Appearance and identity can change freely; money and progress cannot
create function public.update_profile(p_character uuid, p_profile jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.own_character_for_update(p_character);
  update public.characters set profile = coalesce(p_profile, '{}'::jsonb) where id = p_character;
end
$$;

create function public.buy_item(p_character uuid, p_item text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price integer;
  v_balance integer;
begin
  perform public.own_character_for_update(p_character);
  select price into v_price from public.shop_items where id = p_item;
  if not found then
    raise exception 'unknown item';
  end if;
  if exists (select 1 from public.inventory where character_id = p_character and item_id = p_item) then
    raise exception 'already owned';
  end if;
  v_balance := public.balance_of(p_character);
  if v_balance < v_price then
    raise exception 'insufficient funds' using errcode = '53000';
  end if;
  insert into public.wallet_ledger (character_id, amount, reason, ref) values (p_character, -v_price, 'purchase', p_item);
  insert into public.inventory (character_id, item_id) values (p_character, p_item);
  return v_balance - v_price;
end
$$;

-- Spending that isn't a catalogue item (meals, rent, fares, living costs, treats).
-- Spending can never create money, so the client may report it; it can't overdraw.
create function public.spend(p_character uuid, p_amount integer, p_reason text, p_ref text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  perform public.own_character_for_update(p_character);
  if p_amount is null or p_amount <= 0 or p_amount > 100000 then
    raise exception 'invalid amount';
  end if;
  if p_reason not in ('food', 'rent', 'move_in', 'travel', 'living_costs', 'treat') then
    raise exception 'invalid reason';
  end if;
  v_balance := public.balance_of(p_character);
  if v_balance < p_amount then
    raise exception 'insufficient funds' using errcode = '53000';
  end if;
  insert into public.wallet_ledger (character_id, amount, reason, ref) values (p_character, -p_amount, p_reason, p_ref);
  return v_balance - p_amount;
end
$$;

-- Pays for worked game minutes, at most as many as real time allows since the last claim
create function public.claim_work(p_character uuid, p_minutes integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.characters;
  v_allowed integer;
  v_minutes integer;
  v_wage integer;
  v_level numeric;
  v_kit numeric;
  v_pay integer;
begin
  c := public.own_character_for_update(p_character);
  v_allowed := floor(extract(epoch from (now() - c.last_work_claim)) / 3)::integer;
  v_minutes := least(greatest(coalesce(p_minutes, 0), 0), v_allowed, 480);
  if v_minutes <= 0 then
    return public.balance_of(p_character);
  end if;
  select hourly_wage into v_wage from public.careers where id = c.career;
  select pay into v_level from public.career_levels where min_hours * 60 <= c.work_minutes order by rung desc limit 1;
  select coalesce(sum(s.pay_bonus), 0) into v_kit
    from public.inventory i join public.shop_items s on s.id = i.item_id
    where i.character_id = p_character and s.career = c.career;
  v_pay := round(v_wage * coalesce(v_level, 1) * (1 + v_kit) * v_minutes / 60.0);
  update public.characters
    set work_minutes = work_minutes + v_minutes, last_work_claim = now()
    where id = p_character;
  if v_pay > 0 then
    insert into public.wallet_ledger (character_id, amount, reason) values (p_character, v_pay, 'wages');
  end if;
  return public.balance_of(p_character);
end
$$;

revoke all on function
  public.balance_of(uuid),
  public.own_character_for_update(uuid),
  public.create_character(text, text, text, jsonb),
  public.update_profile(uuid, jsonb),
  public.buy_item(uuid, text),
  public.spend(uuid, integer, text, text),
  public.claim_work(uuid, integer)
  from public, anon, authenticated;
grant execute on function
  public.create_character(text, text, text, jsonb),
  public.update_profile(uuid, jsonb),
  public.buy_item(uuid, text),
  public.spend(uuid, integer, text, text),
  public.claim_work(uuid, integer)
  to authenticated;

-- ---------------------------------------------------------------- catalogue data
-- Must match src/lib (checked by src/backend/schema.test.ts).

insert into public.careers (id, hourly_wage) values
  ('none', 0), ('student', 15), ('artist', 25), ('entrepreneur', 50), ('athlete', 40),
  ('engineer', 75), ('doctor', 100), ('pilot', 90);

insert into public.career_levels (rung, min_hours, pay) values
  (0, 0, 1.00), (1, 16, 1.15), (2, 40, 1.35), (3, 80, 1.60), (4, 160, 2.00);

insert into public.lifestyles (id, starting_balance, hourly_living_cost) values
  ('student', 2500, 7), ('ordinary', 5000, 17), ('middle-class', 12500, 40), ('luxury', 25000, 83);

insert into public.shop_items (id, kind, price, career, pay_bonus) values
  ('top-ankara-sunset', 'fashion', 450, null, 0),
  ('top-ankara-royal', 'fashion', 450, null, 0),
  ('top-adire-indigo', 'fashion', 380, null, 0),
  ('top-kente-gold', 'fashion', 900, null, 0),
  ('top-linen-ivory', 'fashion', 220, null, 0),
  ('top-cotton-midnight', 'fashion', 200, null, 0),
  ('top-cotton-terracotta', 'fashion', 200, null, 0),
  ('top-breton-navy', 'fashion', 260, null, 0),
  ('top-gingham-rose', 'fashion', 280, null, 0),
  ('top-silk-burgundy', 'fashion', 1200, null, 0),
  ('top-asooke-champagne', 'fashion', 2400, null, 0),
  ('bottom-denim-classic', 'fashion', 300, null, 0),
  ('bottom-denim-black', 'fashion', 300, null, 0),
  ('bottom-chino-khaki', 'fashion', 260, null, 0),
  ('bottom-linen-cream', 'fashion', 240, null, 0),
  ('bottom-pinstripe-charcoal', 'fashion', 650, null, 0),
  ('bottom-ankara-sunset', 'fashion', 480, null, 0),
  ('bottom-adire-indigo', 'fashion', 400, null, 0),
  ('shoes-clean-white', 'fashion', 250, null, 0),
  ('shoes-leather-black', 'fashion', 700, null, 0),
  ('shoes-leather-tan', 'fashion', 700, null, 0),
  ('shoes-suede-burgundy', 'fashion', 550, null, 0),
  ('shoes-metallic-gold', 'fashion', 1500, null, 0),
  ('hair-natural-black', 'fashion', 150, null, 0),
  ('hair-dark-brown', 'fashion', 150, null, 0),
  ('hair-blue-black', 'fashion', 200, null, 0),
  ('hair-copper', 'fashion', 300, null, 0),
  ('hair-burgundy', 'fashion', 300, null, 0),
  ('hair-honey-blonde', 'fashion', 300, null, 0),
  ('hair-platinum', 'fashion', 450, null, 0),
  ('smartphone', 'equipment', 900, null, 0),
  ('kit-student', 'equipment', 1500, 'student', 0.10),
  ('kit-artist', 'equipment', 1200, 'artist', 0.10),
  ('kit-entrepreneur', 'equipment', 2500, 'entrepreneur', 0.10),
  ('kit-athlete', 'equipment', 1800, 'athlete', 0.10),
  ('kit-engineer', 'equipment', 3000, 'engineer', 0.10),
  ('kit-doctor', 'equipment', 2200, 'doctor', 0.10),
  ('kit-pilot', 'equipment', 3500, 'pilot', 0.10);
