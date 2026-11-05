-- AYE: the first garment from the pattern pipeline, the OGM Atelier sewn pencil dress (docs/GARMENT_PIPELINE.md).
-- NOT DEPLOYED; see docs/BACKEND.md. Must match src/lib/fashion.ts (checked by src/backend/schema.test.ts).

insert into public.shop_items (id, kind, price, career, pay_bonus) values
  ('top-sewn-pencil-tangerine', 'fashion', 3600, null, 0);
