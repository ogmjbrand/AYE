# AYE technical audit

October 2026, on branch `claude/wonderful-franklin-gixkta`. Everything below was checked in this repository: the checks were run, and the timings were measured in a headless browser with the software (CPU) renderer, so absolute times are slower than a real phone GPU and the comparisons are what matter.

## 1. Architecture and rendering

| | |
|---|---|
| App | React 19 + TypeScript, built with Vite 8 |
| 3D | Three.js r186 through React Three Fiber 9 and drei 10; post-processing (AO, bloom, tone mapping) |
| Hosting | Vercel (static site), production at aye-eta.vercel.app |
| Saves | The browser's local storage, sanitised on load (`src/lib/save.ts`) |
| Server | None yet. Supabase is connected to the account but holds no game tables |
| Checks | `tsc -b` clean, `eslint` clean, Vitest 75 files / 5,733 tests passing, `vite build` succeeds (one 3.3 MB JS bundle, 1.0 MB gzipped) |

All game rules are pure functions in `src/lib`, driven through one reducer (`gameState.ts` plus `life.ts`). That is the most valuable part of the codebase: the rules can move to a server, or to another engine, unchanged.

## 2. Working features

These are real, saved and tested:
- **Movement:** third-person walking, running, driving and click-to-move, with collision. Touch stick on phones; landscape on game start.
- **World:** cities and districts with travel between them, day and night, lamps, and weather (rain, wet roads, storms).
- **Homes:** rent and buy, furniture placement, a wardrobe and dressing, sleeping.
- **Needs:** food and needs, mood, and no-death survival (health, critical warning, hospital or sanctuary recovery, medical kit, paramedic, crash injuries).
- **Careers:** ranks, pay and work gear. Qualifications with real exams.
- **Workplaces you can play:** hospital shifts with triage, university classes, office, spa and restaurant.
- **Shops:** fashion, gadgets, car dealership.
- **People:** computer-controlled residents you can talk to (always labelled as computer-controlled), relationships, nights out, the in-game phone, and Life OS.
- **Living-world events:** a building fire with fire engine, police and ambulance; a road accident; a collapse; a missing person; a breakdown; a lunch rush. Reputation.
- **Progress:** quests, player level, Divine Evolution stage 1.

## 3. Missing features and placeholder assets

**Systems not built:**
- Multiplayer and any server validation. Balances and purchases are checked on the device, so anyone can edit their own save.
- Firefighter, police and paramedic as playable careers. The events exist; the jobs don't.
- Businesses, employment and marketplaces.
- Divine Evolution after stage 1.

**Placeholder or dated assets:**
- **Interiors:** mostly built from boxes in code. In the starter flat only the fridge and food are real models; the sofa, wardrobe, bed and plant are primitives.
- **Buildings:** boxes with procedural or 1K textures.
- **Residents:** Microsoft Rocketbox (licensed, realistic but dated). No facial animation; simple hair cards.
- **Emergency vehicles:** built from primitives.

None of these should be described as photorealistic.

## 4. Technical limitations

1. **WebGL in a browser.** No Nanite, Lumen, virtual shadow maps or ray tracing.
2. **First load.**
   - The street takes about 30 s in the software renderer. Each resident brings 2K skin maps, and the street has about 100 shader programs.
   - The low tier now caps textures at 1024 px, and the card has time limits and a "Start now" button.
3. **Phone memory.** Found and fixed in this round:
   - Every trip home and back leaked GPU textures (+75 each return to the street).
   - Signs, name tags and ground strips were redrawn on each visit and never freed.
   - See section 8.
4. **Bundle.** One 3.3 MB script. It is not code-split, so a phone parses all of it before the title screen.
5. **No server.** This blocks multiplayer, trading and anti-cheat.

## 5. Recommended architecture

**Option A: continue in the browser, with a server added for shared state.**
- Keep the Vite + React + Three.js client.
- Keep the rules in `src/lib`.
- Add a server-authoritative backend (Supabase Postgres + edge functions, or a small Node service) that runs the same TypeScript rules for money, purchases and multiplayer.

The reasons, from this repository:
- About 5,700 tests cover rules that run as plain TypeScript. Any other engine would mean rewriting or bridging them.
- The game opens from a link on any phone. Releases are a git push that Vercel deploys, which works from a phone.
- Every asset is GLB, which every option can read, so nothing is locked in.

## 6. Alternatives considered

