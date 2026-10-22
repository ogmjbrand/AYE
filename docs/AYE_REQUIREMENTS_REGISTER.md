# AYE requirements register

**Reviewed:** 2026-10-21  
**Repository:** `aye-web`, branch `main`, based on commit `43155e3`  
**Scope:** Requirements and evidence available in this workspace and the
current conversation. This is a living register, not a claim that AYE is
complete or deployed.

## How to read this register

Statuses apply to the stated requirement as a whole, not to the existence of
a component or document:

- **COMPLETE** — implemented and supported by relevant verification evidence.
- **PARTIAL** — useful implementation exists but does not meet the whole goal.
- **NOT STARTED** — no meaningful implementation is present.
- **BLOCKED** — a specific external dependency prevents safe implementation.
- **NEEDS VERIFICATION** — code exists, but the stated behavior has not been
  established with appropriate tests or runtime evidence.

“Local” means this checkout only. “Deployed” means verified on a configured
production service. No feature is described as deployed without evidence.

## Instruction sources and limits

Reviewed for this register:

- The AYE requirements and corrections visible in the current conversation:
  the original Vite conflict request, autonomous NPC fashion, PBR environment
  integration, Marina Motors and vehicle ownership, and the layout references.
- The complete 227-line “Complete Directive Audit, Project Reconciliation &
  Continuous Execution” attachment.
- The current session’s available checkpoint summaries, especially the
  redesign and dealership checkpoints.
- Current repository documentation: `ARCHITECTURE.md`, `ART_DIRECTION.md`,
  `ASSETS.md`, `ASSET_CHECKLIST.md`, `ASSET_INVENTORY.md`,
  `BACKEND.md`, and `CHARACTER_PIPELINE.md`.
- Current source, tests, package scripts, working-tree status, branch list,
  and recent Git history.

Limits that remain:

- The conversation reports 51 omitted messages. Their exact text is not
  available here; requirements present only in those messages cannot be
  independently reconstructed or declared reviewed.
- The six earlier layout images are represented here by checkpoint summaries
  (overhead apartment, illustrated city map, decorating, character creation,
  an unrelated AquaQuest screen, and a dense city visual). Their original
  pixels are not available for a fresh side-by-side comparison.
- A time-bounded session-history search returned no AYE sessions. Earlier
  work is therefore corroborated by the repository and available checkpoints,
  not a complete transcript of every development session.
- The current branch list contains `main` and
  `origin/claude/wonderful-franklin-gixkta`; this review does not establish
  that every remote or historical branch has been fetched or inspected. The
  visible Claude branch is 19 commits behind `main` and has no commits absent
  from `main`.
- No `AGENTS.md`, `.github/copilot-instructions.md`, or repository `.github`
  instruction directory was found at the workspace root.
- This checkout cannot establish which services, migrations, assets, or
  builds are deployed elsewhere. No live Supabase project was inspected.

## Requirements

### 1. Playable districts, exploration, and navigation

- **Requirement:** Maintain a playable 3D life-simulation world with
  movement, collision, roads, pedestrians, traffic, places, district
  navigation, and travel.
- **Source:** Earlier AYE game and world requirements; current directive,
  sections A and E.
- **Player experience:** Walk through a navigable city, interact with its
  places, and travel between available districts without losing game state.
- **Relevant systems:** `src/App.tsx`, `src/hooks/usePlayerController.ts`,
  `src/lib/world.ts`, `src/lib/geography.ts`, `src/lib/locations.ts`,
  `src/lib/cityDirectory.ts`, `src/lib/travel.ts`,
  `src/world/Buildings.tsx`, `src/world/Streets.tsx`,
  `src/world/Traffic.tsx`.
- **Status: PARTIAL.** The browser game has districts, movement, collision,
  traffic, navigation, and travel code. Its scope and visual fidelity remain
  well below the cinematic/photorealistic target in `ART_DIRECTION.md`.
- **Missing:** More complete world and venue coverage, validation of routes
  and interactions across all districts, and reference-based performance and
  visual acceptance.
- **Dependencies and risks:** World geometry and collision data must stay in
  agreement; high-detail assets must respect browser and integrated-GPU
  budgets.
- **Next action:** Establish repeatable gameplay checks for walking,
  collision, destination routing, and inter-district travel in each supported
  district.
