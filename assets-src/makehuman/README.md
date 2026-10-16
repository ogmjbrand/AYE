# MakeHuman targets (CC0)

Shape and expression targets for the **MakeHuman base mesh**, uploaded by the
project owner for AYE's next character system (see `docs/CHARACTER_PIPELINE.md`).
Every target here is **CC0** (see each pack's JSON in `packs/`).

| Pack | What it is | Targets | Authors |
|---|---|---|---|
| `faceunits01` | Facial expressions: the 52 ARKit face units (smile, blink, jaw open, brows, cheeks, eye look, tongue…) | 52 | Mika Suominen |
| `nose01` | Nose shapes (bulbous, wide, Greek statue, nostril and columella details) | 15 | Elvaerwyn, Habanero, Mindfront, jujube |
| `ears01` | Ear shapes (flap ears, flattened, ear details, canal) | 8 | Elvaerwyn, Mindfront, RehmanPolanski, jujube |
| `hands01` | Hand anatomy (knuckles, thenar and hypothenar, finger correction) | 4 | Mindfront, jujube |

## Format

A `.target` file is a list of `vertexIndex dx dy dz` lines: offsets for
vertices of the MakeHuman base mesh (`hm08`, 19,158 vertices). They only work
on that mesh, **not** on the Rocketbox people the game uses today.

## Verified

`scripts/makehuman/fetch-base.mjs` downloads the base mesh (CC0, from the MPFB
repository; not committed), and `scripts/makehuman/build-test.mjs` builds a
GLB with smile, blink, surprise, nose and ear targets as morph targets. Rendered
in three.js, they deform the face correctly.

## Still needed for playable MakeHuman people

Skins (textures), eyes, eyebrows, eyelashes, hair and clothes. These are in
MakeHuman's **system assets** pack (CC0), downloadable from the MakeHuman
community site, which this build environment cannot reach.
