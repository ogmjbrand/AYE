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
