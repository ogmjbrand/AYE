# AYE asset acquisition checklist

**Status (October 2026): section 1 (player character with Idle/Walk/Run) is installed from Microsoft Rocketbox. Nothing from sections 3–4 has been downloaded yet.**
The game currently runs on procedural textures, procedural buildings and
vehicles. The player character is a Microsoft Rocketbox avatar (MIT, realistic
proportions and photo-sourced textures, but a ~6.7k-triangle mesh from the 2010s;
see `public/assets/CREDITS.md`). Every slot in
`public/assets/manifest.json` is `null`.

Live metadata for some sources is reachable, but obtaining model files can
require authorized account access. No compatible, redistribution-ready shoe
model has been downloaded or verified in this project. Names below are search
terms and selection criteria, not file names. Record each selected asset's
real ID and exact licence in `public/assets/CREDITS.md`.

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
| Mixamo, Fab "Standard licence", Sketchfab "Standard/Editorial", paid packs, MetaHuman exports | `public/assets/private/…` | **No** (git-ignored) |

Files in `public/assets/private/` load in the game on your laptop like any
other asset; they just never leave your machine. Keep your own backup.

Paths in `manifest.json` are relative to `public/assets/`, so a private file
is listed as `"private/characters/player.glb"`.

---

## 1. Detailed human character (GLB)

- [ ] **File:** `public/assets/private/characters/player.glb`
      (or `public/assets/models/characters/player.glb` if CC0/CC-BY).
- [ ] **Manifest:** `"avatar": { "url": "private/characters/player.glb", "height": 1.78 }`.
      `height` is the standing height in metres; allowed range 1.2–2.3.

**Where to get one**

| Source | Realism | Licence notes |
|---|---|---|
| Mixamo (mixamo.com, free Adobe account) | Medium | Free for games; files may not be redistributed, so use `private/`. |
| Reallusion Character Creator 4 + ActorCore (paid) | High; good African skin, hair and clothing options | Game export needs the right Reallusion export licence. Check before buying. Use `private/`. |
| MetaHuman (Epic) | Highest | Epic's licence terms changed in 2025. Read the current MetaHuman EULA about use outside Unreal before exporting. Raw exports are far too heavy and need heavy reduction (below). Use `private/`. |
| Sketchfab, filtered by *Downloadable* and *CC-BY* or *CC0*, searching "rigged African man" or "rigged character PBR" | Varies | CC-BY needs credit. Check that it is actually rigged. |

**Technical requirements (`assets:check` tests the ones marked ✓)**

- ✓ Rigged: one skinned mesh with a skeleton. A static statue won't animate.
- ✓ Under **80,000 triangles**; aim for 30,000–60,000 on Intel integrated graphics.
- ✓ Textures **2048 px or smaller** (1024 is fine for clothing). Use PBR metal/roughness, not specular/gloss.
- ✓ **No Draco compression** (the game's loader uses meshopt). `npm run assets:optimize` produces the right format.
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
frame rate on integrated graphics. You need three images per surface:

| Map | ambientCG file contains | Poly Haven map name | Save as |
|---|---|---|---|
| Colour | `_Color` | `diff` | `color.jpg` |
| Normal | `_NormalGL` (**not** NormalDX) | `nor_gl` | `normal.jpg` |
| Roughness | `_Roughness` | `rough` | `roughness.jpg` |

| Slot | Search for | Folder | Used on |
|---|---|---|---|
| [ ] `road` | "Asphalt": worn, fine aggregate, no painted lines | `textures/road/` | Boulevard and cross street |
| [ ] `pavement` | "PavingStones": interlocking concrete pavers, as on Lagos pavements | `textures/pavement/` | Raised pavements |
| [ ] `concrete` | "Concrete": plain, lightly stained | `textures/concrete/` | Balcony slabs and ledges (small areas) |
| [ ] `ground` (optional) | "Ground" / "Dirt": red laterite soil looks right for Lagos | `textures/ground/` | Unpaved ground |
| [ ] `roof` (optional) | "Concrete" or "Roofing" | `textures/roof/` | Flat roofs |

Manifest entry (repeat per slot). `tileMeters` is the real-world width one
image covers; the asset page lists it:

```json
"road": {
  "color": "textures/road/color.jpg",
  "normal": "textures/road/normal.jpg",
  "roughness": "textures/road/roughness.jpg",
  "tileMeters": 3
}
```

`assets:check` warns above 3 MB per colour or normal image and above 2 MB per roughness image.

## 4. Vehicles and buildings

### Danfo (slot ready)

- [ ] **File:** `public/assets/models/vehicles/danfo.glb` (CC0/CC-BY) or `public/assets/private/vehicles/danfo.glb`.
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
  - Fab.com: check the licence; "Standard" goes in `private/`.

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
