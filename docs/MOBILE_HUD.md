# Mobile HUD

The in-game HUD (`src/components/HUD.tsx`) has two layouts, chosen by
`hudLayout(width, height)` (`src/lib/hudLayout.ts`). The choice is made again
on every resize and every turn of the phone.

- **Compact:** narrower than 640 px, or shorter than 520 px. This covers
  phones held either way up.
- **Full:** desktops and tablets, unchanged from before.

## Audit (before this change)

Measured in Chromium with phone emulation (touch, coarse pointer) at 360×800,
390×844, 412×915 and 844×390.

| Problem | Where | Cause |
|---|---|---|
| The game could not be played upright | every portrait size | A full-screen "Turn your phone sideways" card (`RotateHint`) covered the game, and the start of play tried to lock landscape. |
| The page scrolled in landscape; the canvas was 480 px tall in a 390 px window | 844×390 | `.game { min-height: 480px }` in `App.css`. |
| Goals could not be reached on narrow screens | < 640 px wide | `GoalsPanel` was not rendered at all when `small`. |
| A wide goals panel, a venue plate overlapping the money button, a centred stick | 844×390 | Layout keyed only on width ≥ 640 (`sm:`), so short landscape phones got the desktop layout. |
| Notches and the home bar were ignored | all | No `viewport-fit=cover` and no safe-area insets. |

## What the compact HUD does

- **Top bar:**
  - A slimmer card with the portrait, name, level and time; weather is
    dropped, and the status line stays.
  - The health and needs row, at a smaller size.
  - Money (number only) and Settings. Inventory moves to the bottom bar.
- **Goals:** a "Goals 2/5" button that opens the list. The open list stops
  above the stick and scrolls when the screen is short. Desktops keep the
  list open, as before.
- **Minimap:** an 88 px map upright and 80 px sideways, at the top right.
  - An ✕ folds it to a map button, and the button brings it back.
  - The choice is remembered on this device (`aye.hud.map`).
  - The venue or area name shows in the small pill under the map, in place of
    the large centred venue plate.
- **Banners:** "Vehicle coming" and the driving readout are one short line.
  They sit above the stick when the phone is upright and at the top centre
  when it is sideways, so they never cover the top bar or the goals.
- **Contextual action:** the place prompt ("Order food at…", "Go into…",
  "Talk to…") is a button at least 48 px tall at the bottom right.
  - On touch screens it shows a hand icon instead of the "E" key.
  - The movement stick is at the bottom left: 112 px upright, 96 px
    sideways, 128 px on desktop.
- **Bottom bar:**
  - Upright: it spans the width, with tiny labels ("Inventory" shows as
    "Items").
  - Sideways: icons only, with each button's name kept as its accessible
    label.
  - Every button is at least 44 px tall.
- **Canvas and safe areas:**
  - The game fills `100dvh`, so it tracks the browser's bars.
  - `viewport-fit=cover`, and every HUD element sits inside the
    `env(safe-area-inset-*)` box.
  - The orientation is no longer locked, and the turn-your-phone card is
    gone.

Nothing was removed from the game. Every panel, prompt and button is still
reachable. Only the layout changed.

## Tests

- **Unit tests:** `src/lib/hudLayout.test.ts` covers 360×800, 390×844,
  412×915, 844×390 and desktop or tablet sizes.
- **In the browser:** Chromium with touch emulation, run from a Playwright
  script outside the repo. At each size it checked the following:
  - The canvas exactly fills the window and the page does not scroll:
    360×800, 390×844, 412×915 and 844×390 all matched.
  - Turning 390×844 → 844×390 and 844×390 → 390×844 in the same session
    resizes the canvas, drops or restores the bar labels and keeps the bar
    50 px tall.
  - The goals button opens the list, and the map folds to a button and back,
    with the choice saved.
  - The contextual button at the suya cart is 226×51 px at 390×844 and
    240×51 px at 844×390.

## Performance review

Measured with the Chrome DevTools Protocol `Performance.getMetrics` over 10 s
of play, before and after the change, at the same spot.

| | Before | After |
|---|---|---|
| HUD DOM nodes, 390×844 | 435 | 419 |
| HUD DOM nodes, 844×390 | 503 | 419 |
| Layouts in 10 s | 2–5 | 3–4 |
| Style recalculations in 10 s | 0–20 | 0 |

- **Frame rate:** not measured. The test machine renders WebGL in software
  (SwiftShader) at 1–2 frames a second, so frame-rate and script-time numbers
  from it say nothing about a phone, and none are claimed.
- **Unchanged:** the HUD still re-renders 10 times a second for its readouts,
  as before.
- **Not tested here:** the 3D scene's own cost (draw calls, pixel ratio)
  wasn't changed and needs a real phone to measure.

## Known limits

- **Fixed-size panels:** the full-screen panels (shop, phone, Life OS, menus)
  weren't reworked here. They open over the HUD as before; checking each one
  upright is the next step.
- **Food carts:** ordering at a street food cart takes you into the shared
  restaurant flow, as every food vendor does today.

# Wardrobe studio

The wardrobe (`src/components/WardrobeStudio.tsx`, logic in
`src/lib/wardrobeStudio.ts`) follows the pattern of the reference video. Its
look is our own.

## How it's laid out

- **The stage:** your character on a plain stage. When the phone is upright
  the stage is on top; when it's sideways, or on a desktop, it's on the left.
  - Drag to turn the character, or use the Front, Side and Back buttons.
- **The sheet:** a panel of what you own, below the stage or to its right.
  - **Tabs:** Tops, Bottoms, Dresses, Shoes, Accessories, Hairstyles and
    Complete Outfits.
  - **Thumbnails:** a grid with a gold border and a tick on whatever is on.
    Tap to try something on and tap again to take it off.
  - **Favourites:** a heart on each piece, and a Favourites filter. These are
    the same favourites as the boutique's.
- **Buttons:**
  - **Confirm** wears the look and shows how many slots change. Nothing is
    saved before you confirm.
  - **Cancel** puts back what you had on.
  - **Save Outfit** names the look; saved looks go to Complete Outfits (up to
    6, with delete).
  - The palette button opens the earlier wardrobe panel for skin, colours and
    the fashion showcase, so nothing was lost.
- **Live updates and loading:** the 3D character changes as you tap. A
  "Dressing your character…" note shows while the model and hair load.

## Where it opens and how dresses behave

- **Entry points:** the Fitting Room in the Fashion House, the store
  assistant, Inventory → Change outfit, Life OS → Wardrobe, and the HUD's
  inventory button all open the studio.
- **Dresses:** a dress puts on its skirt as well. A plain top then takes the
  dress's skirt off.

## What a thumbnail is

With today's character models a top, bottom, dress or pair of shoes restyles
the fabric, print and finish of what the character wears. So its thumbnail
is a fabric swatch, labelled "Fabric for your top" (or bottom, or shoes). It
is never shown as a separate 3D garment. Hairstyles are real 3D hair and show
their own picture, labelled "3D hairstyle".

## Tested

- **Unit tests:** `src/lib/wardrobeStudio.test.ts`.
- **In the browser:** at 390×844 and 844×390 the test did the following,
  with no page errors:
  1. Opened the studio from Inventory.
  2. Tried on a dress, checked the character, turned it to the side and
     saved the look as "Gold gala".
  3. Confirmed.
  4. Checked the save: the dress and its skirt were equipped, and the look
     was stored.
