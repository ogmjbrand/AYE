# AYE characters: pipeline, registry, variety and QA

This is the current reference for human characters in AYE. It replaces
`CHARACTER_PIPELINE.md`, which is kept as the history of earlier decisions.
Every number below was measured from the files in the repository on
2026-10-29, by the scripts named next to it. None was typed in by hand.

## 1. What exists today

| | Count | Where | Licence |
|---|---|---|---|
| Rocketbox base models (real, rigged, textured people) | **20** | `public/assets/models/characters/rocketbox/*.glb` | MIT, Microsoft (`ROCKETBOX-LICENSE.md`); can be published |
| Shared gesture files (Talk, Listen, Wave, Sit, SitDown, StandUp) | 2 | `gestures-feminine.glb`, `gestures-masculine.glb` | MIT, Microsoft |
| 3D hairstyles that can be worn on a model | 4 | head-bone attached GLBs | CC0 (MakeHuman), see `public/assets/CREDITS.md` |
| Character Creator 5 player body | 1 | `public/assets/private/characters/cc5/` (git-ignored) | Your CC5 export; **never** committed or published |

Of the 20 Rocketbox people, 12 are everyday adults (6 women, 6 men), 2 are
business people, 2 medics, 2 pilots, 1 construction worker and 1 police
officer. Each one is a different person with a different face. The game has
**20 faces**. It does not have hundreds of unique characters.

The variety described in section 5 comes from clothing, hair colour, skin
tone, body shape and the 3D hairstyles. Those are applied to the same 20
bodies. A crowd of 50 residents will contain repeated faces in different
clothes.

The CC5 character is the player's body only on a machine that has built it
(section 3). Everywhere else the player is a Rocketbox person: on Vercel, in a
fresh clone, and in this cloud session.

## 2. Registry and validation

- **`src/lib/characterRegistry.ts`**: one entry per body. Each entry records:
  - source and file;
  - rig family (`rocketbox-biped` or `cc5-cc-base`);
  - clips, and which gesture files fit its skeleton;
  - hair and outfit;
  - triangles, materials, textures and maximum texture size;
  - LODs;
  - licence and whether the files can be published;
  - what can genuinely be customised;
  - status (`available`, `not-built` or `missing`).
- **`src/lib/characterAssets.json`**: the measured part of the registry. It is
  generated, never edited by hand.
- **`npm run check:characters`** (`scripts/check-characters.mjs`) opens every
  model and reports:
  - size, triangles, materials, textures, largest texture and bones;
  - its own clips;
  - whether each gesture file fits it. A gesture file fits when every node
    its clips animate exists in the model.

  It also lists any private CC5 builds present. Options:
  - `--json` prints the report as JSON.
  - `--write` regenerates `characterAssets.json`. This covers public models
    only, so private data never reaches the repository.

  It exits non-zero if any model has a problem.
- **`src/lib/characterRegistry.test.ts`** checks:
  - every look the game uses is registered, once each;
  - every registered file is on disk;
  - every body has Idle, Walk and Run plus a gesture file;
  - licences are filled in;
  - the CC5 body is marked non-redistributable and lives under `private/`;
  - no body offers face shaping.

## 3. Importing a Character Creator 5 character

The pipeline is `scripts/cc5/build.mjs` together with
`scripts/cc5/convert_cc5.py`. The pipeline runs Blender in the background and
does not need Character Creator to be open.

### Checklist

1. **In Character Creator 5**, export the character as **FBX**, with its
   textures, to one folder. The pipeline reads three things from that folder:
   - `HUMAN.fbx` (required);
   - `HUMAN.json`, the material sidecar CC writes alongside the FBX
     (required);
   - `textures/` (optional, but without it the roughness, AO and opacity maps
     are missing, and the build warns about it).

   The build stops if `HUMAN.fbx` or `HUMAN.json` is missing.
2. **Install Blender 4.2 or newer.** The build finds it through the `BLENDER`
   environment variable, or under
   `C:/Program Files/Blender Foundation/*/blender.exe`.
3. **Run the build:**
   ```
   node scripts/cc5/build.mjs <export folder>
   ```
   If no folder is given, it uses `CC5_SOURCE_DIR`, or else your
   `OneDrive\Documents` folder. Pass `--reuse-raw` to skip the FBX import when
   only the conversion step changed.
4. **What the conversion does:**
   - drops scene props;
   - rebuilds the PBR materials from `HUMAN.json`;
   - turns the character to face the same way as the Rocketbox looks;
   - applies the 0.01 scale;
   - retargets the Rocketbox Idle, Walk and Run clips, and the Talk, Listen,
     Wave and Sit gestures, to the CC skeleton;
   - writes two detail levels.
