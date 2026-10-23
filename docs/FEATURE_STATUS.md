# AYE: feature status against the full player journey

Updated 21 October 2026 (venues milestone), branch `claude/wonderful-franklin-gixkta`.
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
| 3 | Multi-step creator with live 3D preview | **Partial** | Live 3D preview, 12 people, height, body shape (7 women's figures with bust and waist; 5 for men). A studio layout: categories on the left, your character in the middle (Face/Body camera), controls on the right, in steps. |
| 4 | Appearance, hair, clothes, colours, personality, traits, goals, background | **Partial** | Identity, heritage, country/region, look, height, body shape; clothes, fabrics, prints and hair colour in the boutique. Personality traits (up to 2) and a life dream are chosen at creation. A short background bio is written at creation too. **Missing:** new hairstyles and garment cuts. |
| 5 | Starting life that affects gameplay | **Done (basic)** | Lifestyle sets starting balance and hourly living costs; career sets workplace, wage and promotion ladder. |
| 6 | Home selection (types, costs, rent, lifestyle) | **Partial** | Four tiers per city (room → penthouse) with move-in fee, nightly rent, eviction; bigger homes are bigger rooms. Choose a first home (Lagos) during creation, if your starting money covers the move-in fee, or rent one later at any front door. |
| 7 | Playable home: furniture, catalogue, needs, time, mood, balance | **Done** | Needs (energy, hygiene, fun, social) plus hunger, a mood that changes pay and work bonuses, the Home Decor catalogue (40 pieces by room, with a Luxe collection, 3D pictures and a Preview you can turn), delivery into your home, moving/turning/storing/selling, wall art, and furniture you use (shower, bath, sofa, TV, games, books, music, cooking, study). The penthouse is a Victoria Island apartment furnished in Luxe. Open-plan "dolls' house" room with no ceiling, as before. **Missing:** drag-to-place on the floor (pieces are moved with arrow buttons). |
| 8 | Home → outdoor city transition | **Done** | Front door in and out, camera snaps behind you. |
| 9 | Interactive 3D city map, labels, filters, landmarks | **Done (basic)** | 3D districts in 235 cities. The phone map has labelled pins, area names, filters by kind, zoom that follows you, and Go to walk to any place. Also a City Locations directory with walk-there routing and a world map at the travel desk. |
| 10 | Businesses, careers, restaurants, fashion, car dealers, cars, driving | **Partial** | Careers (7, five levels, hourly tasks), food vendors, The Palms (a walk-in fine-dining restaurant in Lagos), the Fashion House (a walk-in boutique and salon in every city), gadget shop, lounge, park, travel desk. **University: AYE Global University, walk-in in every city (see below).** **Cars: a car dealer in all 235 cities (Eko Motors in Lagos, Osu Motors in Accra, "<City> Motors" elsewhere) sells five cars (colour of your choice, sold back for half); Drive/Park on the bar turns you into your car on the street, with fuel billed from GHAI as you drive (one GHAI at a time, no free distance) and parking when you run out. Park and the car stays on the street where you left it (saved, shown on your phone's map, solid to walk into); walk back within 4 m to get in. The engine is made in the browser (Web Audio, no recordings), pitch following your speed; Life OS → Settings → Sound turns it off.** **Bags: five original handbags (tote, top-handle, clutch, bucket, mini) in the boutique's Accessories section, carried in your left hand. Choose the colour of any plain piece (bags, shoes, solid tops and bottoms) from 15 shades, free, in the boutique or the fitting room.** **Missing: dresses, jackets, jewellery and sunglasses (need new 3D garments and accessories).** |
| 11 | Business advertising platform | **Not started** | Needs accounts, a review/approval process, payments and legal review first. Billboards exist in the world but only show built-in art. |
| 12a | Character Life OS, missions, wishes, dreams, perks, achievements | **Done (this milestone)** | See below. |
| 12 | Persistent progress, coherent economy, multiplayer roadmap | **Partial** | Everything saves (browser) and old saves load. Economy is one set of tested rules. Multiplayer is planned in `ARCHITECTURE.md` (authoritative server after accounts). Residents are computer-controlled and labelled so; there are no fake player counts. **Every person is a real 3D person:** residents, staff, students, patients, the body-type chart in the creator (your own person in each shape), you at the wheel of your car, and keke drivers in traffic. No grey stand-in figures while people load. |

## Venues milestone (verified)

Built from the reference screens (The Palms, My Apartment, Fashion House):
- **HUD:** portrait chip with name and day/time, venue title plate, GHAI pill, round inventory/profile/settings buttons, a round minimap with place icons, a location pill, and a bottom bar that changes with where you are (street, home, restaurant, boutique). Urgent needs show as small chips; sleeping and the main menu moved into the Life OS.
- **The Palms Restaurant** (`src/lib/restaurant.ts`, `src/world/RestaurantInterior.tsx`): shop front on the Lagos cross street; inside, marble, a lit bar, chandeliers, a kitchen pass, and staff and diners who are computer-controlled. Check in with the host or take a free table, then order: 19 dishes over four courses at the reference prices, each a 3D model served to your table and shown on the menu. Open 11:00–23:00. A meal costs GHAI, passes time, fills you, lifts fun and counts as a meal out.
- **Home Decor and My Apartment:** see step 7. Thumbnails of dishes and furniture are rendered from the game's own 3D models (`src/components/snapshot/`), kept for the session only.
- **Cantina Ayé** (`src/lib/cantina.ts`, `src/world/CantinaInterior.tsx`, `CantinaFront.tsx`): a walk-in Mexican-style cantina bar in Ayemara, on the cross street next to The Palms, open 12:00–02:00. Built in code to the reference pictures (no bought assets): terracotta tiles, red brick under yellow plaster, papel picado, green enamel lamps, a brick bar under a timber canopy with green-topped stools, blue kitchen doors, an arcade of arches with painted plates, sombreros and two original paintings, square tables with pink runners and red and green rush chairs. Sit at a table or on a stool and order from 15 dishes and alcohol-free drinks, each a 3D model served where you sit. The bartender, waiter and customers are computer-controlled.
- **Studio furniture collection** (`src/world/StudioFurniture.tsx`, `src/lib/furniture.ts`): eleven loft pieces in the Home Decor catalogue: cloud sofa, egg chair, slatted oak bench, tripod floor lamp, acoustic guitar on a stand (play it for fun), framed records and landmark prints for the wall (our own artwork), coat stand, pampas grass vase, low oak bookshelf and linen storage boxes. The two lofts come furnished with them.
- **Real materials and lighting** (`src/world/pbr.ts`, `public/assets/manifest.json`, `scripts/ambientcg/`): photographed CC0 surfaces from ambientCG — real asphalt on the roads, real grass on the ground, oak floorboards in homes and the spa's treatment rooms, a brick chimney breast in the family house, bamboo and backlit onyx in the spa. Image-based lighting from real HDRIs (a city by day, a town at dusk, a street at night, and a lounge for interiors). Scanned real-size food (bread, pastry, cake, fruit) on the hotel's room-service menu (continental breakfast, slice of cake) and in a fruit bowl and on a bread board on every home kitchen counter.
- **Alafia Spa** (`src/lib/spa.ts`, `src/world/SpaInterior.tsx`, `SpaFront.tsx`, `src/components/SpaPanel.tsx`): a walk-in day spa in Ayemara (open 09:00–21:00): marble reception with a teak desk, a waiting sofa and a shelf of oils, and three treatment rooms (Lotus, Jasmine, and the Baobab couples suite) with massage tables, rolled towels, flickering candles, amber oils, wooden massage tools, hot stones and sheer curtains. As a guest, book any of nine treatments at reception (full body, deep tissue, Swedish, sports, relaxation, back & neck, foot, hot stone, couples with a friend), lie on your table, and time passes as it lifts your energy and mood. As a massage therapist: take the job from the manager, clock in 10:00–20:00 and take up to five computer-controlled clients a day from the waiting sofa; every service is its own routine of choices (prepare the room, oil, pressure, technique or tool, focus, finish) guided by what the client asked for. Satisfaction (stars) sets the tip on top of your share of the price; good sessions promote you from trainee (30%) to spa lead (60%). Saved as `spa`.
- **Homes for every creator, and OGM Homes** (`src/lib/homes.ts`, `src/lib/interiors.ts`, `src/components/OgmHomesPanel.tsx`, `src/world/AgencyFront.tsx`, `src/world/HomeDecor.tsx`): every new character starts out renting the one-room flat at Marina Court (rent from the first night); an existing save with no home is given it once (saved as `starterGiven`, so someone evicted later stays evicted). OGM Homes, the estate agency on the cross street west of Eko Motors, sells five homes outright in GHAI: a one-bedroom house (40,000), an attic loft studio with exposed brick (85,000), a middle class family house with a brick fireplace, red curtains, dining for six and a study (150,000), a brick-walled warehouse loft (260,000) and a luxury villa with marble floors, glass walls and a fireplace (600,000). A home you buy is yours (saved in `owned`): no rent, and you can move out and back in for free. Homes for sale have a For sale board; only Ayemara sells homes.
- **Grand Lagoon Hotel** (`src/lib/hotel.ts`, `src/world/HotelInterior.tsx`, `HotelFront.tsx`): a walk-in hotel in Ayemara, behind Gadget Hub on the lane off the boulevard. A lobby with the front desk (the receptionist is computer-controlled), leather sofas and a wall fire, and a corridor of six rooms. Every room is built from one plan with the same textures (oak basket-weave parquet, cream plaster, damask feature wall, walnut doors): a wall fire and leather bench in the entrance, sliding wardrobe, a tiled bathroom (toilet, vanity and mirror, towel rail), a bed under a tray ceiling with teal lamps and three flower prints, dresser and television, luggage bench, two armchairs by a floor-to-ceiling window with curtains. Book a night at the desk (350 GHAI, until noon the next day; saved): your room is 102, the others are taken. Sleep in the bed (a full night's rest, like home), freshen up at the basin, or sit in the armchairs. A drinks vending machine stands in the lobby (water, juice, ginger soda, iced tea, 20–35 GHAI), and the dresser telephone in your room orders 24-hour room service (club sub sandwich, bento box, drinks), left on the dresser on a tray for the rest of your stay (not saved). The machine, sandwich and bento are CC-BY 4.0 Sketchfab models (`public/assets/models/props/`, credits in `public/assets/CREDITS.md`); the machine's branded textures were replaced with original artwork. A guest's motorhome (CC-BY 4.0, Karol Miklas, every badge and sticker painted out) is parked beside the hotel's west wall, solid like any vehicle (`src/world/Campers.tsx`, the district's `campers`).
- **Fashion House** (`src/lib/boutique.ts`, `src/world/BoutiqueInterior.tsx`): walk in from the boutique's street door in any city. Mannequins, rails in the city's own fabrics, bags and shoes, a lounge, the fitting room, a salon chair and the "Style Your Life" neon; the store assistant and stylist are computer-controlled. Clothes, Shoes, Hair, Accessories, Decor and Fitting Room; favourites (the heart) and a cart with checkout. Matching sets sell top and bottom together.
- **Honest limits:** clothes restyle the fabric of what your character wears. Dresses, jackets and accessories say they aren't in the game yet (they need new 3D garments) and sell nothing. The Decor tab's rooms are the home's rooms; there is no outdoor furniture.

## Home life milestone (verified)

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
  - Music and other sounds: only the car engine makes sound so far (Life OS → Settings → Sound turns it off).
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

## University milestone (verified in the browser)

**AYE Global University** (`src/lib/university.ts`, `src/lib/school.ts`, `src/world/University.tsx`): E at any city's University marker takes you to one connected campus. The campus has:
- the street with lane markings, a zebra crossing, a drop-off lane, a taxi and a direction sign;
- the gate (stone pylons with the crest and "AYE GLOBAL UNIVERSITY", security booths, a barrier on the vehicle lane, open pedestrian gates and a computer-controlled guard);
- a courtyard with a fountain, raised gardens, palms, benches, the directory board, a signpost, a noticeboard, bike racks and umbrella tables;
- the academic building: stone and glass with banners, a canopy, the "Academic Building" sign and sliding glass doors.

Inside, without any teleporting, are the lobby (reception, branding wall, directory and timetable screens), the corridor (room plates, noticeboard, fire exits), Lecture Hall A (G01), the Computer Laboratory (G05), the Library (G04), the Cafeteria (G02), the Student Centre (G08), Student Services (G07) and the Restrooms (G06).

Walls, doors and collisions come from one plan. Tests prove every room, interaction spot and seat can be reached on foot from the street. Walls between the camera and you are cut away, and the roof lifts off indoors.

**Student loop**, all saved in `GameState.school` and kept on reload:
- Three classes every weekday on the timetable. You take a seat in the right room between 15 minutes before and 20 minutes after the start. A class counts once per day if you sit through 60% of it. Notes and a question add a credit each.
- Study at a library desk, a library computer, a lab computer or with classmates. This takes game time and moves the assignment towards 100%, which you hand in once (+10 credits).
- Cafeteria meals use the normal `eat` action, with the price shown first. You can also chat with classmates, join clubs (saved; no club events yet) and freshen up.
- **Allowance:** this is the student career's existing hourly pay, 15 GHAI an hour times the level multiplier. It's paid for every minute on campus between 09:00 and 17:00, exactly like any other job's time at work. There is no second clock or second economy.

**HUD:**
- a Today's Goals panel and an Active Status panel (year, In class / On campus, next class, allowance, assignment %, credits, classes today);
- a room label on the title plate;
- the bar's Map becomes Directory (a gold route on the floor) and Career becomes School.

**Honest limits:**
- Everything is built from shapes, canvas-painted signs and textures, the game's palms and the existing character models. It is not photographic.
- Upper floors are façade only; every room is on the ground floor.
- Campus NPCs walk set loops or sit; they're labelled computer-controlled.
- The software renderer used for testing manages only about 1 fps here (the city is the same).

## Hospital milestone (verified in the browser)

**AYE General Hospital** (`src/lib/hospital.ts`, `src/world/Hospital.tsx`): E at any city's Hospital marker. It has a forecourt with an ambulance bay and a canopy sign. Inside are reception and waiting (with visitors), Emergency, the staff room, a corridor, two consulting rooms and a four-bed general ward. Collisions come from the same plan as the walls, and tests reach every room, spot and patient from the street.

**Doctor's shift** (`GameState.shift`, saved):
- Clock in with Dr. Bello (supervisor) between 09:00 and 17:00.
- Seven patients wait in the ward, the consulting rooms and Emergency. Seeing one takes 15–30 game minutes on shift and counts once a day; the daily target is 4.
- Pay is the doctor's existing hourly rate for clocked-in minutes inside the hospital. There is no per-patient money, so nothing is paid twice.
- Leaving the building, sleeping, travelling or the end of the day clock you out.

**HUD:** Today's Goals (go, clock in, patients x/4, clock out) and an Active Status panel (level, on/off shift, room, pay per hour, earned today, waiting, patients today). Staff, patients and visitors are computer-controlled and labelled.

**Change for doctors:** pay now comes only from shifts inside the hospital, no longer from standing at the street marker.

**Character creator (studio layout):**
- Categories on the left, the model in the middle with Face/Body camera and Randomise, and controls on the right. On phones it stacks.
- Skin-tone swatches. The skin shader now darkens in linear colour, so "Deepest" really is deep.

## Songhai (the fictional home country)

`src/lib/songhai.ts` is the single source of truth: the country (name, motto, flag colours, capital), 12 states (ID, name, capital, cities, planned towns, identity), each city's Songhai name, original area names, and the former real state names for old saves.

**IDs never changed.** Districts, homes, places and residents keep the IDs saves use (`lagos.marina`, `marina-court-room`, `lagos.marina.cars.eko-motors`, `tunde`). Names are mapped for display when districts are built (`lib/geography.ts`) and for residents, menus and coursework. The country keeps the internal code `NG` and shows as "Songhai". A home region saved as a former real state shows as its Songhai state; nothing is rewritten in storage.

**Playable:** all 37 Songhai cities are walkable districts in 12 states. The national capital is Ayemara (Lagoon Boulevard) in Aderan, where a new life starts. Each state also lists one planned town marked "Coming later", which can't be booked.

**Directory:** the travel desk has a Songhai tab with the flag, states, capitals, playable cities (with real booking) and planned towns.

**Checks:** `validateSonghai` finds duplicate IDs or names, capitals outside their state, cities in two states or none, and dangling references. The tests run it, scan every Songhai display string for real Nigerian place names, and confirm saved IDs still resolve.

**Not changed:** other countries are still the real world (Ghana, Kenya, the UK and so on). Characters' self-described heritage and ethnic group are untouched. Food, music and clothes keep their cultural names (jollof, aso-oke, highlife).

## Next task (pick up here)


-0.5. **Fashion request (Oct 2026 references)**: evening gowns, heels, nails and wigs. Bags and your own colour choice are in. These need new 3D garments and hair (see 0). No brand logos; no faces taken from photos of real people.

0. **New garments**: dresses, jackets and accessories as real 3D clothes on the character (see `CHARACTER_PIPELINE.md`), so the boutique can sell them.
4. **Accounts** (steps 1–2) as soon as the Supabase project is approved.