- **Acceptance:** A player can reach and use every listed place, collisions
  match visible geometry, routes terminate correctly, travel preserves the
  player’s progress, and performance is measured on target hardware.

### 2. World art, architecture, materials, weather, and lighting

- **Requirement:** Progress toward the supplied city, road, pavement,
  landscape, building, interior, and time-of-day visual targets without
  misrepresenting the current browser prototype as AAA or photorealistic.
- **Source:** PBR environment request; city and interior layout references;
  `docs/ART_DIRECTION.md`.
- **Player experience:** A visually coherent city with readable roads,
  believable surfaces, venue-appropriate interiors, and consistent outdoor
  and indoor lighting.
- **Relevant systems:** `src/world/materials.ts`,
  `src/world/interiorMaterials.ts`, `src/world/SceneLighting.tsx`,
  `src/world/SkyDome.tsx`, `src/world/timeOfDay.ts`,
  `public/assets/manifest.json`, `public/assets/CREDITS.md`,
  `docs/ASSET_CHECKLIST.md`.
- **Status: PARTIAL.** The asset checklist records installed PBR road,
  pavement, ground, tile, and HDRI integration. Buildings and many props
  remain procedural, and the documented visual target requires a substantial
  art and engine effort beyond this browser client.
- **Missing:** Reference-level architecture, richer venue sets, verified
  visual comparison, weather effects, and performance measurements on the
  target laptop.
- **Dependencies and risks:** Every third-party asset needs a compatible
  format, verified licence, provenance record, and optimized runtime budget.
  Indoor environment lighting must not replace the outdoor sky.
- **Next action:** Capture and review one representative exterior and one
  interior against the available reference description; record asset and
  rendering gaps before selecting the next asset set.
- **Acceptance:** Correct materials appear on actual playable surfaces;
  inside/outside lighting transitions remain correct; collisions and
  interactions are unchanged; licences and asset checks pass; target-device
  frame time is measured.

### 3. Player and NPC characters, fashion, and appearance

- **Requirement:** Preserve player customization and saves while giving NPCs
  stable, varied, role-aware appearances and progressing from baked outfits
  toward compatible fitted clothing, footwear, hair, and accessories.
- **Source:** Autonomous NPC fashion request; character creator and avatar
  requirements; `docs/CHARACTER_PIPELINE.md`.
- **Player experience:** Distinct characters retain their identity and
  appearance across visits, with believable styles for their roles.
- **Relevant systems:** `src/lib/npcFashion.ts`, `src/lib/fashion.ts`,
  `src/components/CharacterCreation.tsx`,
  `src/components/CharacterPreview.tsx`, `src/components/Avatar.tsx`,
  `src/components/GarmentLoader.tsx`, `src/world/WorldNPC.tsx`,
  `docs/CHARACTER_PIPELINE.md`, `public/assets/CREDITS.md`.
- **Status: PARTIAL.** Stable NPC styling, role-aware selection, existing
  Rocketbox characters, saved skin choices, and four head-attached CC0 hair
  meshes are documented. Existing clothing remains baked/material-restyled;
  the MakeHuman-compatible garment weights are not verified against the
  active Rocketbox rig.
- **User-supplied avatar assets:** The original archives and preview GLBs stay
  local and git-ignored. Tasha and The Girl body base-colour atlases are used
  only as complexion references for two new optional skin-tone tints on the
  existing Rocketbox player model. The full supplied meshes are not integrated.
  Their atlases have incompatible UVs for direct use on Rocketbox, so exact
  source-texture transfer remains out of scope; no source model or atlas is in
  production assets.
- **Missing:** Verified modular clothing and shoes, broader authored human
  variety, face morph controls on the active player rig, and tests proving
  outfit stability across actual NPC reload/return flows.
- **Dependencies and risks:** Garments must match the active skeleton and
  weights; clothing changes must not break locomotion, gestures, sitting, or
  saves.
- **Next action:** Keep the active Rocketbox fallback and define a rig-fit
  validation path before enabling another garment asset.
- **Acceptance:** NPC identity and outfit are deterministic and role-aware;
  every equipped mesh is licensed and rig-compatible; movement and seated
  animations preserve attachment; existing player data remains readable.

### 4. Homes, apartments, interiors, and daily activities

