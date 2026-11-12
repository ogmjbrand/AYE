# Asset and feature preservation

AYE is an existing game under continuous development. Every improvement must keep everything that already works.

## What happened on 7 November 2026

- Vercel builds production automatically from every push to `main`.
- `main` had split from the working branch (`claude/wonderful-franklin-gixkta`) on 24 October and lacked 78 of its commits.
- A push to `main` on 7 November (`93fb538`) replaced the live game with that older line of work. Players saw these disappear:
  - the real danfo minibus model;
  - the ceilings in homes, hotels and venues;
  - sleeping in your own bed;
  - furniture;
  - the hospital, Crown Residence, live events, and the fire and water effects.
- No asset was deleted or recoloured. The newer work was simply missing from the build that went live.
- Recovery (`dc73d33`) merged `main` into the branch with a normal merge commit, so no history was rewritten:
  - The branch's versions of the systems both lines had built were kept: weather, accidents, life and save state.
  - Additions that existed only on `main` were kept too: furniture dragging, the women's body model, the CC5 scripts, and overcast lighting.

## Rules

1. **One production source.** Production is built from one branch only. Before pushing to it, check that it contains everything already live:
   ```
   git merge-base --is-ancestor <live commit> HEAD
   ```
2. **Merge, never replace.** Bring other lines of work in with a merge commit. Never force-push, `reset --hard`, or rebase a shared branch.
3. **Assets are added, not swapped.** A new Blender or CC5 model is added alongside the one it may replace, behind its own manifest key or option, until it has passed the checks below. Existing files in `public/assets/` are not overwritten, recoloured or deleted.
4. **Shared materials have one writer.** The road, pavement and building materials in `src/world/materials.ts` are shared by the whole city. Before changing one, search for every use of it. Never add a second function that writes the same property; `setWetness` is the only wetness writer.
5. **Source files stay untouched.** Blender (`.blend`) and CC5 source files are read and exported from, never saved over. Exports go to `assets-src/blender/out/`; see `docs/BLENDER_STUDIO.md`.
6. **Saves and data.** Never reset the database. Migrations only add to it.

## Checks before every deploy

- `npm run lint`, `npx tsc -b`, `npx vitest run`, `npm run build`, `npm run check:push`, `npm run assets:check`.
- `src/lib/preservation.test.ts` fails if any of these goes missing:
  - the danfo model or its manifest entry;
  - the ceilings;
  - bed sleep;
  - furniture dragging;
  - the single wetness writer;
  - the Lagoon name.

  Add a line there whenever a feature players rely on is finished.
- Look at the game in a browser: the street with a danfo, a furnished flat with its ceiling, and going to bed through to the morning summary.