5. **Outputs:**
   - in `public/assets/private/characters/cc5/`: `aaron.glb` (full),
     `aaron-lite.glb` (lower detail) and `aaron.json` (info the game reads at
     start-up);
   - in `assets-src/cc5/`: raw intermediates.

   Both folders are git-ignored.
6. **Check the result:** run `npm run check:characters`, which lists the
   private build; then start the game with `npm run dev`. The player uses the
   CC5 body whenever `aaron.json` is present.
7. **Keep it out of git.** Run `npm run check:push` before every push
   (section 4).

### What the CC5 body supports in game

Supported:
- skin tone;
- hair colour;
- height;
- clothing colours, set by material.

Not supported:
- bone-based body shaping, which is tuned for the Rocketbox skeleton;
- the separate 3D hairstyles;
- face shaping. No model in the game has the morph targets that face shaping
  needs.

The creation screen offers only the options that work on the body in use.

### Licence warning

If the CC5 export was made with a **trial** licence, check Reallusion's terms
before shipping it in a public game. Trial exports may not be licensed for
distribution. This is why the CC5 build is treated as private.

## 4. Asset storage policy (git)

**Tracked in git:**
- source code and the pipeline scripts;
- the 20 Rocketbox GLBs (0.5–3 MB each, MIT);
- the gesture files;
- props and other licensed assets listed in `public/assets/CREDITS.md`.

**Never tracked (enforced by `.gitignore` and `npm run check:push`):**
- `public/assets/private/*`, except its README;
- `assets-src/cc5/*.glb`, `*.blend`, `*.log` and `*-report.json`;
- `/$dest/`, a folder created by mistake when a script variable was left
  unexpanded;
- `.env` files.

**Push guard:** `npm run check:push` checks every file in every commit about
to be pushed (`@{u}..HEAD`, or a range you pass in):
- it refuses any file over 100 MB, which GitHub would reject;
- it warns about any file over 50 MB;
- it refuses any path in the never-commit list.

Run it before `git push`.

**If a large file was already committed**, as with the `$dest` folder in
commit 98a1208 on your PC:
- Do not force-push, and do not rewrite history that has already been pushed.
- If the commit has **not** been pushed, the safe way out is to start from the
  remote branch and bring the work back without the folder:
  1. `git branch backup-before-fix` (keeps everything).
  2. `git reset --soft origin/<branch>` (keeps all changes, staged).
  3. `git rm -r --cached '$dest'` (unstages the folder but leaves it on disk).
  4. Commit again, then run `npm run check:push` and push.
- If the commit has already been pushed, ask before doing anything. Removing
  it means rewriting shared history.

  Commit 98a1208 and the `$dest` folder are not in the GitHub repository. No
  file over 20 MB exists on any branch there.

**Large private assets for collaborators:** don't use git, and don't use Git
LFS for the CC5 build, because it can't be published. Each collaborator who
has the CC5 source exports it and runs the build on their own machine.
Everyone else gets the Rocketbox fallback automatically. If shared large
assets are needed later, put them in external storage the team controls (a
private Drive or Blob store), with a checksum file in the repository. Add LFS
only for redistributable files.

**Production builds:** `vite.config.ts` (`keepPrivateAssetsOut`) deletes
`dist/assets/private/*`, except the README, after every build. Private assets
therefore can't ship even on a machine that has them. Set
`AYE_INCLUDE_PRIVATE=1` only for a local preview build.

## 5. Variation: archetypes and the resident generator

`src/lib/archetypes.ts` defines 23 archetypes. Each one names the base models
that can play it, the outfit pool it draws from, and whether a real uniform
exists. The same identity always produces the same person:
`personFor(identity, archetypeId)` is deterministic. The choices of model,
outfit, tone, shape and hairstyle are made independently, each from its own
hash.

For one body, the resident generator (`src/lib/npcFashion.ts`,
`appearanceCount`) can produce:
- 720 casual outfits;
- 6 resident skin tones;
- 6 body shapes;
- 4 hairstyles (women only).

That gives **103,680** appearances per feminine body and **25,920** per
masculine one.

The table counts possible appearances for each archetype: dress and colour,
summed over the base models it may use. "Models" is the number of faces.

