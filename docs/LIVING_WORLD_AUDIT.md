# Living world audit (November 2026)

This audit was made from the code and the running game before this
milestone's work. It covers what exists, what's missing and what was broken.
The work itself is in `LIVING_WORLD_IMPLEMENTATION.md`.

## Architecture (unchanged)

- **Stack:** Vite + React 19 + TypeScript, rendered with three.js through
  React Three Fiber and drei. One `<Canvas>` lives in `src/App.tsx`.
- **World data:**
  - Districts are defined in `src/lib/districts/*` and indexed by
    `src/lib/geography.ts`.
  - Songhai (the fictional home country) is in `src/lib/songhai.ts`, with its
    own validator and tests.
  - Neighbourhoods are in `src/lib/neighborhoods.ts`.
  - Every interactive place is in `District.places`.
- **Game state:**
  - One pure reducer, `gameReducer` in `src/lib/gameState.ts`, used through
    `src/hooks/useGameState.ts`.
  - Saved in the browser by `src/lib/save.ts`, which cleans every field when
    it loads.
- **Movement:**
  - `src/hooks/usePlayerController.ts` handles collision against the layout
    and click-to-move routing (`lib/clickToMove`).
  - `useWalkThen` walks to a spot and acts on arrival.
- **Backend:**
  - Supabase migrations hold the server-side `buy_item` and `spend`
    functions (ledger with a reference, balance checks) plus a full catalogue
    test (`src/backend/schema.test.ts`).
  - **They are not deployed.** The game runs and saves in the browser, so
    purchases are checked by the reducer, not by a server.

## What exists (verified)

### Places and what you do there

| Kind | Where (existing names) | What you do |
|---|---|---|
| Street food stall | Mallam Sule Suya, Roadside market and every city's street-food or snack stall | Order at the window, eat there or take away (this milestone) |
| Local eatery | Mama Put, Osu Chop Bar, waakye joints, tuwo houses | Counter-service room: table, order, eat |
| Kitchen restaurant | Taste of Africa and each city's kitchen | Dining room: host, table, order, eat |
| Luxury restaurant | The Palms Restaurant | Host, table, 19 dishes |
| Bar | Cantina Ayé | Bar, tables, menu |
| Hotel | Grand Lagoon Hotel | Book a night, room, bed, basin, room service, vending |
| Spa | Alafia Spa | Treatments as a guest; massage-therapist job |
| Boutique | Fashion House (every city) | Clothes, shoes, hair, accessories, fitting room, wardrobe |
| Gadgets | Gadget Hub | Phones, laptops, work kits |
| Cars | Marina Motors, Eko Motors | Buy a car |
| Travel | Marina Travel | Flights and coaches |
| Estate agency | OGM Homes | Buy or rent homes |
| Park | Uptown Gardens, Osu Green | Benches, exercise |
| Nightlife | Lagoon Live, Osu Nights | Night out with a friend |
| Hospital | General Hospital | Patient recovery; doctor career (reception, pharmacy, ward) |
| University | AYE Global University | Classes, library, assignments, cafeteria |
| Office | The office workplace | Desks, documents, meetings, clock in and out |
| Homes | Palm View and others | All home furniture, walk-to-use |

### Systems

- GHAI economy with a daily ledger, careers and wages.
- Qualifications, needs and fullness.
- Health with the no-death rules: `CRITICAL` at 10 and `EMERGENCY` at 5. These
  route you to hospital, to the sanctuary for supernatural players, or to
  field medics.
- Supernatural unlock at 1,000,000,000 GHAI (`UNLOCK_BALANCE`), permanent
  once activated.
- Phone, Life OS, wardrobe studio, the boutique, live events and residents.

## Missing (as found)

| Missing | Notes |
|---|---|
| Walk-to-activity inside venues | Prompts only appeared once you stood at the spot; nothing walked you there. |
| Food bought to keep | Every purchase was eaten on the spot. |
| Gym, bank, police station, garage, workshop, airport terminal and school as buildings | **Not in the location registry.** Exercise happens at the park and at home, the phone has a Bank app, and there is an airport stop with a travel desk. The brief says not to invent locations, so none were added; these need named places in the district data first. |
| Server-validated purchases | The functions exist but the backend isn't deployed. Blocked on a Supabase project URL and key. |
| Café and fast-food outlets | Not in any district's vendor list. |

## Bugs found

| Bug | Status |
|---|---|
| NPCs left in a T-pose when a looping clip was stopped from outside | Fixed in the previous phase (`WorldNPC`). |
| Street stalls taking you into the generic dining room | Fixed in the previous phase. |
| Some Life OS buttons ("Go and see them") were under 28 px tall | Fixed: raised to 32–36 px. |

## Order of work and risks

1. **Walk-to-activity in venues.** Risk: walking to a spot that isn't quite
   inside the prompt's radius. Each activity offers several spots, and a
   message explains if nothing is there.
2. **Take-away food in the save.** Risk: old saves. The pantry is cleaned on
   load and defaults to empty.
3. **More real garment cuts.** Risk: clipping. Checked by screenshot while
   standing and walking.
4. **Mobile panel audit, including turning the phone.**
5. **Documentation.**
