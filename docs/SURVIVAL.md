# Survival: nobody dies in AYE

`src/lib/health.ts` · `src/components/Survival.tsx` · `src/world/MedicResponder.tsx` · tests in `src/lib/health.test.ts`

## Built

**Health**
- Every player has health from 5 to 100, shown on the HUD next to energy, hunger and hygiene. Tap it to open the Health panel.
- Health can never go below 5. All harm goes through one function (`damage`), which enforces this.
- A single hit takes at most 35, so nothing can skip the critical stage.
- Negative, zero, NaN and infinite amounts are ignored.

**At 10%: critical survival**
- A red edge pulses on screen like a heartbeat (it doesn't animate when reduced motion is set).
- A banner explains that you're protected and offers your best healing item and a free paramedic.
- Further harm is halved.

**At 5%: automatic emergency recovery**
- There is no button to press. All harm stops and a short "You're safe" card explains what is happening, so it never looks like a crash or a death.
- You're then taken to where you'll recover:
  - **Ordinary players** go to General Hospital: admitted at A&E, then to a ward bed. The panel shows health rising, when you can carry on, and staff to talk to (computer-controlled).
  - **Divine Evolution players with a home** go to the healing chamber in their sanctuary. You return to human form, your energy is restored, and powers and belongings are kept.
  - **Missions with a field medic** (the `field` place) treat you on the spot. This is ready for when missions exist.
- If the sanctuary isn't available, you go to hospital, which is always available.
- During a stay you stay put: no trips, shifts, workouts or nights out. You can rest through the rest of the stay.
- You're discharged at full health, fed and rested, and protected from harm for 30 minutes.

**Free, and nothing is lost**
- Recovery is never charged for.
- No money, items, property, career progress or achievements are lost.
- Healing items are an extra option, never a requirement.

**Healing items**
- Sold at the General Hospital pharmacy and in the Gadget Hub's First aid tab, with prices, effects and a confirmation before you buy.
- Items:
  - plasters (+8)
  - first-aid kit (+20)
  - advanced medical pack (+40)
  - emergency trauma kit (+60)
  - sanctuary restorative (+25 health and +40 energy; Divine Evolution players only)
- Each item takes game time to use and has a carry limit. There is a short cooldown between uses.
- They're kept in your Inventory under "Medical kit" and saved with the game.

**Paramedic**
- You can call one for free at 50 health or below.
- A computer-controlled paramedic walks up to where you called from, treats you (+35) and then leaves.

**What hurts you**
- Going without food (fullness at 0) or sleep (energy at 0).
- Holding a supernatural form past full exhaustion.
- Crashing the car you're driving at 22 km/h or faster: the faster you're going, the worse the injury.
- Health recovers slowly while you're fed and rested, and a night's sleep heals 50 at home or 25 elsewhere.

**Saves and interruptions**
- A recovery interrupted by closing the game carries on after you reload.
- A save stuck at the floor starts its recovery when it loads.
- Edited values are clamped, a stay can't be stretched out, and fake items are dropped.

**Landscape**
- Starting or continuing a game on a phone goes full screen and locks the screen sideways where the browser supports it (`src/lib/orientation.ts`).
- Where it can't (iPhone Safari), a "Turn your phone sideways" card with the AYE logo covers the game while the phone is upright (`src/components/RotateHint.tsx`).

## Honest limits

- **Not server-authoritative yet.** Health is calculated in the game reducer on the device. When AYE's backend exists, the server must apply damage and recovery and the client should only display them. The rules are pure functions so they can move there unchanged.
- **No multiplayer, combat, war zones or player-to-player damage yet**, so those tests are the boundary tests above rather than real multiplayer fights.
- When those systems are built they must call `damage`, which keeps the no-death rule.
- There are no healing or medic animations beyond the paramedic walking to you and standing with you while they treat you.
