# AYE premium upgrade: technology audit and plan

Written 12 November 2026, on branch `claude/wonderful-franklin-gixkta`.

AYE stays a Vite + TypeScript + React Three Fiber game. Nothing here migrates to Next.js or replaces a working system. Each step is added beside what exists, tested, and checked in the browser before it ships (`docs/ASSET_PRESERVATION.md`).

## 1. What AYE already has

| Area | In AYE today |
|---|---|
| Rendering | `three` 0.186 with React Three Fiber 9, drei 10 and `postprocessing`. PBR materials from ambientCG, HDRI lighting (`SceneLighting`, `SkyDome`), a shadow budget, quality tiers (`world/quality`), GPU fire and water (`src/vfx`). |
| Characters | Microsoft Rocketbox skinned characters (`lib/looks.ts`, 81-bone Bip01 rig), CC5 player bodies behind a flag (`lib/cc5Body.ts`), a MakeHuman reference body (`components/mh`), body-shape morphs, skin tone and sheen, skinned garments (`world/SkinnedGarments.tsx`, garment pipeline). |
| Animation | Rocketbox clips plus BVH retargeting (`lib/bvhRetarget`, `npm run anim:bvh`), gestures, hand poses, sitting, lying in bed (`lib/bedSleep.ts`), hugs. |
| Movement and collision | The game's own: box obstacles and `resolveCollisions` (`lib/world.ts`), A* click-to-move over a 0.5 m grid (`lib/pathfinding.ts`), pavement heights (`groundHeightAt`). |
| NPCs | Residents with daily routines and relationships (`world/Residents.tsx`, `lib/people.ts`), street life (`lib/streetLife.ts`), venue staff, traffic that pedestrians avoid. |
| Homes | Interiors with furniture (`lib/interiors.ts`), a furniture catalogue with buying, placing and dragging (`lib/furniture.ts`, `world/FurnitureDrag.tsx`), uses: cook, shower, bath, sleep, sofa, TV, study. |
| Assets | `@gltf-transform` 4 and `meshoptimizer` in the optimiser (`npm run assets:optimize`) and checker (`npm run assets:check`); Blender export (`scripts/blender`). |

## 2. The seven references

| Project | Licence | Already in AYE? | Fits Vite + TS? | Verdict |
|---|---|---|---|---|
| three.js | MIT | Yes (0.186) | Yes | Keep. Use its examples as patterns (`SkeletonUtils`, `AnimationMixer` blending, `InstancedMesh`, `LOD`, KTX2). |
| react-three-fiber | MIT | Yes (9.8) | Yes | Keep. Follow its performance guide: `frameloop` control, no per-frame React state, instancing. |
| drei | MIT | Yes (10.7) | Yes | Keep. Worth adopting: `<Detailed>` (LOD), `<Bvh>` (faster raycasts for clicking furniture), `<AdaptiveDpr>` / `<PerformanceMonitor>` for phones, `<Merged>`/`<Instances>`, `useKTX2`. |
| @react-three/rapier | MIT (Rapier: Apache-2.0) | No | Yes (WASM) | **Not now.** It adds about 1.5–2 MB of WASM and a physics step every frame. AYE's box collisions, A* paths and seat/bed placement already work and are tested; swapping them would risk regressions. Revisit only for a feature that truly needs physics (thrown objects, ragdolls, doors pushed open), and then only in that scene, lazy-loaded. |
| MPFB2 (MakeHuman for Blender) | GPL-3.0 for the add-on's code; characters it exports are CC0 | Partly: AYE already ships a MakeHuman body | It's a Blender add-on, not a web package | Use it **as a tool in Blender only**: build bodies there, export GLB through `scripts/blender/aye_export.py`, then optimise. Never copy its code into AYE (GPL). |
| Yuka | MIT | No | Yes (plain JS, about 100 KB) | **Adopt in part, later.** Steering (separation, arrive, obstacle avoidance) and a small state machine for NPCs. Keep AYE's own A* grid and routines; use Yuka only for crowd steering, where it adds most. |
| glTF-Transform | MIT | Yes (4.5) | Yes (Node, build time) | Keep. Add: texture resize, KTX2/Basis texture compression (`toktx` needed), `simplify` for LOD levels, `prune`/`dedup`, as steps in the existing optimiser. |

