# Career progression, economy and lifestyle

AYE's career economy is built as a working vertical slice first, then extended
to every career and shop. GHAI is an in-game currency only: it cannot be bought,
sold or exchanged for real money.

## The vertical slice: built

`src/lib/careerGear.ts`, `src/components/WorkGear.tsx`, `src/components/InventoryPanel.tsx`

The brief asks for one career, one shop, one item, one earning activity, one
GHAI transaction, a saved inventory and a save-and-reload test. The slice
covers all seven careers at once, because they share one catalogue.

**The shop**

- The Gadget Hub has a "Work gear" tab. It lists gear for your career in three
  slots: tools, tech and professional kit.
- Each piece shows its tier (used, standard or professional), price, pay bonus,
  working life and the rank it needs.
- Buying needs the rank as well as the GHAI. Owning gear never lets you do work
  your rank doesn't allow.
- Every purchase and sale asks for confirmation and shows your balance after.

**Earning**

- Equipped gear in working condition raises your pay at work by its bonus.
- One piece per slot can be equipped.
- Gear wears with every paid minute. At 0% it stops helping until it is
  repaired.

**Inventory**

- The Inventory panel lists everything you own: work gear, clothes, gadgets
  and kits, vehicles and furniture.
- You can equip a piece, put it away, repair it or sell it.
- A repair costs 30% of the price for the wear being fixed.
- Selling pays 50% of the price, scaled by condition.
- Nothing you own is ever taken away.

**Transactions and saves**

- Every purchase, repair and sale is a line in the ledger ("Work gear: …",
  "Repair: …", "Sold: …") and counts towards the day's expenses.
- Gear is saved with the game. Loading a save drops unknown items and
  duplicates, clamps condition to 0–100 and allows one equipped piece per slot.
- `careerGear.test.ts` covers buying, the gates, pay, wear, repairs, sales, the
  save-and-reload path and the clean-up rules.
- A browser playtest confirmed a purchase survives a real page reload.

**Validation**

- Every rule is checked in the game reducer, not only in the interface.
- It moves to the server when AYE's backend is live, so that balances,
  purchases and ownership cannot be edited on the device.

## Next

1. **More shops and suppliers:** a medical supplier, a hardware store, a pilot
   shop, an art supplier and a sports store, each in the world, using the same
   catalogue rules.
2. **Consumables:** supplies used up by work, such as gloves, fuel and paint.
3. **Qualifications and certifications:** earned through study and exams, and
   required for restricted work and gear alongside rank.
4. **Businesses and employment:** run a business, hire residents (labelled
   computer-controlled), pay wages and track profit.
5. **Marketplace and trading between players:** this needs the server, for
   ownership, escrow and anti-fraud checks.
