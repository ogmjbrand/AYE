# AYE Character Creator 2.0

Status: Task 1 (feasibility) and Task 2 (wardrobe architecture) done. This
document covers the deferred-features milestones, the Task 3 preparation
(Neutral F / Neutral M wardrobe), and Phase 1 asset discovery for the
"Modular Fashion System 2.0" spec — all write-up and inspection, no new
garment is integrated yet. See `CHARACTER_PIPELINE.md` for the superseded
MakeHuman plan and `ASSET_INVENTORY.md` for the pre-CC5 raw asset survey.

## Deferred features (not attempted in this milestone)

These three were explicitly scoped out of Character Creator 2.0. Each needs
a real design decision and non-trivial pipeline work before it's worth
attempting — recorded here as future milestones, not started.

### Facial morph customization

Real face-shape sliders (jaw, cheekbones, nose width/length, lips, eyes,
brow) acting on the player's own head mesh — not just picking a different
CC5 "Person."

**Why deferred:** the CC5 pipeline (`convert_cc5.py`) exports a static
skinned mesh with no glTF morph targets; there is currently nothing to
slide. CC5's own face-shaping tools are GUI-only and don't survive the
FBX → glTF export.

**Two possible paths, not decided:**
1. Extend `convert_cc5.py` to export CC5 head-morph data as glTF morph
   targets, if RLPy exposes it in a form Blender can bake — unverified.
2. Revisit the MakeHuman/MPFB2 pipeline already scoped in
   `CHARACTER_PIPELINE.md`, which already has real CC0 face-morph target
   packs on disk (`assets-src/makehuman/faceunits01` etc., confirmed
   deforming correctly on the MakeHuman base mesh) — but that's a
   different base body from the CC5 player bodies AYE uses today, so
   choosing this path means reopening the MakeHuman-vs-CC5 decision.

### Advanced facial editing

Finer controls than basic morphs — individual eye shape, brow height, lip
fullness, asymmetry, skin detail — comparable to CC5's own Headshot/Face
Puppet tools.

**Why deferred:** entirely downstream of facial morph customization above.
Without exported morph targets there is nothing to edit at this level of
detail; revisit only after that milestone has a working base.

### Real-time cloth simulation

Garments (skirts, dresses, capes, loose fabric) that physically react to
movement, rather than rigid skinned geometry that moves exactly with the
body.

**Why deferred:** the current garment pipeline
(`export_cc5_garment.py` / `components/Cc5Garment.tsx`) exports and rebinds
every garment as an ordinary skinned mesh; CC5's own cloth-sim data doesn't
survive FBX/glTF export, and the game's physics engine
(`@react-three/rapier`) has no cloth or soft-body solver wired in.

**Needs a real decision, not assumed here:** either add a lightweight web
cloth solver (e.g. a mass-spring/Verlet system driven from `useFrame`) for
secondary motion on loose garments, or accept CC5's pre-baked drape as a
static pose with no runtime simulation. Both are real engineering efforts,
not a quick toggle.

## Task 3 preparation: Neutral F / Neutral M wardrobe

Goal (per the approved plan): at least one properly fitted top and bottom
each for Neutral F and Neutral M, the two "blank canvas" mannequins (bald,
underwear only, no outer clothes to clip against or hide). Aaron and Ariana
keep their existing outfits unchanged.

This section is preparation only: the pipeline is inspected and verified
below, but **no garment is built or integrated yet** — that waits on your
manually-exported CC5 clothing projects (Task 1 found scripting CC5's own
content-loading APIs crashes the app, so this has to be done by hand in the
CC5 GUI, same as Aaron's and Ariana's existing garments were).

### 1. Pipeline inspected (existing, unchanged scripts)

Three scripts, already proven on Aaron/Ariana, need no changes to work for
Neutral F/M:

- **`scripts/cc5/export_cc5_projects.py`** (run inside CC5): batch-exports a
  `.ccProject` to `<OUT_ROOT>/<job name>/<job name>.fbx` + `.json` +
  textures, via the bundled Unity Pipeline Plugin's exporter — the only
  exporter that produces the per-mesh material manifest the rest of the
  pipeline needs (plain `RFileIO.ExportFbxFile` does not). Driven by a
  `JOBS` dict of `name -> (project_file, export_motion)`.
