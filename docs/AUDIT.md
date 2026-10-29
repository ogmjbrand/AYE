# AYE technical audit

October 2026, on branch `claude/wonderful-franklin-gixkta`.

## What AYE is built on

| | |
|---|---|
| App | React 19 + TypeScript, built with Vite 8 |
| 3D | Three.js through React Three Fiber and drei; post-processing (AO, bloom, tone mapping) |
| Hosting | Vercel (static site) |
| Saves | The browser's local storage, sanitised on load (`src/lib/save.ts`) |
| Server | None yet. Supabase is connected to the account but holds no game tables |
| Tests | Vitest: 72 files, 5,719 tests, all passing |

All game rules are pure functions in `src/lib`, driven through one reducer (`gameState.ts` plus `life.ts`). That is the most valuable part of the codebase: those rules can move to a server, or to another engine, unchanged.

## 1. Why "Getting Lagoon Boulevard ready…" took so long

I measured this in a real browser run; numbers are from the software (CPU) renderer:

| Step | Before | Cause |
|---|---|---|
| Waiting for assets | 8.5 s (could wait up to 20 s) | Residents' models and hair keep streaming in |
| Compiling shaders | 3.3 s, no time limit | About 100 shader programs |
| Uploading textures | 12.9 s, no time limit | **198 textures** on the street. The heaviest are two 2048×2048 skin maps plus four 1K maps for **every** resident |
| First frame | 9.5–13 s | 31 shader variants (shadows, post-processing) that can only be compiled by drawing |

**Fixed** (commit `7b63bd7`):
- Every step now has a time limit: 12 s for loading, 8 s for compiling, 6 s for uploading. Anything left is prepared on first use, so the card can never hang.
- On the low tier (phones, and machines with 4 cores or 4 GB or less), textures are scaled to 1024 px before upload.
- The card shows a progress bar and what it's doing.
- After 6 seconds a "Start now" button appears.

**Still to do:**
- Cut the number of shader programs (about 100) by sharing materials between residents.
- Bake 1K copies of character textures into the files, so phones don't download 2K at all.

## 2. Working systems

These are real, saved and tested:
- Walking, driving and click-to-move with collision. Touch stick on phones.
- Cities and districts with travel between them, day and night, and lamps.
- Homes to rent and buy, furniture placement, a wardrobe and dressing.
- Food and needs (hunger, energy, hygiene, fun, social) and mood.
- Careers with ranks and pay. Playable workplaces: hospital shifts with triage, university classes and assignments, office, spa, restaurant.
- Work gear: buy, equip, wear, repair and sell.
- Shops: fashion, gadgets, car dealership.
- Relationships, nights out, the phone, and Life OS.
- Living-world events (accident, collapse, missing person, breakdown, lunch rush) and reputation.
- Quests, player level and level-up.
- Divine Evolution stage 1: form, energy and healing chamber.
- **No-death survival** (this session): health, 10% critical, 5% automatic hospital or sanctuary recovery, medical kit, paramedic, crash injuries.
- Landscape on phones.

## 3. Incomplete or placeholder systems

- **Multiplayer:** none. Residents are computer-controlled and labelled that way.
- **Server validation:** none. Balances, health and purchases are checked on the device. Anyone can edit their own save.
- **Police, firefighter, military and pilot gameplay:** no missions yet.
  - The pilot career has a rank ladder but no flying.
  - There is no combat or crime system.
- **Fires, weather and rain:** not built.
- **Divine Evolution powers and paths:** not built (stage 1 only).
- **Businesses, employment and marketplaces:** not built.
- **Character realism:** the residents are Microsoft Rocketbox models (licensed, realistic but dated). Faces and animation are well short of the reference images.

## 4. Biggest limits on visual quality

1. **The engine is WebGL in a browser.** It has no Nanite, Lumen, virtual shadow maps or hardware ray tracing, so it can't match Unreal Engine 5 lighting or geometry density on any device.
2. **Characters.** Rocketbox bodies and animation sets, no facial animation, and simple hair cards.
3. **Assets.** The city is mostly built from code (boxes with procedural or 1K textures). Matching the reference images needs high-quality modelled buildings, vehicles (fire engines, police cars, ambulances), props and interiors.
4. **Phones.** A phone browser has a tight memory budget, so texture sizes and shader counts must stay low.

## 5. Stay on the current engine, or move to Unreal Engine 5?

**Recommendation: keep the current game shipping in the browser, and don't start an Unreal migration yet.**

- **What the browser version can reach:** polished stylised realism, good PBR materials, baked lighting, solid gameplay, instant play from a link and easy updates from a phone. That is roughly where good mobile web games sit.
- **What Unreal Engine 5 gives you:** the look in the reference images (Lumen lighting, MetaHuman faces, Nanite cities).
- **What Unreal Engine 5 costs:**
  - A Windows PC with an RTX-class GPU and 32 GB+ RAM. It **cannot be developed from a phone or this cloud environment.**
  - A native mobile build pipeline (Android Studio and Xcode on a Mac) and app store releases.
  - 5% royalties above $1M revenue.
  - A rebuild of the whole front end in C++ or Blueprints.
- **What carries over in a migration:**
  - The game rules (`src/lib`, about 5,700 tests). They become the server's logic in TypeScript, or a reference for porting.
  - The design documents (`docs/`).
  - The licensed models: GLB files, which Unreal imports.
- **Practical path:**
  1. Put the rules on a server first (Supabase or Node).
  2. Keep improving the web client.
  3. Start an Unreal client later, against the same server, when there is a PC and an artist.

## 6. Next three priorities

1. **A server-authoritative backend.** Accounts, saves, balance and health validation on the server. This is the foundation for multiplayer and anti-cheat, and it must come before any real multiplayer.
2. **Emergency-services careers.** Firefighter, police and paramedic shifts built on the living-world events: a fire event with hoses and a fire engine, crash scenes with emergency vehicles, and police scene control. The reference images centre on these.
3. **Rendering performance and look.**
   - Share materials across residents to cut shader count.
   - Bake 1K character textures.
   - Add wet-road and rain weather.
   - Add emissive emergency-light bars, without real lights so nothing recompiles.

## 7. Needs your approval

- Creating Supabase tables and auth for the backend. This writes to your Supabase project.
- Whether to buy or commission higher-quality vehicle and character assets. The current rule is free or licensed only; paid assets need your permission.
- Any move to Unreal Engine 5. It needs hardware this environment doesn't have.
