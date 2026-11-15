-- Register the first real modelled CC5 garment piece (src/lib/fashion.ts): Ariana's
-- turtleneck sweater, rebound onto her CC5 skeleton at runtime
-- (src/components/Cc5Garment.tsx), not a recolour of her existing clothes.
-- This migration is local source only; see docs/BACKEND.md before deployment.

insert into public.shop_items (id, kind, price, career, pay_bonus) values
  ('top-ariana-turtleneck', 'fashion', 900, null, 0);