| Option | Why not now |
|---|---|
| **Babylon.js** | Similar visual ceiling to Three.js on WebGL/WebGPU. Switching would rewrite every scene component for no gain in fidelity. |
| **Godot 4 (web export)** | Its web export is heavier and slower to start than the current client. The rules would need porting to GDScript or C#. The editor needs a PC. |
| **Unreal Engine 5** | The only option that reaches the reference images (Lumen, MetaHuman, Nanite). The costs:<ul><li>A Windows PC with an RTX-class GPU and 32 GB+ RAM.</li><li>A native app pipeline (Android Studio; Xcode on a Mac) and store releases.</li><li>A 5% royalty above $1M.</li><li>A full rebuild of the client.</li></ul>It cannot be developed from a phone or this cloud environment. |
| **C: web shell + separate engine for 3D** | Two clients to keep in sync, and pixel streaming costs money per user-hour. Worth revisiting only once there is a PC, an artist and a server for both to share. |

Path if UE5 becomes realistic later:
1. The server comes first.
2. A UE5 client then talks to the same server.
3. The rules (`src/lib`) and GLB assets carry over.

## 7. Smallest useful milestone: "one home, one street, done properly"

Most pieces of the requested vertical slice exist already. These would make it convincing, in order:

1. **Fast, leak-free home ↔ street transitions.** Done in this round; see section 8.
2. **A real furnished starter flat.**
   - Replace the box sofa, wardrobe, bed, table and plant with licensed GLB models, credited in `public/assets/CREDITS.md`.
   - Each model needs a box fallback.
   - Budget: under 300 KB per model after meshopt compression, and at most 1024 px textures.
3. **Interactive objects.**
   - Every visible fixture in the flat does something: bed (sleep), shower (wash), fridge (eat), wardrobe (dress).
   - Lights switch on and off with no new light sources.
   - The front door opens visibly.
4. **One talkable neighbour outside the door**, with a short daily routine (leave for work, come home).
5. **Loading.**
   - Code-split the title screen from the 3D world.
   - Bake 1K resident textures so phones don't download 2K maps.

## 8. What was implemented in this round

- **Your own front door wins over a passer-by.** Previously, a resident standing near your door took the E key and the on-screen prompt, so you couldn't get home. Fixed in `HUD.tsx` and `App.tsx`.
- **Texture leak fixed.**
  - Signs, name tags and shop boards are drawn once per wording (`src/world/textureCache.ts`).
  - Ground strips and park paths share one tiled copy per size (`tiledMaterial` in `materials.ts`).
  - Park paving loads once, instead of on every visit.
- **Wet streets now reach every strip.** The tiled copies used to miss weather changes; they now follow the original's wetness.
- **No idle waiting on the card.** The texture step only pauses after real upload work. On return visits every texture is already on the GPU, and those pauses alone kept the card up for 6 s.

Measured in the software renderer:

| Step | Before | After |
|---|---|---|
| Leave home, first time | 11.7 s | 5.6 s |
| Enter home, second time | 10.5 s | 5.0 s |
| Leave home, second time | 12.1 s | **0.2 s** |
| GPU textures after two round trips | 381 (+75 per return to the street) | 301 (+25 to +33) |

The first visit to the flat still takes about 10 s, because its kitchen loads about 50 food models. That is the next loading fix.

## 9. Testing and acceptance criteria for the milestone

- `npm run build`, `npm run lint` and `npm test` all pass.
- A scripted browser run (Playwright, isolated profile, never a real save) does the following:
  - walks to the flat, goes in and out twice, and records card times and the GPU texture count;
  - **pass:** the second exit is under 1 s, and the texture count grows by no more than 40 per round trip.
- In the flat, every fixture shown has a working action, checked by the same script pressing E at each one.
- On a mid-range Android phone (manual check):
  - the street holds 30 fps on the low tier;
  - three round trips home don't reload the tab.
- Every new model is listed in `CREDITS.md` with its licence and author.

## 10. Phone or PC

**Possible from a phone** (through Claude Code on the web or the app):
- All code changes, tests, builds and Vercel deploys.
- Free licensed models from Sketchfab, Poly Haven and ambientCG, which I download, compress and wire in.
- Supabase backend setup (once approved).
- Playtesting on the live link.

**Needs a PC:**
- Unreal Engine 5, Character Creator 5 or iClone, and MetaHuman.
- Blender work beyond what scripts can do, such as sculpting, retopology or custom rigging.
- Fixing EMA.fbx's missing textures (they point to files on another computer).
- Native Android/iOS builds.

## Needs your approval

- Creating Supabase tables and auth for the backend. This writes to your Supabase project.
- Buying or commissioning higher-quality furniture, vehicle or character assets. The current rule is free or licensed only; paid assets need your permission.
- The licences of the uploaded pending models:
  - Tripo AI exports: 1, 12, 16.
  - Fab downloads: dress, plate, fish, cake, armour, quail.
  - asset.glb, b1, the air-con unit and the apartment plan.

  These stay private and unused until their licences are known.
