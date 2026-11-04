-- AYE: OGM Atelier 3D garments, real meshes built on the body and skinned to its skeleton
-- (aso-oke buba, iro and gele; tailored blazer and wide-leg trousers).
-- NOT DEPLOYED; see docs/BACKEND.md. Must match src/lib/fashion.ts (checked by src/backend/schema.test.ts).

insert into public.shop_items (id, kind, price, career, pay_bonus) values
  ('top-asooke3d-wine', 'fashion', 2400, null, 0),
  ('bottom-asooke3d-wine', 'fashion', 2200, null, 0),
  ('hairstyle-gele-wine', 'fashion', 1600, null, 0),
  ('top-tailored-charcoal', 'fashion', 2600, null, 0),
  ('bottom-tailored-charcoal', 'fashion', 1800, null, 0);
