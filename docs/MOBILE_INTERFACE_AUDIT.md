# Mobile interface audit

Tested in Chromium with phone emulation (touch, coarse pointer), in the
running game, by a Playwright script outside the repo.

- **Screen sizes:** 360×800, 390×844 and 412×915 upright, and 844×390
  sideways.
- **What was measured:** each panel's box against the window, the page's
  scroll size, and buttons under 28 px or partly off screen.
- **Also checked:** a screenshot of every panel.
- **Not tested:** physical phones, and the iOS Safari bars.

## Results

| Panel | 360×800 | 390×844 | 412×915 | 844×390 | Turned while open |
|---|---|---|---|---|---|
| HUD | ✓ | ✓ | ✓ | ✓ | ✓ (both ways) |
| Phone | ✓ | ✓ | ✓ | ✓ (wide handset, apps six across) | ✓ |
| Life OS (Today, People, Career, Money, Settings) | ✓ | ✓ | ✓ | ✓ (full height) | ✓ |
| Wardrobe studio | ✓ | ✓ | ✓ | ✓ (stage beside the sheet) | ✓ |
| Inventory (with take-away food) | ✓ | ✓ | ✓ | ✓ | — |
| City Locations (map) | ✓ | ✓ | ✓ | ✓ (scrolls as one panel) | — |
| Quests | ✓ | ✓ | ✓ | ✓ | — |
| Divine Evolution | ✓ | ✓ | ✓ | ✓ | — |
| Boutique (Fashion House) | ✓ | — | — | ✓ | — |
| Street stall menu | — | ✓ | — | — | — |
| Things to do here (venue activities) | — | ✓ | — | — | — |

- **Page:** no panel scrolls the page sideways or downwards at any size.
- **Map:** the one "overflow" reading on City Locations (24 px past the
  bottom) is its slide-in animation caught mid-way; the screenshots show it
  in place.

## Resolved

| Problem | Fix |
|---|---|
| The game couldn't be played upright (a rotate card) | Removed; the HUD has upright and sideways layouts. |
| The landscape page scrolled (480 px minimum height) | Removed; the game fills `100dvh`. |
| The phone squashed to a strip sideways, apps hidden | A wide handset filling the height on short screens. |
| Life OS sideways sat under the HUD, about 50 px of content | Full height on short screens. |
| Side panels sideways were 214 px tall (`100vh-11rem`) | Full height on short screens; `dvh` everywhere. |
| City Locations sideways: the list squeezed to nothing | The whole panel scrolls as one. |

## Still to do

| Problem | Where |
|---|---|
| Small buttons (under 28 px) | 4 on the phone's status row (the Life OS "Go and see them" pills were raised to 32–36 px) |
| Not re-tested this round | Spa, hotel, OGM Homes, travel and gadgets panels at every size (they share the same fixed panel classes as the boutique) |
| Untestable here | Safari's collapsing bars and real notches; only the CSS safe-area insets are in place |
