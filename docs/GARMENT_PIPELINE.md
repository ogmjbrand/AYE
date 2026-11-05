# Garment pipeline: from a photo to a garment people wear in the game

This is how a garment in a reference photo becomes a real 3D garment on AYE's
people, and what the first one (the tangerine pencil dress) does and doesn't
do yet. Everything heavy runs offline. The browser only loads a small skinned
GLB per person.

## Choice of tools (audited before building)

| Project | What it gives | Licence | Used? |
|---|---|---|---|
| **GarmentCode** | Parametric sewing patterns (bodice, sleeves, collars, skirts, trousers) and a box-mesh layout with the true sewn edge lengths | MIT | **Yes**: patterns and box meshes |
| GarmentCode's simulator (NVIDIA Warp fork) | Its cloth drape | NVIDIA Source Code License: "non-commercially… research or evaluation purposes only" (§3.3) | **No**: not cleared for a commercial game. We drape with our own solver instead. |
| GarVerseLOD, ReMu | Garment reconstruction from images, using learned models | Research or non-commercial terms, and they need a GPU | No |
| Clothware | Garment assets and tools | Checked; not needed for this round | No |
| Blender (`bpy` 4.2) | glTF import and export, weight transfer, preview renders | GPL tool; what you make with it is yours | Yes |

## The pipeline

