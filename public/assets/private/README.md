# Private assets

Files in this folder are **not** committed to the public GitHub repository
(see `.gitignore`). Put assets here whose licence lets you use them in the
game but not share the files themselves, for example Mixamo characters and
animations, Fab "Standard licence" models or paid packs.

List them in `public/assets/manifest.json` with paths starting `private/`,
for example `"avatar": { "url": "private/characters/player.glb", "height": 1.8 }`.

Because they are not in the repository, keep your own backup of them.
