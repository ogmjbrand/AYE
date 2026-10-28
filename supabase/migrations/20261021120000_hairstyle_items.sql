-- Register the CC0 hairstyle catalogue items used by src/lib/fashion.ts.
-- This migration is local source only; see docs/BACKEND.md before deployment.

insert into public.shop_items (id, kind, price, career, pay_bonus) values
  ('hairstyle-afro', 'fashion', 650, null, 0),
  ('hairstyle-braids', 'fashion', 850, null, 0),
  ('hairstyle-ponytail', 'fashion', 600, null, 0),
  ('hairstyle-long', 'fashion', 700, null, 0);