- **Requirement:** Support enterable homes and venues, persisted furnishing,
  furniture rotation/placement, usable sleep and home interactions, and a
  camera/cutaway that keeps interiors playable without permanently removing
  building architecture.
- **Source:** Home/interior requirements and apartment/decorating references;
  current directive, section B.
- **Player experience:** Enter a home, move around furnished rooms, decorate
  within owned limits, and perform relevant home activities.
- **Relevant systems:** `src/lib/homes.ts`, `src/lib/homeDecor.ts`,
  `src/lib/interiors.ts`, `src/world/HomeInterior.tsx`,
  `src/world/DecorPlacementPreview.tsx`, `src/components/HomePanel.tsx`,
  `src/components/FashionStore.tsx`, `src/App.tsx`.
- **Status: PARTIAL.** Home tiers, entry, furnished interiors, sleeping, and
  home decoration/persistence foundations are present. Current work changes
  home entry to a top-down camera, but wall/roof readability and the complete
  decoration experience have not been validated against the supplied image.
- **Missing:** Reliable placement/rotation/ownership UX across screen sizes,
  more home activities, and live verification of the new overhead camera and
  cutaway behavior.
- **Dependencies and risks:** Placement must agree with collision and room
  bounds; save changes must be backward-compatible; camera changes must not
  leak into offices, restaurants, or other interiors.
- **Next action:** Browser-test home entry, camera visibility, furniture
  placement, rotation, persistence, and exit with an isolated profile.
- **Acceptance:** Furniture stays within the room, owned items persist across
  reload, interactions align characters correctly, the full interior remains
  readable, and leaving restores the exterior camera and controls.

### 5. Restaurants, dining, and hospitality

- **Requirement:** Make restaurant visits a complete interaction loop with
  appropriate venue layout, host/server/chef/customer presence, ordering,
  payment, eating, needs updates, and seat release.
- **Source:** Restaurant requirements in the current directive, section C;
  previous restaurant seated-flow QA checkpoint.
- **Player experience:** Enter a restaurant, order and pay, sit and eat, then
  leave with needs and the seat state updated.
- **Relevant systems:** `src/lib/restaurant.ts`, `src/lib/food.ts`,
  `src/lib/interiors.ts`, `src/world/RestaurantScene.tsx`,
  `src/world/HomeInterior.tsx`, `src/components/FoodMenu.tsx`,
  `src/components/SitBar.tsx`, `src/App.tsx`.
- **Status: PARTIAL.** Restaurant menus, seating and interaction systems
  exist, and an earlier isolated browser check verified a seated character,
  NPCs, and interior materials. The full payment-to-needs-to-seat-release
  lifecycle has not been reverified in this audit.
- **Missing:** Current end-to-end evidence for ordering, charging once,
  eating, needs changes, and seat release across all restaurant types.
- **Dependencies and risks:** Wallet actions must not double-charge; chair,
  table, and character positions must stay aligned during animation.
- **Next action:** Add or run one isolated end-to-end restaurant lifecycle
  check without accessing player saves.
- **Acceptance:** Exactly one charge occurs, food and needs update as
  designed, the player can exit, and the seat becomes available again.

### 6. Offices, careers, and work progression

- **Requirement:** Provide meaningful career-specific workplaces, work
  interactions, pay, work tasks, and progression.
- **Source:** Current directive, section C; earlier AYE careers requirements.
- **Player experience:** Reach a workplace, perform career-related work,
  receive the correct reward, and advance through a career path.
- **Relevant systems:** `src/lib/officeCareer.ts`, `src/lib/workTasks.ts`,
  `src/lib/gameState.ts`, `src/components/OfficePanel.tsx`,
  `src/world/OfficeScene.tsx`, `src/lib/locations.ts`, `src/App.tsx`.
- **Status: PARTIAL.** Career and task systems are implemented locally and
  have focused tests; not every career is supported by a distinct, fully
  realized workplace and activity.
- **Missing:** Audit of each career’s work activity, workstation/NPC
  integration, career progression, and pay path in the live game.
- **Dependencies and risks:** Pay and promotion must use the game reducer,
  and work completion must only be awarded for the corresponding activity.
- **Next action:** Map each career to its workplace, activity, reward, and
  test, then close any disconnected career loop.
