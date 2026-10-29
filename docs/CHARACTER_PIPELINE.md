# AYE character pipeline proposal

> **Historical.** The current reference is [CHARACTERS.md](CHARACTERS.md):
> registry, CC5 import, asset storage policy, variety counts and QA results.

Status: **incremental migration in progress.** Rocketbox remains the active,
save-compatible character pipeline. A skin-only tint selector and four CC0
head-attached hairstyles are integrated; a MakeHuman base character, facial
morphs, and rigged MakeHuman clothing are not integrated.

## 1. Audit: what the game has today

| Part | Current state | Meets the target? |
|---|---|---|
| Model | Twelve selectable Microsoft Rocketbox adult looks (MIT), retained as the active player and NPC-compatible fallback. | Realistic game-resolution people; the original rig and locomotion clips remain. |
| Variation | Look, height, four existing bone-based body-shape controls, and a separately saved skin tint. | Partial; skin-tone colors modulate exposed skin pixels, not source skin-texture replacement. |
| Presentation | Six feminine and six masculine Rocketbox looks. | Fixed source models; not an exhaustive or fully representative character library. |
| Body / face | Existing body shape scales selected bones. No facial morph targets are present on these Rocketbox meshes. | Body-shape foundation only; no face-shape editing. |
| Hair / clothes | Four CC0 MakeHuman hairstyles are static GLBs attached to the Rocketbox head bone. Existing clothing restyling remains texture-mask based. | Hair follows head turns but lacks secondary motion; downloaded MakeHuman garments are not asserted to fit Rocketbox. |
| Animation | Rocketbox motion capture: idle, walk, run on the avatar's own skeleton, cadence matched to ground speed. The walk clip holds the fingers still, so its finger rotations were dropped at conversion and the hands showed the open bind pose; `components/handPose.ts` gives such clips the idle clip's relaxed hand at load time. Rocketbox has 417 more clips on the same skeleton (sit, talk, phone, work…). | Yes for locomotion; extensible. |
| Creation UI | Name, lifestyle, career, diet, outfit colour, with a live 3D preview. | Skin tint and model-backed hairstyle options are available; facial and parametric controls remain unavailable on Rocketbox. |

### Pre-dress appearance target

The supplied reference is the target for a neutral, adult feminine base body
before outfit selection: realistic proportions, dark simple undergarments, and
front/side/back views. The target should be visible in the creator and where
the corresponding outfit slots are empty, with bought/equipped clothing layered
over it. Implement the feminine version first and keep current Rocketbox looks
as the fallback for all players until the replacement passes rig, movement,
save, and clothing-fit checks. The reference image is guidance only, not a
redistributable character asset.

This is **not yet implemented**: current Rocketbox outfits are part of the
model's baked mesh/texture and cannot be safely removed or reshaped into
undergarments with the clothing-colour shader. The MakeHuman base OBJ, game
rig, and fitted underwear garment are not present in the repository. Do not
paint underwear onto a texture or recolour the existing shirt and trousers as
a substitute for the required base model.

### Verified rig boundary

`src/lib/characterRig.ts` records the gameplay-critical `rocketbox-biped-v1`
bone roles and normalizes the space/underscore bone-name variants found in
the GLBs. Eating poses, body-shape bone matching, relaxed finger animation,
and accessory attachment all use this shared boundary. The verified runtime
conventions are the existing `Bip01` hierarchy and its matching Idle/Walk/Run
and gesture clips; this adapter does not retarget clips or certify another
skeleton as compatible. A future MakeHuman kit must supply its own verified
profile, rigged model, clothing weights, and animation mapping before it can
be selected in gameplay.

### User-supplied skin references

The local Tasha and The Girl GLBs are reference sources only. Their static
meshes, hair, clothing, rigs, and animations are not used by the game. The
original archives and extracted PBR maps remain in git-ignored
`assets-src/private-avatars/` staging directories; do not move them into
`public/` or ship them while provenance and usage rights are unverified.

