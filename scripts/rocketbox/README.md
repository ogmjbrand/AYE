# Building a Rocketbox character

The built-in player character comes from the
[Microsoft Rocketbox Avatar Library](https://github.com/microsoft/Microsoft-Rocketbox)
(MIT licence: it may be redistributed, so it lives in the public repo).
These steps rebuild it, or build another avatar from the same library.

Tools: Node (this repo's devDependencies), Python 3 with Pillow
(`pip install pillow`) and FBX2glTF (`npm install fbx2gltf` in any scratch
folder gives you `node_modules/fbx2gltf/bin/<OS>/FBX2glTF`).

1. Download from the Rocketbox repository (raw files):
   - `Assets/Avatars/Adults/<Avatar>/Export/<Avatar>.fbx`
   - its six textures from `Assets/Avatars/Adults/<Avatar>/Textures/`
     (`<id>_body_color|normal|specular.tga`, `<id>_head_color|normal|specular.tga`;
     the `<id>`, e.g. `m007`, is in the FBX)
   - three animations for the same sex, e.g.
     `Assets/Animations/all_animations_max_motextr_static/m_idle_neutral_01.max.fbx`,
     `Assets/Animations/all_animations_max_motextr_xy/m_walk_neutral_01.max.fbx`,
     `Assets/Animations/all_animations_max_motextr_xy/m_run_neutral_01.max.fbx`
     (female clips start `f_`)
2. Convert each FBX: `FBX2glTF --binary --input <file>.fbx --output <name>`
3. Textures: `python scripts/rocketbox/convert-textures.py <TexturesDir> <outDir> <id> 2048 1024`
4. Assemble: `node scripts/rocketbox/build-avatar.mjs avatar.glb idle.glb walk.glb run.glb <outDir> built.glb`
5. Shrink: `npm run assets:optimize -- built.glb public/assets/models/characters/<name>.glb 2048`
6. Garment maps (for the boutique and wardrobe):
   `node scripts/rocketbox/garment-masks.mjs built.glb <outDir> public/assets/models/characters/rocketbox/masks <look-id>`.
   Check the result by eye: the body map should be red on the top, green on
   the bottom, blue on the shoes and black on skin; the head map red on hair
   and headwear only. Garments close to the person's skin colour (beige,
   khaki on lighter skin) restyle only partly.
7. Portrait for the look picker: `public/assets/models/characters/rocketbox/thumbs/<look-id>.webp` (192 px, rendered from the model).
8. Point `DEFAULT_AVATAR` in `src/components/Avatar.tsx` (or `avatar` in
   `public/assets/manifest.json`) at it. Measure the clips' ground speeds
   (forward travel of `Bip01` per cycle ÷ cycle length) for `walkSpeed`/`runSpeed`.

## Gestures (shared by every look of a body type)

Talk, listen, wave and sit clips live in one clips-only file per body type,
`gestures-masculine.glb` and `gestures-feminine.glb`; three.js binds them to
any look by bone name, so the 12 avatars don't need rebuilding. To add or
change a gesture:

1. Download the clips from `Assets/Animations/all_animations_max_motextr_static/`
   (files end in `.max.fbx`), e.g. `m_gestic_talk_neutral_01`,
   `m_gestic_listen_neutral_01`, `m_wave_01`, `m_sit_chair_idle_neutral_01` (and the `f_` versions).
2. Convert each with FBX2glTF as above.
3. `node scripts/rocketbox/build-gestures.mjs gestures-masculine.raw.glb Talk=m_gestic_talk_neutral_01.glb Listen=m_gestic_listen_neutral_01.glb Wave=m_wave_01.glb Sit=m_sit_chair_idle_neutral_01.glb`
4. `npm run assets:optimize -- gestures-masculine.raw.glb public/assets/models/characters/rocketbox/gestures-masculine.glb`

Clip names (`Talk`, `Listen`, `Wave`, `Sit`) are what `src/lib/bodyLanguage.ts` asks for.
Clips that hold the fingers still get the idle clip's relaxed hand at load
time (`src/components/handPose.ts`).