- **Acceptance:** Every advertised career has a reachable relevant
  workplace, validated work action, correct exactly-once pay, persistent
  progression, and tests for promotion boundaries.

### 7. Character life, needs, finance, and progression UI

- **Requirement:** Preserve character creation, identity, needs, finances,
  skills, profile, inventory, missions, challenges, wishes, dreams, perks,
  achievements, and persistent progression; evolve toward the referenced
  Lagos Life-inspired dashboard with AYE’s identity.
- **Source:** Current directive, section D; character-creation/dashboard
  references.
- **Player experience:** Understand the character’s needs, goals, finances,
  achievements, and next meaningful action in a clear dashboard.
- **Relevant systems:** `src/lib/gameState.ts`, `src/lib/progression.ts`,
  `src/lib/fashionMission.test.ts`, `src/components/HUD.tsx`,
  `src/components/CharacterCreation.tsx`, `src/components/DailyLogModal.tsx`,
  `src/lib/save.ts`.
- **Status: PARTIAL.** The character creator, needs, clock, finances,
  daily log, career, and selected progression/missions exist. The full
  dashboard and complete list of long-term goals and rewards are not
  established by available evidence.
- **Missing:** A verified inventory, coherent overview of all goals, and
  proof that every mission reward is connected to its intended gameplay.
- **Dependencies and risks:** UI additions must preserve existing saves and
  avoid falsely awarding progress for menu-only actions.
- **Next action:** Inventory actual reducer state and UI for each listed
  progression feature; implement the highest-value disconnected loop.
- **Acceptance:** Each visible goal has a real triggering activity and
  persistent completion state; reward is exactly once; the dashboard works
  with keyboard, touch, and narrow screens.

### 8. NPC behavior, safety, and relationships

- **Requirement:** Support believable NPC routines, pathfinding, contextual
  social interactions, consent-based behavior, friendships, and adult NPC
  romance where appropriate; clearly distinguish NPCs from real players.
- **Source:** Current directive, sections E and F.
- **Player experience:** Meet identifiable NPCs, navigate safely around them,
  choose respectful social interactions, and develop persistent NPC
  relationships.
- **Relevant systems:** `src/lib/people.ts`, `src/lib/relationships.ts`,
  `src/lib/pathfinding.ts`, `src/world/Residents.tsx`,
  `src/world/WorldNPC.tsx`, `src/components/TalkPanel.tsx`,
  `src/components/Gestures.tsx`, `src/lib/save.ts`.
- **Status: PARTIAL.** NPC pedestrians and friend/social foundations exist.
  The complete routine/dialogue/relationship lifecycle and the specified
  consent/decline coverage have not been established here.
- **Missing:** Evidence for decline behavior, adult-romance constraints,
  relationship persistence, natural schedule changes, and safe traffic
  yielding across all routes.
- **Dependencies and risks:** NPCs must never be presented as real players;
  consent boundaries and age gating must be explicit before romance scope
  expands.
- **Next action:** Review current dialogue and relationship state transitions
  against consent and persistence acceptance tests before adding new
  relationship features.
- **Acceptance:** NPC identity is clear; every social action can be declined;
  relationship changes are bounded, explainable, and persistent; pedestrians
  avoid traffic and blocked geometry.

### 9. Marina Motors, vehicle ownership, and driving

- **Requirement:** Integrate a physical dealership, catalogue, genuine
  GHAI-backed ownership, saved paint, a garage, safe spawning, and usable
  vehicle driving into the existing city and save systems.
- **Source:** Car dealership and vehicle ownership request; archive findings
  documented in `docs/ASSET_CHECKLIST.md`.
- **Player experience:** Visit a city dealership, compare vehicles, pay once,
  retain ownership, customize paint, spawn a car safely, and drive/exit it.
- **Relevant systems:** `src/components/DealershipPanel.tsx`,
  `src/world/CarDealershipScene.tsx`, `src/lib/vehicleCatalog.ts`,
  `src/lib/vehicleDriving.ts`, `src/lib/gameState.ts`,
  `src/lib/save.ts`, `src/hooks/usePlayerController.ts`,
  `src/lib/districts/lagos.ts`, `src/lib/cityDirectory.ts`,
  `src/lib/locations.ts`.