| Archetype | Models | Appearances | Real uniform | Missing for a faithful version |
|---|---:|---:|:-:|---|
| Everyday resident | 12 | 777,600 | – | |
| Student | 12 | 777,600 | – | |
| Teacher | 14 | 907,200 | – | |
| Entrepreneur | 2 | 43,200 | yes | |
| Office worker | 2 | 43,200 | yes | |
| Doctor | 2 | 9,720 | yes | |
| Nurse | 2 | 9,720 | yes | |
| Police officer | 1 | 8,640 | yes | a policewoman model |
| Military | 12 | 777,600 | – | military uniform models |
| Firefighter | 12 | 259,200 | – | turnout gear models |
| Construction worker | 1 | 8,640 | yes | a woman in workwear |
| Engineer | 3 | 51,840 | yes | |
| Pilot | 2 | 43,200 | yes | |
| Driver | 12 | 259,200 | – | |
| Chef | 12 | 259,200 | – | chef whites models |
| Retail worker | 12 | 259,200 | – | |
| Fashion model | 12 | 648,000 | – | |
| Musician | 12 | 648,000 | – | |
| Content creator | 12 | 648,000 | – | |
| Athlete | 12 | 97,200 | – | sportswear models |
| Security | 7 | 60,480 | – | a security uniform |
| Tourist | 12 | 777,600 | – | |
| Luxury lifestyle | 14 | 302,400 | – | |

"Real uniform" means the model itself wears that uniform. Where there is
none, the archetype uses everyday people in the matching outfit pool, and the
lab says so. Firefighters, soldiers, chefs, athletes and security guards are
therefore **not** in uniform yet.

## 6. Character lab (demo scene)

Run `npm run dev` and open `/characters.html`. The page is for development
only and is not linked from the game. It provides:
- an archetype picker;
- a count of 4, 8, 12 or 20 people;
- **Regenerate**, which moves to a new seed;
- tap a person to see their base model, hair, clothes, skin tone, body shape
  and licence.

The bottom line shows the renderer's own counters (draw calls, triangles,
textures, shader programs), so the cost of a crowd is measured, not
estimated. A crowd can be reproduced from the URL:
`/characters.html?archetype=doctor&count=20&seed=7`.

## 7. Player customisation (creation screen)

- **Touch:** drag to rotate and pinch to zoom.
- **Views:** the Front, Side and Back buttons turn the preview to that view.
  Dragging hands control back to you.
- **Edits:** presets and randomise.
- **Undo:** up to 50 steps. Name typing isn't recorded.
- **Reset:** returns to the starting look but keeps the name. Reset can
  itself be undone.
- **Saving:** the character is saved on confirm. Editing it later goes
  through the same screen.
- **Options:** only those the current body supports are shown. Face shaping
  is not offered, because no model has the morph targets for it.

## 8. QA report (measured)

**Models.** All 20 Rocketbox people pass `check:characters`:
- 6,434–9,376 triangles each;
- 2–4 materials;
- 6–8 textures, with a largest texture of 2048 px;
- 80 bones (81 on `pilot-male-01`);
- Idle, Walk and Run clips;
- both gesture files fit every skeleton, including the sit-down and
  stand-up clips added for getting into and out of bed.

The gesture clip lengths are:

| Gesture file | Talk | Listen | Wave | Sit |
|---|---|---|---|---|
| Feminine | 27.3 s | 21.4 s | 5.5 s | 33.2 s |
| Masculine | 35.5 s | 32.5 s | 2.8 s | 36.1 s |

**Variety.** Measured by the tests:
- every one of the 720 casual outfits is reachable from 20,000 identities;
- all six resident tones occur;
- the counts in section 5 multiply out.

**Animation.** Locomotion runs on each model's own skeleton. Talk, Listen,
Wave, Sit, SitDown and StandUp come from the shared gesture files.

Going to bed (`src/lib/bedSleep.ts`) uses them in sequence:
1. turn your back to the bed;
2. sit down onto its edge (the motion-captured sit-down);
3. tip over onto your side;
4. pull the duvet up.

Getting up plays the same movement in reverse, ending with the
motion-captured stand-up. The CC5 body has its own
retargeted copies of those clips, plus a hug built at run time.

**Performance.** Each person is about 6.4k–9.4k triangles, and each material
costs at least one draw call. A crowd of 20 is therefore roughly 130k–190k
triangles and 50–80 draw calls. Read the exact figures from the lab's
counter on the device you are testing. On phones, textures are scaled to
1024 px when they are uploaded.

**Known defects and gaps:**
- **No LOD for Rocketbox people.** Every model has a single detail level;
  only the CC5 body has a lite version.
- **3D hairstyles can clip** with the model's own modelled hair on some
  women.
- **T-pose seen once in the lab** after switching from 8 to 20 people. It
  could not be reproduced in controlled tests, so it remains open.
- **No face shaping.** None of the models have morph targets for it.
- **Missing uniforms.** There are no models for firefighter, military, chef,
  athlete or security uniforms. There is no policewoman, and no woman in
  workwear.
- **Uploaded models are not yet in the game.** Their licences are unverified,
  so they stay out of `public/` until each source and licence is confirmed.
