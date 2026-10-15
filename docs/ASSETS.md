# Adding real assets to AYE

The game runs with built-in procedural textures and a placeholder character.
You can swap in real, properly licensed files without changing any code:
put them in `public/assets/`, list them in `public/assets/manifest.json`,
then check them.

```
npm.cmd run assets:check
npm.cmd run dev
```

Anything not listed (or that fails to load) falls back to the built-in version,
so the game always starts.

**Start with [ASSET_CHECKLIST.md](ASSET_CHECKLIST.md)**: exact slots, folders,
file names, budgets and licence rules, including the `concrete` surface, the
`danfo` vehicle model and the git-ignored `public/assets/private/` folder for
files that may not be shared publicly. Shrink models first with
`npm.cmd run assets:optimize -- input.glb output.glb`.

## 1. Road, pavement, ground and roof textures

Good free sources with CC0 licences (no attribution needed, commercial use allowed):

- ambientCG — https://ambientcg.com (search "Asphalt", "PavingStones", "Ground", "Concrete")
- Poly Haven — https://polyhaven.com/textures

Download the **1K JPG** version (2K at most; larger hurts integrated graphics).
From the zip you need three images: Color, NormalGL (not NormalDX) and Roughness.
Put them in a folder per surface, for example:

```
public/assets/textures/road/color.jpg
public/assets/textures/road/normal.jpg
public/assets/textures/road/roughness.jpg
```

Then list them in `public/assets/manifest.json`. `tileMeters` is how many
metres one copy of the image covers on the ground (ambientCG pages show the
real-world size; asphalt is usually 2–4 m):

```json
{
  "surfaces": {
    "road": {
      "color": "textures/road/color.jpg",
      "normal": "textures/road/normal.jpg",
      "roughness": "textures/road/roughness.jpg",
      "tileMeters": 3
    },
    "pavement": null,
    "ground": null,
    "roof": null
  },
  "avatar": null
}
```

Surfaces you can replace: `road`, `pavement`, `ground`, `roof`, `concrete`.

## 2. The player character

The character must be a **rigged** (skinned) `.glb` with animations whose names
contain `idle`, `walk` and `run`. Sources:

- Mixamo — https://www.mixamo.com (free with an Adobe account). Pick a
  character, download it with an Idle, a Walking and a Running animation
  ("In Place" ticked), as FBX. Mixamo's licence allows use in your game but
  not reselling or sharing the files on their own.
- Fab — https://www.fab.com (Epic's store; free and paid characters; check
  each asset's licence allows use outside Unreal).
- Reallusion Character Creator (paid) exports game-ready rigged characters.

Convert FBX to GLB with Blender (free): File → Import → FBX, then
File → Export → glTF 2.0, format "glTF Binary (.glb)", with Animation ticked.
Rename the actions in Blender's Action Editor to Idle, Walk and Run if needed.

Aim for under 80,000 triangles and 2K textures. Put the file in
`public/assets/models/` and list it:

```json
"avatar": { "url": "models/my-character.glb", "height": 1.8 }
```

`height` is the standing height in metres the model is scaled to.

## 3. Check and test

```
npm.cmd run assets:check
npm.cmd run dev
```

`assets:check` reports missing files, oversized images, missing animations
and very heavy models. Then open http://localhost:5173 on your laptop.

## Licences

Record every third-party file you add in `public/assets/CREDITS.md`
(file, source, licence). Don't add files whose licence you can't confirm.
The GitHub repository is public: anything committed there can be downloaded
by anyone, so only commit files whose licence allows redistribution
(CC0 textures are fine; check paid assets' terms first).