- **Status: PARTIAL.** The current uncommitted local diff adds catalogue,
  reducer purchase/ownership, saved paint, dealership location/interior,
  UI, and basic driving integration. Focused tests passed before the latest
  layout audit. No production-quality licensed car models were found; the
  procedural vehicles are explicitly low-poly temporary fallbacks. A full
  current browser purchase/reload/drive session has not been established.
- **Missing:** Real vehicle models and licensing, end-to-end browser
  verification, performance checks with multiple cars, and authoritative
  server-side wallet transactions.
- **Dependencies and risks:** Local reducer purchases are not secure against
  client modification; no price or ownership should be represented as
  server-authoritative. Spawn and collision checks must cover buildings,
  pedestrians, and traffic.
- **Next action:** Verify the purchase-to-ownership-to-reload-to-spawn-to-drive
  path on isolated data, then record exact asset requirements and do not
  represent fallback geometry as a finished car.
- **Acceptance:** A purchase uses a canonical catalogue price and changes
  balance and ownership atomically once; insufficient funds do not mutate
  state; ownership and paint survive reload; safe spawn and movement/exit
  work on keyboard and touch; fallback status is visible.

### 10. GHAI economy, persistence, and transaction authority

- **Requirement:** Preserve one consistent GHAI economy, durable player
  progress, auditable transaction safety, and clear limits between client
  simulation and authoritative server state.
- **Source:** Economy and safety requirements throughout the current
  directive; `docs/BACKEND.md`.
- **Player experience:** Earn and spend currency predictably, with balances
  and purchases retained on the player’s save.
- **Relevant systems:** `src/lib/gameState.ts`, `src/lib/save.ts`,
  `src/hooks/useGameState.ts`, `src/lib/supabase.ts`,
  `supabase/migrations/`, `src/backend/schema.test.ts`.
- **Status: PARTIAL.** Local browser persistence and reducer-based economy
  exist. Backend migrations and PGlite tests provide a server-side ledger
  foundation, but the game client is not synced to it and deployment status
  is unknown.
- **Missing:** Server-authoritative game saves, client integration with
  server purchase/payout functions, conflict/retry semantics, and live
  deployment evidence.
- **Dependencies and risks:** Requires owner-approved staging/live backend
  configuration and migration review. Never put privileged keys in the
  browser or perform production writes during this audit.
- **Next action:** Keep guest/local play clearly labelled and prepare a
  staging integration plan only after reviewing the live project and
  obtaining explicit deployment approval.
- **Acceptance:** Server validates every balance mutation, writes ledger and
  ownership atomically, rejects duplicate transaction IDs, and has verified
  recovery and migration tests.

### 11. Accounts, social features, multiplayer, and cloud saves

- **Requirement:** Provide secure authentication and, when deliberately
  implemented, profile discovery, friend requests, messaging, home visits,
  privacy controls, multiplayer, and cloud synchronization.
- **Source:** Current directive, sections F and H; `docs/BACKEND.md`.
- **Player experience:** Know whether play is local or online, control
  discoverability/privacy, and interact with authenticated real players only
  when those services are actually operational.
- **Relevant systems:** `src/components/CloudAccountPanel.tsx`,
  `src/lib/supabase.ts`, `supabase/migrations/`,
  `docs/BACKEND.md`.
- **Status: PARTIAL.** Optional Supabase email authentication and profile
  foundations exist. The backend documentation explicitly says cloud game
  save sync, realtime messaging, requests, payments, and shared multiplayer
  are not implemented and migrations are not verified as deployed.
- **Missing:** Cloud save sync, real friend/messaging flows, shared presence,
  multiplayer simulation, and operational privacy enforcement for those
  absent systems.
- **Dependencies and risks:** Requires reviewed backend schema, deployment,
  threat model, moderation/safety tooling, and explicit approval before live
  migrations.
- **Next action:** Do not add UI that implies online play exists; define
  staging acceptance criteria after the authoritative save architecture is
  approved.
- **Acceptance:** Guest, authenticated, and multiplayer states are distinct;
  privacy and access rules pass integration tests; cloud saves reconcile
  safely; no feature is described as live unless verified.

### 12. Payments, monetisation, creator economy, and real-money value

- **Requirement:** Keep GHAI virtual currency distinct from real money.
  Implement any future payments, withdrawals, trading, or creator economy
  only with secure services and necessary safety/legal review.
