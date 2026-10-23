-- AYE: handbags (the boutique's Accessories section). Colours are chosen by the player for free.
-- NOT DEPLOYED; see docs/BACKEND.md. Must match src/lib/fashion.ts (checked by src/backend/schema.test.ts).

insert into public.shop_items (id, kind, price, career, pay_bonus) values
  ('bag-tote-leather', 'fashion', 900, null, 0),
  ('bag-tophandle-leather', 'fashion', 1800, null, 0),
  ('bag-clutch-metallic', 'fashion', 1200, null, 0),
  ('bag-bucket-suede', 'fashion', 750, null, 0),
  ('bag-mini-leather', 'fashion', 650, null, 0);
