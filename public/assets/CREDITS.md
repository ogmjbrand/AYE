# Third-party assets

| File | Source | Licence | Notes |
|---|---|---|---|
| `hdri/potsdamer_platz_1k.hdr` | Poly Haven, "Potsdamer Platz" (via the pmndrs/drei-assets mirror) | CC0 | Daytime image-based lighting and reflections. |
| `hdri/venice_sunset_1k.hdr` | Poly Haven, "Venice Sunset" (via pmndrs/drei-assets) | CC0 | Golden-hour lighting. |
| `hdri/dikhololo_night_1k.hdr` | Poly Haven, "Dikhololo Night" (via pmndrs/drei-assets) | CC0 | Night lighting. |
| `models/characters/rocketbox/*.glb` (12 looks) | Microsoft Rocketbox Avatar Library (github.com/microsoft/Microsoft-Rocketbox): avatars `Assets/Avatars/Adults/Female_Adult_03, 04, 06, 08, 10, 11` and `Male_Adult_01, 04, 10, 12, 15, 18`, with animations `f_`/`m_idle_neutral_01` (motextr_static) and `f_`/`m_walk_neutral_01`, `f_`/`m_run_neutral_01` (motextr_xy). | MIT, Copyright (c) 2020 Microsoft. Full notice in `models/characters/ROCKETBOX-LICENSE.md`. | Converted with FBX2glTF, assembled by `scripts/rocketbox/build-avatar.mjs` (walk/run made in place, specular converted to roughness, eyelash cut-outs), then meshopt + WebP via `npm run assets:optimize`. Portrait thumbnails in `thumbs/` are renders of these models; garment maps in `masks/` are generated from them by `scripts/rocketbox/garment-masks.mjs`. |
| `models/characters/rocketbox/gestures-*.glb` | Microsoft Rocketbox Avatar Library: animations `m_`/`f_gestic_talk_neutral_01`, `m_`/`f_gestic_listen_neutral_01`, `m_`/`f_wave_01` and `m_`/`f_sit_chair_idle_neutral_01` (seated idle; motextr_static). | MIT, Copyright (c) 2020 Microsoft. Full notice in `models/characters/ROCKETBOX-LICENSE.md`. | Converted with FBX2glTF, assembled into clips-only files by `scripts/rocketbox/build-gestures.mjs`, then `npm run assets:optimize`. |
| `src/lib/worldLand.ts` (travel desk map) | Natural Earth 1:110m land (naturalearthdata.com), via the world-atlas package (github.com/topojson/world-atlas). | Natural Earth: public domain. world-atlas: ISC, Copyright 2013-2019 Michael Bostock. | Converted to one SVG path by `scripts/world/build-land.mjs`. |

All other textures (asphalt, pavers, soil, kerbs, facades, roofs, palm fronds, signage) are generated procedurally in `src/world/textures.ts` and are original to this project.

The HDRIs are used for lighting and reflections only; the visible sky is rendered by the `Sky` shader so the backdrop is not a European city.

## MakeHuman body (characters/mh/)

`female-body.glb` is built by `scripts/makehuman/build-body.mjs` from the MakeHuman base mesh, targets and game-engine rig weights in the MPFB repository (github.com/makehumancommunity/mpfb2). MakeHuman assets and their output are **CC0** (public domain); credit given with thanks to the MakeHuman community.

## Furniture and flowers (models/furniture/)

From the Khronos glTF Sample Assets (github.com/KhronosGroup/glTF-Sample-Assets), rebuilt by
`scripts/khronos/build-furniture.mjs` (one colour baked in, WebP textures, meshopt compression).

| File | Source model | Author / owner | Licence |
|---|---|---|---|
| `sofa-velvet-champagne.glb`, `sofa-velvet-blush.glb` | GlamVelvetSofa | Eric Chadwick, © Wayfair, LLC | CC BY 4.0 |
| `chair-velvet-peacock.glb`, `chair-velvet-mango.glb` | SheenChair | Eric Chadwick, Wayfair, LLC | CC0 1.0 |
| `vase-flowers.glb` | GlassVaseFlowers | Eric Chadwick (vase), Rico Cilliers (flowers) | CC0 1.0 |
| `plant-potted.glb` | DiffuseTransmissionPlant | Rico Cilliers (original, CC0), Eric Chadwick / Darmstadt Graphics Group (materials) | CC BY 4.0 |

CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ — changes made: colour variant baked in, textures resized and converted to WebP, meshes compressed, the vase model reduced to one vase.

## Props (models/props/)

From Sketchfab, rebuilt by `scripts/sketchfab/build-props.mjs` (WebP textures, meshopt compression).

| File | Source model | Author | Licence |
|---|---|---|---|
| `sub-sandwich.glb` | "Sub Sandwich 3D Model [RapidAssets.ai]" (sketchfab.com/3d-models/sub-sandwich-3d-model-rapidassetsai-0b391970731a4096944a28646b9a785e) | RapidAssets | CC BY 4.0 |
| `bento-box.glb` | "FREE Japanese Bento Box – 3D Food Model" (sketchfab.com/3d-models/free-japanese-bento-box-3d-food-model-519e3aeef157483bb9c4cc1652d6b70d) | Halabalo067 | CC BY 4.0 |
| `vending-machine.glb` | "Vending Machine" (sketchfab.com/3d-models/vending-machine-3397acf75bf54f0e9bb0fff991be0989) | gabyyu | CC BY 4.0 |
| `motorhome.glb` | "FREE GMC Motorhome reimagined low poly" (sketchfab.com/karolmiklas) | Karol Miklas | CC BY 4.0 |

CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ — changes made: animations removed, textures resized and converted to WebP, meshes compressed. On the vending machine, every texture that showed real drinks brands (the front, the drinks on the shelves, the instructions panel) was replaced with original artwork made for this game, so no brand names or logos remain. On the motorhome, the maker's badge, the tyre lettering, two round badges, the modeller's stickers and the fuel-company window stickers were painted out, and the wheels use the plain yellow paint sheet.

## ambientCG (textures/, hdri/*.exr, models/food/)

From ambientCG (ambientcg.com), **CC0 1.0** (public domain), with thanks. Built by `scripts/ambientcg/build.mjs` and `scripts/ambientcg/build-food.mjs` (WebP maps resized to 1K; scanned food simplified and meshopt-compressed).

| Files | ambientCG assets |
|---|---|
| `textures/road/` (street asphalt), `textures/ground/` (grass) | Road007, Grass001 |
| `textures/wood-floor/`, `textures/bricks/`, `textures/bamboo/`, `textures/onyx/`, `textures/fabric/`, `textures/metal/` | WoodFloor051, Bricks104, Bamboo001C, Onyx006, Fabric080, Metal049A |
| `hdri/city-day_1k.exr`, `hdri/town-dusk_1k.exr`, `hdri/street-night_1k.exr`, `hdri/lounge-indoor_1k.exr` | DayEnvironmentHDRI052, EveningEnvironmentHDRI002, NightEnvironmentHDRI010, IndoorEnvironmentHDRI013 |
| `models/food/*.glb` | 3DBread005/006/007/012, 3DCookie001, 3DAvocado001, 3DKiwi001, 3DPear001/002, 3DPastry003, 3DCake001, 3DApple002/003, 3DMelon001 |