- **Source:** Current directive, section G; `docs/BACKEND.md`.
- **Player experience:** No ambiguity about whether virtual currency has
  cash value, and no insecure or misleading payment flow.
- **Relevant systems:** `src/lib/gameState.ts`, `src/components/HUD.tsx`,
  `src/components/CloudAccountPanel.tsx`, `docs/BACKEND.md`.
- **Status: NOT STARTED.** No verified payment, withdrawal, or creator-market
  service is present.
- **Missing:** Reviewed product requirements, legal review, payment provider,
  server-authoritative receipts, fraud handling, support, and reconciliation.
- **Dependencies and risks:** External financial services and regulatory
  obligations; client-only purchase handling is insufficient.
- **Next action:** Keep these features out of operational claims and first
  complete authoritative account and save foundations.
- **Acceptance:** Real-money flows are server-authoritative, legally
  reviewed, tested in provider sandbox, auditable, and accurately described.

### 13. Venues and services not yet evidenced

- **Requirement:** Progress beyond homes, restaurants, offices, and
  boutiques toward hotels, supermarkets, clinics, gyms, salons, and other
  enterable venues requested in the AYE vision.
- **Source:** Current directive, sections A and B; earlier AYE gameplay
  requirements.
- **Player experience:** Reachable venues support their advertised
  activities instead of being decorative map entries.
- **Relevant systems:** `src/lib/geography.ts`, `src/lib/locations.ts`,
  `src/lib/cityDirectory.ts`, `src/lib/interiors.ts`, `src/world/`.
- **Status: PARTIAL.** Existing venue systems cover only some requested
  categories; this register does not count directory labels or planned
  entries as playable features.
- **Missing:** Verified playable flows for hotel, supermarket, clinic, and
  gym; complete venue-specific NPCs, interactions, and assets.
- **Dependencies and risks:** New venues should reuse shared interior,
  interaction, NPC, economy, and navigation systems rather than duplicate
  them.
- **Next action:** Inspect current directory entries against actual enterable
  scenes and prioritize the highest-value missing venue.
- **Acceptance:** Every advertised venue is navigable, enterable where
  appropriate, has working interactions and state changes, and passes a
  route and save regression check.

### 14. Layout references and responsive UI

- **Requirement:** Adapt relevant AYE screens to the provided city-map,
  apartment, decorating, and character-creation layout references without
  copying unrelated AquaQuest branding or sacrificing current interactions.
- **Source:** Six images summarized in the previous available checkpoint;
  user’s “THIS IS THE LAYOUT I WANT” direction.
- **Player experience:** See a readable illustrated city map, a useful
  overhead home view, and consistent decoration and creator screens on
  desktop and mobile.
- **Relevant systems:** `src/components/MapPanel.tsx`,
  `src/world/HomeInterior.tsx`, `src/components/FashionStore.tsx`,
  `src/components/CharacterCreation.tsx`, `src/App.tsx`.
- **Status: NEEDS VERIFICATION.** The phone map was rewritten to derive
  projected streets, buildings, park, markers, and player position from
  district data; home entry now uses a top-down camera. Production build,
  lint, and 48 focused tests passed. The map could not be opened in the
  isolated browser profile because that test character did not own the
  map-enabled phone. The original images were not available for fresh
  comparison, and the decorating/creator layouts remain largely unchanged.
- **Missing:** Browser validation of the map on desktop/mobile, map marker and
  selection interactions, camera/cutaway validation, and review against the
  actual image pixels.
- **Dependencies and risks:** The map is behind the phone ownership gate.
  Avoid using real player saves to bypass that gate for QA.
- **Next action:** Use a new isolated profile with test-only map access or an
  isolated test setup; verify map rendering and layout at narrow and wide
  viewports, then review the apartment camera.
- **Acceptance:** Map data corresponds to current district coordinates,
  place selection is understandable, no overflow occurs at target sizes,
  close/keyboard interactions work, and home walls/roof transition
  correctly without changing other interior cameras.

### 15. Assets, licensing, and performance

- **Requirement:** Use only verified, appropriately licensed, compatible
  assets; preserve provenance; optimize for browser and integrated graphics.
