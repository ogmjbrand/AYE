# AYE asset inventory

Inventory checked 21 October 2026. Only assets that are actually present are
listed. Reference images are not treated as 3D models or cleared for
redistribution.

## Usable 3D assets already in the game

| Project path | Format / category | Source and licence | Status |
|---|---|---|---|
| `public/assets/models/characters/rocketbox/female-adult-03.glb` | GLB, rigged human | Microsoft Rocketbox, MIT; see `public/assets/models/characters/ROCKETBOX-LICENSE.md` | Ready; selectable player look and reusable human model |
| `public/assets/models/characters/rocketbox/female-adult-04.glb` | GLB, rigged human | Microsoft Rocketbox, MIT | Ready; selectable player look and reusable human model |
| `public/assets/models/characters/rocketbox/female-adult-06.glb` | GLB, rigged human | Microsoft Rocketbox, MIT | Ready; selectable player look and reusable human model |
| `public/assets/models/characters/rocketbox/female-adult-08.glb` | GLB, rigged human | Microsoft Rocketbox, MIT | Ready; selectable player look and reusable human model |
| `public/assets/models/characters/rocketbox/female-adult-10.glb` | GLB, rigged human | Microsoft Rocketbox, MIT | Ready; selectable player look and reusable human model |
| `public/assets/models/characters/rocketbox/female-adult-11.glb` | GLB, rigged human | Microsoft Rocketbox, MIT | Ready; selectable player look and reusable human model |
| `public/assets/models/characters/rocketbox/male-adult-01.glb` | GLB, rigged human | Microsoft Rocketbox, MIT | Ready; selectable player look and reusable human model |
| `public/assets/models/characters/rocketbox/male-adult-04.glb` | GLB, rigged human | Microsoft Rocketbox, MIT | Ready; selectable player look and reusable human model |
| `public/assets/models/characters/rocketbox/male-adult-10.glb` | GLB, rigged human | Microsoft Rocketbox, MIT | Ready; selectable player look and reusable human model |
| `public/assets/models/characters/rocketbox/male-adult-12.glb` | GLB, rigged human | Microsoft Rocketbox, MIT | Ready; default player look and reusable human model |
| `public/assets/models/characters/rocketbox/male-adult-15.glb` | GLB, rigged human | Microsoft Rocketbox, MIT | Ready; selectable player look and reusable human model |
| `public/assets/models/characters/rocketbox/male-adult-18.glb` | GLB, rigged human | Microsoft Rocketbox, MIT | Ready; selectable player look and reusable human model |
| `public/assets/models/characters/rocketbox/gestures-feminine.glb` | GLB, animation clips | Microsoft Rocketbox, MIT | Ready; clips-only library for the feminine Rocketbox skeleton |
| `public/assets/models/characters/rocketbox/gestures-masculine.glb` | GLB, animation clips | Microsoft Rocketbox, MIT | Ready; clips-only library for the masculine Rocketbox skeleton |

These characters are integrated through `src/lib/looks.ts`,
`src/components/Avatar.tsx`, and the NPC renderers. They are human models, not
separate garment, hair, or furniture assets.

## MakeHuman source assets

| Project path | Format / category | Source and licence | Status |
|---|---|---|---|
| `assets-src/makehuman/packs/faceunits01.json` and `assets-src/makehuman/targets/faceunits/*.target` | 52 facial morph targets | MakeHuman community pack; CC0, authors listed in pack metadata | Source data only; requires the matching MakeHuman base mesh |
| `assets-src/makehuman/packs/nose01.json` and `assets-src/makehuman/targets/nose/*.target` | 15 nose morph targets | MakeHuman community pack; CC0, authors listed in pack metadata | Source data only; requires the matching MakeHuman base mesh |
| `assets-src/makehuman/packs/ears01.json` and `assets-src/makehuman/targets/ears/*.target` | 8 ear morph targets | MakeHuman community pack; CC0, authors listed in pack metadata | Source data only; requires the matching MakeHuman base mesh |
| `assets-src/makehuman/packs/hands01.json` and `assets-src/makehuman/targets/hands/*.target` | 4 hand morph targets | MakeHuman community pack; CC0, authors listed in pack metadata | Source data only; requires the matching MakeHuman base mesh |
| `assets-src/makehuman/targets/**/*.thumb` | 27 target-preview images | MakeHuman community pack; CC0 per pack metadata | Documentation previews, not game hair or clothing |
| `assets-src/makehuman/base/base.obj` | Not present | n/a | `scripts/makehuman/fetch-base.mjs` can retrieve the CC0 base mesh; no MakeHuman base mesh, rigged character, hair, or clothing is currently included |

The `.target` deltas refer to the 19,158-vertex MakeHuman base mesh. They
cannot be applied directly to Rocketbox models, whose topology differs. The
existing `scripts/makehuman/build-test.mjs` creates an unrigged morph test
mesh, not a playable character.

## Images and materials in the repository

| Project path | Format / category | Source and licence | Status |
|---|---|---|---|
| `public/assets/clothing/*` | 78 JPG, 6 PNG, 9 SVG fashion images | Individual provenance/licence not recorded | Reference/product imagery only; not 3D garments and not cleared for redistribution as products |
| `public/assets/hair/*` | 17 JPG, 1 PNG, 1 WebP hairstyle images | Individual provenance/licence not recorded | Reference imagery only; no selectable 3D hairstyles |
| `public/assets/hdri/*.hdr` | 3 HDR environment maps | Poly Haven, CC0; see `public/assets/CREDITS.md` | Ready for lighting/reflections; not interior furniture or architecture |
| `public/assets/models/characters/rocketbox/thumbs/*` | 12 WebP portraits | Renders of the MIT Rocketbox models | Ready as character-selection portraits |
| `public/assets/models/characters/rocketbox/masks/*` | 24 PNG garment masks | Generated from the Rocketbox models | Ready for existing outfit-material shader; not garment meshes |

## Supplied archives inspected without extracting over project files

| Source path | Contents found | Source/licence | Status |
|---|---|---|---|
| `Downloads/materials.tar.gz.bz2` | `materials/Pinterest/`: 94 JPG, 15 SVG, 4 PNG, 1 WebP; `materials/funiture/`: two ZIPs, each containing 120 JPEGs and no model files | Archive/source metadata does not establish redistribution licences | Reference images only; no 3D clothing, hair, furniture, or interior models |
| `Downloads/haireditor.zip` | `hair/haireditor/hair.blend` and `hair/haireditor/fur.blend`; Blender files contain curves parented to a human mesh and no animation/actions | No licence or source notice found in the archive | Not integrated; no verified redistribution rights or compatible rigged export |
| `Downloads/system_hair_materials01_cc0 (1).zip` | Hair material/texture images and MakeHuman material metadata; no interchangeable hair meshes | The filename claims CC0, but the archive does not provide an independently verified mesh licence | Materials only; cannot create a selectable hairstyle |

The two furniture ZIPs are image collections, not furniture models.
No downloadable shoe, clothing, accessory, furniture, building, food, or
vehicle GLB/GLTF/FBX/OBJ/Blend asset with verified rights and game
compatibility was found in the tagged archive.

## Integration boundary

The existing asset registry is `public/assets/manifest.json`; its model and
surface slots are currently `null`. The Rocketbox look registry is already
active. `src/lib/fashion.ts` intentionally has an empty `GARMENT_MODELS`
registry because the available clothing and shoe files are not fitted 3D
models. Do not register image references or the unlicensed hair archive as
wearable items. A MakeHuman character requires its matching base mesh,
compatible rig/animations, skin assets, and licensed hair/clothing before it
can safely replace or augment the saved player avatar.
