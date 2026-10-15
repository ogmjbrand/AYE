# AYE character pipeline proposal

Status: **proposal, not implemented.** Written October 2026. Licence facts
were checked against the sources linked at the end; where a source was
second-hand or disputed, it says so.

## 1. Audit: what the game has today

| Part | Current state | Meets the target? |
|---|---|---|
| Model | One fixed avatar: Microsoft Rocketbox `Male_Adult_12` (MIT). Real human proportions, photo-sourced face, hand and clothing textures (2K), ~6,700 triangles. | Human, not cartoon. Low-poly by 2026 standards; hair is painted on the head. |
| Variation | **None** except an outfit tint that recolours the denim. Every player is the same man. | **No.** |
| Presentation | Male only. The library has no dark-skinned adult woman (checked all 17 adult women). | **No.** |
| Body / face | No morphs. Height is a fixed scale. | **No.** |
| Hair / clothes | Baked into one texture; not interchangeable. | **No.** |
| Animation | Rocketbox motion capture: idle, walk, run on the avatar's own skeleton, cadence matched to ground speed. Rocketbox has 417 more clips on the same skeleton (sit, talk, phone, work…). | Yes for locomotion; extensible. |
| Creation UI | Name, lifestyle, career, diet, outfit colour, with a live 3D preview. | Systems are fine; appearance options are missing. |

Conclusion: the game has a **character file**, not a **character system**.
Fixing that needs a different kind of source asset: a parametric human with
morph targets and modular hair and clothing on a shared skeleton.

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

## 5. What is needed from you

**For Phase 1 (free):** the MPFB2 core data (base mesh, targets, rigs) is on
GitHub and reachable from the development environment. **Skins, eyes, hair
and clothes come in asset packs hosted on makehumancommunity.org, which the
development environment cannot reach.** On your laptop:

1. Open the official asset packs page:
   https://static.makehumancommunity.org/assets/assetpacks.html
2. Download **"MakeHuman system assets"** (required), plus any packs offering
   skins with darker tones and afro, braid or loc hair. **Check each pack's
   stated licence**: CC0 is fine to commit; CC-BY needs a credit line.
3. Get the zip files to me by uploading them in this chat. Don't commit them
   to GitHub: large binaries bloat the repository. I'll extract only what the
   kit uses.

Not needed for Phase 1: installing Blender yourself. The build runs here. If
you'd like to try MPFB interactively, it needs Blender 4.2 or newer.

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
