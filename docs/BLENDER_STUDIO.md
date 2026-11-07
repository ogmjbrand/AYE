# Claude + Blender: AYE's 3D studio

Updated 7 November 2026.

## 1. What was checked, and what works

| Check | Result |
|---|---|
| Can this Claude session talk to the Blender open on your computer? | **No.** This session runs in a cloud container, not on your computer. No Blender tools are connected to it, and none of your computer's folders are shared with it (Remote Control: none). The Magnific local connector reports "nothing connected". So nothing done here can appear in your open Blender window yet. Section 2 sets that up. |
| Can Claude run Blender Python at all? | **Yes, in the cloud.** Blender 5.2.3 LTS, as the `bpy` module from PyPI, runs headless in this container. The Blender download site is blocked from here; PyPI is not. |
| Create objects, edit meshes, apply materials | **Yes.** `scripts/blender/smoke-test.py` makes a bevelled, tapered crate and a stool in metres, with Principled BSDF materials. |
| Import 3D models | **Yes.** It imports AYE's own velvet chair (4 meshes, 39,936 triangles) after `scripts/garments/decompress-glb.mjs` removes the game's compression, which Blender can't read. |
| Save .blend files | **Yes** (`assets-src/blender/out/aye-smoke-test.blend`). |
| Export game-ready GLB | **Yes.** `scripts/blender/aye_export.py` checks the asset, then exports it +Y up with transforms applied. It re-imports with identical triangle counts and materials, stands on the floor (lowest point at y = 0), and passes through AYE's optimiser (`npm run assets:optimize`) to the same meshopt-compressed format as the game's models. |
| Render a preview | **Yes,** with Cycles on the CPU (no GPU needed). |
| Changes visible inside your Blender | **Not yet:** needs one of the connections below. |

The existing project already used Blender this way. `scripts/garments/drape-in-blender.py` drapes clothing with `bpy` 4.2, and there are character and MakeHuman scripts too. The new scripts were run in Blender 5.2.3. They use only long-standing API calls, but they haven't been tried in 4.x.

## 2. Connecting your own Blender (needs you, on your computer)

Choose the path by what you want.

### A. Let Claude work on your computer (recommended first step)

Claude then runs Blender and the AYE scripts on your machine, writes files into your AYE folder, and you open the results in Blender.

1. Install Claude Code on the computer where Blender and your AYE folder are.
2. Make the AYE folder available to Claude in one of two ways:
   - In the Claude desktop app, open **Settings → Claude Code → Remote Control** and add your AYE folder.
   - Or, in a terminal inside the AYE folder, run `claude remote-control`.
3. Tell Claude it's ready. Claude can then ask to use that folder: you'll see a permission prompt, and it's your choice.
4. Claude runs the smoke test against your installed Blender:
   `blender --background --python scripts/blender/smoke-test.py -- --import <a plain glb>`
5. Open `assets-src/blender/out/aye-smoke-test.blend` in Blender to see the result.

### B. A live link to the Blender window you have open

Use this if you want to see changes appear as Claude makes them. It needs a Blender MCP add-on: a small server inside Blender that runs the commands Claude sends. A widely used community option is `blender-mcp` (github.com/ahujasid/blender-mcp). It's third-party, so read its README before installing, and save your work first, because it runs Python in your open scene.

1. Install `uv`, the Python launcher the server uses (instructions in the add-on's README).
2. Install the add-on in Blender:
   1. Download `addon.py` from that repository.
   2. In Blender, go to **Edit → Preferences → Add-ons → Install from Disk**, choose `addon.py`, and enable it.
3. In the 3D Viewport, press **N**, open the **BlenderMCP** tab, and click **Connect**.
4. Register the server with Claude (the add-on's README has the current wording; these steps were written from it, not tested from here):
   - **Claude Desktop:** add `"blender": { "command": "uvx", "args": ["blender-mcp"] }` under `mcpServers` in its config file, then restart the app.
   - **Claude Code on your computer:** run `claude mcp add blender -- uvx blender-mcp`.
5. Ask Claude to create a cube. It should appear in your viewport.

This live link has to run on the same computer as Blender. It can't be set up from a cloud session like this one.

### C. Other connectors already offered to this account

- **Magnific Local MCP.** It can drive Blender on your computer once its local app runs with the uplink enabled while Blender is open. Right now it reports nothing connected.
- **Higgsfield "use Blender".** It installs on your computer and works in its own background Blender process, not your open window: results are files you open. Its setup has to run from Claude Code on your computer.
- **Higgsfield 3D Jutsu.** A hosted Blender in Higgsfield's cloud. It's a paid service, and its scenes live in Higgsfield projects rather than your AYE folder.

### Check it works, whichever path you choose

In Blender's **Scripting** workspace:
1. **Text → Open** `scripts/blender/smoke-test.py` from your AYE folder.
2. **Run Script.** A collection called **AYE smoke test** appears in your scene with the crate and stool.
3. A second scene, **AYE smoke test: re-import**, holds the exported GLB brought back in and a preview render.
4. Files are written to `assets-src/blender/out/`.

The script never clears the scene you have open or changes its units.

## 3. The export workflow into AYE

1. Model in metres, +Z up in Blender (the exporter turns it +Y up for three.js). Stand the asset on the floor: z = 0 at its feet or footprint.
2. Use **Principled BSDF** materials only. Bake procedural node trees to image textures, at most 2048 px.
3. Check and export from Blender Python:
   ```python
   import sys; sys.path.insert(0, "<AYE>/scripts/blender")
   from aye_export import check_scene, export_game_glb
   print(check_scene(category="furniture"))  # problems, warnings, triangles vs budget, size in metres
   export_game_glb("<AYE>/assets-src/blender/out/<name>.glb", category="furniture")
   ```
   The exporter refuses to write into `public/` and refuses an asset with problems:
   - wrong units;
   - non-Principled materials;
   - missing textures;
   - over the triangle budget (prop 8k, furniture 20k, garment 30k, building 60k, vehicle 80k, character and environment 120k).

   It warns about unapplied scale or rotation, a floor offset, missing materials, double-sided materials and oversized textures.
4. Review the GLB: the smoke test's render, or open it in the game's dev build.
5. Promote it, which compresses it for the web and is the only step that touches the game's folders:
   `npm run assets:optimize -- assets-src/blender/out/<name>.glb public/assets/models/<category>/<name>.glb`
6. List it in `public/assets/manifest.json` (or the registry for its kind), add its licence line to `public/assets/CREDITS.md`, and run `npm run assets:check`.

**Characters and clothing:** skin to the Rocketbox `Bip01` skeleton names the game binds by (`world/glbGarment.ts`). The draping pipeline, `scripts/garments/drape-in-blender.py`, already does this for clothing.

## 4. Files

- `scripts/blender/aye_export.py`: scene checks, game-ready GLB export, glTF-safe material helper and metric units.
- `scripts/blender/smoke-test.py`: the capability test, for a terminal, `blender --background` or Blender's Text Editor.
- `.gitignore`: `assets-src/blender/out/` (studio outputs stay out of the repository until promoted).