- **Source:** Asset archive inspection requirements; `ASSETS.md`,
  `ASSET_CHECKLIST.md`, `ASSET_INVENTORY.md`, and `public/assets/CREDITS.md`.
- **Player experience:** Assets load reliably, are visually honest, and do
  not destabilize gameplay or frame rate.
- **Relevant systems:** `public/assets/manifest.json`,
  `public/assets/CREDITS.md`, `scripts/check-assets.mjs`,
  `scripts/optimize-glb.mjs`, `docs/ASSET_CHECKLIST.md`.
- **Status: PARTIAL.** Asset inventory and license guidance exist; the
  checklist records previous archive findings and names several missing
  high-quality asset categories. The current dealership uses explicit
  procedural fallback vehicles rather than verified production models.
- **Missing:** Verified production vehicle models, building and furniture
  libraries, and repeated target-hardware performance measurements.
- **Dependencies and risks:** No asset enters a public build without
  provenance, redistribution rights, compatibility checks, and explicit
  user approval when provenance is unclear.
- **Next action:** Run `npm run assets:check` after any asset change and
  procure only documented, compatible, redistributable models.
- **Acceptance:** Asset manifest paths resolve; licence and credits are
  recorded; budgets pass; no unsupported model or licence claim is made.

### 16. Technical quality, save safety, and release discipline

- **Requirement:** Preserve Vite, React, TypeScript, and Three.js; keep saves
  backward-compatible; test changes; review uncommitted work; avoid
  destructive Git operations.
- **Source:** Current directive, sections H and 7; original merge-conflict
  request; repository package scripts.
- **Player experience:** Existing lives remain usable across updates and
  features do not break each other.
- **Relevant systems:** `src/lib/save.ts`, `src/lib/gameState.ts`,
  `src/lib/save.test.ts`, `package.json`, all app entry points.
- **Status: PARTIAL.** The current build and lint pass; the latest layout
  change has 48 focused tests passing. A full run on 2026-10-21 passed 5,479
  of 5,480 tests across 47 files, with one failure in
  `src/lib/districts/generate.test.ts`. The current checkout contains
  uncommitted dealership and layout changes. A prior Vite chunk-size advisory
  remains.
- **Missing:** Full-suite result against the current checkout, final review
  of all uncommitted changes, and browser verification of the current
  integrated flows. The two existing generation-test failures concern a
  street-plan distribution expectation and an orientation assertion that
  treats cross-street parked cars as boulevard buses.
- **Dependencies and risks:** Protect user edits in the dirty worktree and
  never clear or rewrite existing browser saves during testing. Changing
  generated street-plan assignments can move persistent home and destination
  coordinates, so the failing distribution expectation must not be “fixed”
  by silently reshuffling existing cities.
- **Next action:** Review current diff and status, resolve only failures
  attributable to current changes, and design a save-compatible resolution
  for the generated-layout test expectations before changing world
  assignments. Do not commit or push until changes are reviewed and release
  criteria are met.
- **Acceptance:** TypeScript/build/lint and relevant tests pass; all failures
  are attributed and reported; save migration tests cover old data; diff
  contains only understood changes; no user save or unrelated change is lost.

## Audit outcome and priority order

The current browser game is a functional local prototype with substantial
world, character, economy, career, home, restaurant, fashion, and navigation
systems. It is not yet the photorealistic, authoritative, multiplayer global
game described by the larger vision. Important boundaries are explicit:

1. **Protect and verify the current uncommitted implementation.** The
   dealership and layout changes are local and uncommitted; the entire suite
   and end-to-end browser flows have not been verified against this exact
   state.
2. **Close the highest-impact playable gaps.** Verify the home/decorating and
   restaurant loops, then identify any advertised but nonfunctional career
   or venue entries.
3. **Strengthen authoritative persistence before online economy.** Local
   browser saves are not secure or cloud-synchronized; migration deployment
   must remain owner-approved.
4. **Treat production-quality art as an asset and platform program.** The
   documented cinematic target cannot be met by procedural geometry alone;
   obtain verified licensed assets and measure performance before expanding
   scene complexity.

## Change log

- 2026-10-21: Initial reconciliation against the sources listed above;
  verified production build, lint, asset checks, and the full test-suite
  result recorded in section 16.
- Update this register after each meaningful implementation or verification
  milestone; preserve the evidence, limitations, and local/deployed boundary.
