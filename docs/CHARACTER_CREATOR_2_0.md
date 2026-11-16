# AYE Character Creator 2.0

Status: Task 1 (feasibility) and Task 2 (wardrobe architecture) done. This
document covers the deferred-features milestones and the Task 3 preparation
(Neutral F / Neutral M wardrobe) — the write-up only; no new garment is
integrated yet. See `CHARACTER_PIPELINE.md` for the superseded MakeHuman
plan and `ASSET_INVENTORY.md` for the raw asset survey.

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
