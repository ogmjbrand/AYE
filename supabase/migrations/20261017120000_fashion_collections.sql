-- AYE: new fashion pieces (bogolan, batik, houndstooth, more kente and aso-oke).
-- NOT DEPLOYED; see docs/BACKEND.md. Must match src/lib/fashion.ts (checked by src/backend/schema.test.ts).

insert into public.shop_items (id, kind, price, career, pay_bonus) values
  ('top-asooke-wine', 'fashion', 2200, null, 0),
  ('top-adire-eleko', 'fashion', 520, null, 0),
  ('top-kente-adweneasa', 'fashion', 1100, null, 0),
  ('top-batakari-stripe', 'fashion', 700, null, 0),
  ('top-bogolan-earth', 'fashion', 520, null, 0),
  ('top-batik-ocean', 'fashion', 420, null, 0),
  ('top-houndstooth-mono', 'fashion', 600, null, 0),
  ('bottom-kente-adweneasa', 'fashion', 1150, null, 0),
  ('bottom-bogolan-earth', 'fashion', 540, null, 0),
  ('bottom-batik-ocean', 'fashion', 440, null, 0),
  ('bottom-houndstooth-mono', 'fashion', 620, null, 0);
