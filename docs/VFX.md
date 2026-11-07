# Fire and water effects

Updated 7 November 2026, branch `claude/wonderful-franklin-gixkta`.

This is an extension of AYE's existing Vite, TypeScript, three.js and React Three Fiber rendering, not a replacement.
The effects live in `src/vfx/` as independent, reusable components. The game's existing `Fire` and `HoseAndWater` components (`src/world/Emergency.tsx`) are now built on them, with the same props, so the building-fire event looks better without any change to its rules.

## Try it

**The effects lab** is at `/vfx.html` in development and on the built site (https://aye-eta.vercel.app/vfx.html once deployed).
- **Fire:** a shopfront whose windows catch fire from one another, a burning car, and a bin fire with an extinguisher.
- **Water:** a hose, a swimming pool (tap it for ripples), a river fed by a waterfall, the sea breaking on a beach, and rain with puddles.
- **Controls:** buttons switch Low, Medium and High and turn the hose, extinguisher and rain on and off; a frame counter shows the cost.
- **URL options:** `?tier=low|medium|high` sets the tier, `?view=water|ocean` sets the camera.

**In the game:**
- The building-fire event uses the new flames, smoke, embers, firelight and hose (Marina Heights, Lagoon Boulevard).
- **The burning doorway and window** are shaded as a room on fire: hottest low down, flickering, smoky towards the top, charred round the frame. They replace the earlier flat orange panels.
- **The building fire spreads** across the shopfront by the fire rules: from the doorway to the neighbouring windows and the floors above, faster upwards. Once the crew starts spraying, their hose soaks and knocks down the windows nearest where it's aimed. It is never bigger than the event's own fire, so the event's rules and timing are unchanged. The spreading uses the same rules the lab shows working. In the game it wasn't visibly confirmed in a screenshot, because the 1 fps test renderer reaches the moment the crew start spraying before the fire can spread.
- **A vehicle fire at the road accident:** the red car's engine bay smoulders, with low flames and smoke, until someone makes the cars safe.
- **Puddles** gather on the boulevard as the weather makes the street wet. Checked in the browser during a thunderstorm: dark reflective patches in the lanes.
- **Uptown Gardens has a pond:** an oval of water in a stone rim with a fountain, in the south-east lawn. It's clear of every tree, bench and path; the park's name, paths and use-point are unchanged.
  - The water ripples under the fountain's drops and the rain, and as you walk along its rim (an interactive surface).
  - Its rim is solid.
  - Generated cities get it too, mirrored with their park.
  - Checked in the browser in the rain.
- **Settings → Fire and water effects** picks Automatic, Low, Medium or High. Automatic follows the graphics quality.

## How it's built

| Effect | How it's drawn |
|---|---|
| Flames | Instanced camera-facing quads. The vertex shader moves each from the time (rise, taper, sway, wind). The fragment shader shapes a teardrop with fractal noise and colours it by temperature, from deep red at the edges to a near-white core. Drawn additively, as many overlapping translucent tongues that read as one body of fire. |
| Smoke | Instanced quads rising and spreading with turbulence and wind. Sooty near the flames and greyer as it thins, lit orange from below while the fire burns. It smoulders on after the flames are out. |
| Embers and sparks | GPU points spiralling up and flickering. |
| Firelight | An always-mounted rig of 0, 1 or 2 point lights (by tier). Fires report their position and strength (`vfx/fireLights.ts`); the rig moves to the strongest and flickers. Lights are never added or removed as fires start, because that would make every material recompile. Every fire also casts an additive glow on the ground. |
| Fire behaviour | `vfx/fireModel.ts` (pure, seeded). It grows with fuel, burns the fuel, spreads to flammable neighbours (more readily upwards), never catches stone, and is knocked down and soaked by a hose or, more weakly, an extinguisher. Wet surfaces resist catching. |
| Water surfaces | three's physically based material extended with `onBeforeCompile` (`vfx/waterMaterial.ts`), so the water keeps the scene's real lighting, HDRI reflections, Fresnel and roughness. Added on top: <ul><li>Gerstner waves moving the sea, with matching normals;</li><li>scrolling noise normals for wind or the river's flow;</li><li>ripple rings from touches and waders;</li><li>raindrop rings;</li><li>foam on pool edges, riverbanks and a rolling surf line at the shore, rougher than the water;</li><li>soft irregular puddle edges.</li></ul> Fine detail fades with distance. |
| Pools | A tiled basin with moving caustics on the floor (Medium and High) and a coping round the edge. |
| Waterfalls | A curved sheet with streaks that speed up as they fall and white water where it breaks up, plus a splash, mist and a churning pool below. |
| Spray | One ballistic particle shader (`Spray`) for hose droplets, splashes, waterfall spray and extinguisher powder. Each droplet's flight is worked out on the GPU. The hose jet follows the same ballistic path as its droplets (`vfx/ballistics.ts`), lands where it's aimed, and makes steam where it meets fire. |
| Puddles | Placed in the gutters and wheel ruts (`puddleSpots`), never over the kerb or across the junction. They grow with the weather's wetness and ripple under the drops. |

## Quality tiers (`vfx/vfxQuality.ts`)

| | Low | Medium | High |
|---|---|---|---|
| Flames / smoke / embers per fire | 14 / 8 / 20 | 28 / 16 / 60 | 48 / 26 / 140 |
| Noise octaves (fire) | 1 | 2 | 3 |
| Firelights | none (ground glow only) | 1 | 2 |
| Water normal detail | 1 octave | 2 | 3 + clear coat |
| Moving waves | no | yes | yes, denser mesh |
| Pool caustics | no | yes | yes |
| Droplets per spray | 24 | 60 | 120 |
| Puddles | 6 | 12 | 20 |

## Performance

- **Draw calls:** a fire is 4 (flames, smoke, embers, ground glow) whatever its particle count. A spray is 1, and a water surface is 1.
- **No per-particle CPU work.** Motion happens in the vertex shaders; each frame only updates a handful of uniforms and the instance count, which scales with the fire's intensity.
- **No recompiles mid-game:** firelights come from an always-mounted rig, and particle counts are fixed per tier. Same-kind materials share one compiled program.
- **Mobile:**
  - Low has no extra lights, single-octave noise and flat (non-moving) water.
  - The game's automatic quality picks Low on touch devices and machines with 4 GB or less, or 4 cores or fewer.
  - Wave meshes are only subdivided where waves are on.
- **Known costs:**
  - The first fire or puddle compiles its shaders, a few programs, once per session. This can show as a short hitch on slow phones.
  - Overlapping translucent flames and smoke cost fill-rate up close, which the tier counts keep in check.
  - Measured frame rates here come from a software renderer at about 1–4 fps and aren't meaningful; compare tiers on a real device with the lab's counter.

## Assets and licences

None of these effects use a downloaded asset. Every flame, smoke puff, ember, ripple, wave, foam pattern and caustic is generated by shaders written for AYE in this repository, so there is nothing third-party to license and no file size to ship. The scene lighting and reflections reuse the HDRIs the game already ships (listed in `public/assets/CREDITS.md`). The lab uses `town-dusk_1k.exr` (ambientCG EveningEnvironmentHDRI002, CC0).

## Files

**New:**
- `src/vfx/vfxQuality.ts`: the tiers, budgets and saved setting.
- `src/vfx/useVfxTier.ts`: the hook the effects read.
- `src/vfx/glsl.ts`: shared noise and blackbody code.
- `src/vfx/fireModel.ts`, `src/vfx/firePresets.ts`, `src/vfx/fireLights.ts`, `src/vfx/FireEffect.tsx`: fire.
- `src/vfx/waterModel.ts`, `src/vfx/waterMaterial.ts`, `src/vfx/WaterSurface.tsx`, `src/vfx/WaterFx.tsx`, `src/vfx/ballistics.ts`: water.
- `src/vfx/lab/VfxLab.tsx`, `src/vfx/lab/main.tsx`, `vfx.html`: the lab.
- `src/world/WetStreet.tsx`: puddles in the city.
- `src/world/ParkPond.tsx`: the park's pond and fountain.
- `BurningOpening` in `src/vfx/FireEffect.tsx`: a doorway or window with the room behind it alight.
- `src/lib/parkPond.test.ts`: checks the pond is placed clear of trees, benches and paths and is solid, in every city with a park.
- `src/vfx/vfx.test.ts`: 18 tests, covering:
  - the tiers;
  - fire growth, burning out, hose and extinguisher, spreading, determinism and stone;
  - the light rig;
  - waves, ripples, puddles and wetness;
  - ballistic aim;
  - the water shader hooking into three's physical shader, a guard against GLSL reserved words, waves only where intended, and transparency.

**Changed:**
- `src/world/Emergency.tsx`: `Fire` and `HoseAndWater` use the new effects, and the shopfront spreads. Existing props are unchanged; `Fire` gains an optional `hosed`.
- `src/world/LiveEventScene.tsx`: the smouldering crashed car, and the hose reaching the spreading fire.
- `src/world/Park.tsx`, `src/lib/world.ts`, `src/lib/districts/lagos.ts`, `src/lib/districts/generate.ts`: the park pond (an optional `pond` on the park layout, solid).
- `src/vfx/WaterSurface.tsx`: a `round` option for ponds and basins.
- `src/App.tsx`: the light rig and puddles in the city.
- `src/components/EntryScreen.tsx`: the effects setting.
- `vite.config.ts`: builds the lab page too.

## Not done yet

- **The fire spread rules only drive the building fire.** No furniture or indoor fire uses them yet; the indoor small-fire preset is used only in the lab.
- **No swimming pool, river or sea in the game yet.** The park pond is the game's first water body. The other components wait for a place that should have them (for example a villa's pool, or the lagoon's shore).
- **No physical splash collision:** droplets don't bounce off geometry.
