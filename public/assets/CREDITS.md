# Third-party assets

| File | Source | Licence | Notes |
|---|---|---|---|
| `hdri/potsdamer_platz_1k.hdr` | Poly Haven, "Potsdamer Platz" (via the pmndrs/drei-assets mirror) | CC0 | Daytime image-based lighting and reflections. |
| `hdri/venice_sunset_1k.hdr` | Poly Haven, "Venice Sunset" (via pmndrs/drei-assets) | CC0 | Golden-hour lighting. |
| `hdri/dikhololo_night_1k.hdr` | Poly Haven, "Dikhololo Night" (via pmndrs/drei-assets) | CC0 | Night lighting. |
| `models/aye-avatar.glb` | Built from the three.js example models `Michelle.glb` (mesh, rig) and `Xbot.glb` (Idle/Walk/Run clips). Both originate from Adobe Mixamo. | Mixamo terms: free to use in games and other projects, **may not be redistributed or resold as standalone assets**. | Placeholder avatar. Replace with an original or properly licensed character (e.g. MetaHuman for the Unreal client) before commercial release. Rebuilt with `@gltf-transform`: clips retargeted by bone name, hips locked in place, meshopt-compressed. |

All other textures (asphalt, pavers, soil, kerbs, facades, roofs, palm fronds, signage) are generated procedurally in `src/world/textures.ts` and are original to this project.

The HDRIs are used for lighting and reflections only; the visible sky is rendered by the `Sky` shader so the backdrop is not a European city.
