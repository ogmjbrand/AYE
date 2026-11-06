# Healthcare: modern medicine and herbal medicine

Updated 6 November 2026, branch `claude/wonderful-franklin-gixkta`.

## 1. Audit: what existed before this work

| Area | Where | What it did |
|---|---|---|
| Hospital building | `src/lib/hospitalSite.ts`, `src/world/HospitalScene.tsx` | General Hospital in Lagoon (Ayemara): reception and waiting, pharmacy, a three-bed ward, the supervisor's office and a nurse station. Five staff. |
| Doctor's shift | `src/lib/hospital.ts`, `src/components/HospitalPanel.tsx` | Doctors only: clock in, briefing, a triage quiz per patient, clock out. Everyone else could use only the pharmacy. |
| Survival | `src/lib/health.ts`, `src/components/Survival.tsx` | Health, critical at 10, emergency at 5, never below the floor. Free emergency recovery in hospital, the sanctuary or the field. Medical kit sold at the pharmacy. |
| Server | `supabase/migrations/20261016120000_player_life.sql` | `buy_item` for one-off catalogue items only. Nothing for consumables or healthcare. |

The Songhai map, the hospital's location and its name are unchanged. No hospital was replaced: the
existing building gained two wings.

## 2. What was built, by stage

1. **Departments.** `src/lib/healthcare.ts` lists 13 departments, each with its equipment and staff:
   - modern: emergency, examination, imaging, laboratory, surgery, pharmacy, rehabilitation, recovery;
   - herbal: dispensary, preparation, garden, treatment, research.

   The hospital floor is now 48 m wide. It has a modern wing to the west and the Herbal Medicine
   Centre to the east, each with glass-walled rooms off a corridor.
2. **Working modern equipment.** Each department has a point you walk to and press E
   (`HOSPITAL_POINTS`). There you pay for a service and it takes effect:
   - check-up (gives a diagnosis), laboratory tests, imaging scan;
   - emergency treatment (free while your health is critical);
   - minor procedure, rehabilitation, an hour in the recovery room.

   Treatments done to you are done in person (`CARE_SEATS`). When you confirm, your character
   walks to the equipment and sits on it while the treatment runs: the examination couch, the
   emergency trolley, the scanner's table, the operating table, a ward bed, the steam chair or the
   herbal bath. The equipment is solid: you walk round it. A test checks that every department and
   seat can be reached from the door.

   The equipment is drawn in `src/world/HospitalEquipment.tsx`:
   - emergency: trolley bed, monitors, crash cart, oxygen;
   - examination couch, CT scanner, X-ray console;
   - surgery: operating table, anaesthesia machine, instrument trolley;
   - laboratory bench (microscope, centrifuge, analyser, samples) and sample fridge;
   - rehabilitation: parallel bars, treadmill.
3. **Herbal Medicine Centre.** `src/lib/herbal.ts` holds the plants and remedies.
   - **Plants (12):** bitter leaf, neem, ginger, turmeric, lemongrass, aloe vera, hibiscus, moringa, scent leaf (African basil), uziza, utazi, pawpaw leaf. Each has its botanical name and local names. Its documented traditional use is kept apart from its game effect.
   - **Remedies (9).** Each has a fictional effect, ingredients, preparation steps, a price, a carry limit and the rank needed to make it.
   - **The centre's rooms:** shelves of labelled remedies, preparation tables, drying racks, a copper pot, a herbal bath, a steam chair, a consultation table, raised beds and a research bench.
4. **Buying.** Every purchase shows its price, its effect, the time it takes and your balance afterwards, and waits for you to confirm.
   - Remedies go into a saved medicine cabinet. You take them from there, but not during an emergency stay.
   - The server checks every purchase (see section 4).
5. **Herbal career** (`src/lib/herbalCareer.ts`). You take it up alongside your main career.
   - **Ranks:** Beginner → Apprentice → Herbal Practitioner → Experienced Herbalist → Senior Herbal Specialist → Master Herbal Practitioner.
   - Each rank needs experience and a paid training course, taken in order. Master also needs three finished research projects.
   - **What each rank unlocks:** identifying plants; planting and harvesting; preparing remedies; consultations; serving at the dispensary for a share of the price (60%, or 85% with your own business as a Master).