## 3. Mobile performance budget (what every step must respect)

- **Phone (Low tier):** one shadow-casting light at most, no post-processing, DPR at most 1.5, at most about 150 draw calls in the street, and textures at most 1024 px.
- **Characters:** detailed models only near the camera. Distant passers-by use a lighter model or are hidden. One `AnimationMixer` update per visible character, none for hidden ones.
- **New dependencies:** must load lazily if they're large (Rapier, any WASM). Initial JavaScript must not grow by more than about 50 KB gzip per step.
- **Measure, don't guess:** each performance step is compared before and after on the in-game FPS meter (`world/FpsMeter.tsx`) and with draw-call and triangle counts from `renderer.info`.

## 4. Plan, in order

Each item is a separate, shippable increment.

### 1. High-quality human characters
1. Build one hero body in Blender with MPFB2. Export a GLB on the Bip01 skeleton the game already binds to, so the existing animations and garments still fit. Keep it under 30k triangles with a 2048 px skin texture.
2. Load it **alongside** the Rocketbox looks behind a setting, like the CC5 body, so nothing existing changes until it passes review.
3. Add 2–3 LOD levels with glTF-Transform `simplify` and switch with drei `<Detailed>`.

### 2. Realistic animations
1. Grow the clip library through the existing BVH retargeting: cooking stir, wiping a counter, scrubbing, folding clothes, washing hands, sweeping.
2. Smooth blending: cross-fade by default, and let walk speed drive walk and run weights.
3. Foot placement: keep feet on the floor on pavements, steps and stairs, using the ground height the game already knows. This extends the fix just made for the suya stand and the university guard.

### 3. Interactive houses and furniture
1. Use the furniture catalogue and dragging that already exist.
2. Add **state** to pieces: doors and cupboards that open, lights that switch, a tap that runs, and a cooker whose hob glows while cooking.
3. Add drei `<Bvh>` for fast picking on phones.

### 4. Cooking, cleaning, washing and sleeping
**Increment 1 is built (see below).** Next steps:
- Cooking stages: prep, cook, serve, each with a clip and a prop on the hob.
- Laundry: a washing machine you can buy, or hand-washing in a bucket.
- Sleeping already works through to the morning summary.

### 5. Environments and lighting
1. KTX2 textures and texture resizing in the optimiser.
2. Baked light probes for interiors; the day/night HDRI blend that already exists.
3. `<PerformanceMonitor>` to drop DPR and shadows when frames drop.

### 6. Intelligent NPCs
1. Add Yuka steering to street life: separation, so passers-by don't walk through each other, and slowing and going round the player.
2. A needs-driven state machine for residents: they eat, work, socialise and sleep from their own needs, not only their timetable.
3. Keep the existing routines as the fallback.

### 7. Mobile optimisation
1. Measure the street and three interiors on the Low tier first. Then, in order:
   - instance repeated props;
   - character LOD;
   - KTX2 textures;
   - adaptive DPR.
2. Make one change at a time and measure after each.

## 5. Increment 1: household chores (built)

Cooking and living now leave work to do, with no new libraries.

- **Dishes:** each meal cooked leaves dirty dishes. In a home with a stove, the kitchen counter shows "Wash the dishes" while there are any, and the stove cooks. In a home with only a counter, the counter keeps cooking, and you wash up from the list, so cooking is never blocked.
- **Laundry:** a day's worn clothes go in the basket each night. Do the laundry at your shower or bath (hand-washing) when the basket fills.
- **Tidiness:** the home gets messier each day, faster with dirty dishes and laundry piling up. Tidying up restores it.
- **Effect:** a messy home makes relaxing at home less fun, by up to 30%. Nothing is ever blocked. Keeping house costs time, not money.
- **"Things to do at home":** a list that walks you to each chore and to each piece you can use.
- Saves from before this change load with a clean home.
- Code: `src/lib/chores.ts` with tests in `src/lib/chores.test.ts`. Wired into `gameState`, `save`, `furniture` and `App`.
