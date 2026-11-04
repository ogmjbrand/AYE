# Animation pipeline

How motion gets onto AYE's people, what plays today, and how to add captured
motion from RGB MoCap. Nothing here migrates the game: it stays Vite +
three.js, and every clip ends up in the same files the game already loads.

## The rig and the files (audited)

- **Skeleton:** every built-in person (`public/assets/models/characters/rocketbox/*.glb`)
  is a Microsoft Rocketbox avatar on the 3ds Max **Biped** skeleton:
  - 80 joints: `Bip01 Pelvis`, `Bip01 Spine`… `Bip01 L Thigh`, `Bip01 R Finger42`, plus face bones;
  - binding is verified in `src/lib/characterRig.ts`;
  - the bind pose is an A-pose, with the arms about 37° below level.
- **Clips in each person's file:** `Idle`, `Walk` and `Run`.
- **Shared clips:** in `gestures-feminine.glb` and `gestures-masculine.glb`. These are
  skeleton-only files whose nodes are named like the bones, and three.js binds
  their clips by name:
  - Talk, Listen, Wave, Sit, SitDown, StandUp, TurnLeft, TurnRight and WalkStop;
  - added this round: **Stretch**, **PhoneText** and **Drink**.
- **The registry:** `src/lib/animationLibrary.ts` lists every activity, the
  clip or code that plays it, and the gaps. Its test opens the GLBs and fails
  if a named clip is missing from any file.
- **Playback:**
  - `components/Avatar.tsx` picks idle, walk or run from speed, with the rate
    matched to ground speed;
  - it steps round on turns, plays the stop clip, and handles sitting
    transitions (`lib/seating.ts`) and gestures;
  - eating and hugging are posed in code, and so is the bed (`lib/bedSleep.ts`);
  - player activities are set through `Avatar`'s `activity` prop: a looped clip
    plays while the activity lasts, and a one-shot ends by itself so the body
    never falls into its bind pose.

## What plays today, and what's missing

| Activity | Source | In the game |
|---|---|---|
| Idle and breathing | Rocketbox `Idle` | Standing |
| Walk, run, turns, stopping | Rocketbox clips | Moving |
| Sit down, sit, stand up | Rocketbox clips | Chairs, sofas, benches, bed edges |
| Talk, listen, wave | Rocketbox clips | Residents |
| **Morning stretch** | Rocketbox `idle_stretch_arms_01` | Getting up from bed (new) |
| **Texting** | Rocketbox `cell_phone_textmessage` | While your phone is open (new) |
| **Drinking** | Rocketbox `drink_drinking` | Hotel vending machine (new) |
| Getting into bed, sleeping | Posed in code | Bed timeline |
| Eating, hugging | Posed in code | Meals, friends |
| Changing clothes | **Missing** | Wardrobe Confirm |
| Showering | **Missing** | The shower |
| Lying down, getting out of bed, sleep breathing | **Missing** | Would replace the posed bed timeline |
| Picking up, typing | **Missing** | Counters, office desks |

The Rocketbox library has no bed, dressing, showering or picking-up clips: its
471 animation files were searched. Those are what a capture needs to supply.
`WANTED` in `src/lib/animationLibrary.ts` lists each one with its name,
length, whether it loops, and where it hooks in.

## Adding Rocketbox clips (any machine)

The clips are MIT-licensed and free to ship; credits go in `public/assets/CREDITS.md`.

```sh
# Only the clips you need, from github.com/microsoft/Microsoft-Rocketbox (sparse checkout)
node scripts/rocketbox/add-gestures.mjs public/assets/models/characters/rocketbox/gestures-feminine.glb out.raw.glb Name=f_<clip>.max.fbx
npm run assets:optimize -- out.raw.glb public/assets/models/characters/rocketbox/gestures-feminine.glb
```

Repeat for `masculine` with the `m_` clip. Then:
1. Add the name to `ActivityClip` and to `MOTIONS` in `animationLibrary.ts`.
2. Run `npx vitest run src/lib/animationLibrary.test.ts`.

## Captured motion with RGB MoCap (needs a Windows PC)

