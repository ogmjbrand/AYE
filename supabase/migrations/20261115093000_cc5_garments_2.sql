-- Register the second real modelled CC5 garment piece for Ariana (src/lib/fashion.ts):
-- a slim trench coat, extracted from the same source export as the turtleneck
-- sweater (see the earlier migration). A third piece, denim shorts, was built from
-- the same export but isn't registered as an item -- see the comment in fashion.ts.
-- This migration is local source only; see docs/BACKEND.md before deployment.

insert into public.shop_items (id, kind, price, career, pay_bonus) values
  ('top-ariana-trench', 'fashion', 1400, null, 0);