The earlier UV-baked skin maps and `bake-private-skin-maps.py` were removed.
Character creation and the in-game wardrobe share one complexion control,
including a freely adjustable colour, applied to the Rocketbox skin by the
existing shader. The optional skin tone and colour are save-compatible. No
standalone preview route or production player replacement is part of this
workflow. See `ASSET_INVENTORY.md` for the inspected files and current
blockers.

Conclusion: AYE now has a safer customization foundation on the existing
character system, but not yet the parametric human pipeline described below.
Facial morphs and modular fitted garments require a compatible base mesh and
verified rig/weights before they can be activated.

## 2. Options compared

| Pipeline | Realism | Customisation | Licence and redistribution | Browser / Intel iGPU | Cost | Verdict |
|---|---|---|---|---|---|---|
| **MakeHuman / MPFB2** (Blender add-on) | Medium: believable anatomy and faces; realism depends on skin textures; community hair is game-style cards | **Strong**: sex, age, weight, muscle, height, proportions, ethnic-blend sliders and hundreds of face/body targets; modular clothes, hair, eyes and eyebrows on one skeleton; a "game engine" rig | **CC0** for base mesh, targets, rigs, textures, clothes *and* the output. Can be committed to the public repo. Third-party community packs keep their own licences. | Good: base mesh is light; morphs export as glTF morph targets (keep the runtime set small) | Free | **Recommended for Phase 1** |
| **Reallusion Character Creator 4/5 + Headshot + ActorCore** | **High**: skin, eyes, hair, African hairstyles and clothing libraries; game-ready LODs | Very strong: full morph system, wardrobe, hair | Paid. The EULA allows embedding in games and web services, but content **must not be publicly downloadable**, so **not in the public repo**; serve it from private storage. Staff say mass distribution needs a **written permission letter** after registering the game with Reallusion. | Good after LOD and texture reduction | Software, plus export licences per content pack | **Phase 2 (premium quality)** once there is budget and written permission |
| **Microsoft Rocketbox** (current) | Medium: real people, 2010s game quality | None per avatar; 115 fixed avatars (adults, children, professions); facial blendshape versions exist | **MIT**: committable | Excellent (about 1.4 MB per avatar) | Free | Keep for **NPC crowds** and as the fallback; not a creation system |
| **MetaHuman** (Epic) | Highest | Strong (in Unreal's creator) | **Disputed for non-Unreal use**: June 2025 trade press says Unity, Godot and other engines are allowed; an April 2026 studio blog says shipped use is still tied to Unreal. Needs Epic's current EULA in writing. | **Poor**: very heavy meshes, 4K/8K textures and strand hair that doesn't export to glTF | Free under thresholds | Not now |
| **Daz3D Genesis 9** | High | Strong | Game use needs an **Interactive License per product** (base figure, each morph pack, hair, clothes), so cost grows with every item | Medium; awkward Daz → Blender → glTF route | Per-item licences | Not recommended |
| **Ready Player Me** | Stylised | Medium | **Service shut down 31 Jan 2026** after Netflix bought it | n/a | n/a | **Excluded** |
| **Selfie-to-avatar services** (Avaturn, Avatar SDK) | Medium–high faces | Limited bodies | Commercial terms not verified; reported pricing around $800/month (unverified); vendor risk (Ready Player Me and Union Avatars both shut down) | GLB, fine | Subscription | Not as the core; maybe a later "scan yourself" feature |
| **AI text/image-to-3D** | Low–medium faces, weak topology and rigging | n/a | Licence varies by service | Varies | Varies | Not for player characters |

## 3. Recommendation

Build **one character system** whose contract doesn't care where assets come
from. Fill it first with **MPFB2 (CC0, free, can start now)**, then upgrade
it with **Reallusion CC4/5** content when budget and written permission
exist. Keep **Rocketbox** for background crowds.

Honest expectation: MPFB2 characters look like believable, varied real
people at gameplay distance. They will **not** match the CC4 or MetaHuman
renders in the reference images; that tier needs the paid Phase 2 assets.

### The character "kit" contract (what the code will load)

```
public/assets/characters/<kit>/
  kit.json            skeleton id, presentations, morph list with ranges, skins, hair, outfits
  body-<presentation>.glb   base body: skinned mesh + morph targets (body and face)
  skins/<id>/         albedo / normal / roughness (1K body, 2K face)
  hair/<id>.glb       skinned to the kit skeleton
  outfits/<id>.glb    skinned to the kit skeleton (top, bottom, shoes as separate pieces)
  anims.glb           clips only (idle, walk, run, then sit, talk, work…)
```

Each player saves a **CharacterSpec** alongside the existing character:
kit, presentation, height, morph weights (body build and face), skin, hair
and hair colour, outfit pieces and colours. Old saves without one get a
default spec, so careers, lifestyle, balance, hunger, work and saves are
untouched.

### How variation comes out

- **Skeleton-level:** height and limb proportions (bone scale).
- **Morph targets:** body build (weight, muscle, waist, hips, shoulders) and
  face (jaw, cheekbones, nose width and length, lips, eyes, brow, ears). About
  15–25 runtime morphs, chosen from MPFB's hundreds, keeps the files light.
- **Skin:** several base skin texture sets covering the full range of tones
  and undertones, plus fine tone adjustment, freckles and marks. Not one
  texture recoloured.
- **Hair and grooming:** separate meshes (afro, braids, locs, fades, curls,
  straight, long, beards) bound to the same skeleton.
- **Clothing:** separate pieces per slot, recolourable where the fabric
  allows, so lifestyle and career can drive wardrobe later (uniforms, aso-ebi,
  agbada, business wear).

The creator UI offers presentation, then presets ("starting faces" sampled
from real-world variation, never a "race" button), then fine sliders. The
live preview already exists.

### Performance plan (Intel iGPU, 16 GB RAM, mobile)

- Load only the player's pieces; the creator loads hair and outfits on demand
  when browsed, never the whole library.
- Budgets per player character: up to about 30k triangles in total, about
  6 MB of GPU texture memory, 1K body and 2K face textures (1K on the Low
  tier), meshopt plus WebP (KTX2 later).
- NPCs: Rocketbox avatars (about 7k triangles), and later shared kit pieces
  with instancing and LODs.
- One animation library per skeleton, shared by every character.

### Animation

Clips live in `anims.glb` on the kit skeleton. The idle, walk and run
cadence logic already in `Avatar.tsx` carries over unchanged. The 417
Rocketbox clips (MIT) can be retargeted offline onto the kit skeleton with the
existing world-space retargeting approach, which adds sit, talk, phone and
work activities without buying motion capture.

## 4. Phase 1 plan (MPFB2), in testable checkpoints

1. **Kit build script** (Blender run headless; the `bpy` Python module
   installs from PyPI): generates body GLBs with the chosen morph set and the
   game-engine rig, then exports clothes and hair as separate skinned GLBs.
   *Check:* the files open in three.js; morphs move the mesh; one skeleton is
   shared.
2. **Runtime loader** (`CharacterModel` replaces the single `Avatar`): it
   assembles body, hair and outfit from a CharacterSpec. *Check:* the build
   passes and the current gameplay is unchanged.
3. **Animation library** retargeted onto the kit skeleton (idle, walk, run
   first). *Check:* no foot sliding at walk and jog speeds.
4. **Creator UI:** presentation, presets, sliders, skin, hair and outfit, with
   save migration. *Check:* 8–10 visibly different characters screenshotted
   side by side.
5. **Performance pass on your laptop** (your FPS readings) before adding more
   assets.

## 5. Asset availability

The MakeHuman system-assets archive and several CC0 target packs are now
available in the local Downloads folder. There is no need to upload them
again. Four system hairstyles (afro, braids, ponytail and long waves) have
been converted, optimized and integrated with the existing player. The
remaining system clothing and shoe assets are fitted to MakeHuman's HM08
topology, not the Rocketbox avatar, and are not yet safe to wear in-game.

The selected public assets are CC0 and attributed in
`public/assets/CREDITS.md`. Original archives remain in Downloads; only the
converted, verified runtime assets are copied into the repository.

Not needed for this step: installing Blender yourself. Blender 5.2 is
available in the development environment.

**For Phase 2 (premium):** a budget decision on Reallusion Character Creator
plus the content licences, and a written mass-distribution permission request
to Reallusion naming AYE as a browser game. I can draft that request.

## Sources

- MPFB licence (CC0 assets and output): `LICENSE.md` in
  github.com/makehumancommunity/mpfb2; MPFB FAQ, "Can I use models made with MPFB in a closed-source game?"
- MPFB asset packs: static.makehumancommunity.org/assets/assetpacks.html
- Reallusion EULA (reallusion.com/Content/EULA) and Reallusion forum staff
  posts on export licences and mass distribution
- MetaHuman licensing: CG Channel, 4 June 2025, "You can now sell MetaHumans,
  or use them in Unity or Godot"; contrary claim in a StraySpark studio blog,
  April 2026
- Ready Player Me shutdown: Avatar SDK blog, July and August 2026 (a
  competitor's account) and Ryan Schultz, December 2025
- Daz interactive licences: Daz store product pages and forum guidance
- Rocketbox: github.com/microsoft/Microsoft-Rocketbox (MIT)


## Status update: MakeHuman targets received (October 2026)

The project owner uploaded four CC0 MakeHuman target packs (now in
`assets-src/makehuman/`): **faceunits01** (52 ARKit facial expressions),
**nose01**, **ears01** and **hands01**. They were checked on the real MakeHuman
base mesh (fetched from the MPFB repository, CC0): smile, blink, surprise, nose
and ear targets all deform correctly as glTF morph targets in three.js.

What this unlocks once the MakeHuman pipeline is built: blinking, smiling and
talking faces, and far finer face and body customisation than the 12 fixed
Rocketbox people allow.

What is still missing before MakeHuman people can replace Rocketbox in the game:

1. **MakeHuman system assets** (CC0): skins, eyes, eyebrows, eyelashes, hair and
   clothes. Without them a MakeHuman person has no skin texture, hair or
   clothing, which would look worse than today's characters.
2. **Animations for the MakeHuman game-engine skeleton** (idle, walk, run), or a
   retarget of the Rocketbox clips onto it.
3. A build step (MPFB in headless Blender, or a Node script) that bakes body
   shape, skin and clothes into optimised GLBs.

## Status update: MakeHuman body in the game (October 2026)

`scripts/makehuman/build-body.mjs` now builds a real MakeHuman body from the
CC0 MPFB data (fetched from raw.githubusercontent.com and cached in
`assets-src/makehuman/cache/`, which is not committed):

- An adult African female base (`macrodetails/african-female-young`).
- The arms posed down by the shoulders, using the game-engine rig's own
  skin weights.
- 14 morph targets: weight, muscle, cup size, bust, waist in and out, hips,
  hip width, belly, buttocks, and arm room for fuller figures. Each target is
  posed the same way and has its own normals.
- Eyes, plus a scalp cap cut from the body for hair.
- The output is `public/assets/characters/mh/female-body.glb` (438 KB after
  meshopt).

In the game it powers the women's **body-type chart** in "Create your life":
- seven 3D figures in a black two-piece, placed on the body by shader;
- deep skin tones;
- natural hair: afro, afro puff, short natural and bun.

Choosing one sets the character's body shape.

Not done yet, so the playable character is still the Rocketbox person:
- a men's MakeHuman body;
- face shaping;
- textured skin;
- real hair models (braids, locs, long hair);
- fitted clothing;
- animations on the MakeHuman skeleton.

The playable character takes the chosen shape through the bone-girth system,
fully clothed.
1. A complete MakeHuman base body, skin, eye and skeleton export. The local
   CC0 system pack contains multiple skin textures, hair, clothing and shoes;
   four hairstyles are already converted for the Rocketbox head attachment.
2. Idle, walk and run animations for the MakeHuman game-engine skeleton, or a
   verified retarget of Rocketbox clips onto it.
3. A repeatable rigged export that applies the HM08 clothing proxy mappings
   and weights, and a save-compatible character selection path.

The four current hairstyles are static meshes attached to the Rocketbox head
bone: they follow head turns and locomotion, but do not have ponytail or braid
secondary-motion simulation.
