# AYE asset acquisition checklist

**Status (October 2026):** the Rocketbox player with Idle/Walk/Run is installed. Four CC0 MakeHuman hair meshes (afro, braids, ponytail and long waves) are selectable, previewable and saved separately from hair colour. Character creation also offers independently saved skin-tone tints applied to exposed skin while preserving the source texture. NPCs now receive stable, role-aware material styles, skin tones, body shapes and compatible head-attached hair. Their clothes are the existing Rocketbox baked garments restyled by masks; there are no modular garment, shoe, dress or accessory meshes.
The city uses ambientCG PBR maps for asphalt, paving and exposed ground,
venue/tier-specific tile materials for interiors, and ambientCG EXR lighting
for day, golden hour and indoor venues. Snow is retained but not applied to the
Nigerian city. Buildings and vehicles remain procedural. The player character
is a Microsoft Rocketbox avatar (MIT, realistic
proportions and photo-sourced textures, but a ~6.7k-triangle mesh from the 2010s;
see `public/assets/CREDITS.md`). `public/assets/manifest.json` enables road,
pavement and ground; roof, concrete, avatar and vehicle entries use built-ins.

Live metadata for some sources is reachable, but obtaining model files can
require authorized account access. MakeHuman system clothing and shoe assets
are available locally, but their HM08 proxy fit and skeleton weights must be
converted to a compatible wearable rig before registration. Names below are
search terms and selection criteria, not file names. Record each selected
asset's real ID and exact licence in `public/assets/CREDITS.md`.

The current filesystem and supplied archive scan is recorded in
[`ASSET_INVENTORY.md`](./ASSET_INVENTORY.md). It found licensed Rocketbox
characters, MakeHuman morph-target source data, and four converted CC0 hair
meshes. The downloaded clothing and shoe meshes remain fitted to the MakeHuman
body and have not been verified on Rocketbox; no furniture meshes were found.
Reference images are not product meshes and are not treated as redistributable
assets.

Tick each box only when the file is in place **and** `npm.cmd run assets:check`
passes **and** you have looked at it in the game at http://localhost:5173.

---

## Before you start: where files go and what may be committed

The GitHub repository is **public**. Anything committed can be downloaded by
anyone.

| Licence of the file | Where to put it | Committed? |
|---|---|---|
| CC0 (ambientCG, Poly Haven, Kenney, Quaternius) | `public/assets/textures/…`, `public/assets/models/…` | Yes |
| CC-BY (many Sketchfab models) | same as CC0, **plus** a credit line in `CREDITS.md` | Yes |
| Private, non-redistributable, or unverified assets | Outside `public/`; `assets-src/private-avatars/` is reserved for the local avatar lab | No; never include in a production build |

**Do not put private assets in `public/`, even in a git-ignored folder.** Vite
copies everything under `public/` into the production build, whether or not Git
tracks it. The legacy `public/assets/private/` folder is not a safe place for
unlicensed or non-redistributable files.

Only assets cleared for distribution belong in `public/assets/` or
`public/assets/manifest.json`. The local avatar lab reads from
`assets-src/private-avatars/` during development; it is not part of the game
manifest or production build.

---

## 1. Detailed human character (GLB)

- [ ] **File:** `public/assets/models/characters/player.glb` only after its
      source and redistribution licence are verified.
- [ ] **Manifest:** `"avatar": { "url": "models/characters/player.glb", "height": 1.78 }`.
      `height` is the standing height in metres; allowed range 1.2–2.3.
- [ ] If rights are not verified, keep the asset outside `public/` and do not
      register it in the production manifest.

**Where to get one**

| Source | Realism | Licence notes |
|---|---|---|
| Mixamo (mixamo.com, free Adobe account) | Medium | Free for games; files may not be redistributed, so use `private/`. |
| Reallusion Character Creator 4 + ActorCore (paid) | High; good African skin, hair and clothing options | Game export needs the right Reallusion export licence. Check before buying; keep uncleared exports outside `public/`. |
| MetaHuman (Epic) | Highest | Epic's licence terms changed in 2025. Read the current MetaHuman EULA about use outside Unreal before exporting. Raw exports are far too heavy and need heavy reduction (below); keep uncleared exports outside `public/`. |
| Sketchfab, filtered by *Downloadable* and *CC-BY* or *CC0*, searching "rigged African man" or "rigged character PBR" | Varies | CC-BY needs credit. Check that it is actually rigged. |

**Technical requirements (`assets:check` tests the ones marked ✓)**

