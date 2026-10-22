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

## User-supplied avatar archives (local development only)

All three RAR5 archives passed integrity checks and were extracted only to a
temporary inspection directory. The original archives were left untouched.
No archive included a licence, credits file, or reliable source/provenance
record. This does not establish that the assets are prohibited; it means
redistribution rights remain unverified. The FBX metadata identifies Blender
as the exporter but leaves author/comment fields empty; exact model filenames
also returned no public GitHub code-search matches. Neither fact identifies
the original creator or grants permission.

| Archive | Exact model/scene files | Rig, UV and geometry findings |
|---|---|---|
| `Tasha.rar` (23 entries) | `Tasha .fbx`, `Tasha .obj`, `Tasha .mtl`, `Tasha 4.0.blend`, `Tasha 4.5.blend`, `Tasha 5.2.blend` | 10 FBX meshes; Blender scene has 9 UV-mapped render meshes. Body: 49,801 vertices / 98,880 polygons. No armature, vertex groups, or animation actions. |
| `The+Girl.rar` (34 entries) | `The Girl .fbx`, `The Girl .obj`, `The Girl .mtl`, `The Girl 4.0.blend`, `The Girl 4.5.blend`, `The Girl 5.0.blend`, `The Girl 5.2.blend` | 12 FBX meshes; Blender scene has 11 UV-mapped render meshes. Body: 45,114 vertices / 44,760 polygons; scene total 215,861 triangles. No armature, vertex groups, or animation actions. |
| `Rainy(1).rar` (28 entries) | `Rainny DS.fbx`, `Rainny DS.obj`, `Rainny DS.mtl`, `Rainny 4.0.blend`, `Rainny 4.5.blend`, `Rainny 5.0.blend` | 11 weighted render meshes; 177,259 triangles total. `rig` has 559 bones, 144 marked deform; `body` has 33,323 vertices / 66,646 triangles and 135 vertex groups. No animation actions. |

The body material is the actual skin surface, not a complete character:
`body_basecolor.png` is the skin albedo, with separate `body_normal.png`,
`body_roughness.png`, and `body_specular.png` maps in each package (case
differs for Rainny: `Body_Roughness.png` and `Body_specular.png`). Each body
albedo is 8192×8192 and each body normal is 12288×12288. The supplied models
are approximately 3.2–3.4 Blender units tall; their physical scale has not
been validated against AYE's world scale.

Additional texture files found under each package's `textures/` folder:

- **Tasha:** `bra_alpha.png`, `bra_basecolor.png`, `bra_normal.png`,
  `dress_basecolor.png`, `dress_normal.png`, `Eye_green_BaseColor.png`,
  `eyelashes_basecolor_opacity.png`, `eyelashes_normal.png`,
  `hair_alpha.png`, `hair_basecolor.png`, `sock_basecolor.png`,
  `sock_normal.png`, and `sock_roughness.png`.
- **The Girl:** `bra_alpha.png`, `bra_basecolor.png`, `bra_normal.png`,
  `bunny_ear_basecolor.png`, `bunny_ear_normal.png`,
  `bunny_ear_roughness.png`, `cloth_normal_2.dds`, `dress_alpha.png`,
  `dress_basecolor.png`, `dress_Normal.png`, `dress_Roughness.png`,
  `Eye_green_BaseColor.png`, `eyelashes_basecolor_opacity.png`,
  `eyelashes_normal.png`, `hair_alpha.png`, `hair_basecolor.jpg`,
  `pussy_hair_alpha.png`, `sexy_sock_basecolor.png`,
  `sexy_sock_normal.png`, `sexy_sock_roughness.png`, `shirt_basecolor.png`,
  `shirt_normal.png`, and `shirt_ORM.png`. The DDS map was present, but its
  use by the exported materials is not verified.
- **Rainny:** `Dress_basecolor.png`, `dress_metallic.png`, `dress_normal.png`,
  `dress_roughness.png`, `Eye_brown_BaseColor.png`,
  `eyelashes_basecolor_opacity.png`, `eyelashes_normal.png`,
  `hair_alpha.png`, `hair_basecolor.png`, `pant_basecolor.png`,
  `pant_normal.png`, `pant_roughness.png`, `pant_specular.png`,
  `shirt_basecolor.png`, `shirt_normal.png`, `shirt_roughness.png`, and
  `shirt_specular.png`.

The Rainny scene contains the only supplied rig, but its deform bone names
(`root.x`, `spine_01.x`, `thigh_stretch.l`, etc.) differ from AYE's
`Bip01` Rocketbox rig. The scene has no authored animations. Its teeth
material references four missing files under `demo/Asian cute girl/textures/`:
`teeth_basecolor.png`, `teeth_normal.png`, `teeth_roughness.png`, and
`teeth_specular.png`. The private preview conversion uses a plainly named
neutral material on only those teeth/tongue meshes; it does not invent or
claim to restore the missing textures. The archive also contains
`rig tools.rar`, listing `auto_rig_pro_3.77.10.zip`,
`proxy_picker_1.1.10.zip`, and `rig_tools_3.77.10.zip`; those nested tools were
not installed or redistributed.

For local source inspection, `scripts/characters/export-private-avatar.py`
exports selected scene meshes and downsizes used maps to at most 2K. The
original optimized GLB previews remain in the ignored
`assets-src/private-avatars/` directory. Tasha and The Girl body base-colour,
normal, and roughness maps are extracted under the ignored
`assets-src/private-avatars/source-textures/` directory. They are reference
material only: the baked UV-transfer maps and the script that made them were
removed, nothing from them is loaded by the game, and no standalone gallery
route exists. Character creation and the in-game wardrobe share one complexion
control with a freely adjustable colour applied by the existing avatar shader.

The Tasha and The Girl archives have no recorded licence or provenance
evidence. Do not copy source maps to `public/`, distribute them, or include
them in a production build until rights are established. No private avatar
models or source maps are listed in the public asset manifest.

## Integration boundary

The optional road, pavement and ground textures are enabled in
`public/assets/manifest.json`; roof, concrete and vehicle entries still use
their existing built-in materials. The Rocketbox look registry is active. The
fashion model registry contains the four CC0 hair meshes. MakeHuman clothing and shoe proxies must
not be registered against Rocketbox until their HM08 fit and bone weighting
are converted and verified on the moving avatar. A full MakeHuman replacement
still requires a compatible rig/animations and save migration that preserves
existing character records.