1. **Pattern** (`scripts/garments/make-pattern.py`, Python 3.9, GarmentCode on the path):
   - a design file (`scripts/garments/patterns/<garment>.json`) names the GarmentCode
     programs and only the measurements that differ from its defaults, and says what in the
     photo was and wasn't made;
   - it writes the pattern, a box mesh (panels laid round GarmentCode's body), the sewn edge
     lengths and which panel each vertex is on;
   - `--resolution 2.5` (2.5 cm cloth edges) gives about 2,200 vertices for a dress, light
     enough for phones.
2. **Plain copy of the person** (`scripts/garments/decompress-glb.mjs`): the game's GLB with
   its meshopt compression and quantisation removed, so Blender can read it.
3. **Sew, drape, weight, export** (`scripts/garments/drape-in-blender.py`, Blender's Python):
   - **placement:** the garment is placed with GarmentCode's body, sized by shoulder height,
     and turned to face the way the person faces (worked out from their foot and toe bones);
   - **sewing:** the garment is sewn and hung on GarmentCode's own body, which its panels are
     laid out for:
     - a position-based cloth solver (Gauss-Seidel by edge colour) with the true sewn lengths
       and static friction;
     - while it sews, panels close round the body more than they slide up or down it;
     - sleeves meet the arms, the bodice and skirt don't (as GarmentCode's simulator does);
   - **carry:** the sewn garment is moved onto the AYE body (each vertex follows its nearest
     body point, smoothed over the cloth) and settles there against the real body surface;
   - **fit:** with `--fit 0.86` the garment is cut 14% smaller round the body only, for a
     stretch fabric that hugs (the length and the hem stay put);
   - **smoothing and clearance:** a smoothing pass removes dents and keeps everything 1.2 cm
     off the body;
   - **inner layers:** the Rocketbox people are dressed meshes with inner layers (inside a
     collar or a cuff), so body surface facing into its nearest bone is ignored;
   - **weights:** copied from the body (nearest face, interpolated), four per vertex;
   - **skirt weights:** the skirt hangs from the pelvis and is shared between the thighs and
     calves across the middle (so a stride doesn't split it). Over each thigh the body's own
     weights are partly kept, so a seated lap doesn't show through;
   - **output:** a skinned GLB with the Bip01 skeleton, and a Cycles preview render.
4. **Optimise:** `npm run assets:optimize -- <raw.glb> <out.glb>` (meshopt): about 50 KB per
   person for the dress.
5. **Batch** (`scripts/garments/batch.mjs scripts/garments/jobs/<garment>.json <out dir>`):
   - steps 2–4 for every listed person, with a review sheet (`review.json`) and a preview
     render each;
   - nothing is written into `public/`: copy the files you've checked there and list them in
     the registry.
6. **In the game:**
   - `src/lib/garmentRegistry.ts` lists each garment: id, name, category, subcategory, the
     source photo (described, not shipped), the pattern, the per-person files, body, rig,
     colour, material, vertex count, layers, licence, status and known limits;
   - a shop item (`style.sewn`, `fashion.ts`) names its registry id;
   - `world/glbGarment.ts` loads the file and rebinds it to the person's own skeleton by bone
     name. Vertices move from the file's bind space to the person's, fitted on the bones' rest
     positions by rotation, scale and translation (Horn's method), and the fit is refused if
     the rest poses differ by more than 3% of the person's height;
   - it then plays every clip the person plays. Under the dress the person's legs show as
     dark opaque tights (the Rocketbox people have no bare legs).

## Tools to set up (any machine, no GPU)

- Python 3.9 venv: `pip install -e <GarmentCode>` (it needs `numpy<2`), and copy its
  `system.template.json` to `system.json`.
- Python 3.11 venv: `pip install bpy==4.2.0 scipy`.
- Point the job file at them with the `GC_OUT`, `GARMENTCODE` and `BPY_PYTHON` environment variables.

A drape takes about 45 s per person on 4 CPU cores.

## The first garment: tangerine pencil dress

**Source:** a supplied photo of a tangerine, short-sleeved, fitted pencil dress, mid-calf.
- **Brand marks:** none carried over. The photo's watermark and the bag (with its clasp)
  were not used. It's sold as "OGM Atelier sewn pencil dress · Tangerine" in the Office
  collection (3,600 GHAI).
- **Made:** the fitted bodice with short sleeves and a round neck, the fitted waist, and the
  midi pencil skirt.
- **Not made:** the cape with pearl trim and the flap pockets. GarmentCode has no cape or
  pocket pieces, and drawing new ones is the next step for this garment.

**Verified in the game, in full** (female-adult-08, 900 × 900 screenshots at high quality):
- standing, walking and running: the skirt moves as one piece and doesn't split round the
  legs;
- sitting down on a bench, seated, and standing up: the skirt follows the lap, with no body
  showing through in the frames checked;
- the drape itself: 0 of 2,247 cloth vertices inside the body, a median gap of 2.1 cm, the
  hem 0.34 m above the feet;
- no console errors.

**Other people (batch run on all nine feminine people, then checked in the game):**

| Result | People |
|---|---|
| Wear it (front and side checked in the game) | female-adult-08, female-adult-03, female-adult-04, female-adult-11, business-female-02, pilot-female-01 |
| Not shipped: their own long or bulky clothes deform the drape | female-adult-06 (long tunic, hijab), female-adult-10 (abaya, khimar), medical-female-02 (white coat) |

- **Hiding the body under the dress** (`world/glbGarment.ts` `hideUnder`): the person's own
  clothes can't show through it.
  - While the dress is worn, the body is drawn from its own triangle list without the
    triangles the dress covers: cloth within 7 cm along the skin's normal, on either side, and
    within 3 cm of straight out.
  - So skin below the hem, whose nearest cloth is above it, stays.
  - Taking the dress off restores the body.
  - This turned the blazer, the fitted tops and female-adult-11's clothes from showing
    through badly to clean.
- **Lumps:** over bulky clothes the dress follows them and looks a little lumpy.
- **Who wears it:** a person wears the dress only if their file is listed in the registry.
  Anyone else keeps the fabric restyle of their own top, as before.

**Limits, said plainly:**
- plain colour, no fabric texture;
- skinned, not simulated: the skirt follows the legs rather than swinging;
- not for the masculine bodies or the CC5 player body;
- the cape and the pockets are missing (see above).

## Adding the next garment

1. Write `scripts/garments/patterns/<garment>.json`: GarmentCode programs and the changed
   measurements, and what in the photo can't be made.
2. Run `make-pattern.py`, then `batch.mjs` with a job file.
3. Look at every preview and at `review.json`. Anything with vertices inside the body, or a
   preview that looks wrong, isn't copied.
4. Copy the reviewed GLBs to `public/assets/models/garments/sewn/<garment>/<look>.glb`, list
   them in `garmentRegistry.ts`, and add a shop item with `sewn3d(...)` in `fashion.ts`.
5. Run `npx vitest run src/lib/garmentRegistry.test.ts`, then check it in the game: walk,
   run and sit.