- **`scripts/cc5/export_cc5_garment.py`** (Blender, called by
  `build-garment.mjs`): extracts one or more named meshes from that FBX as
  a standalone skinned GLB bound to the same `CC_Base` rig the player
  bodies use, rebuilds materials from the CC JSON manifest, and applies the
  same forward-facing rig correction `convert_cc5.py` applies to player
  bodies (critical — skipping it renders the garment rotated/mangled; see
  the 270.8° bug recorded for Ariana's garments).
  ```
  blender --background --factory-startup --python scripts/cc5/export_cc5_garment.py -- \
      <in.fbx> <in.json> <mesh_names> <anim.glb> <out.glb> <report.json>
  ```
  `mesh_names` is one name, or several comma-separated for a multi-mesh
  piece (e.g. a hairstyle's base + a separate accessory).
- **`scripts/cc5/build-garment.mjs`** (Node, what's actually run): wraps the
  Blender call, optimises the result (dedup/prune/resample, meshopt,
  texture budget 1024px diffuse/normal, 512px AO/other), and writes:
  ```
  node scripts/cc5/build-garment.mjs <name> <sourceDir> <fbxBaseName> <meshNames> <rocketboxAnim>
  →  public/assets/private/characters/cc5/garments/<name>.glb
  →  public/assets/private/characters/cc5/garments/<name>.json   (metadata sidecar)
  ```
  `rocketboxAnim` must match the `anim` field `build.mjs`'s `CHARACTERS`
  entry uses for that body — **`male-adult-12` for Neutral M, `female-adult-08`
  for Neutral F** (same as Aaron/Ariana respectively; confirmed in
  `build.mjs`'s `CHARACTERS` map).

### 2. Exact naming convention and manifest structure

- **Project file naming** (established by Aaron/Ariana): the plain body is
  `_HD Neutral F.ccProject` / `_HD Neutral M.ccProject` (already exported,
  unchanged, used for the player body itself). A **separate, newly-dressed
  project** should follow the same `_Clothed` suffix convention already used
  for Aaron and Ariana: **`_HD Neutral F_Clothed.ccProject`** and
  **`_HD Neutral M_Clothed.ccProject`**, saved in
  `C:\Users\kolak\Downloads\CHARACTER\` (the existing `SOURCE_DIR`). This
  keeps the plain bald/underwear export (used for the player body GLB)
  completely separate from the dressed one (used only as a garment source) —
  satisfying "don't modify existing working character models."
- **Export job naming**: two new entries in `export_cc5_projects.py`'s
  `JOBS` dict, matching the existing `AaronClothed`/`ArianaClothed` pattern:
  ```python
  "NeutralFClothed": ("_HD Neutral F_Clothed.ccProject", False),
  "NeutralMClothed": ("_HD Neutral M_Clothed.ccProject", False),
  ```
  This produces `Downloads\CHARACTER\export\NeutralFClothed\NeutralFClothed.fbx`
  + `.json` (and the same for `NeutralMClothed`) once you re-run the export
  script inside CC5.
- **Garment metadata manifest** (`build-garment.mjs`'s sidecar JSON,
  unchanged structure — confirmed from the script):
  ```json
  {
    "source": { "fbx": "<FbxBaseName>.fbx", "json": "<FbxBaseName>.json", "mesh": "<mesh names>" },
    "builtAt": "<ISO timestamp>",
    "fileMB": 0.0,
    "rawMB": 0.0,
    "vertices": 0,
    "vertexGroups": ["<bone names the garment is weighted to>"],
    "materialsRebuilt": 0,
    "textures": ["<name> <width>x<height>", "..."],
    "gpuMB": 0.0,
    "warnings": []
  }
  ```
- **Wiring into the wardrobe** (`src/lib/fashion.ts`): a new item uses the
  existing `cc5Garment()` helper with `characterId: 'neutralF'` or
  `'neutralM'` — these are the exact ids already registered in
  `lib/assetManifest.ts`'s `CC5_CHARACTERS` map, confirmed matching
  `build.mjs`'s `CHARACTERS` keys. No new `Slot` values are needed: a top
  and a bottom use the existing `'top'` / `'bottom'` slots, same as every
  other garment.

### 3. Garment compatibility — verified now, ahead of time

Per the instruction to verify compatibility before integrating, the
skeletons of the already-built player bodies were compared directly
(`@gltf-transform/core`, reading each GLB's skin joints):

| Comparison | Result |
|---|---|
| `aaron.glb` (101 joints) vs `neutralM.glb` (101 joints) | **Identical** — zero bone-name differences |
| `woman.glb` (104 joints) vs `neutralF.glb` (101 joints) | Differ only by 3 bones: `Earring_Flower`, `Earring_Flower_0`, `CC_Base_Pivot` — all specific to Ariana's own earring accessory, not part of the core body rig |
| `neutralM.glb` vs `neutralF.glb` | Identical |

Conclusion: a top/bottom garment exported from Aaron's rig will rebind
cleanly onto Neutral M (exact match). One exported from Ariana's rig will
rebind cleanly onto Neutral F too, as long as it doesn't reference the
earring-only bones (a torso/leg garment never would). `components/
Cc5Garment.tsx`'s bone-by-name rebind (`findSkinnedMeshes` → remap each
bone by name onto the live avatar's skeleton) will work unchanged for
Neutral F/M; no changes are needed there.

Both Neutral bodies are already confirmed bald/underwear-only (boxers for M,
bra + underwear for F) with no own hairstyle mesh entry in
`CC5_OWN_HAIRSTYLE_MESHES` (`lib/cc5Body.ts`) and full split-material skin
pigmentation support already on by body type (`CC5_HAS_SPLIT_MATERIALS`) —
nothing there needs to change for this task, which is how "preserve the
existing hairstyle and skin customization systems" is satisfied: this
integration only adds new garment GLBs and `FASHION_ITEMS` entries, the
same way Ariana's turtleneck/trench/bun were added without touching
`woman.glb`.

**Nudity rule already satisfied by the choice of mannequin**: because
Neutral F/M have no outer clothing to begin with, nothing needs to be
hidden to show the new garment, and removing the new garment later always
reveals the existing underwear mesh, never bare skin — this was the whole
point of using Neutral as the mannequin rather than Aaron/Ariana.

### 4. What still depends on your manual export

Not knowable until the export exists, and deliberately not guessed or
placeholder-filled:

- **The exact mesh name(s)** of whatever top and bottom you dress Neutral F
  and Neutral M in — these come from the bundled CC5 content item you pick
  (e.g. a shirt template's own internal mesh name), read from the exported
  `.json`'s `Meshes` keys once the files exist.
- **Whether one top fits both** or each needs its own fitted piece — CC5's
  own fitting/skin-weight-transfer step when you dress the avatar in the
  GUI should handle this per body, same as it did for Aaron and Ariana.
- **Whether CC5's own fit introduces any clipping** against the underwear
  — checked visually in CC5 before export, and again in-browser after
  build, same two-step verification already used for every garment so far.

### 5. Next steps, once you have the exports

1. Add the two `JOBS` entries above to `export_cc5_projects.py` and re-run
   it inside CC5.
2. I inspect the resulting `.json` files to get the real mesh name(s).
3. Run `build-garment.mjs` once per body (top and bottom can be one
   multi-mesh garment or two separate ones — decided from what the export
   actually contains).
4. Add the new `FASHION_ITEMS` entries (`cc5Garment()`, `characterId:
   'neutralF'` / `'neutralM'`) and a Supabase seed migration, same pattern
   as the existing CC5 garments.
5. Full verification per Task 5: `tsc`, `eslint`, `vitest`, production
   build, visual browser test (dress Neutral F and Neutral M, confirm no
   clipping, confirm the underwear-only fallback still shows correctly
   with nothing equipped), then an independent commit — not bundled with
   any other change.

## Phase 1 asset discovery ("Modular Fashion System 2.0")

Real inspection of the machine's actual files (CC5's bundled template
library and the Downloads folder's external packs), not estimated counts.
Per the execution order, this is discovery only: **nothing listed here is
approved for integration** by virtue of appearing in this table, and a
file being present doesn't mean it's exportable — that's checked
asset-by-asset during the "validate the pipeline with one real garment"
step and each category expansion afterwards, never assumed.

### CC5 bundled template library

Verified by listing `C:\Users\Public\Documents\Reallusion\Reallusion
Templates\` directly. The previously-cited counts (71 hairstyles, 202
clothing, 141 skins, 57 accessories, 528 animations) are exact — confirmed
file-by-file, not approximate:

| Category | Real count (by extension) | Structure found | Gender/body signal |
| --- | --- | --- | --- |
| **Cloth** | 159 `.ccCloth` + 4 `.ccGloves` + 39 `.ccShoes` = **202** | `Coats/CC3` (1), `Full-body/CC3` (1), `Gloves` (4), `Pants/CC3` (1), `Shirts/CC3` (10), `Shoes/CC3` (8), `Skirts` (5), `Underwear/CC3` (2), `Others/*` (named outfit sets, see below) | Most `CC3`-folder items are generic/gender-neutral by rig (not styling); several `Others` subfolders are complete outfit sets named after a specific avatar |
| **Hair** | 37 `.rlHair` + 24 `.rlHairElement` + 5 `.rlhair` + 2 `.rlhairelement` + 3 `.rlhairstyle` = **71** | `Element`, `Group`, `Style` | Only the 3 `.rlhairstyle` files are complete ready-to-apply styles; the rest are sub-components (strand groups) used to build one, not 71 independent interchangeable styles |
| **Accessory** | 19 `.ccAcc` + 38 `.iAcc` = **57** | `Arm` (incl. `Actor Group`/`Samples`), `Head/CC3`, `Leg`, `Torso`, `Others/*` (named sets: Alika, Eddy, Hivewire_Huntress, Light Armor) | Mixed; several tied to the same named costume sets as Cloth/Others |
| **Skin** | 47 `.ccSkin` + 94 `.ccSkinGenPreset` = **141** | `Acquired`, `Blemish`, `Body Hair`, `Full Skin`, `Head`, `Nails`, `Normal Effects`, `Overall`, `Skin Base`, `Skin Details`, `SkinGen Tools` | Not inspected further this pass — out of scope for Phase 1-4 (clothing), relevant to the existing skin pigmentation system instead |
| **Animation** | 71 `iHand` + 102 `iMotionPlus` + 17 `iMotionplus` + 35 `iTalk` + 72 `italk` + 109 `rlMotion` + 4 `rlPersona` + 118 `rlPose` = **528** | `Motion/1.Human Male`, `Motion/2.Human Female` (each: Idle/Move/Perform), plus `Motion/Coyote`, `Motion/Horse`, `Motion/TRex` (non-human, irrelevant here) | Explicitly gendered folders for human motion; not needed for this clothing pass |

**Named outfit sets found under `Cloth/Others/` and `Accessory/Others/`**
(each a pre-built, multi-piece costume, not a single garment):

| Set | Pieces | Notes |
| --- | --- | --- |
| `Aaron Outfit Set` | Regular Fit Shirt, Slim Fit Trousers, Sport Sneakers | **Confirms provenance** — this is exactly Aaron's current baked-in outfit (`RS_Regular_Fit_Shirt`/`Slim_Fit_Trousers`/`Sport_sneakers`), already in the game |
| `Ariana Party Set` | Halter Mini Dress, High Heels | **New candidate, not yet used.** A different outfit from Ariana's current one (which is a skirt, not a dress) — already fitted to a known-compatible avatar. The strongest available real dress candidate found this pass |
| `Mila Outfit Set` | Jeans, Sweater, Sneaker | Feminine casual set; "Mila" isn't one of AYE's current characters/exports, so this is template content to retarget onto Neutral F via CC5's own skin-weight transfer, not an existing avatar's outfit |
| `Gibro Work Set` | Apron, Belt, Boots, Glasses, Pants | Masculine work-uniform styling; aesthetic is "uniform," not business wear — lower priority for the Phase 4 categories requested |
| `Alika` (12 files), `Eddy` (17 files) | Jackets, pants, tops, gloves, boots, tactical gear | Sci-fi/tactical aesthetic. Technically CC_Base-compatible content, but **wrong aesthetic for AYE's target categories** (everyday/African/luxury/business) — flagged as available, not recommended |
| `Hivewire_Huntress` | Dress, gloves, pants, jacket, shoes | Fantasy aesthetic — same flag as above |
| `Light Armor` | Helmet, pauldron, tasset, trouser, tunic, vambrace, greave | Fantasy armor — same flag as above |

**Licensing (blanket flag, applies to every item above):** per the
existing research in `CHARACTER_PIPELINE.md` §2, Reallusion's EULA allows
embedding exported content in a game/web service but **the content must
not be publicly downloadable**, and mass distribution needs a **written
permission letter** from Reallusion after registering the game. The
current pipeline already respects the "not publicly downloadable" half —
every built CC5 GLB lives under `public/assets/private/` and
`assets-src/cc5/`, both git-ignored. The mass-distribution permission
letter has not been requested and is **not assumed granted** by anything
in this document; it's a real open item for whoever owns that
relationship with Reallusion, not a blocker invented for this task.

### External downloaded assets

Spot-checked by listing zip contents directly (not just filenames), since
a filename guessing the category reliably turned out to mislead at least
once below (per the instruction not to assume a format from the name):

| Asset | Real contents found | Format | Verdict |
| --- | --- | --- | --- |
| `suits02_cc0.zip`, `suits03_cc-by.zip` | Despite the name, these contain **"donitz_monk_robe_hood," "galactic_warrior_uniform," "scifi-armor_guardian," "hero_suit"** — a fantasy/sci-fi costume pack, not business suits | `.mhclo` + `.obj` + `.mhmat` (MakeHuman proxy format) | **Not usable**: wrong format (MakeHuman HM08 topology, not CC_Base/Rocketbox — same conclusion `CHARACTER_PIPELINE.md` already reached for the other MakeHuman clothing packs) *and* wrong aesthetic despite the filename |
| `system_clothes_materials01_cc0`, `equipment02/03_cc-by.zip`, `underwear03_cc-by.zip`, `underwear04_cc0.zip`, `hats01_cc0.zip`, `hats03_cc-by.zip` | Not individually opened this pass | Same MakeHuman ecosystem as the packs above and the already-confirmed-incompatible ones in `ASSET_INVENTORY.md` | Presumed same `.mhclo` topology issue; needs the same per-pack check before any assumption, not yet done |
| `Streetwear+Module+01.zip` | Bomber Jacket, Modern Formal Pants, Shoes, Sport Shirt, Bag — each with full base-colour/metallic/normal/roughness PBR textures | `.obj` + `.mtl` + `.jpeg` textures | **Right aesthetic, right texture quality, wrong rig state**: `.obj` carries no skeleton or skin weights at all (the format can't). These are static display meshes, not wearable garments — would need a full manual rigging/weight-painting pass in Blender before they could deform with a character. Real, non-trivial content-prep work, not a drop-in conversion like the proven CC5 pipeline |
| `SK_SummerGirl.zip` | One file, `SKM_Hair.fbx` | FBX (can carry skin weights, unlike `.obj`) | A single hairstyle mesh, not clothing despite the ambiguous zip name. Skeleton compatibility with `CC_Base` not checked this pass |
| `CGT_Free_Pack.zip` | Armchairs, barstools, benches, ceiling lights, chairs, coffee tables, artwork — confirmed by filename inspection of all 56 FBX entries | `.max` (112, 3ds Max only) + `.fbx` (56) + textures | **Not a clothing pack at all**, despite being inside the search scope — this is furniture/home-decor content (relevant to the existing Home Decor catalogue, not the wardrobe) |
| `Elegant Long Black Blazer Dress…`, `Fashion Icon Game Overview`, `Pin on Clothing` | Reference/inspiration JPEGs (Pinterest-style mood boards); `Pin on Clothing` is empty | 2D images only | **Not 3D assets** — design references only, per the rule against substituting images for real garments |
| `Avatar(12).ccProject` | A `.ccProject` not in the current `export_cc5_projects.py` `JOBS` dict | CC5 native project | Unidentified — same situation `Avatar13`/`Avatar13b`/`HDNeural` were in before being inspected; not opened this pass, no assumption made about what it contains |

### What this means for Phase 4 (production)

Ranked by what's actually ready to attempt next, not by category count:

1. **Best next candidate: `Ariana Party Set`'s Halter Mini Dress.** Already
   fitted to a known-compatible, already-integrated avatar; would be the
   first real `dress`-slot content once that Slot is added — per the
   wardrobe-architecture invariant from Task 2, the new `Slot` value and
   its real item land in the same commit, never separately.
2. **Good MVP raw material**: the plain `CC3`-folder items (Camisole, Tank
   Top, generic Jeans/skirt variants, generic boots, the generic
   Underwear boxers) — least "costume-y," broadest fit, matches the
   feminine/masculine MVP lists in the spec reasonably well.
3. **`Mila Outfit Set`** (sweater/jeans/sneaker) as a second feminine MVP
   source, pending confirmation it retargets cleanly onto Neutral F (no
   different in principle from any other CC5 template item, but not yet
   tried).
4. **Streetwear Module 01** is a real option for later expansion, but only
   after someone does the rigging/weight-painting work it needs — not a
   Phase 4 MVP item.
5. **Not recommended for AYE's stated aesthetic** (everyday/African
   fashion/luxury/business/formal): Alika, Eddy, Hivewire_Huntress, Light
   Armor, and the `suits02/03` MakeHuman packs. Available, catalogued, and
   explicitly not prioritized rather than silently ignored.

Per the execution order, the next concrete step is still Task 3's
validation: one real garment each for Neutral F and Neutral M, from your
manual CC5 export — not a broader sweep of this list — before any category
expansion begins.

## Phase 2: modular wardrobe architecture (design only)

Design for how the spec's 18 clothing categories map onto AYE's actual
render slots, **without adding any new `Slot` value yet** — the existing
invariant (every `Slot` lands with real backing content in the same
commit, recorded for Task 2) still applies and the spec itself reaffirms
it ("do not introduce speculative garment slots without actual content
and tests"). This is the plan to build against once Task 3/4 content
exists, not a change made now.

### Category → slot mapping

| Spec category | Slot | Status |
| --- | --- | --- |
| T-shirts, Shirts, Blouses, Sweaters, Tops | `top` (existing) | Real content exists today (Aaron's/Ariana's own + 2 modelled Ariana tops) |
| Jeans, Trousers, Skirts, Shorts | `bottom` (existing) | Real content exists today |
| Shoes | `shoes` (existing) | Real content exists today |
| Hairstyles | `hairstyle` (existing) | Real content exists today, now sellable (Task 2) |
| Dresses | **New `dress` slot — not added yet** | No real content yet; `Ariana Party Set`'s Halter Mini Dress (Phase 1) is the best candidate to pair with it |
| Jackets, Coats, Blazers | **New `outerwear` slot — not added yet.** Layers over `top`, never replaces it | No real content yet |
| Suits | **No new slot** — modelled as a matching `outerwear` + `bottom` pair, reusing the existing `FashionSet` top+bottom combo mechanic already in the boutique (`setsIn()` in `lib/boutique.ts`), not a body-coverage region of its own | Depends on `outerwear` existing first |
| African traditional fashion | **No new slot** — a style/collection tag, the same way `'African prints'` already tags Ankara/Adire/Kente items across `top`/`bottom` today (`FashionItem.collection`); applies the same way to `dress`/`outerwear` once those exist | Already-existing mechanism; no architecture change needed |
| Accessories | **New `accessory` slot — not added yet.** Starting as one slot; whether it needs to split (earring/bag/glasses as independent simultaneous pieces) is a real question to answer once actual accessory content exists, not decided speculatively now | No real content yet |

### Layering and compatibility rules (to implement once the slots above have real content)

- `top` + `bottom` stay independent and always combinable — unchanged, already true today.
- `outerwear` **coexists** with `top` rather than replacing it, the way a jacket goes over a shirt in life. No runtime change is needed for this: `Avatar.tsx` already renders every equipped slot's `cc5Garment` independently (`Object.entries(cc5Garments)`), so a `top` and an `outerwear` piece would simply both render. Only the new `Slot` value and its content are missing, not any rendering capability.
- `dress` is **mutually exclusive** with `top` and `bottom` — wearing a dress must clear (or hide the picker for) both, the same way a skirt mesh can't coexist with a separate bottom without clipping. This needs real UI logic in `CharacterCreation`'s `ClothesStage` and `BoutiquePanel`'s try-on (equip a `dress` → set `outfit.top`/`outfit.bottom` to `null`, and vice versa) — not yet written, since there's no dress content to test it against. This is the one new behaviour rule this system needs beyond "add a slot and an item."
- `accessory` stacks independently of everything else — no exclusivity rule needed, same as `hairstyle` today.
- `shoes` and `hairstyle` are unchanged.

### What this phase deliberately does not change

- No new `Slot` enum values (`dress`/`outerwear`/`accessory`) are added to `src/lib/fashion.ts` yet.
- No dress/top/bottom mutual-exclusivity code is written yet.
- No new `ClothesTab`/`BoutiqueSection` wiring beyond what Task 2 already
  added (the `suits` tab and `dresses`/`outerwear`/`accessories`
  placeholders already exist and already show "not in the game yet"
  honestly).

Each of the above gets implemented together with its first real
content — e.g. the day `Ariana Party Set`'s dress (or any other dress) is
actually exported and built, that same change adds the `dress` Slot value,
the `FASHION_ITEMS` entry, and the top/bottom exclusivity logic, verified
together, not staged separately.

Per the execution order, the next concrete step is still Task 3's
validation: one real garment each for Neutral F and Neutral M, from your
manual CC5 export — not a broader sweep of this list — before any category
expansion begins.
