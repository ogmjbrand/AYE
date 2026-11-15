-- Register the pale-white hair dye added alongside the skin pigmentation system
-- (src/lib/fashion.ts). This migration is local source only; see docs/BACKEND.md
-- before deployment.

insert into public.shop_items (id, kind, price, career, pay_bonus) values
  ('hair-pale-white', 'fashion', 150, null, 0);
