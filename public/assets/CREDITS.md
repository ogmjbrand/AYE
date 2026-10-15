# Third-party assets

| File | Source | Licence | Notes |
|---|---|---|---|
| `hdri/potsdamer_platz_1k.hdr` | Poly Haven, "Potsdamer Platz" (via the pmndrs/drei-assets mirror) | CC0 | Daytime image-based lighting and reflections. |
| `hdri/venice_sunset_1k.hdr` | Poly Haven, "Venice Sunset" (via pmndrs/drei-assets) | CC0 | Golden-hour lighting. |
| `hdri/dikhololo_night_1k.hdr` | Poly Haven, "Dikhololo Night" (via pmndrs/drei-assets) | CC0 | Night lighting. |
| `models/characters/rocketbox-male-adult-12.glb` | Microsoft Rocketbox Avatar Library (github.com/microsoft/Microsoft-Rocketbox): avatar `Assets/Avatars/Adults/Male_Adult_12` (textures `m007_*`) with animations `m_idle_neutral_01` (motextr_static), `m_walk_neutral_01` and `m_run_neutral_01` (motextr_xy). | MIT, Copyright (c) 2020 Microsoft. Full notice in `models/characters/ROCKETBOX-LICENSE.md`. | Converted with FBX2glTF, assembled by `scripts/rocketbox/build-avatar.mjs` (walk/run made in-place, specular converted to roughness), then meshopt + WebP via `npm run assets:optimize`. |

All other textures (asphalt, pavers, soil, kerbs, facades, roofs, palm fronds, signage) are generated procedurally in `src/world/textures.ts` and are original to this project.

The HDRIs are used for lighting and reflections only; the visible sky is rendered by the `Sky` shader so the backdrop is not a European city.