- ✓ Rigged: one skinned mesh with a skeleton. A static statue won't animate.
- ✓ Under **80,000 triangles**; aim for 30,000–60,000 on Intel integrated graphics.
- ✓ Textures **2048 px or smaller** (1024 is fine for clothing). Use PBR metal/roughness, not specular/gloss.
- ✓ **No Draco compression** (the game's avatar, vehicle and clothing loaders configure MeshoptDecoder). `npm run assets:optimize` produces the right format.
- Y-up, metres, facing **+Z**, feet at the origin, rest pose T or A.
- At most 4 bone influences per vertex (Blender's glTF exporter does this by default).
- Under ~15 MB after optimisation; aim for under 8 MB.

## 2. Idle, walking and running animations

The game plays clips stored **inside the character GLB**. It finds them by
name, so each name must contain `idle`, `walk` or `run` (any capitals):
`Idle`, `Walk`, `Run`.

- [ ] Clips come from **the same skeleton** as the character. Mixamo clips
      downloaded *for that Mixamo character* match; ActorCore motions match CC4
      characters. Clips from a different rig need retargeting in Blender first.
- [ ] Mixamo settings: format FBX, Skin "Without Skin" for the 2nd and 3rd
      clips, 30 fps, **In Place ticked** for Walk and Run (the game moves the character itself).
      Suggested Mixamo searches: "Idle", "Walking", "Running".
- [ ] In Blender (free): import the character FBX, then import each clip FBX
      and push each action to the character's armature. Rename the actions
      `Idle`, `Walk`, `Run`. Export **glTF Binary (.glb)** with Animation ✓
      and "Always Sample Animations" ✓.
- [ ] `npm.cmd run assets:check` shows `animation "idle" found`, `"walk"`, `"run"`.

The game blends them by speed: standing still uses Idle, below 3.2 m/s uses
Walk, above that uses Run.

## 3. Ground textures (1K PBR, CC0)

**Sources (both CC0, no attribution required):** ambientCG (ambientcg.com) and
Poly Haven (polyhaven.com/textures).

Download the **1K JPG** package. 2K is the maximum; larger costs memory and
frame rate on integrated graphics. You need three images per surface, and a
fourth (ambient occlusion) is used if the package has one:

| Map | ambientCG file contains | Poly Haven map name | Save as |
|---|---|---|---|
| Colour | `_Color` | `diff` | `color.jpg` |
| Normal | `_NormalGL` (**not** NormalDX) | `nor_gl` | `normal.jpg` |
| Roughness | `_Roughness` | `rough` | `roughness.jpg` |
| Ambient occlusion (optional) | `_AmbientOcclusion` | `ao` | `ao.jpg` |

Leave out `_Displacement`, `_NormalDX` and `.usdc`/`.mtlx` files: the game
doesn't use height maps (too costly on integrated graphics).

| Slot | Search for | Folder | Used on |
|---|---|---|---|
| [x] `road` | "Asphalt015": worn, fine aggregate, no painted lines | `environment/road/` | Boulevard and cross street |
| [x] `pavement` | "PavingStones036": interlocking concrete pavers, as on Lagos pavements | `environment/pavement/` | Raised pavements |
| [ ] `concrete` | "Concrete": plain, lightly stained | `textures/concrete/` | Balcony slabs and ledges (small areas) |
| [x] `ground` (optional) | "Ground003": suitable exposed soil | `environment/ground/` | Unpaved ground |
| [ ] `roof` (optional) | "Concrete" or "Roofing" | `textures/roof/` | Flat roofs |

Manifest entry (repeat per slot). `tileMeters` is the real-world width one
image covers; the asset page lists it:

```json
"road": {
  "color": "textures/road/color.jpg",
  "normal": "textures/road/normal.jpg",
  "roughness": "textures/road/roughness.jpg",
  "ao": "textures/road/ao.jpg",
  "tileMeters": 3
}
```

Worked example for an ambientCG download such as `PavingStones092_1K-JPG.zip`:
unzip it, then copy `PavingStones092_1K-JPG_Color.jpg` to
`public/assets/textures/pavement/color.jpg`, `..._NormalGL.jpg` to `normal.jpg`,
`..._Roughness.jpg` to `roughness.jpg` and `..._AmbientOcclusion.jpg` (if
present) to `ao.jpg`. Typical sizes: asphalt 3–4 m, paving stones 1.5–2 m,
concrete 2–3 m per image.

If a listed file is missing the game says so in the browser console and uses
the built-in texture (or goes without that one map); it never renders black.
Painted black-and-yellow kerbs keep their built-in paint; only plain grey kerbs
take the concrete texture.

`assets:check` warns above 3 MB per colour or normal image and above 2 MB per roughness or AO image, and flags a DirectX normal map by its name.

### Integrated interior and environment maps

Tiles074 is used in boutiques, Tiles075 in offices, Tiles076 in penthouses, and
Tiles078 in homes and restaurants. DaySkyHDRI026A and DaySkyHDRI030A provide
time-aware outdoor image-based lighting; IndoorEnvironmentHDRI020 is selected
only inside venues. Snow007A remains unused outside a suitable snowy setting.
The assets and ambientCG CC0 licence are recorded in `public/assets/CREDITS.md`.

## 4. Vehicles and buildings

### Danfo (slot ready)

- [ ] **File:** `public/assets/models/vehicles/danfo.glb` only when cleared
      for redistribution.
- [ ] **Manifest:** `"vehicles": { "danfo": { "url": "models/vehicles/danfo.glb", "length": 5, "rotateY": 0 } }`.
  - `length`: bumper to bumper in metres (2–20). The game rescales the model to it.
  - `rotateY`: 0, 90, 180 or 270. Use it if the model appears backwards or sideways.
  - The game puts the wheels on the road and centres the model in its parking spot.
- Requirements:
  - static (no rig);
  - ✓ under **40,000 triangles** (aim for 10,000–25,000);
  - ✓ textures 2048 or smaller;
  - ✓ no Draco;
  - ideally one material.
- Where to look:
  - Sketchfab (*Downloadable*, licence CC-BY/CC0), searching "danfo", "Lagos bus" and "Volkswagen T3 van" (the classic danfo base vehicle). Repaint it yellow with the two black stripes.
  - Fab.com: check the licence; non-redistributable files must stay outside
    `public/` and must not be listed in the production manifest.

### Marina Motors (temporary procedural vehicle models)

The dealership catalogue currently uses low-poly procedural vehicle shapes
with different body silhouettes and saved paint colours. They are explicitly
labelled as temporary previews; the game does not contain production-quality
car models yet.

The supplied Downloads were inspected without importing them into the game:

- `GLTF.rar` contains `GLTF/1.glb` (263,104,868 bytes after extraction), with
  195 meshes and 71 materials. Its model parts have generic names and the
  archive contains no licence or provenance document; it is also far beyond
  the game's recommended runtime asset budget.
- `texture.rar` contains motorcycle-part texture maps (fairings, handlebars,
  wheels and related parts), not a compatible car model.
- `Final_3Ds+Max+2021_Vray.rar` contains an Acura 3ds Max scene and a single
  `Main Body.obj` mesh, but no car-ready glTF, material library or licence file.
- `FBX.rar` contains an anonymous 240 MB FBX and baked maps, but no licence
  document. `CGT_Free_Pack.zip` has no car or vehicle model entries.

None of these files is imported or redistributed by this change. To replace
the placeholders, provide a car-ready, licensed glTF for the catalogue (or
distinct compatible variants), ideally under 40,000 triangles, 2K textures,
and 15 MB per model after optimization. Record its source and licence in
`public/assets/CREDITS.md`, then register it through the vehicle asset manifest.

### Buildings (no slot yet)

The 17 buildings are procedural and their footprints drive collision and
layout (`BUILDINGS` in `src/lib/world.ts`). Replacing them needs code that
places a model per footprint and keeps collision correct. That is planned
as a separate step, so **don't download buildings yet**. When ready, the
requirements will be:

- per building: under 50,000 triangles, 2048 or smaller texture atlas, baked AO, front facing +Z;
- or a modular kit (walls, windows, shopfronts, balconies) assembled to each footprint, which reuses textures and is much cheaper to render;
- CC0 kits (Kenney "City Kit", Quaternius) are stylised, not photoreal, and would only be a stopgap.

Near‑photoreal African street architecture is unlikely to exist as free
downloads. Expect to commission it or use photogrammetry, which is a budget
decision for you.

### Shoes and garment models (not yet installed)

The fashion catalogue currently has **no real garment GLB files**. Its shoe
preview is procedural placeholder geometry, and the garment model registry
must stay empty until compatible, licensed files are actually present. Do not
add placeholder paths or generated meshes to the registry as if they were
finished products.

For each shoe model:

- Save the optimised file under `public/assets/clothing/shoes/` and register
  its path in `src/lib/fashion.ts`.
- Use CC0 or CC-BY assets that may be redistributed in this public repository;
  add the source URL, asset ID and exact licence to `public/assets/CREDITS.md`.
- Keep the GLB below 30,000 triangles with textures no larger than 2048 px.
- Match the shoe pair's scale, orientation and placement to the Rocketbox feet.
  Bone attachment alone does not make a shoe fitted or rigged; inspect walking
  and sitting in-game before calling it complete.
- Rigged garments must use a compatible skeleton. Runtime retargeting is not
  implemented; incompatible skinned models must not be attached as props.

## 5. Optimise, check, test

```powershell
# 1. Shrink a model (meshopt + WebP textures, max 2048 px). The input is left untouched.
npm.cmd run assets:optimize -- C:\Downloads\danfo.glb public\assets\models\vehicles\danfo.glb

# 2. List it in public\assets\manifest.json, then:
npm.cmd run assets:check

# 3. Look at it
npm.cmd run dev        # then open http://localhost:5173
```

`assets:check` reports, per file:

- missing files and oversized files;
- triangle counts over budget;
- textures over 2048 px;
- Draco compression (unsupported);
- for the avatar, missing Idle/Walk/Run clips and a missing skeleton.

Anything that fails to load falls back to the built-in version, so the game
always starts.

## 6. Record the licence

Add a row per file to `public/assets/CREDITS.md`:

| File | Source and asset ID | Licence | Notes |
|---|---|---|---|
| `textures/road/color.jpg` | ambientCG, *ID you chose* | CC0 | |
