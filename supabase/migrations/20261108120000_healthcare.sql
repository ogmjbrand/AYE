-- Healthcare on the server: the hospital's priced services and remedies, and each player's
-- medicine cabinet. Every purchase is checked here — the real price, the balance and how many
-- you may carry — so a client can't set its own price or overfill its cabinet.
--
-- Emergency care is never charged when your health is critical and emergency recovery is free
-- (src/lib/health.ts): the client simply makes no purchase then, so nothing here can be used to
-- create money. Must match src/lib/healthcare.ts and src/lib/herbal.ts (checked by
-- src/backend/schema.test.ts).

create table public.care_items (
  id text primary key,
  kind text not null check (kind in ('service', 'remedy', 'treatment', 'course')),
  price integer not null check (price >= 0),
  -- How many you can carry (remedies only; 0 for things had there and then)
  max_carry integer not null default 0 check (max_carry >= 0 and max_carry <= 99)
);

create table public.care_cabinet (
  character_id uuid not null references public.characters (id) on delete cascade,
  item_id text not null references public.care_items (id),
  count integer not null check (count > 0 and count <= 99),
  primary key (character_id, item_id)
);

alter table public.care_items enable row level security;
alter table public.care_cabinet enable row level security;
create policy "catalogue is public" on public.care_items for select using (true);
create policy "read own cabinet" on public.care_cabinet
  for select to authenticated using (character_id in (select id from public.characters where owner = auth.uid()));
revoke insert, update, delete, truncate on public.care_items, public.care_cabinet from anon, authenticated;

-- Paying for care is its own line on your statement
alter table public.wallet_ledger drop constraint wallet_ledger_reason_check;
alter table public.wallet_ledger add constraint wallet_ledger_reason_check check (reason in (
  'starting_balance', 'wages', 'purchase', 'food', 'rent', 'move_in', 'travel', 'living_costs', 'treat', 'care'
));

-- Buy a service, treatment, course or remedy at its real price. Remedies go into your cabinet,
-- up to what you may carry. Returns your new balance.
create function public.buy_care(p_character uuid, p_item text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.care_items;
  v_balance integer;
  v_have integer;
begin
  perform public.own_character_for_update(p_character);
  select * into v_item from public.care_items where id = p_item;
  if not found then
    raise exception 'unknown item';
  end if;
  if v_item.kind = 'remedy' then
    select coalesce((select count from public.care_cabinet where character_id = p_character and item_id = p_item), 0) into v_have;
    if v_have >= v_item.max_carry then
      raise exception 'cabinet full';
    end if;
  end if;
  v_balance := public.balance_of(p_character);
  if v_balance < v_item.price then
    raise exception 'insufficient funds' using errcode = '53000';
  end if;
  if v_item.price > 0 then
    insert into public.wallet_ledger (character_id, amount, reason, ref) values (p_character, -v_item.price, 'care', p_item);
  end if;
  if v_item.kind = 'remedy' then
    insert into public.care_cabinet (character_id, item_id, count) values (p_character, p_item, 1)
      on conflict (character_id, item_id) do update set count = public.care_cabinet.count + 1;
  end if;
  return v_balance - v_item.price;
end
$$;

-- Take a remedy from your cabinet. Returns how many are left.
create function public.take_remedy(p_character uuid, p_item text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_have integer;
begin
  perform public.own_character_for_update(p_character);
  select count into v_have from public.care_cabinet where character_id = p_character and item_id = p_item;
  if not found then
    raise exception 'none left';
  end if;
  if v_have <= 1 then
    delete from public.care_cabinet where character_id = p_character and item_id = p_item;
  else
    update public.care_cabinet set count = v_have - 1 where character_id = p_character and item_id = p_item;
  end if;
  return v_have - 1;
end
$$;

revoke execute on function public.buy_care(uuid, text), public.take_remedy(uuid, text) from public, anon, authenticated;
grant execute on function public.buy_care(uuid, text), public.take_remedy(uuid, text) to authenticated;

insert into public.care_items (id, kind, price, max_carry) values
  -- Modern services (src/lib/healthcare.ts CARE_SERVICES)
  ('svc-checkup', 'service', 120, 0),
  ('svc-lab', 'service', 200, 0),
  ('svc-imaging', 'service', 400, 0),
  ('svc-emergency', 'service', 300, 0),
  ('svc-procedure', 'service', 600, 0),
  ('svc-rehab', 'service', 150, 0),
  ('svc-recovery', 'service', 250, 0),
  -- Herbal remedies to carry, and treatments at the centre (src/lib/herbal.ts REMEDIES)
  ('rem-ginger-lemongrass', 'remedy', 30, 6),
  ('rem-bitter-tonic', 'remedy', 45, 5),
  ('rem-zobo', 'remedy', 25, 8),
  ('rem-moringa-bowl', 'remedy', 40, 4),
  ('rem-aloe-gel', 'remedy', 35, 6),
  ('rem-pepper-soup', 'remedy', 60, 3),
  ('rem-turmeric-recovery', 'remedy', 90, 3),
  ('rem-neem-bath', 'treatment', 120, 0),
  ('rem-lemongrass-steam', 'treatment', 80, 0),
  -- Herbal training (src/lib/herbalCareer.ts COURSES)
  ('course-plant-id', 'course', 150, 0),
  ('course-preparation', 'course', 300, 0),
  ('course-dispensary', 'course', 500, 0),
  ('course-clinical', 'course', 800, 0),
  ('course-research', 'course', 1200, 0);
