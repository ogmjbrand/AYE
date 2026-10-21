# AYE: feature status against the full player journey

Updated 21 October 2026 (Life OS milestone), branch `claude/wonderful-franklin-gixkta`.
"Done" means it changes real game state, is covered by tests and was checked
in a browser. Nothing here is a mock: where something isn't built, it says so.

The reference is the user's set of screenshots (city overview, onboarding
card, character creator, decorating catalogue, labelled city map). AYE keeps
its own brand, people, places, writing and economy (GHAI, a virtual currency
that is never real money; the balance is the same one the game always had,
now shown under its official name).

| # | Journey step | Status | What exists / what's missing |
|---|---|---|---|
| 1 | Landing page with Sign up / Log in | **Partial** | Entry screen with Continue, Start a new life, How to play and settings. **No accounts yet:** sign-up needs the Supabase project (see `BACKEND.md`, waiting for your approval). No fake sign-in is shown. |
| 2 | Registration, secure auth, persistent accounts | **Blocked (approval)** | Server schema, row-level security and money functions are written and tested against real Postgres (`supabase/`, `src/backend/schema.test.ts`). Not connected: needs a free Supabase project under your account. Saves are in the browser until then. |
| 3 | Multi-step creator with live 3D preview | **Partial** | Live 3D preview, 12 people, height, body shape (7 women's figures with bust and waist; 5 for men). One long scrolling form, not yet split into steps with a progress indicator. |
| 4 | Appearance, hair, clothes, colours, personality, traits, goals, background | **Partial** | Identity, heritage, country/region, look, height, body shape; clothes, fabrics, prints and hair colour in the boutique. **Missing:** personality, traits, life goals, background story; new hairstyles and garment cuts. |
| 5 | Starting life that affects gameplay | **Done (basic)** | Lifestyle sets starting balance and hourly living costs; career sets workplace, wage and promotion ladder. |
| 6 | Home selection (types, costs, rent, lifestyle) | **Partial** | Four tiers per city (room → penthouse) with move-in fee, nightly rent, eviction; bigger homes are bigger rooms. Chosen at the front door in the city, **not yet during onboarding**. |
| 7 | Playable home: furniture, catalogue, needs, time, mood, balance | **Done (this milestone)** | Needs (energy, hygiene, fun, social) plus hunger, a mood that changes pay and work bonuses, a 27-piece furniture catalogue in 9 categories with search, 3D preview, prices, delivery into your home, moving/turning/storing/selling, and furniture you use (shower, bath, sofa, TV, games, books, music, cooking, study). Open-plan "dolls' house" room with no ceiling, as before. **Missing:** drag-to-place on the floor (pieces are moved with arrow buttons), wall items. |
| 8 | Home → outdoor city transition | **Done** | Front door in and out, camera snaps behind you. |
| 9 | Interactive 3D city map, labels, filters, landmarks | **Partial** | 3D districts in 235 cities; phone map; City Locations directory by category with walk-there routing; world map at the travel desk. **Missing:** a labelled overhead map of a district with pins and filters like the reference. |
| 10 | Businesses, careers, restaurants, fashion, car dealers, cars, driving | **Partial** | Careers (7, five levels, hourly tasks), food vendors, boutique and salon, gadget shop, lounge, park, travel desk. **Missing: car dealership, owning a car, driving.** |
| 11 | Business advertising platform | **Not started** | Needs accounts, a review/approval process, payments and legal review first. Billboards exist in the world but only show built-in art. |
| 12a | Character Life OS, missions, wishes, dreams, perks, achievements | **Done (this milestone)** | See below. |
| 12 | Persistent progress, coherent economy, multiplayer roadmap | **Partial** | Everything saves (browser) and old saves load. Economy is one set of tested rules. Multiplayer is planned in `ARCHITECTURE.md` (authoritative server after accounts). Residents are computer-controlled and labelled so; there are no fake player counts. |

## This milestone: home life (verified)

- `src/lib/needs.ts`: four needs, mood score and labels, exhausted pay penalty, mood multiplier on work-task bonuses.
- `src/lib/furniture.ts`: catalogue, what each kind of piece does, placement that never blocks the door, the bed or anything you use, moving house, storage, resale at half price.
- `src/lib/gameState.ts`: actions `buyFurniture`, `sellFurniture`, `placeFurniture`, `storeFurniture`, `useFurniture`; needs run down each minute; sleep restores energy (fully only at home); friends, nights out and the park meet social and fun needs.
- Every home now has a shower (the penthouse a bath).
- UI: needs and mood in the player panel; Furniture button at home; side-panel catalogue; E at a piece uses it.
- Saves from before this milestone load with every need met and no furniture.

Checked in a browser: walked into a mini flat, bought a TV and a sofa (balance 20,000 → 16,900 ⓒ, both delivered), showered (15 minutes, hygiene 24 → 100). Phone and desktop layouts.

## Life OS milestone (verified)

- **Life OS** (`src/components/os/`): a glass side panel (bottom sheet on phones) over the running world. Open with the Life button or L. Sections: Today, Goals, Skills, People, Career, Money, Profile, Settings.
- **Engine** (`src/lib/life.ts`, `src/lib/lifeState.ts`): progress comes only from comparing the game before and after real actions. Every reward is paid once and recorded in the money history.
  - 3 daily missions and 2 weekly challenges, picked from what you can actually do.
  - Up to 3 wishes generated from your needs and situation; you can dismiss them.
  - 7 dreams with 5 milestones each; you can change your dream once a game week.
  - 23 achievements; 7 skills with levels; 8 perks; 7 personality traits (choose 2).
  - Perks and traits change the real rules: need drain, living costs, friendship gain, cooking, studying, furniture prices, work bonuses, mood.
- **Actions:** every Go button walks you to the real place or piece of furniture, or opens the real panel.
  - It says so honestly when it can't: no career, no desk, or your home is in another city.
  - Reaching a place in the directory counts it as discovered.
  - Parks have a real run (fitness, fun, tiredness).
- **Persistence:** everything saves with the existing browser save.
  - Saves from before Life OS start fresh.
  - Achievements already earned are recognised **without** paying out again, so no balances jump.
- **Currency:** the existing balance is labelled GHAI everywhere. No second currency; no cash value.
- **Not added, on purpose:**
  - Bladder: there are no toilets in the world yet, and it would add chores.
  - Age: characters don't have one.
  - Audio settings: there's no sound.
  - Privacy settings: nothing leaves the device.
  - Romantic partners, family and real-player relationships: they need new systems or accounts.
  - Vehicles: shown as not available.

Checked in a browser with an isolated test profile:
- Opened the dashboard and tapped Fun; it routed to the park.
- Ran 30 minutes: fitness 20, fun up, the park counted as discovered.
- "Find food" routed to a food spot; ordered a meal: fullness 30 → 80, −35 GHAI recorded.
- Chose a dream.
- Reloaded: dream, skills, places, missions and balance all persisted.

Also checked: desktop and phone layouts.

## Next task (pick up here)

1. **Car dealership, ownership and driving** (step 10): a dealer counter per city, cars as owned items, get in at your parking spot, drive with the existing controls on the roads (traffic and collisions already exist), fuel/parking costs.
2. **Onboarding flow** (steps 3–6): split character creation into steps with a progress bar (Identity → Look → Body → Personality & goals → Starting life → First home), add traits, goals and background that affect needs decay, pay or friendships, and pick the first home there.
3. **District map with pins and filters** (step 9).
4. **Accounts** (steps 1–2) as soon as the Supabase project is approved.
