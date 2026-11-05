# Living world: what's implemented

Status words used here:
- **Done:** built and verified in the running game.
- **Partial:** works, with the limits listed.
- **Blocked:** waiting on something outside the code.
- **Planned:** not started.

## Walking to activities (done)

### At home

- Tap Use on any furniture and the character walks to a free spot beside it
  (`lib/furniture.ts` `standSpotsFor`):
  - it tries the usual spot first, then each side and corner;
  - it walks round obstacles and uses the item on arrival.
- The shower walks you in and back out.

### In venues

- **The list:** inside a venue, "Things to do here" (`components/ActivityMenu.tsx`)
  lists every activity in the place, with several places to stand for each
  (`lib/venueActivities.ts`).
- **The walk:** pick one and the character walks there with the same
  walk-then-act system (`hooks/useWalkThen.ts`). The first spot with a way
  there wins, so a person or chair in the way doesn't stop you.
- **On arrival:** the venue's own prompt for that spot runs (the same as
  pressing E there), so no venue behaviour was copied or faked.
- **Where it works:**
  - Fashion House: assistant, fitting room, salon;
  - Grand Lagoon Hotel: desk, vending, and your bed, phone and basin once
    you've booked;
  - Alafia Spa: reception, manager;
  - Cantina Ayé (bar) and The Palms (host);
  - General Hospital: reception, pharmacy, supervisor, ward;
  - AYE Global University: seven places;
  - the office: reception, every desk, files, meeting;
  - the car showrooms (salesperson) and the restaurants (host).
- **Verified:** in the Fashion House, picking "The fitting room" from the
  door walked the player from (0, −4.7) to (−4.4, 3.6), and the wardrobe
  opened on arrival.
- **Walking off by hand** cancels it, as at home.

### Food stalls

- You turn to face the cart or stall you're ordering from (`lib/foodService.ts`
  `faceStall`).
- **The suya grill** (`cartStations`, `world/Props.tsx`):
  - Mallam Sule works on the cart's working side, at the grill and board facing the
    pavement, turning the skewers (arms posed in code, as eating is);
  - you order at the grill end of the counter, facing him;
  - two residents walk the pavement, stop at the counter to buy while he turns to serve
    them, and walk on.
- **Fixed:** pressing E at a street stall used to take you into a restaurant dining room
  (only the on-screen button opened the stall). E now opens the stall menu too.
  - **Verified:** E at the suya counter opened the menu, and "Eat here" on suya took
    37 GHAI and raised fullness from 66 to 93.

**Partial:** NPCs don't yet reserve activity spots, so the player and a
resident can stand at the same counter. Collisions keep them apart.

## Food (done, partial for cafés)

### Street stalls

- Street stalls (suya, street food, snacks, tea, kiosks, food trucks, in
  every city) serve at the window. There's no dining room
  (`components/StallMenu.tsx`).
- **Eat here:** pay and eat standing at the stall with the eating animation.
  Fullness rises and 12 minutes pass.
- **Take away** (new):
  - Paid once by a single reducer step (`gameState` `buyTakeaway`); the dish
    goes into your pantry, which is in your save (`lib/pantry.ts`).
  - Inventory → "Food to take away" → Eat now fills you, with the animation,
    for no more money.
  - The pantry holds at most 5 of one dish and 12 in all.
- **Verified:** suya to take away charged exactly 20 GHAI, put suya × 1 in the
  pantry, survived a reload, and eating it raised fullness from 28 to 56 at
  no further cost.

### Other places

- Local eateries have their own counter-service room. Kitchens keep the
  dining room. The Palms and Cantina Ayé keep their own buildings.
- **Planned:** cafés, bakeries, supermarkets and fast-food outlets. None are
  in the district data, and new named places need adding there first.

## Clothing (partial)

Real 3D garments are built on the Rocketbox body and skinned to its own
skeleton (`world/skinnedGarment.ts`), so they move with every animation.
There are seven cuts, each with its own silhouette:
- aso-oke **buba** with bell sleeves;
- aso-oke **iro** wrapper;
- pleated **gele**;
- tailored **blazer**;
- **wide-leg trousers**;
- strapless **mermaid gown** (fitted to the knee, flaring to the floor);
- tailored **shorts**.

Geometry is built once per body and shared; the cloth is a separate material
(aso-oke, suiting, satin).

**Where they work:** boutique (badged "3D garment"), shop try-on, wardrobe
preview, equipping, favourites and saved outfits. They're also in the server
catalogue migrations.

**Limits:**
- **Everything else restyles fabric:** every other clothing item still
  restyles the fabric of the character's own clothes, and is labelled that
  way.
- **No bare legs:** the Rocketbox people have no bare legs under their
  clothes, so below the shorts you see their own trousers in a matching
  colour.
- **No cloth simulation:** skirts follow the legs by skinning.
- **Rocketbox only:** the CC5 player body isn't supported.

## Shops and money (partial)

- **Every purchase:**
  - is checked against your GHAI in the reducer and refused, with nothing
    taken, if you can't pay;
  - is taken once in the same state update that grants the item;
  - is saved with it.
- **Blocked:** server validation. The Supabase functions (`buy_item`, and
  `spend` with a reference) and the catalogue test exist, but the backend
  isn't deployed. It needs a project URL and key (`docs/BACKEND.md`). Until
  then a player who edits their browser save can change their own GHAI.
- **Shop categories already in the game:**
  - clothing, shoes, bags, accessories, jewellery and fragrance (Fashion
    House);
  - gadgets and work kits (Gadget Hub);
  - furniture (catalogue);
  - medical supplies (hospital pharmacy, Gadget Hub);
  - cars (showrooms), and homes (OGM Homes);
  - food (stalls, eateries, restaurants, hotel vending and room service);
  - supernatural items (Divine Evolution, once unlocked).
- **Not in the game yet:** groceries, household supplies, sports equipment and
  vehicle products.

## Health and no-death (unchanged, still covered)

- Every new interaction (walking, eating, take-away) only adds fullness or
  takes GHAI; none deals damage. The health floor stays 5:
  - critical at 10;
  - emergency recovery at 5 (`lib/health.ts`).
- **Routing:**
  - ordinary players go to hospital;
  - supernatural players with a home go to their sanctuary;
  - field medics treat on missions.
- **Tests:** `src/lib/health.test.ts`, including "never goes below the floor,
  whatever the harm" and "starving long enough ends in hospital, never in
  death".
- **Unlock:** the 1,000,000,000 GHAI supernatural unlock (`UNLOCK_BALANCE`)
  and its permanence weren't touched.

## NPCs (partial)

Residents, staff and venue NPCs walk set paths, sit, work their posts (host,
waiter, chef, bartender, receptionist) and talk. Their job comes from their
place, and they're not labelled "computer-controlled" anywhere on screen.

**Not done yet:**
- daily schedules across the city;
- NPCs using home furniture;
- NPC-to-NPC conversations that change state;
- reserving activity spots.

## Songhai

No location name, spelling, coordinate or district relationship changed. The
location data (`src/lib/districts`, `geography.ts`, `neighborhoods.ts`,
`places.ts`, `songhai.ts`) has no diff across this milestone or the previous
one. The new eatery room reuses the dining room's plan, and no places were
added.
