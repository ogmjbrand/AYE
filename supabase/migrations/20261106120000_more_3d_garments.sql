-- AYE: two more OGM Atelier 3D garment cuts (a strapless mermaid gown and tailored shorts).
-- NOT DEPLOYED; see docs/BACKEND.md. Must match src/lib/fashion.ts (checked by src/backend/schema.test.ts).

insert into public.shop_items (id, kind, price, career, pay_bonus) values
  ('top-mermaid3d-emerald', 'fashion', 4800, null, 0),
  ('bottom-shorts3d-cream', 'fashion', 900, null, 0);
