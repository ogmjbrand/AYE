# Skin & pigmentation

Updated 13 November 2026.

The character creator's **Skin & pigmentation** section starts from AYE's eight reference categories: Ebony, Light Brown, Dark Brown, Chocolate, Caramel, Albinism, Light Skin and Vitiligo. They're starting points, not fixed faces. The setting changes only the skin's pigmentation; the person's face, body type, hairstyle, clothes and animations stay theirs.

## What players can choose
- **Preset and shade:** each ordinary category has three shades (lighter, middle, deeper).
- **Fine-tuning:**
  - pigmentation, from lighter to deeper;
  - undertone, from cool (pinker) to warm (golden);
  - saturation, from muted to vivid.

  All three stay within natural limits.
- **Vitiligo:**
  - the skin around the patches: any of the six ordinary categories, in any shade;
  - where the patches are: face, around the eyes and mouth, neck, hands, arms, chest and back, knees and legs, feet;
  - patch size, how many, and natural or rounded edges;
  - a **New arrangement** button.

  Patches are centred on points of the skin itself, chosen by the arrangement's seed. They're tied to the skeleton, so they stay in place on every body type and move with every animation. They follow the skin's own light and shade.
- **Albinism:**
  - very low-pigment skin with a pink undertone;
  - hair, eyebrows and eyelashes that follow the hair colour: white, platinum or pale blonde, or keep their own;
  - an eye colour: blue, grey, violet or light brown.

  A hair dye bought in the game still takes priority over the albinism hair colour.
- **Keep this person's own skin:** keeps the original skin, with the older lighter/deeper slider and tint picker.

## How it's drawn
- The existing skin shader (`components/outfitShader.ts`) paints the chosen pigmentation onto the character's own skin texture, keeping its pores, light, shade and sheen. It uses the game's physically based materials, so the skin looks consistent in sunlight, indoors and at night. Garment masks keep it off clothes and hair.
- Vitiligo adds at most 12 soft-edged patches per material, with value noise for natural edges. It costs a few arithmetic operations per pixel, and only on skin.
- **Mobile:** there are no extra textures, draw calls or render passes, so it costs phones nothing noticeable.
- **Saving:** the setting is stored with the character (`skin`) and checked when loaded. Older characters load unchanged, keeping their original skin settings.

## Not done yet
- **Eye colour:** it's saved, but these models paint the eyes into the face texture, so it doesn't show yet.
- **Subsurface scattering:** three.js has no true skin subsurface scattering. Skin uses the existing physically based material with its tuned sheen.
- **Character Creator 5 bodies:** Aaron and the women's CC5 body share one texture for skin and clothes, so the new setting is saved but doesn't show on them yet. The same applies to Ariana once her export is provided.
- **NPCs:** passers-by and residents don't use vitiligo or albinism yet. Giving the crowd that variety is a natural next step.

## Files
- `src/lib/skinAppearance.ts`: presets, shades, fine-tuning, vitiligo patches, albinism, saving.
- `src/components/SkinPigmentation.tsx`: the creator section.
- `src/components/outfitShader.ts`: vitiligo in the skin shader.
- `src/components/Avatar.tsx`: anchors and applying the skin.
- Tests: `src/lib/skinAppearance.test.ts` and `src/components/SkinPigmentation.test.tsx`.
