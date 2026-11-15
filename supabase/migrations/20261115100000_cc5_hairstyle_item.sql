-- Register Ariana's first real modelled CC5 hairstyle (src/lib/fashion.ts): a bun,
-- extracted from Avatar13 (two meshes, Hair_Base + Bun), rebound onto her CC5
-- skeleton at runtime (src/components/Cc5Garment.tsx) in place of her own baked-in
-- hairstyle, unlike the existing Rocketbox-head-bone hairstyles.
-- This migration is local source only; see docs/BACKEND.md before deployment.

insert into public.shop_items (id, kind, price, career, pay_bonus) values
  ('hairstyle-ariana-bun', 'fashion', 750, null, 0);
