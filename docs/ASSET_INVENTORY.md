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
`src/components/Avatar.tsx`, and the NPC renderers. The player also has a
save-compatible skin-tint selector applied through generated skin-excluding
garment masks. This adjusts the existing texture; it is not a replacement
skin-texture library or face-morph system.

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
| `public/assets/hair/*` | 17 JPG, 1 PNG, 1 WebP hairstyle images | Individual provenance/licence not recorded | Reference imagery only; not the models used by the selectable hairstyle items |
| `public/assets/clothing/hair/{afro01,braid01,ponytail01,long01}.glb` | 4 optimized GLB hair meshes with 1K WebP textures | MakeHuman System Assets, CC0; see `public/assets/CREDITS.md` | Ready; available as purchasable head-attached player hairstyles. Static meshes follow the head bone; no secondary motion |
| `public/assets/clothing/hair/{afro01,braid01,ponytail01,long01}.png` | 4 hairstyle previews | MakeHuman System Assets, CC0 | Ready; real MakeHuman hairstyle preview images |
| `public/assets/hdri/*.hdr` | 3 HDR environment maps | Poly Haven, CC0; see `public/assets/CREDITS.md` | Ready for lighting/reflections; not interior furniture or architecture |
| `public/assets/environment/road/` | 1K JPG colour, OpenGL normal and roughness maps | ambientCG Asphalt015, CC0; see `public/assets/CREDITS.md` | Applied to city roads through the surface manifest |
| `public/assets/environment/pavement/` | 1K JPG colour, OpenGL normal, roughness and AO maps | ambientCG PavingStones036, CC0; see `public/assets/CREDITS.md` | Colour, normal and roughness applied to city walkways; AO retained but unused |
| `public/assets/environment/ground/` | 1K JPG colour, OpenGL normal and roughness maps | ambientCG Ground003, CC0; see `public/assets/CREDITS.md` | Applied to exposed city ground through the surface manifest |
| `public/assets/environment/snow/` | 1K JPG colour, OpenGL normal, roughness and AO maps | ambientCG Snow007A, CC0; see `public/assets/CREDITS.md` | Retained for a future designated snow environment; not applied to the Nigerian city |
| `public/assets/environment/tiles074/`, `tiles075/`, `tiles076/`, `tiles078/` | 1K JPG colour, OpenGL normal and roughness maps | ambientCG Tiles074, Tiles075, Tiles076 and Tiles078, CC0; see `public/assets/CREDITS.md` | Applied by shared venue/tier floor materials; map sets are texture/material assets, not floor geometry |
| `public/assets/environment/sky-*/` | Three 1K EXR HDRIs and tonemapped JPG previews | ambientCG DaySkyHDRI026A, DaySkyHDRI030A and IndoorEnvironmentHDRI020, CC0; see `public/assets/CREDITS.md` | Day and golden EXRs are time-of-day environment lighting; indoor EXR is used only inside venues |
| `public/assets/models/characters/rocketbox/thumbs/*` | 12 WebP portraits | Renders of the MIT Rocketbox models | Ready as character-selection portraits |
| `public/assets/models/characters/rocketbox/masks/*` | 24 PNG garment masks | Generated from the Rocketbox models | Ready for existing outfit-material shader; not garment meshes |

## Supplied archives inspected without extracting over project files

| Source path | Contents found | Source/licence | Status |
|---|---|---|---|
| `Downloads/materials.tar.gz.bz2` | `materials/Pinterest/`: 94 JPG, 15 SVG, 4 PNG, 1 WebP; `materials/funiture/`: two ZIPs, each containing 120 JPEGs and no model files | Archive/source metadata does not establish redistribution licences | Reference images only; no 3D clothing, hair, furniture, or interior models |
| `Downloads/haireditor.zip` | `hair/haireditor/hair.blend` and `hair/haireditor/fur.blend`; Blender files contain curves parented to a human mesh and no animation/actions | No licence or source notice found in the archive | Not integrated; no verified redistribution rights or compatible rigged export |
| `Downloads/system_hair_materials01_cc0 (1).zip` | Hair material/texture images and MakeHuman material metadata; no interchangeable hair meshes | The filename claims CC0, but the archive does not provide an independently verified mesh licence | Materials only; cannot create a selectable hairstyle |
| `Downloads/makehuman_system_assets_cc0 (1).zip` | 421 entries, including CC0 skin/material textures, HM08-fitted clothes/shoes proxies, and 12 hair meshes with textures and previews | Per-item CC0 metadata in `packs/makehuman_system_assets.json`; selected hair proxies also state CC0 | Four hair models converted and integrated. Clothing/shoes are real 3D assets, but remain HM08-fitted and are not yet compatible with the Rocketbox wardrobe rig |

The furniture ZIPs are image collections, not furniture models. The downloaded
system pack does contain real clothing and shoe meshes, but they need the
matching MakeHuman body and fitting/weight workflow before they can be safely
worn by the current player avatar. Four hairstyles are already converted and
registered for the Rocketbox head attachment; the remaining pack hair has not
been converted.

## Integration boundary

The optional road, pavement and ground textures are enabled in
`public/assets/manifest.json`; roof, concrete and vehicle entries still use
their existing built-in materials. The Rocketbox look registry is active. The
fashion model registry contains the four CC0 hair meshes. MakeHuman clothing and shoe proxies must
not be registered against Rocketbox until their HM08 fit and bone weighting
are converted and verified on the moving avatar. A full MakeHuman replacement
still requires a compatible rig/animations and save migration that preserves
existing character records.