6. **Research.** There are four projects. Each needs groundwork done first, for example "identify 6 plants" or "harvest 6 times".
   - Each has questions with right and wrong answers. Only a full set of right answers completes it, so clicking through gets you nothing.
   - **Rewards:** a bigger harvest, an extra bottle from a perfect preparation, and a new recovery drink.
7. **Combined treatment.** A check-up, test or scan finds a fictional condition. The hospital then recommends a modern, herbal or combined plan, and you choose.
   - A red-flag emergency is offered the modern plan only.
   - Herbalists in consultation must refer emergencies and "modern" conditions to the doctors. A wrong call earns nothing.
8. **Emergency recovery.** The stay card shows the seven stages:
   - reception → assessment → bed → treatment → monitoring → restored → discharge.

   Two optional, free herbal extras are offered on a hospital stay: a tea round and a garden walk.
   The stay stays free and never takes money, home, career or belongings.
9. **NPCs.** Each works at their department's equipment:
   - an emergency doctor at the trolley bed, and a triage nurse on a round of the wing;
   - a laboratory scientist working at the bench;
   - a physiotherapist by the parallel bars;
   - a herbal practitioner serving at the dispensary, and another preparing at the table;
   - a garden apprentice tending the beds.
10. **Persistence.** The cabinet, your diagnosis and care plan, the stay's extras and the whole herbal profession are saved with your game and cleaned on load (`sanitiseCare`).

## 3. Safety rules the code enforces

- Herbal information is history and culture, never a cure claim. A test checks that no plant's text claims to cure or treat a real illness. Every herbal screen shows the disclaimer.
- Herbal care is never a substitute in an emergency:
  - `plansFor` gives a red-flag condition only the modern plan;
  - consultations count only a referral as right;
  - remedies can't be taken during an emergency stay.
- Emergency treatment is free while critical, and emergency recovery is free and automatic, whatever your balance.
- The video references (hands-on, tool-by-tool treatment) became the preparation game. You pick up each tool (basin, paring knife, mortar and pestle, muslin, copper pot, strainer, bottle) in the right order. It is shown as a calm list with no graphic content and no real person's likeness.

## 4. Server

`supabase/migrations/20261108120000_healthcare.sql` adds:

- `care_items`: every service, remedy, treatment and course, at the game's prices;
- `care_cabinet`: each player's cabinet;
- `buy_care` (charges the real price, refuses overdrafts, enforces the carry limit);
- `take_remedy`;
- a new `care` reason on the wallet ledger.

Players cannot write prices or cabinets directly. `src/backend/schema.test.ts` checks that the prices
match the game and plays the cheating cases against real Postgres.

## 5. Not done yet (said plainly)

- **The game doesn't call the server yet.** The game still runs on browser saves. It uses the server functions only once the Supabase project is connected (see `BACKEND.md`).
- **Selling remedies is checked only in the browser.** Income from selling prepared remedies is applied in the browser. It needs a server rule like `claim_work` before accounts go live.
- **No co-operation between players yet.** The spec asks for players to work together, for example a doctor and a herbalist on one patient. That needs the multiplayer layer, which doesn't exist yet.
- **Supernatural sanctuaries can't use the centre yet.** The sanctuary still heals as before. Its link to the herbal centre is limited to the shared recovery rules.
- **The NPCs stay at their posts.** They work at fixed places or simple rounds. They don't yet treat the player in person on screen.

## 6. Tests

- `src/lib/healthcare.test.ts` (23 tests) covers:
  - departments and data;
  - herbal purchases and the medical inventory;
  - treatment and care plans;
  - admission stages, emergency recovery and the no-death floor;
  - the herbal career, training, identification, preparation, consultations, research and sales;
  - saving and loading.
- `src/backend/schema.test.ts` adds 3 server tests.