[RGB MoCap](https://github.com/toyxyz/toyxyz_RGBMocap) is a native Windows app
that turns video into skeleton animation.

### Requirements

- 64-bit Windows, an NVIDIA GPU and OpenGL 4.3.
- CUDA 12.8 and the Visual Studio C++ tools for some models.

It can't run in the browser or in this cloud workspace, so it was **not**
installed here.

### Licences: read before using a capture in the game

| Part | Licence |
|---|---|
| The app | MIT |
| GVHMR, ExMR, PromptHMR, MAMMA, VGGT and the SMPL / SMPL-X / SMPL-H body models | Research or non-commercial only |
| FlowHMR's source | Apache-2.0, but its body model (SMPL-H) is still registered, non-commercial data |

- **Rights:** a motion reconstructed with these models may not be cleared for a
  commercial game. Get written clearance for the model and body-data terms you
  used, or use captures you have the rights to, before shipping one.
- **Credits:** record the model and terms for each clip in `CREDITS.md`.

### Steps (on the Windows PC)

1. **Install:** follow the repository's README and `docs/AGENT_GUIDE.md`
   (`install.cmd`, then the Model Manager for the model you choose). Review
   each script before you run it.
2. **Record:** film the action plainly, one person in full view. Use a steady
   camera, good light, and the whole body in frame.
3. **Reconstruct:** process the video, then check the feet and hands; contact
   correction reduces sliding.
4. **Export:** **File > Export… > BVH**, with:
   - profile **Generic / Blender** (not 3ds Max Biped: that renames the joints);
   - **Add T-pose before motion** ticked;
   - one person per file.
5. Copy the `.bvh` to the development machine.

### On the development machine (any OS)

```sh
npm run anim:bvh -- capture.bvh ChangeClothes feminine out.raw.glb
npm run assets:optimize -- out.raw.glb public/assets/models/characters/rocketbox/gestures-feminine.glb
```

Then:
1. Do the same for `masculine`.
2. Add the clip name to `ActivityClip` (and `ONE_SHOT` if it plays once) and
   to `MOTIONS`.
3. Set it where the activity happens (e.g. `playOnce('ChangeClothes', 5)` on
   wardrobe Confirm).
4. Run the tests and look at it in the game.

### What the converter does

`scripts/animation/bvh-to-rocketbox.mjs`:

1. **Maps the joints:** the 52 generic joints (`Hips`, `Spine`…, `LeftForeArm`,
   `LeftHandIndex1`…) go to the Biped's (`Bip01 Pelvis`…, `Bip01 L Forearm`,
   `Bip01 L Finger1`…). All 52 targets are checked to exist.
2. **Calibrates on the T-pose frame:** the Rocketbox binds in an A-pose, so
   each limb and spine bone is first swung to lie along the capture's
   T-pose.
3. **Carries the motion:** each bone's motion is its rotation away from the
   T-pose (a world-space delta), turned into the Biped's frame. That handles
   the two rigs' different bone axes, which copying rotations would not.
4. **Moves the hips:** their travel is scaled by leg length and held on the
   spot horizontally, as AYE's clips are (`--keep-travel` keeps it).
5. **Writes the clip:** it goes into a copy of the gestures file, with flat
   bone-named nodes like the existing clips.

**Verified** (`src/lib/bvhRetarget.test.ts`, and a command-line run on a
31-frame fixture):
- frame 0 puts the Biped in a level-armed T-pose with straight legs;
- a 90° forearm bend points the forearm up the body;
- the other arm stays put relative to the hips;
- a hip drop carries over, with no horizontal travel;
- the written file loads in three.js with tracks named like the game's.

**Not verified:** a real RGB MoCap capture on a character in the game, because
none exists yet. Check the first one by eye for twist on the forearms and
fingers: the calibration corrects each bone's direction, not its roll.

## Mobile and bundle rules

- Capture, reconstruction and retargeting all run offline. The browser only
  plays finished clips.
- Source videos, BVH files, RGB MoCap, its models and any `*.raw.glb` stay out
  of the repo. Only the optimised gesture files ship, and `npm run check:push`
  refuses large files.
- **File sizes:** each clip adds roughly 80–150 KB to a gestures file after
  optimisation. This round's three clips added 250 KB (feminine) and 360 KB
  (masculine).
- **Loading:** the gestures load in the background after the person is on
  screen.
